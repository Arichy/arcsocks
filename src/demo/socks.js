const { SocksClient } = require('socks');

(async () => {
  const info = await SocksClient.createConnection({
    proxy: {
      host: '127.0.0.1',
      port: 1086,
      type: 5,
    },
    command: 'connect',
    destination: {
      host: 'ip-api.com',
      port: 80,
    },
  });

  let http = `GET /json HTTP/1.1\nHost: ip-api.com\n\n`;

  info.socket.write(Buffer.from(http), (err) => {
    info.socket.once('data', (data) => {
      console.log(data.toString());
    });
  });

  info.socket.on('data', (data) => {
    console.log(data.toString());
  });

  info.socket.on('close', () => {
    console.log('close');
  });

  info.socket.on('error', (err) => {
    console.log(err);
  });

  info.socket.on('timeout', () => {
    console.log('timeout');
  });
})();
