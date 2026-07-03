const TelegramBot = require('node-telegram-bot-api');
const { MIN_ALERT_STRENGTH } = require('./config');

let bot;
let chatId;

function initTelegram(token, chat) {
  bot = new TelegramBot(token, { polling: false });
  chatId = chat;
}

function fmt(price) {
  return typeof price === 'number' ? price.toFixed(3) : price;
}

async function sendSignal(symbolLabel, signal) {
  const weak = signal.strength < MIN_ALERT_STRENGTH;
  const dirEmoji = signal.direction === 'bullish' ? '🟢 BUY' : '🔴 SELL';

  let msg = '';
  if (weak) {
    msg += '⚠️⚠️ *LOW CONFIDENCE SETUP — GO CHECK MANUALLY* ⚠️⚠️\n\n';
  }
  msg += '*' + symbolLabel + '* — ' + signal.strategy + '\n';
  msg += dirEmoji + '  |  Strength: *' + signal.strength + '%*  |  R:R ' + signal.rr + '\n\n';
  msg += 'Entry: `' + fmt(signal.entry) + '`\n';
  msg += 'SL: `' + fmt(signal.sl) + '`\n';
  msg += 'TP: `' + fmt(signal.tp) + '`\n\n';
  msg += signal.notes.map((n) => '• ' + n).join('\n');

  await bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
}

async function sendPendingBreakout(symbolLabel, breakout) {
  const dirEmoji = breakout.direction === 'bullish' ? '🟢' : '🔴';
  let msg = '';
  msg += '👀 *' + symbolLabel + '* — Breakout detected\n';
  msg += dirEmoji + ' Broke ' + breakout.originalRole + ' at `' + fmt(breakout.level) + '`';
  msg += ' (' + breakout.touches + ' prior touches)\n';
  msg += 'Now watching for a retest as ' + breakout.flippedRole + ' before entry...';

  await bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
}

async function sendStatus(text) {
  if (!bot) return;
  await bot.sendMessage(chatId, text);
}

module.exports = { initTelegram, sendSignal, sendPendingBreakout, sendStatus };
