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
//   nor the names of its contributors may be used to endorse or promote products
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

const http = require('http');

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





io.on('connection', (socket) => {


  const userName = socket.handshake.auth.userName;
  const password = socket.handshake.auth.password;

  // Add client to the clients object
  //clients[socket.id] = { userName: socket.handshake.auth.userName };

  connectedSockets.push({
    socketId: socket.id,
    userName
  })


  // Notify all clients about the updated list
  io.emit('clientsUpdate', getOtherClients(socket.id));



  socket.on('offerAnswered', (offererUserName) => {
    console.log("OFFER ANSWERED+++++++++++++++++++++++++");
    socket.broadcast.emit('removeOffer', offererUserName);
  });

  // console.log("Someone has connected");
  //     const userName =" socket.handshake.auth.userName;"
  //     const password =" socket.handshake.auth.password;"
  // // console.log("Someone has connected");


  // if(password !== "x"){
  //     socket.disconnect(true);
  //     return;
  // }


  socket.on('disconnect', () => {
    // Remove the disconnected client
    connectedSockets = connectedSockets.filter(s => s.socketId !== socket.id);
    // Also, remove any offers related to the disconnected user
    offers = offers.filter(offer => offer.offererUserName !== userName && offer.answererUserName !== userName);


    // Notify all remaining clients to update their offer elements
    io.emit('availableOffers', offers);

    //delete clients[socket.id];

    // Notify all clients about the updated list
    io.emit('clientsUpdate', getOtherClients(socket.id));

    console.log('Client disconnected:', socket.id);
  });
  //a new client has joined. If there are any offers available,
  //emit them out
  if (offers.length) {
    socket.emit('availableOffers', offers);
  }

  socket.on('newOffer', data => {


    offers.push({
      offer: data.offer,
      offererUserName: data.offererUserName,
      receivingClientName: data.receivingClientName,
      receivingClientID: data.receivingClientID,

      offerIceCandidates: [],
      answererUserName: null,
      answer: null,
      answererIceCandidates: []
    })

    console.log("OFFER ARRIVED+++++++++++++++++++++++++");


    let socketInfo = connectedSockets.find(socket => socket.userName ===  data.receivingClientName);

    if (socketInfo) {
      console.log(`Socket ID for ${data.receivingClientName} is ${socketInfo.socketId}`);
    } else {
      console.log(`No socket found for ${usernameToFind}`);
    }

    // send the message to the specific socket
    io.to(socketInfo.socketId).emit('newOfferAwaiting', { offers: offers.slice(-1), newOffer: data.offer, receivingClientID: data.receivingClientID });

    //send out to all connected sockets EXCEPT the caller
    //socket.broadcast.emit('newOfferAwaiting', { offers: offers.slice(-1), newOffer: data.offer, receivingClientID: data.receivingClientID });
  })

  socket.on('newAnswer', (offerObj, ackFunction) => {
    console.log(offerObj);
    //emit this answer (offerObj) back to CLIENT1
    //in order to do that, we need CLIENT1's socketid
    const socketToAnswer = connectedSockets.find(s => s.userName === offerObj.offererUserName)
    if (!socketToAnswer) {
      console.log("No matching socket")
      return;
    }
    //we found the matching socket, so we can emit to it!
    const socketIdToAnswer = socketToAnswer.socketId;
    //we find the offer to update so we can emit it
    const offerToUpdate = offers.find(o => o.offererUserName === offerObj.offererUserName)
    if (!offerToUpdate) {
      console.log("No OfferToUpdate")
      return;
    }
    //send back to the answerer all the iceCandidates we have already collected
    ackFunction(offerToUpdate.offerIceCandidates);
    offerToUpdate.answer = offerObj.answer
    offerToUpdate.answererUserName = userName
    //socket has a .to() which allows emiting to a "room"
    //every socket has it's own room
    socket.to(socketIdToAnswer).emit('answerResponse', offerToUpdate)
  })

  socket.on('sendIceCandidateToSignalingServer', iceCandidateObj => {
    const { didIOffer, iceUserName, iceCandidate } = iceCandidateObj;
    // console.log(iceCandidate);
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
