const net = require('net');
const config = require('./remote-conf');

const server = net.createServer(socket => {
  socket.once('data', data => {
    const [ip, port, rest] = (() => {
      switch (data[3]) {
        case 0x01:
          return [data.subarray(4, 8).join('.'), data.readUInt16BE(8), data.subarray(10)];
        case 0x03:
          const len = data[4];
          return [data.subarray(5, 5 + len).toString('utf-8'), data.readUInt16BE(5 + len), data.subarray(7 + len)];
        case 0x04:
          return [data.subarray(4, 20).join(':'), data.readUInt16BE(20), data.subarray(22)];
        default:
          return [null, null, null];
      }
    })();

    console.log(`Connection to ${ip}:${port}`);

    const remote = net.connect(port, ip);
    remote.pipe(socket).pipe(remote);
    remote.write(rest);
    remote.on('error', err => {
      socket.end();
    });
    remote.on('close', () => {
      socket.end();
    });
  });
  socket.on('error', () => {});
});

server.listen(config.port, () => {
  console.log(`remote-server is listening on port ${config.port}`);
});
