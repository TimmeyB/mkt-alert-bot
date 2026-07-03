const { findBreakoutRetest, detectFreshBreakoutOnly } = require('./support-resistance');
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
  const reward = risk * 2;
  const tp = direction === 'bullish' ? entry + reward : entry - reward;
  const rrRatio = risk > 0 ? (reward / risk).toFixed(1) : '—';

  const h4Aligned = h4Structure.bias === setup.direction;

  const strength = Math.min(85, 30 + setup.touches * 10 + (h4Aligned ? 25 : 0));

  return {
    strategy: 'Breakout + Retest (S/R)',
    direction: direction,
    strength: strength,
    entry: entry,
    sl: sl,
    tp: tp,
    rr: '1:' + rrRatio,
    notes: [
      'Old ' + setup.originalRole + ' at ' + setup.level.toFixed(3) + ' broken (' + setup.touches + ' prior touches)',
      'Now acting as ' + setup.flippedRole + ' — retested & held',
      h4Aligned ? 'H4 trend agrees (' + h4Structure.bias + ')' : 'H4 trend neutral/ranging',
      'M15 entry trigger, SL beyond wick'
    ]
  };
}

function checkPendingBreakout(candlesH1, candlesM15) {
  return detectFreshBreakoutOnly(candlesH1, candlesM15);
}

module.exports = { analyzeSymbol, checkPendingBreakout };
