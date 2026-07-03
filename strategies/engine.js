const { findBreakoutRetest } = require('./support-resistance');
const { getMarketStructure } = require('./structure');

function analyzeSymbol(candlesH4, candlesH1, candlesM15) {
  const setup = findBreakoutRetest(candlesH1, candlesM15);
  if (!setup || !setup.fresh) return null;

  const h4Structure = getMarketStructure(candlesH4);
  if (h4Structure.bias !== 'ranging' && h4Structure.bias !== setup.direction) {
    return null;
  }

  const direction = setup.direction;
  const entry = candlesM15[candlesM15.length - 1].close;
  const sl = setup.sl;
  const risk = Math.abs(entry - sl);
  const tp = direction === 'bullish' ? entry + risk * 2 : entry - risk * 2;

  const h4Aligned = h4Structure.bias === setup.direction;

  return {
    strategy: 'Breakout + Retest (S/R)',
    direction: direction,
    strength: setup.touches >= 3 ? 90 : h4Aligned ? 75 : 50,
    entry: entry,
    sl: sl,
    tp: tp,
    notes: [
      'Old ' + setup.originalRole + ' at ' + setup.level.toFixed(3) + ' broken (' + setup.touches + ' prior touches)',
      'Now acting as ' + setup.flippedRole + ' — retested & held',
      h4Aligned ? 'H4 trend agrees (' + h4Structure.bias + ')' : 'H4 trend neutral/ranging',
      'M15 entry trigger, SL beyond wick'
    ]
  };
}

module.exports = { analyzeSymbol };
