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


const roomName = '1'//`room${roomCounter++}`;

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

    socket.leave(roomName);


    nameToClientIDMap.delete(disconnectingClient.userName);

    // Assuming disconnectingClient is determined earlier
    //let disconnectingClientUserName = disconnectingClient.userName;

    // // Iterate through all active calls to remove the disconnecting client
    // Object.keys(activeCalls).forEach(offererUserName => {
    //   // Check if the disconnecting client is part of this call
    //   if (activeCalls[offererUserName].includes(disconnectingClientUserName)) {
    //     // Safely remove the client from the call
    //     activeCalls[offererUserName] = activeCalls[offererUserName].filter(userName => userName !== disconnectingClientUserName);

    //     // If no participants are left in the call, delete the entry
    //     if (!activeCalls[offererUserName].length) {
    //       delete activeCalls[offererUserName];
    //     }
    //   }
    // });

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


    socket.broadcast.emit('clientDisconnected', disconnectingClient.userName);

    //  if (offerInOffers && offerInOffers.answererUserName) {
    // The offer is found
    //   const answererUserName = offerInOffers.answererUserName;

    // Get the socket of the answerer
    //    const answererSocket = connectedSockets.find(s => s.userName === answererUserName);


    // The answerer socket is found
    // const answererSocketId = answererSocket.socketId;

    // Emit 'endCall' event to the answerer

    // }

  });




  socket.on('newOffer', async (data) => {

    let newOffer = {
      offer: data.offer,

      offererUserName: data.offererUserName,
      answererUserName: data.answererUserName,

      offererSocketID: socket.id,
      answererSocketID: connectedSockets.find(socket => socket.userName === data.answererUserName)?.socketId,
      offerIceCandidates: [],
      answer: null,
      answererIceCandidates: []
    }

    // offer.answererSocketId = answererSocketidKeyValue.socketId;
    // offer.offererSocketId = offererSocketKeyValue.socketId;



    offers.push(newOffer)

    console.log("OFFER ARRIVED+++++++++++++++++++++++++");

    let answererSocket = connectedSockets.find(socket => socket.userName === data.answererUserName);

    let socketInfoOfferer = connectedSockets.find(socket => socket.userName === data.offererUserName);

    if (answererSocket) {
      console.log(`Socket ID for ${data.answererUserName} is ${answererSocket.socketId}`);
    } else {
      console.log(`No socket found for ${data.answererUserName}`);
    }


    if (answererSocket) {

      if (data.isForClientSync) {


        io.to(answererSocket.socketId).emit('newOfferAwaiting2', {
          isForClientSync: data.isForClientSync,
          newOffer: newOffer, offererSocketID: newOffer.offererSocketID, offererClientID: nameToClientIDMap.get(newOffer.offererUserName)
        });

        //  console.log("SENDING NEW OFFER AWAITING 2 --- offererSocketID " + newOffer.offererSocketID )

        // const sockets = await io.in(roomName).fetchSockets();

        // for (const s of sockets) {

        //  s.emit('newOfferAwaiting', {
        //     newOffer: newOffer, offererClientID: nameToClientIDMap.get(newOffer.offererUserName)
        //   });

        // }



        //io.to(answererSocket.socketId).emit('receiveOffer', newOffer, newOffer.offererUserName) //, nameToClientIDMap.get(newOffer.offererUserName) );



        // io.to(answererSocket.socketId).emit('newOfferAwaiting', {
        //     newOffer: newOffer, offererClientID: nameToClientIDMap.get(newOffer.offererUserName)
        //   });

        //  io.to(socketInfo.socketId).emit('acceptClientOffer', {offer: newOffer, isAnswer: true, offererClientID: nameToClientIDMap.get(data.offererUserName)});


        //  io.to(socketInfo.socketInfoOfferer).emit('acceptClientOffer', {offer: newOffer, offererClientID: nameToClientIDMap.get(data.offererUserName)});

      } else {

        io.to(answererSocket.socketId).emit('newOfferAwaiting', {
          newOffer: newOffer, offererClientID: nameToClientIDMap.get(newOffer.offererUserName)
        });
        // io.to(answererSocket.socketId).emit('newOfferAwaiting2', {
        //   newOffer: newOffer, offererClientID: nameToClientIDMap.get(newOffer.offererUserName)
        // });

      }

    } else {
      console.error('No socket found for', data.answererUserName);
    }

    //   }

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

  socket.on('roomCallClient', async (clientToAdd, clientsAlreadyConnectedTo, otherClientID, offer) => {

    clientsAlreadyConnectedTo.push(socket.id);
    // if(otherClientID){

    //   io.to(otherClientID).emit('syncForOfferer', clientToAdd, offer);
    //   return;
    // }

    const sockets = await io.in(roomName).fetchSockets();
    console.log("NUMBER OF SOCKETS IN ROOM " + roomName + " " + sockets.length);

    // Create a new array that includes only the socket objects that are not in clientsAlreadyConnectedTo
    let socketsNotConnected = sockets.filter(s => !clientsAlreadyConnectedTo.includes(s.id));
    console.log("NUMBER AFTER FILTER - NotConnected " + socketsNotConnected.length);

    for (const s of socketsNotConnected) {

      setTimeout(() => {

        let socketInfo = connectedSockets.find(socket => socket.socketId === s.id);
        // console.log("CALLER ID " + socket.id + "  clientsNotConnectedTo: " + s.id);
        console.log("SENDING CLIENT :  " + clientToAdd + " to client: " + socketInfo.userName);
        io.to(s.id).emit('makeClientSendOffer', clientToAdd);
      }, 1000);
      // if(s.id !== socket.id )
      // {

      //  io.to(s.id).emit('makeClientSendOffer', clientToAdd );

      // }
    }

    //check offerer client if it needs to sync
    // if(otherClientID)
    // io.to(otherClientID).emit('syncForOfferer', offer.offererUserName, offer);


    // if(otherClientID){
    //   io.to(otherClientID).emit('makeClientSendOffer', clientToAdd );
    // }
  });


  socket.on('offerAnswered', (offer) => {
    console.log("OFFER ANSWERED+++++++++++++++++++++++++");
    // socket.broadcast.emit('removeOffer', offer);
  });



  socket.on('answerResolve', async (offer, ackFunction) => {
    console.log("ANSWER RESOLVE+++++++++++++++++++++++++");

    // Join the clients to the room
    const offererSocketObject = connectedSockets.find(client => client.userName === offer.offererUserName);
    const answererSocketObject = connectedSockets.find(client => client.userName === offer.answererUserName);

    const offererSocket = io.sockets.sockets.get(offer.offererSocketID);//offererSocketObject.socketId);
    const answererSocket = io.sockets.sockets.get(offer.answererSocketID);//answererSocketObject.socketId);

    offer.roomName = roomName;

    if (offererSocket) offererSocket.join(roomName);
    if (answererSocket) answererSocket.join(roomName);

    // Store the room name in the clients
    if (offererSocket) offererSocket.roomName = roomName;
    if (answererSocket) answererSocket.roomName = roomName;


    // Emit the room name to the clients
    if (offererSocket) offererSocket.emit('roomCreated', { roomName, nameToAdd: offer.answererUserName });

    if (answererSocket) answererSocket.emit('roomCreated', { roomName, nameToAdd: offer.offererUserName });


    const offerToUpdate = offers.find(o => o.offererUserName === offer.offererUserName)
    if (!offerToUpdate) {
      console.log("No OfferToUpdate")
      return;
    }
    offerToUpdate.answer = offer.answer
    offerToUpdate.answererUserName = userName


    ackFunction(offer)//.offerIceCandidates);

    io.to(offererSocketObject.socketId).emit('answerResponse', { offer: offerToUpdate, offererClientID: nameToClientIDMap.get(offer.answererUserName) }); //, otherClientsInRoom });//, roomName: roomName});


  })

  socket.on('sendAnswer', (data) => {
    console.log("SEND ANSWER+++++++++++++++++++++++++" + data.fromUserName);
    const recipientSocketId = findSocketIdByUsername(data.fromUserName);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('receiveAnswer2', data.offer, data.user);
    }
  });

  function findSocketIdByUsername(username) {
    const socketInfo = connectedSockets.find(s => s.userName === username);
    return socketInfo ? socketInfo.socketId : null;
  }


  socket.on('sendCallEndedToServer', (userName) => {
    // Forward the 'callEnded' event to all other clients in the room
    //socket.to(userName).emit('callEnded', nameToClientIDMap.get(userName));
    socket.leave(roomName);
    socket.broadcast.emit('callEnded', nameToClientIDMap.get(userName));
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
          const socketFrom = connectedSockets.find(s => s.userName === offerInOffers.offererUserName);
          const socketToSendTo = connectedSockets.find(s => s.userName === offerInOffers.answererUserName);
          if (socketToSendTo) {

            // console.log(`IOFFERED --- ICE CANDIDATE ARRIVED+++++++++++++++++++++++++  ${offerInOffers.offererUserName}`);

            socket.to(socketToSendTo.socketId).emit('receivedIceCandidateFromServer', { iceCandidate, offer: offerInOffers, from: socketFrom.userName, to: socketToSendTo.userName })
          } else {
            console.log("Ice candidate recieved but could not find answere")
          }
        }
      }
    } else {
      //this ice is coming from the answerer. Send to the offerer
      //pass it through to the other socket


      const offerInOffers = offers.find(o => o.answererUserName === iceUserName);

      if (!offerInOffers) {
        // Find the index of the invalid offer
        const index = offers.findIndex(offer => offer === offerInOffers);
        if (index !== -1) {
          // Remove the invalid offer from the array
          offers.splice(index, 1);
        }
        console.log("Invalid offer removed: offererUserName is undefined or null");
        return;
      }



      const socketFrom = connectedSockets.find(s => s.userName === offerInOffers.answererUserName);


      const socketToSendTo = connectedSockets.find(s => s.userName === offerInOffers.offererUserName);
      if (socketToSendTo) {
        //why is ice candidate null?
        // if (iceCandidate)
        // console.log(`IRECEIVED --- ICE CANDIDATE ARRIVED+++++++++++++++++++++++++  ${offerInOffers.offererUserName}`);

        socket.to(socketToSendTo.socketId).emit('receivedIceCandidateFromServer', { iceCandidate, offer: offerInOffers, from: socketFrom.userName, to: socketToSendTo.userName })
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
//Utility functions as previously defined
// function getClientsInCallWithOfferer(offererUserName) {
//   return activeCalls[offererUserName] || [];
// }

// function addToCall(offererUserName, participantUserName) {
//   if (!activeCalls[offererUserName]) {
//     activeCalls[offererUserName] = [];
//   }
//   activeCalls[offererUserName].push(participantUserName);
// }

// function removeFromCall(offererUserName, participantUserName) {
//   // Check if there is an entry for offererUserName to avoid accessing properties of undefined
//   if (activeCalls[offererUserName]) {
//     // Proceed to filter out the participantUserName
//     activeCalls[offererUserName] = activeCalls[offererUserName].filter(userName => userName !== participantUserName);

//     // After filtering, check if there are no more participants left
//     if (activeCalls[offererUserName].length === 0) {
//       delete activeCalls[offererUserName]; // Delete the entry if no participants are left
//     }
//   }
// }


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
