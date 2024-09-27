const net = require('net');
const config = require('./local-conf');

const server = net.createServer(socket => {
  socket.once('data', data => {
    if (data[0] !== 0x05) {
      console.log('Invalid socks version');
      socket.end(Buffer.from([0x05, 0xff]));
      return;
    }

    socket.write(Buffer.from([0x05, 0x00]));
    const remote = net.connect(config.remotePort, config.remoteServer, () => {
      socket.write(Buffer.from([0x05, 0x00, 0x00, 0x01, 0, 0, 0, 0, 0, 0]));
    });
    remote.on('error', err => {
      socket.end();
    });
    socket.pipe(remote).pipe(socket);
    remote.on('close', () => {
      socket.end();
    });
  });
  socket.on('error', () => {});
});

server.listen(config.port, () => {
  console.log(`local-server is listening on port ${config.port}`);
});
