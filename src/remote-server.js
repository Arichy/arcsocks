const net = require('net');
const config = require('./remote-conf');

const STATE = {
  INIT: 0,
  RECEIVED_ADDR: 1,
  SENT_RESPONSE: 3,

  ERR: -1,
};

let count = 0;

const log = (id, ...msg) => {
  console.log(`id:${id} - `, ...msg);
};

const server = net.createServer((socket) => {
  let id = count++;

  let state = STATE.INIT;

  let desSocket = null;

  let cache = [];

  socket.on('data', (data) => {
    log(id, `[data received]`, `state:${state}, length:${data.length}`);

    switch (state) {
      case STATE.INIT:
        state = STATE.RECEIVED_ADDR;

        let addrLength = data[0];
        let addr = data.slice(1, 1 + addrLength).toString();
        let port = data.readUInt16BE(1 + addrLength);

        let headerLength = addrLength + 3;
        if (data.length > headerLength) {
          let buf = Buffer.alloc(data.length - headerLength);
          data.copy(buf, 0, headerLength);
          cache.push(buf);
        }

        desSocket = net.connect(port, addr, () => {
          state = STATE.SENT_RESPONSE;
          // log(id, 'connect to target server success');
          // log(id, 'cache length:', cache.length);

          for (let piece of cache) {
            // 清空缓存
            // log('cache buffer length:', piece.length);
            desSocket.write(piece);
          }
        });

        desSocket.on('data', (data) => {
          socket.write(data);
          // log(id, 'received from target server success', data.length);
        });

        desSocket.on('error', (err) => {});

        break;
      case STATE.RECEIVED_ADDR: // 此时还没有成功连接到目标服务器，所以先把 local 发来的数据缓存起来
        cache.push(data);
        break;
      case STATE.SENT_RESPONSE:
        desSocket.write(data);
        break;
    }
  });

  socket.on('error', (err) => {
    console.log('socket error:', err.message);
  });
});

server.listen(config.port, () => {
  console.log(`remote-server is listening on port ${config.port}`);
});
