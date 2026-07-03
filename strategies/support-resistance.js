const { findSwings } = require('./structure');

function findSRLevels(candles, tolerancePct = 0.05) {
  const swings = findSwings(candles);
  const levels = [];

  for (const s of swings) {
    const type = s.type === 'high' ? 'resistance' : 'support';
    const existing = levels.find(
      (l) => l.type === type && Math.abs(l.price - s.price) / s.price * 100 < tolerancePct
    );
    if (existing) {
      existing.touches += 1;
      existing.price = (existing.price + s.price) / 2;
      existing.lastIndex = s.index;
    } else {
      levels.push({ type, price: s.price, touches: 1, lastIndex: s.index });
    }
  }
  return levels;
}

function findBreakoutRetest(higherTFCandles, lowerTFCandles, retestTolerancePct = 0.1) {
  const levels = findSRLevels(higherTFCandles);
  if (!levels.length) return null;

  let activeBreakout = null;

  for (let i = 1; i < lowerTFCandles.length; i++) {
    const c = lowerTFCandles[i];

    if (!activeBreakout) {
      for (const level of levels) {
        if (level.type === 'resistance' && c.close > level.price) {
          activeBreakout = {
            direction: 'bullish',
            level: level.price,
            originalRole: 'resistance',
            flippedRole: 'support',
            breakIndex: i,
            touches: level.touches,
          };
          break;
        }
        if (level.type === 'support' && c.close < level.price) {
          activeBreakout = {
            direction: 'bearish',
            level: level.price,
            originalRole: 'support',
            flippedRole: 'resistance',
            breakIndex: i,
            touches: level.touches,
          };
          break;
        }
      }
      continue;
    }

    const nearLevel =
      Math.abs(c.low - activeBreakout.level) / activeBreakout.level * 100 < retestTolerancePct ||
      Math.abs(c.high - activeBreakout.level) / activeBreakout.level * 100 < retestTolerancePct;

    if (nearLevel) {
      const held =
        activeBreakout.direction === 'bullish' ? c.close > activeBreakout.level : c.close < activeBreakout.level;
      if (held) {
        return { ...activeBreakout, retestIndex: i, fresh: i === lowerTFCandles.length - 1 };
      }
      const reclaimed =
        activeBreakout.direction === 'bullish' ? c.close < activeBreakout.level : c.close > activeBreakout.level;
      if (reclaimed) activeBreakout = null;
    }
  }

  return null;
}

module.exports = { findSRLevels, findBreakoutRetest };
