const { findBreakoutRetest } = require('./support-resistance');

function analyzeSymbol(candlesH1, candlesM15) {
  const setup = findBreakoutRetest(candlesH1, candlesM15);
  if (!setup || !setup.fresh) return null;

  const direction = setup.direction;
  const entry = candlesM15[candlesM15.length - 1].close;
  const sl = setup.level;
  const risk = Math.abs(entry - sl);
  const tp = direction === 'bullish' ? entry + risk * 2 : entry - risk * 2;

  return {
    strategy: 'Breakout + Retest (S/R)',
    direction: direction,
    strength: setup.touches >= 2 ? 75 : 50,
    entry: entry,
    sl: sl,
    tp: tp,
    notes: [
      'Old ' + setup.originalRole + ' at ' + sl.toFixed(3) + ' broken (' + setup.touches + ' prior touches)',
      'Now acting as ' + setup.flippedRole + ' — retested & held',
      'M15 entry trigger'
    ]
  };
}

module.exports = { analyzeSymbol };
