const net = require('net');

// const port = process.argv[2];

const STATE = {
  INIT: 0,
  SENT_FIRST_HANDSHAKE_REQUEST: 1,
  RECEIVED_FIRST_HANDSHAKE_RESPONSE: 2,
  SENT_CONNECT_REQUEST: 3,
  RECEIVED_CONNECT_RESPONSE: 4,
  SENT_REQUEST: 5,
  RECEIVED_RESPONSE: 6,
};

const socket = new net.Socket();

socket.on('data', (data) => {});
