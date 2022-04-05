const net = require('net');

let host = 'ip-api.com';
let port = 80;

let requestBuffers = [Buffer.from([0x05, 0x01, 0x00, 0x03])];
let addrBuffer = Buffer.alloc(1 + host.length);
addrBuffer.writeUInt8(host.length);

addrBuffer.write(host, 1);
requestBuffers.push(addrBuffer);

let portBuffer = Buffer.alloc(2);
portBuffer.writeUint16BE(port);
requestBuffers.push(portBuffer);

let request = Buffer.concat(requestBuffers);

let http = `GET /json HTTP/1.1\nHost: ip-api.com\n\n`;
let httpBuffer = Buffer.from(http);

let state = 'init';

let socket = new net.Socket();
socket.on('data', (data) => {
  console.log(state, data.toJSON());
  if (state === 'connect') {
    socket.write(request);
    state = 'request';
  } else if (state === 'request') {
    console.log('request response', data.toJSON());
    socket.write(httpBuffer);
    state = 'resp';
  } else if (state === 'resp') {
    console.log(data.toString());
  }
});

socket.on('end', () => {
  console.log('end');
});

socket.on('connect', (err) => {
  socket.write(Buffer.from([0x05, 0x01, 0x00]));
  state = 'connect';
});

socket.on('error', (err) => {
  console.log(err);
});

socket.connect({ port: 1086, host: '127.0.0.1' }, () => {});
