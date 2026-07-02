const WebSocket = require('ws');
const { DERIV_WS_URL, CANDLE_COUNT } = require('./config');

let ws;
let reqId = 1;
const pending = new Map();

function connect() {
  return new Promise((resolve, reject) => {
    ws = new WebSocket(DERIV_WS_URL);

    ws.on('open', () => {
      console.log('[deriv] connected');
      resolve();
    });

    ws.on('message', (raw) => {
      const msg = JSON.parse(raw);
      if (msg.req_id && pending.has(msg.req_id)) {
        const { resolve: res, reject: rej } = pending.get(msg.req_id);
        pending.delete(msg.req_id);
        if (msg.error) rej(new Error(msg.error.message));
        else res(msg);
      }
    });

    ws.on('close', () => {
      console.log('[deriv] disconnected, reconnecting in 5s...');
      setTimeout(connect, 5000);
    });

    ws.on('error', (err) => {
      console.error('[deriv] ws error', err.message);
      reject(err);
    });
  });
}

function send(payload) {
  return new Promise((resolve, reject) => {
    const id = reqId++;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ ...payload, req_id: id }));
    // safety timeout
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error('Deriv request timed out'));
      }
    }, 15000);
  });
}

// Returns array of candles: { open, high, low, close, epoch }
async function getCandles(symbol, granularity, count = CANDLE_COUNT) {
  const res = await send({
    ticks_history: symbol,
    adjust_start_time: 1,
    count,
    end: 'latest',
    start: 1,
    style: 'candles',
    granularity,
  });
  return res.candles.map((c) => ({
    open: parseFloat(c.open),
    high: parseFloat(c.high),
    low: parseFloat(c.low),
    close: parseFloat(c.close),
    epoch: c.epoch,
  }));
}

module.exports = { connect, getCandles };
