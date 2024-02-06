// University of Illinois/NCSA
// Open Source License
// http://otm.illinois.edu/disclose-protect/illinois-open-source-license

// Copyright (c) 2020 Grainger Engineering Library Information Center.  All rights reserved.

// Developed by: IDEA Lab
//               Grainger Engineering Library Information Center - University of Illinois Urbana-Champaign
//               https://library.illinois.edu/enx

// Permission is hereby granted, free of charge, to any person obtaining a copy of
// this software and associated documentation files (the "Software"), to deal with
// the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
// of the Software, and to permit persons to whom the Software is furnished to
// do so, subject to the following conditions:
// * Redistributions of source code must retain the above copyright notice,
//   this list of conditions and the following disclaimers.
// * Redistributions in binary form must reproduce the above copyright notice,
//   this list of conditions and the following disclaimers in the documentation
//   and/or other materials provided with the distribution.
// * Neither the names of IDEA Lab, Grainger Engineering Library Information Center,
//   nor the names of its contributors may be used to endorse or promote productc:\Users\David\OneDrive\Documents\RELAY\RelayTesting\serve.jss
//   derived from this Software without specific prior written permission.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
// CONTRIBUTORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS WITH THE
// SOFTWARE.

/* jshint esversion: 6 */


const https = require('https');

const socketIO = require('socket.io');

const { instrument } = require("@socket.io/admin-ui");

const mysql = require('mysql2');

const syncServer = require('./sync');

const chatServer = require('./chat');

const adminServer = require('./admin');

const config = require('./config');

const fs = require('fs');

const path = require('path');

// set up logging
const { createLogger, format, transports } = require('winston');
const { debug } = require('console');

const { combine, timestamp, printf } = format;

const printFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} ${level}: ${message}`;
});


const logger = createLogger({
  format: combine(

    timestamp(),

    printFormat
  ),
  transports: [

    new transports.Console(),
    new transports.File({ filename: 'log.txt' })
  ],
  exitOnError: false
});

let pool;

if (config.db.host && config.db.host != "") {
  pool = mysql.createPool(config.db);

  testQuery = pool.query(`SHOW TABLES;`, (err, res) => {
    if (err) {
      if (logger) logger.error(`Tried to connect to database: ${err}`);

      process.exit();
    } else {
      if (logger) logger.info(`Database initialized with ${res.length} tables.`);
    }
  });

  if (logger) logger.info(`Database pool created: host: ${config.db.host}, database: ${config.db.database}.`);
}












const keyPath = path.join(__dirname, 'certs', 'privkey.pem');
const certPath = path.join(__dirname, 'certs', 'fullchain.pem');

const options = {

  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath),

  //  secureProtocol: 'TLSv1_2_method',
  requestCert: false,
  rejectUnauthorized: false
};

const server = https.createServer(options);

const io = new socketIO.Server(server,
  {
    cors: {
      origin: '*',
      //   credentials: true

    },
  });




//offers will contain {}

let offers = [
  //offererUserName = "test",
  // offer
  // offerIceCandidates
  // answererUserName
  // answer
  // answererIceCandidates
];
let connectedSockets = [
  //username, socketId
]


let nameToClientIDMap = new Map();


io.on('connection', (socket) => {


  //a new client has joined. If there are any offers available emit them out
  // if (offers.length)
  //   socket.emit('availableOffers', offers);


  const userName = socket.handshake.auth.userName;
  const password = socket.handshake.auth.password;
  const client_id = socket.handshake.auth.client_id;

  nameToClientIDMap.set(userName, client_id);

  // if(password !== "x"){
  //     socket.disconnect(true);
  //     return;
  // }


  connectedSockets.push({
    socketId: socket.id,
    userName
  })

  // Notify all clients about the updated list
  io.emit('clientsUpdate', getOtherClients(socket.id));





  socket.on('disconnect', () => {
    // Remove the disconnected client
    let disconnectingClient = connectedSockets.find(s => s.socketId === socket.id);

    nameToClientIDMap.delete(disconnectingClient.userName);

    // Assuming disconnectingClient is determined earlier
    let disconnectingClientUserName = disconnectingClient.userName;

    // Iterate through all active calls to remove the disconnecting client
    Object.keys(activeCalls).forEach(offererUserName => {
      // Check if the disconnecting client is part of this call
      if (activeCalls[offererUserName].includes(disconnectingClientUserName)) {
        // Safely remove the client from the call
        activeCalls[offererUserName] = activeCalls[offererUserName].filter(userName => userName !== disconnectingClientUserName);

        // If no participants are left in the call, delete the entry
        if (!activeCalls[offererUserName].length) {
          delete activeCalls[offererUserName];
        }
      }
    });

    console.log("DISCONNECTING CLIENT", disconnectingClient);


    // Find the offer that matches the disconnectingClient.userName
    const offerInOffers = offers.find(offer => offer.offererUserName === disconnectingClient.userName);

    connectedSockets = connectedSockets.filter(s => s.socketId !== socket.id);

    // Remove any offers where the offerer is the disconnected user
    offers = offers.filter(offer => offer.offererUserName !== disconnectingClient.userName);

    // Notify all clients about the updated list
    io.emit('clientsUpdate', getOtherClients(socket.id));

    // Notify all remaining clients to update their offer elements
    io.emit('availableOffers', offers);



    if (offerInOffers && offerInOffers.answererUserName) {
      // The offer is found
      const answererUserName = offerInOffers.answererUserName;

      // Get the socket of the answerer
      const answererSocket = connectedSockets.find(s => s.userName === answererUserName);

      if (answererSocket) {
        // The answerer socket is found
        const answererSocketId = answererSocket.socketId;

        // Emit 'endCall' event to the answerer
        socket.broadcast.emit('clientDisconnected', disconnectingClient.userName);
      }
    }

  });




  socket.on('newOffer', data => {


    let existingOffer = offers.find(offer => offer.offererUserName === data.answererUserName);

    if (existingOffer) {

      let socketInfo = connectedSockets.find(socket => socket.userName === data.answererUserName);

      let socketInfo2 = connectedSockets.find(socket => socket.userName === data.offererUserName);
      //to specific socket, socket.to is foe room

      let offererClientID = nameToClientIDMap.get(data.offererUserName);
      //io.to(socketInfo.socketId).emit('acceptClientOffer', { offer: existingOffer, isAnswerer: true, offererClientID: nameToClientIDMap.get(data.answererUserName) });
      io.to(socketInfo2.socketId).emit('acceptClientOffer', existingOffer, offererClientID);

      console.log("EXISTING OFFER :" + nameToClientIDMap.get(data.offererUserName));
      return;
    }


    let newOffer = {
      offer: data.offer,
      offererUserName: data.offererUserName,

      answererUserName: data.answererUserName,

      type: data.type, // Include the type of offer

      offerIceCandidates: [],
      answer: null,
      answererIceCandidates: []
    }

    offers.push(newOffer)

    // Handle the offer based on its type
    if (data.type === 'screenShare') {
      console.log("Screen share offer arrived");

      // Example: Notify only specific clients about the screen share offer
      // This could be based on some logic, like clients who are already in a call with the offerer
      const clientsInCallWithOfferer = getClientsInCallWithOfferer(data.offererUserName);
      clientsInCallWithOfferer.forEach(clientUserName => {
        let socketInfo = connectedSockets.find(socket => socket.userName === clientUserName);
        if (socketInfo) {
          console.log(`Notifying ${clientUserName} about screen share offer.`);
          //  io.to(socketInfo.socketId).emit('newScreenShareOfferAwaiting', { newOffer: newOffer, answererUserName: clientUserName });
        }
      });
    } else {
      console.log("OFFER ARRIVED+++++++++++++++++++++++++");

      let socketInfo = connectedSockets.find(socket => socket.userName === data.answererUserName);

      if (socketInfo) {
        console.log(`Socket ID for ${data.answererUserName} is ${socketInfo.socketId}`);
      } else {
        console.log(`No socket found for ${data.answererUserName}`);
      }


      if (socketInfo) {
        io.to(socketInfo.socketId).emit('newOfferAwaiting', {
          newOffer: newOffer, offererClientID: nameToClientIDMap.get(newOffer.offererUserName)
        });
      } else {
        console.error('No socket found for', data.answererUserName);
      }

    }

  })

  socket.on('requestRejectOffer', message => {
    if (message.type === 'offer-rejection') {
      const offererUserName = getKeyByValue(nameToClientIDMap, message.offererClientID);//message.offererUserName; // The username of the peer who made the offer

      const reason = message.reason; // The reason for rejection
      console.log(`Call offer to ${offererUserName} was rejected: ${reason}`);

      //const name = getKeyByValue(nameToClientIDMap, message.offererClientID);

      // Remove the offer from the offers array
      offers = offers.filter(offer => !(offer.offererUserName === offererUserName && offer.answererUserName === message.answererUserName));

      const offererSocketID = connectedSockets.find(s => s.userName === offererUserName).socketId;
      io.to(offererSocketID).emit('rejectedClientOffer', { offererUserName, reason, answererUserName: message.answererUserName });


    }
  });



  socket.on('offerAnswered', (offer) => {
    console.log("OFFER ANSWERED+++++++++++++++++++++++++");
    socket.broadcast.emit('removeOffer', offer);
  });

  let roomCounter = 0;

  socket.on('answerResolve', (offer, ackFunction) => {

    //emit this answer (offerObj) back to CLIENT1
    //in order to do that, we need CLIENT1's socketid


    const socketToAnswer = connectedSockets.find(s => s.userName === offer.offererUserName)
    if (!socketToAnswer) {
      console.log("No matching socket")
      return;
    }
    //we found the matching socket, so we can emit to it!
    const socketIdToAnswer = socketToAnswer.socketId;




    // Create a new room
    const roomName = `room${roomCounter++}`;

    // Join the clients to the room
    const offererSocketKeyValue = connectedSockets.find(client => client.userName === offer.offererUserName);
    const answererSocketidKeyValue = connectedSockets.find(client => client.userName === offer.answererUserName);

    const offereId = offererSocketKeyValue.socketId;
    const answererId = answererSocketidKeyValue.socketId;

    const offereName = offererSocketKeyValue.userName;
    const answererName = answererSocketidKeyValue.userName;

    const offererSocket = io.sockets.sockets.get(offereId);
    const answererSocket = io.sockets.sockets.get(answererId);

    // console.log(offererSocketid, answererSocketid, offererSocket, answererSocket);
    offer.roomName = roomName;

    if (offererSocket) offererSocket.join(roomName);
    if (answererSocket) answererSocket.join(roomName);

    // Store the room name in the clients
    if (offererSocket) offererSocket.roomName = roomName;
    if (answererSocket) answererSocket.roomName = roomName;

    // io.to(roomName).emit('roomCreated', { roomName, nameToAdd: offereName });
    // Emit the room name to the clients
    if (offererSocket) offererSocket.emit('roomCreated', { roomName, nameToAdd: answererName });
    if (answererSocket) answererSocket.emit('roomCreated', { roomName, nameToAdd: offereName });

    addToCall(offer.offererUserName, offer.answererUserName);


    //every socket has it's own room
    socket.to(socketIdToAnswer).emit('answerResponse', { offer, offererClientID: nameToClientIDMap.get(offer.offererUserName) });//, roomName: roomName});

    //send back to the answerer all the iceCandidates we have already collected
    ackFunction(offer.offerIceCandidates);
  })



  socket.on('sendCallEndedToServer', (roomName) => {
    // Forward the 'callEnded' event to all other clients in the room
    socket.to(roomName).emit('callEnded');

  });







  socket.on('sendIceCandidateToSignalingServer', iceCandidateObj => {
    const { didIOffer, iceUserName, iceCandidate } = iceCandidateObj;


    if (didIOffer) {
      //this ice is coming from the offerer. Send to the answerer
      const offerInOffers = offers.find(o => o.offererUserName === iceUserName);

      if (offerInOffers) {
        offerInOffers.offerIceCandidates.push(iceCandidate)
        // 1. When the answerer answers, all existing ice candidates are sent
        // 2. Any candidates that come in after the offer has been answered, will be passed through
        if (offerInOffers.answererUserName) {
          //pass it through to the other socket
          const socketToSendTo = connectedSockets.find(s => s.userName === offerInOffers.answererUserName);
          if (socketToSendTo) {
            socket.to(socketToSendTo.socketId).emit('receivedIceCandidateFromServer', iceCandidate)
          } else {
            console.log("Ice candidate recieved but could not find answere")
          }
        }
      }
    } else {
      //this ice is coming from the answerer. Send to the offerer
      //pass it through to the other socket


      const offerInOffers = offers.find(o => o.answererUserName === iceUserName);

      if (!offerInOffers || !offerInOffers.offererUserName) {
        // Find the index of the invalid offer
        const index = offers.findIndex(offer => offer === offerInOffers);
        if (index !== -1) {
          // Remove the invalid offer from the array
          offers.splice(index, 1);
        }
        console.log("Invalid offer removed: offererUserName is undefined or null");
        return;
      }

      const socketToSendTo = connectedSockets.find(s => s.userName === offerInOffers.offererUserName);
      if (socketToSendTo) {
        //why is ice candidate null?
        if (iceCandidate)
          socket.to(socketToSendTo.socketId).emit('receivedIceCandidateFromServer', iceCandidate)
      } else {
        console.log("Ice candidate recieved but could not find offerer")
      }
    }
    // console.log(offers)
  })

})


// Function to get all clients except for the specified client
function getOtherClients(excludedClientId) {
  return Object.entries(connectedSockets)
    .filter(([clientId]) => clientId !== excludedClientId)
    .map(([_, client]) => client.userName);
}





// At the top level of your server code
let activeCalls = {};
// Utility functions as previously defined
function getClientsInCallWithOfferer(offererUserName) {
  return activeCalls[offererUserName] || [];
}

function addToCall(offererUserName, participantUserName) {
  if (!activeCalls[offererUserName]) {
    activeCalls[offererUserName] = [];
  }
  activeCalls[offererUserName].push(participantUserName);
}

function removeFromCall(offererUserName, participantUserName) {
  // Check if there is an entry for offererUserName to avoid accessing properties of undefined
  if (activeCalls[offererUserName]) {
    // Proceed to filter out the participantUserName
    activeCalls[offererUserName] = activeCalls[offererUserName].filter(userName => userName !== participantUserName);

    // After filtering, check if there are no more participants left
    if (activeCalls[offererUserName].length === 0) {
      delete activeCalls[offererUserName]; // Delete the entry if no participants are left
    }
  }
}


function getKeyByValue(map, searchValue) {
  for (let [key, value] of map.entries()) {
    if (value === searchValue) {
      return key;
    }
  }
}




instrument(io, {
  auth: false,
  mode: "development",
});







const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running on https://192.168.1.67:${PORT}`);
});



if (logger) logger.info(` Dev relay is running on :${PORT}`);

var chatNamespace = chatServer.init(io, logger);

var adminNamespace = adminServer.init(io, logger, syncServer, chatServer);


syncServer.init(io, pool, logger, chatNamespace, adminNamespace);
