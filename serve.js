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
const { Console } = require('console');
const { data } = require('browserslist');


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
  let client_id = socket.handshake.auth.client_id;
  if (!client_id)
    client_id = Math.floor(Math.random() * 100000)

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











  });





  // A function to determine if an offer should be sent between two peers
  function shouldSendOffer(offererUserName, answererUserName) {
    // Simplified logic: Check if an offer already exists to prevent duplicates
    const existingOffer = offers.find(offer =>
      (offer.offererUserName === offererUserName && offer.answererUserName === answererUserName) ||
      (offer.offererUserName === answererUserName && offer.answererUserName === offererUserName));

    return !existingOffer;
  }





  socket.on('sendToClient', (data, ackFn) => {
    let { targetClientId, message } = data;
    // Ensure the target client exists

    console.log("SEND TO CLIENT+++++++++++++++++++++++++");

    targetClientId = connectedSockets.find(s => s.userName === targetClientId).socketId;

    const targetSocket = io.sockets.sockets.get(targetClientId);

    if (targetSocket) {
      // Forward the message to the target client
      targetSocket.emit('messageFromClient', { message, from: socket.id }, (response) => {
        // Receive acknowledgment from Client B and relay back to Client A
        if (ackFn) ackFn(response);
      });
    } else {
      // Handle the case where the target client is not connected
      if (ackFn) ackFn('Target client not found');
    }
  });


  socket.on('newOffer', async (data, ackFn) => {

    // if (!shouldSendOffer(data.offererUserName, data.answererUserName)) {
    //   console.log(`Duplicate offer prevented between ${data.offererUserName} and ${data.answererUserName}`);
    //   return;
    // }


    let newOffer = {
      offer: data.offer,

      offererUserName: data.offererUserName,
      answererUserName: data.answererUserName,

      offererSocketID: socket.id,
      answererSocketID: connectedSockets.find(socket => socket.userName === data.answererUserName)?.socketId,


      answererClientID: nameToClientIDMap.get(data.answererUserName),

      offererClientID: nameToClientIDMap.get(data.offererUserName),


      offerIceCandidates: [],
      answer: null,
      answererIceCandidates: []
    }

    // offer.answererSocketId = answererSocketidKeyValue.socketId;
    // offer.offererSocketId = offererSocketKeyValue.socketId;



    offers.push(newOffer)

    console.log("OFFER ARRIVED+++++++++++++++++++++++++");

    let answererSocket = connectedSockets.find(socket => socket.userName === data.answererUserName);

    //  let socketInfoOfferer = connectedSockets.find(socket => socket.userName === data.offererUserName);

    if (answererSocket) {
      console.log(`Socket ID for ${data.answererUserName} is ${answererSocket.socketId}`);
    } else {
      console.log(`No socket found for ${data.answererUserName}`);
    }


    if (answererSocket) {

      if (data.isForClientSync) {


        io.to(answererSocket.socketId).emit('newOfferAwaiting2', {
          isForClientSync: data.isForClientSync,
          newOffer,
          offererSocketID: newOffer.offererSocketID,
          offererClientID: newOffer.offererClientID,
          answererClientID: newOffer.answererClientID
        },
          (response) => {
            // Receive acknowledgment from Client B and relay back to Client A
            if (ackFn) ackFn(response);
          }




        );


      } else {


        const targetSocket = io.sockets.sockets.get(answererSocket.socketId);

        targetSocket.emit('newOfferAwaiting', {
          newOffer, offererClientID: newOffer.offererClientID
        },
          (response) => {
            // Receive acknowledgment from Client B and relay back to Client A
            if (ackFn) ackFn(response);
          }
        );

        // io.to(answererSocket.socketId).emit('newOfferAwaiting', {
        //   newOffer: newOffer, offererClientID: nameToClientIDMap.get(newOffer.offererUserName)
        // },);


        //targetClientId = connectedSockets.find(s => s.userName === targetClientId).socketId;



        // if (targetSocket) {
        //   // Forward the message to the target client
        //   targetSocket.emit('messageFromClient', { message, from: socket.id }, (response) => {
        //     // Receive acknowledgment from Client B and relay back to Client A
        //     if (ackFn) ackFn(response);
        //   });
        // } else {
        //   // Handle the case where the target client is not connected
        //   if (ackFn) ackFn('Target client not found');
        // }

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


      const answererClientID = nameToClientIDMap.get(message.answererUserName);//message.answererUserName; // The username of the peer who received the offer



      const reason = message.reason; // The reason for rejection
      console.log(`Call offer to ${offererUserName} was rejected: ${reason}`);

      //const name = getKeyByValue(nameToClientIDMap, message.offererClientID);

      // Remove the offer from the offers array
      //offers = offers.filter(offer => !(offer.offererUserName === offererUserName && offer.answererUserName === message.answererUserName));


      const offererSocket = connectedSockets.find(s => s.userName === offererUserName);

      if (offererSocket) {
        const offererSocketID = offererSocket.socketID
        io.to(offererSocketID).emit('rejectedClientOffer', { offererUserName, reason, answererUserName: message.answererUserName, answererClientID, offererClientID: message.offererClientID });
      }
      else {
        console.log("offererSocket not found - not in scene?")
      }


      const existingOffer = offers.find(offer => {
        offer.offererUserName === offererUserName
        //&& offer.answererUserName === answererUserName) 
        // ||
        // (offer.offererUserName === answererUserName && offer.answererUserName === offererUserName)
      });

      if (existingOffer) {
        removeOfferFromList(existingOffer.offererUserName, existingOffer.answererUserName)
        removeOfferTracking(existingOffer.offererUserName, existingOffer.answererUserName);
      }
    }

  });

  socket.on('roomCallClient', async (data) => {

    // data.clientToAdd, data.clientsAlreadyConnectedTo

    let socketIDSet = new Set();
    socketIDSet.add(socket.id);

    data.clientsAlreadyConnectedTo.forEach(userName => {

      console.log("CLIENTS IN REMOVE LIST" + userName)
      let socketInfo = connectedSockets.find(socket => socket.userName === userName);
      if (socketInfo) {
        socketIDSet.add(socketInfo.socketId);
      }
    });

    console.log("CLIENTS TO REMOVE FROM LIST" + socketIDSet.size)

    const sockets = await io.in(roomName).fetchSockets();
    console.log("NUMBER OF SOCKETS IN ROOM " + roomName + " " + sockets.length);

    // Create a new array that includes only the socket objects that are not in clientsAlreadyConnectedTo
    let socketsNotConnected = sockets.filter(s => !socketIDSet.has(s.id));
    console.log("NUMBER AFTER FILTER - NotConnected " + socketsNotConnected.length);

    for (const s of socketsNotConnected) {

      setTimeout(() => {

        //   let socketInfo = connectedSockets.find(socket => socket.socketId === s.id);
        // console.log("SENDING CLIENT :  " + clientToAdd + " to client: " + socketInfo.userName);
        io.to(s.id).emit('makeClientSendOffer', data.clientToAdd);


      }, 3000);


    }

  });



  socket.on('offerAnswered', (offer) => {
    console.log("OFFER ANSWERED+++++++++++++++++++++++++");
    // socket.broadcast.emit('removeOffer', offer);
  });




  socket.on('connectionEstablished', (data) => {

    removeOfferFromList(data.offererUserName, data.answererUserName)
    removeOfferTracking(data.offererUserName, data.answererUserName);

    // console.log("INFORM CLIENT OF ANSWER+++++++++++++++++++++++++");
    // io.to(data.answererSocketID).emit('informAnswered', { answererUserName: data.answererUserName, offererUserName: data.offererUserName });
    // attachIceCandidateListener(peerConnection, userName, false);
  })




  socket.on('newAnswer', async (data, ackFunction) => {
    console.log("ANSWER RESOLVE+++++++++++++++++++++++++");




    // Join the clients to the room
    const offererSocketObject = connectedSockets.find(client => client.userName === data.offer.offererUserName);
    // const answererSocketObject = connectedSockets.find(client => client.userName === offer.answererUserName);

    const offererSocket = io.sockets.sockets.get(data.offer.offererSocketID);//offererSocketObject.socketId);
    const answererSocket = io.sockets.sockets.get(data.offer.answererSocketID);//answererSocketObject.socketId);

    //offer.roomName = roomName;

    if (offererSocket) offererSocket.join(roomName);
    if (answererSocket) answererSocket.join(roomName);

    // Store the room name in the clients
    if (offererSocket) offererSocket.roomName = roomName;
    if (answererSocket) answererSocket.roomName = roomName;

    // Emit the room name to the clients
    if (offererSocket) offererSocket.emit('roomCreated', { roomName, nameToAdd: data.offer.answererUserName, socketID: data.offer.answererSocketID });

    if (answererSocket) answererSocket.emit('roomCreated', { roomName, nameToAdd: data.offer.offererUserName, socketID: data.offer.offererSocketID });




    const offerToUpdate = offers.find(o => o.offererUserName === data.offer.offererUserName)
    if (!offerToUpdate) {
      console.log("No OfferToUpdate")
      return;
    }

    offerToUpdate.answer = data.offer.answer
    offerToUpdate.answererUserName = data.offer.answererUserName
    offerToUpdate.isForSync = data.offer.isForSync
    offerToUpdate.offererUserName = data.offer.offererUserName

    // offerToUpdate.offer = data.offer.offer;

    ackFunction(data.offer)//.offerIceCandidates);

    io.to(offererSocketObject.socketId).emit('answerResponse', { offer: offerToUpdate, offererClientID: nameToClientIDMap.get(data.offer.answererUserName) }); //, otherClientsInRoom });//, roomName: roomName});

    // Process the answer...
    // removeOfferFromList(offer.offererUserName, offer.answererUserName)
    // removeOfferTracking(offer.offererUserName, offer.answererUserName);

  })


  let nameToDeviceType = new Map();

  socket.on('setDeviceType', ({ userName, deviceType }) => {

    nameToDeviceType.set(userName, deviceType);
    console.log("Device type set for " + userName + " " + deviceType);

  })

  socket.on('callClientFromServer', async ({ userName, sendToUserName, isForClientSync, restartIce }) => {


    sendToUserDeviceType = nameToDeviceType.get(sendToUserName);
    console.log("CALL CLIENT FROM SERVER+++++++++++++++++++++++++" + userName + " " + sendToUserName + " " + sendToUserDeviceType);
    socket.emit('receiveCallClientFromServer', { userName, sendToUserName, isForClientSync, restartIce, sendToUserDeviceType });

  });

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


  socket.on('sendCallEndedToServer', async (userName) => {
    // Forward the 'callEnded' event to all other clients in the room
    //socket.to(userName).emit('callEnded', nameToClientIDMap.get(userName));

    await socket.leave(roomName);

    let sockets = await io.in(roomName).fetchSockets();


    socket.broadcast.emit('callEnded', { clientID: nameToClientIDMap.get(userName), clientName: userName });

    // Check if only one socket is left in the room or if it's empty
    if (sockets.length <= 1) {
      // If the room is empty or has one remaining client, notify that client or perform a global action as needed
      socket.broadcast.emit('callEndedAndEmptyRoom'); // This will send to the remaining clients in the room
    }

    //else {
    // If there are more than one clients, notify others that a client has ended the call
    socket.broadcast.emit('callEnded', { clientID: nameToClientIDMap.get(userName), clientName: userName });
    // }


    // else
    // socket.broadcast.emit('callEnded', { clientID: nameToClientIDMap.get(userName), clientName: userName });


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




      //erase it because of null on answerOffer offer
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

      // if (offerInOffers.answererIceCandidates === undefined)
      //   offerInOffers.answererIceCandidates = [];

      // offerInOffers.answererIceCandidates.push(iceCandidate)

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

let ongoingOffers = {}; // Object to track ongoing offers


function shouldSendOffer(userA, userB) {
  const offerKeyForward = `${userA}-${userB}`;
  const offerKeyReverse = `${userB}-${userA}`;

  // Check for existence in either direction
  if (ongoingOffers[offerKeyForward] || ongoingOffers[offerKeyReverse]) {
    console.log(`Offer already exists between ${userA} and ${userB}`);
    return false;
  }

  // Mark this direction as having an ongoing offer
  ongoingOffers[offerKeyForward] = true;
  return true;
}

// Function to get all clients except for the specified client
function getOtherClients(excludedClientId) {
  return Object.entries(connectedSockets)
    .filter(([clientId]) => clientId !== excludedClientId)
    .map(([_, client]) => client.userName);
}


function removeOfferFromList(offererUserName, answererUserName) {
  offers = offers.filter(offer =>
    !(offer.offererUserName === offererUserName && offer.answererUserName === answererUserName));
}

function removeOfferTracking(offererUserName, answererUserName) {
  const offerKeyForward = `${offererUserName}-${answererUserName}`;
  const offerKeyReverse = `${answererUserName}-${offererUserName}`;

  delete ongoingOffers[offerKeyForward];
  delete ongoingOffers[offerKeyReverse];
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
