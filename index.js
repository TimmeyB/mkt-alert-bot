require('dotenv').config();
const { connect, getCandles } = require('./deriv');
const { initTelegram, sendSignal, sendPendingBreakout, sendStatus } = require('./telegram');
const { analyzeSymbol, checkPendingBreakout } = require('./strategies/engine');
const { SYMBOLS, TIMEFRAMES, SCAN_INTERVAL_MS } = require('./config');

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) {
  console.error('Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in .env');
  process.exit(1);
}

const lastSignalAlerted = new Map();
const lastBreakoutAlerted = new Map();

async function scanSymbol(label, symbol) {
  try {
    const [h4, h1, m15] = await Promise.all([
      getCandles(symbol, TIMEFRAMES.H4),
      getCandles(symbol, TIMEFRAMES.H1),
      getCandles(symbol, TIMEFRAMES.M15),
    ]);

    const signal = analyzeSymbol(h4, h1, m15);
    if (signal) {
      const currentEpoch = m15[m15.length - 1].epoch;
      if (lastSignalAlerted.get(symbol) !== currentEpoch) {
        lastSignalAlerted.set(symbol, currentEpoch);
        console.log('[signal] ' + label + ': ' + signal.direction + ' @ ' + signal.strength + '% (R:R ' + signal.rr + ')');
        await sendSignal(label, signal);
      }
      return;
    }

    const pending = checkPendingBreakout(h1, m15);
    if (pending) {
      const key = pending.direction + ':' + pending.level.toFixed(3);
      if (lastBreakoutAlerted.get(symbol) !== key) {
        lastBreakoutAlerted.set(symbol, key);
        console.log('[breakout] ' + label + ': ' + pending.direction + ' broke ' + pending.originalRole + ' at ' + pending.level.toFixed(3));
        await sendPendingBreakout(label, pending);
      }
    }
  } catch (err) {
    console.error('[scan] ' + label + ' error:', err.message);
  }
}

async function scanAll() {
  for (const [label, symbol] of Object.entries(SYMBOLS)) {
    await scanSymbol(label, symbol);
  }
}

async function main() {
  initTelegram(TELEGRAM_TOKEN, TELEGRAM_CHAT_ID);
  await connect();
  await sendStatus('🤖 Signal bot is live. Monitoring USDJPY and Gold (Breakout + Retest, S/R).');

  await scanAll();
  setInterval(scanAll, SCAN_INTERVAL_MS);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
