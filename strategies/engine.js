const { findBreakoutRetest } = require('./support-resistance');

function analyzeSymbol(candlesH1, candlesM15) {
  const setup = findBreakoutRetest(candlesH1, candlesM15);
  if (!setup || !setup.fresh) return null;

  const direction = setup.direction; // 'bullish' = buy, 'bearish' = sell
  const entry = candlesM15[candlesM15.length - 1].close;
  const sl = setup.level;
  const risk = Math.abs(entry - sl);
  const tp = direction === 'bullish' ? entry + risk * 2 : entry - risk * 2;

  return {
    strategy: 'Breakout + Retest (S/R)',
    direction,
    strength: setup.touches >= 2 ? 75 : 50,
    entry,
    sl,
    tp,
    notes: [
      `Old ${setup.originalRole} at ${sl.toFixed(3)} broken (${setup.touches} prior touch${setup.touches > 1 ? 'es' : ''})`,
      `Now acting as ${setup.flippedRole} — retested & held`,
      `M15 entry trigger`,
    ],
  };
}

module.exports = { analyzeSymbol };    checkBreakoutRetest(candlesH4, candlesH1, candlesM15) ||
    checkFVG(candlesH4, candlesH1, candlesM15) ||
    checkCRT(candlesH4, candlesH1, candlesM15) ||
    null
  );
}

module.exports = { analyzeSymbol };
