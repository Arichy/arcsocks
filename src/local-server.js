const net = require('net');
const { SmartBuffer } = require('smart-buffer');

const config = require('./local-conf');

const STATE = {
  INIT: 0,
  SENT_FIRST_HANDSHAKE_RESPONSE: 1,
  SENT_CONNECT_RESPONSE: 2,
  SENT_RESPONSE: 3,
  ERR: -1,
};

const log = (id, ...msg) => {
  console.log(`id:${id} - `, ...msg);
};

let count = 0;

const server = net.createServer((socket) => {
  let id = count++;

  let state = STATE.INIT;

  const closeSocket = () => {
    socket.destroy();
    state = STATE.ERR;
  };

  let remoteSocket = new net.Socket();

  let addrType, remoteAddr, remotePort, addrLength;

  socket.on('data', (data) => {
    log(id, `[data received]`, `state:${state}, length:${data.length}`);
    switch (state) {
      case STATE.INIT:
        let version = data.readUInt8(0);
        if (version !== 5) {
          closeSocket();
          return;
        }
        socket.write(Buffer.from([0x05, 0x00]));
        state = STATE.SENT_FIRST_HANDSHAKE_RESPONSE;
        break;
      case STATE.SENT_FIRST_HANDSHAKE_RESPONSE:
        let cmd = data.readUInt8(1);
        if (cmd !== 1) {
          // 只支持 CONNECT
          Buffer.from([
            0x05, 0x07, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          ]);
          closeSocket();
          return;
        }
        addrType = data.readUInt8(3);
        if (addrType === 4) {
          // 不支持 ipv6
          socket.write(
            Buffer.from([
              0x05, 0x08, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            ])
          );
          closeSocket();
          return;
        }

        if (addrType === 3) {
          // domain
          addrLength = data.readUInt8(4);
          remoteAddr = data.slice(5, 5 + addrLength).toString();
          remotePort = data.readUInt16BE(data.length - 2);
        } else if (addrType === 1) {
          // ipv4
          remoteAddr = data.slice(4, 8).join('.');
          remotePort = data.readUInt16BE(data.length - 2);
        }

        // log(id, 'connect to remote');
        remoteSocket = net.connect(config.remotePort, config.remoteServer);
        remoteSocket.on('connect', () => {
          state = STATE.SENT_CONNECT_RESPONSE;

          socket.write(
            Buffer.from([
              0x05, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            ])
          );

          // 目标服务器的地址和端口
          let targetInfo = new SmartBuffer();
          targetInfo.writeUInt8(remoteAddr.length); // 先写入地址的长度
          targetInfo.writeString(remoteAddr); // 再写入地址
          targetInfo.writeUInt16BE(remotePort); // 再写入端口

          // log(id, 'ready to send targetInfo', buf.toBuffer().length);

          // socket.pause();

          remoteSocket.write(targetInfo.toBuffer(), () => {
            // log(id, 'success send addr to remote');
            // socket.resume();
          });
        });

        remoteSocket.on('data', (data) => {
          // log(id, 'get data from remote server:', data.length);
          socket.write(data); // 发送给客户端
          state = STATE.SENT_RESPONSE;
        });

        remoteSocket.on('error', () => {
          socket.write(
            Buffer.from([
              0x05, 0x04, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            ])
          );
          closeSocket();
        });
        break;
      case STATE.SENT_CONNECT_RESPONSE: // 发送完最后一个 socks5 resposne，现在传来的 data 是 client 需要发给 target 的真实数据
      case STATE.SENT_RESPONSE: // 发送完一个 target -> remote -> local 的数据，现在传来的 data 是 client 需要发给 target 的真实数据
        // log(id, 'req from client:', data.length);

        remoteSocket.write(data); // 发送给远程服务器

        break;
    }
  });

  socket.on('error', (err) => {
    console.log('socket error:', err.message);
  });

  remoteSocket.on('error', (err) => {
    console.log('remoteSocket error:', err.message);
  });
});

server.listen(config.port, () => {
  console.log(`local-server is listening on port ${config.port}`);
});
