const { findSwings } = require('./structure');

// Cluster swing highs/lows into S/R levels (merge levels within tolerance %)
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
      existing.price = (existing.price + s.price) / 2; // refine
      existing.lastIndex = s.index;
    } else {
      levels.push({ type, price: s.price, touches: 1, lastIndex: s.index });
    }
  }
  return levels;
}

// Finds a fresh breakout: latest candle closes beyond a known S/R level
function findFreshBreakout(candles) {
  const levels = findSRLevels(candles.slice(0, -1)); // levels formed before the last candle
  const last = candles[candles.length - 1];

  for (const level of levels) {
    if (level.type === 'resistance' && last.close > level.price) {
      return { direction: 'bullish', level: level.price, breakIndex: candles.length - 1 };
    }
    if (level.type === 'support' && last.close < level.price) {
      return { direction: 'bearish', level: level.price, breakIndex: candles.length - 1 };
    }
  }
  return null;
}

// Given a broken level + direction, scan forward for a valid retest:
// price returns close to the level and rejects (wick back in breakout direction)
function findRetest(candles, breakout, tolerancePct = 0.1) {
  if (!breakout) return null;
  const { level, direction, breakIndex } = breakout;

  for (let i = breakIndex + 1; i < candles.length; i++) {
    const c = candles[i];
    const nearLevel = Math.abs(c.low - level) / level * 100 < tolerancePct
      || Math.abs(c.high - level) / level * 100 < tolerancePct;

    if (!nearLevel) continue;

    const rejected = direction === 'bullish' ? c.close > level : c.close < level;
    if (rejected) {
      return { ...breakout, retestIndex: i, fresh: i === candles.length - 1 };
    }
  }
  return null;
}

// Full pipeline: breakout then retest on a single timeframe's candles
function detectBreakoutRetest(candles) {
  const breakout = findFreshBreakoutOrRecent(candles);
  if (!breakout) return null;
  return findRetest(candles, breakout);
}

// Looks a bit further back than just the very last candle, so retest has time to form
function findFreshBreakoutOrRecent(candles, lookback = 15) {
  for (let end = candles.length; end > candles.length - lookback && end > 3; end--) {
    const slice = candles.slice(0, end);
    const b = findFreshBreakout(slice);
    if (b) return { ...b, breakIndex: end - 1 };
  }
  return null;
}

module.exports = { findSRLevels, findFreshBreakout, findRetest, detectBreakoutRetest };
