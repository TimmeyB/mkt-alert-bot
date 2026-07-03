require('dotenv').config();
const { connect, getCandles } = require('./deriv');
const { initTelegram, sendSignal, sendStatus } = require('./telegram');
const { analyzeSymbol } = require('./strategies/engine');
const { SYMBOLS, TIMEFRAMES, SCAN_INTERVAL_MS } = require('./config');

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) {
  console.error('Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in .env');
  process.exit(1);
}

const lastAlerted = new Map();

async function scanSymbol(label, symbol) {
  try {
    const [h4, h1, m15] = await Promise.all([
      getCandles(symbol, TIMEFRAMES.H4),
      getCandles(symbol, TIMEFRAMES.H1),
      getCandles(symbol, TIMEFRAMES.M15),
    ]);

    const signal = analyzeSymbol(h4, h1, m15);
    if (!signal) return;

    const currentEpoch = m15[m15.length - 1].epoch;
    const key = symbol;
    if (lastAlerted.get(key) === currentEpoch) return;

    lastAlerted.set(key, currentEpoch);
    console.log('[signal] ' + label + ': ' + signal.direction + ' @ ' + signal.strength + '%');
    await sendSignal(label, signal);
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
