const net = require('net');
const { SmartBuffer } = require('smart-buffer');

const port = process.argv[2];

const server = net.createServer((socket) => {
  console.log('new socket created');
  socket.once('data', (data) => {
    const { remoteAddress, remotePort } = socket;

    console.log(`received connect request from ${remoteAddress}:${remotePort}`);

    console.log('start first handshake');
    // 版本不为5
    if (!data || data[0] !== 0x05) {
      console.log('err1');
      return socket.destroy();
    }

    socket.write(Buffer.from([0x05, 0x00]), (err) => {
      if (err) {
        console.log('err2', err);
        return socket.destroy();
      }

      console.log('finish first handshake');

      socket.once('data', (data) => {
        if (data.length < 7 || data[1] !== 0x01) {
          console.log('err3');
          return socket.destroy();
        }

        console.log('start handle request');

        let addrType = data[3];
        let remoteAddr;
        let remotePort;

        if (addrType === 0x03) {
          // domain
          let addrLength = data[4];
          remoteAddr = data.slice(5, 5 + addrLength).toString();
          remotePort = data.readUInt16BE(data.length - 2);
        } else if (addrType === 0x01) {
          // ipv4
          remoteAddr = data.slice(4, 8).join('.');
          remotePort = data.readUInt16BE(data.length - 2);
        } else {
          // ipv6
          console.log('err4');
          socket.write(
            Buffer.from([
              0x05, 0x08, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            ])
          );
          return;
        }

        console.log(
          `start connecting to target server:${remoteAddr}:${remotePort}`
        );

        const remote = net.createConnection(
          {
            host: remoteAddr,
            port: remotePort,
            host: '127.0.0.1',
            port: 3002,
          },
          () => {
            console.log('connecting to target server success');

            socket.write(
              Buffer.from([
                0x05, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
              ]),
              (err) => {
                if (err) {
                  console.log('err5', err);
                  return socket.destroy();
                }

                remote.on('data', (data) => {
                  console.log('get res from remote', data.toString());
                });
                // console.log(`connecting ${remoteAddr}:${remotePort}`);

                socket.on('data', (data) => {
                  console.log('get request from client:');
                });

                let buffer = new SmartBuffer();
                let addrStringLength = remoteAddr.length;

                buffer.writeUInt8(addrStringLength);
                buffer.writeString(remoteAddr);
                buffer.writeUInt16BE(remotePort);
                remote.write(
                  JSON.stringify({
                    type: 'addr',
                    addr: remoteAddr,
                    port: remotePort,
                  })
                );

                // socket.pipe(remote);
                // remote.pipe(socket);
                socket.on('data', (data) => {
                  // buffer.writeBuffer(data);
                  // console.log({ remoteAddr, remotePort });
                  // let newBuf = buffer.toBuffer(); // length 1 2 3 p1 p2

                  remote.write(data);
                });
                remote.on('data', (data) => socket.write(data));
              }
            );
          }
        );

        remote.on('error', (err) => {
          console.log(
            `连接${remoteAddr}:${remotePort}失败，错误信息：${err.message}`
          );
          remote.destroy();
          socket.destroy();
        });
      });
    });
  });

  socket.on('error', (err) => {
    console.log('err6', err.message);
  });

  socket.on('end', () => {
    console.log(`end from ${socket.remoteAddress}:${socket.remotePort}`);
  });
});

server.listen(port, () => {
  console.log(`server listening on ${port}`);
});
