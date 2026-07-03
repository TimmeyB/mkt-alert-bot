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

  return removeChoppyLevels(levels);
}

function removeChoppyLevels(levels, minGapPct = 0.15) {
  const bad = new Set();
  for (let i = 0; i < levels.length; i++) {
    for (let j = 0; j < levels.length; j++) {
      if (i === j || levels[i].type === levels[j].type) continue;
      const gapPct = Math.abs(levels[i].price - levels[j].price) / levels[i].price * 100;
      if (gapPct < minGapPct) {
        bad.add(i);
        bad.add(j);
      }
    }
  }
  return levels.filter((_, idx) => !bad.has(idx));
}

function detectFreshBreakoutOnly(higherTFCandles, lowerTFCandles, minTouches) {
  const mt = minTouches || 2;
  const levels = findSRLevels(higherTFCandles).filter((l) => l.touches >= mt);
  if (!levels.length || lowerTFCandles.length < 2) return null;

  const last = lowerTFCandles[lowerTFCandles.length - 1];
  const prev = lowerTFCandles[lowerTFCandles.length - 2];

  for (const level of levels) {
    if (level.type === 'resistance' && prev.close <= level.price && last.close > level.price) {
      return { direction: 'bullish', level: level.price, originalRole: 'resistance', flippedRole: 'support', touches: level.touches };
    }
    if (level.type === 'support' && prev.close >= level.price && last.close < level.price) {
      return { direction: 'bearish', level: level.price, originalRole: 'support', flippedRole: 'resistance', touches: level.touches };
    }
  }
  return null;
}

function findBreakoutRetest(higherTFCandles, lowerTFCandles, options) {
  const opts = options || {};
  const retestTolerancePct = opts.retestTolerancePct || 0.05;
  const minTouches = opts.minTouches || 2;
  const lookbackCandles = opts.lookbackCandles || 40;
  const minClosebufferPct = opts.minCloseBufferPct || 0.02;
  const slBufferPct = opts.slBufferPct || 0.03;

  const allLevels = findSRLevels(higherTFCandles);
  const levels = allLevels.filter((l) => l.touches >= minTouches);
  if (!levels.length) return null;

  const recent = lowerTFCandles.slice(-lookbackCandles);
  const offset = lowerTFCandles.length - recent.length;

  let activeBreakout = null;

  for (let i = 1; i < recent.length; i++) {
    const c = recent[i];

    if (!activeBreakout) {
      for (const level of levels) {
        if (level.type === 'resistance' && c.close > level.price) {
          activeBreakout = {
            direction: 'bullish',
            level: level.price,
            originalRole: 'resistance',
            flippedRole: 'support',
            breakIndex: offset + i,
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
            breakIndex: offset + i,
            touches: level.touches,
          };
          break;
        }
      }
      continue;
    }

    const wickTouchedLevel =
      activeBreakout.direction === 'bullish'
        ? Math.abs(c.low - activeBreakout.level) / activeBreakout.level * 100 < retestTolerancePct
        : Math.abs(c.high - activeBreakout.level) / activeBreakout.level * 100 < retestTolerancePct;

    if (wickTouchedLevel) {
      const closeBuffer = activeBreakout.level * (minClosebufferPct / 100);
      const held =
        activeBreakout.direction === 'bullish'
          ? c.close > activeBreakout.level + closeBuffer
          : c.close < activeBreakout.level - closeBuffer;

      if (held) {
        const slBuffer = activeBreakout.level * (slBufferPct / 100);
        const sl =
          activeBreakout.direction === 'bullish' ? c.low - slBuffer : c.high + slBuffer;

        return {
          ...activeBreakout,
          retestIndex: offset + i,
          fresh: offset + i === lowerTFCandles.length - 1,
          sl: sl,
        };
      }

      const reclaimed =
        activeBreakout.direction === 'bullish' ? c.close < activeBreakout.level : c.close > activeBreakout.level;
      if (reclaimed) activeBreakout = null;
    }
  }

  return null;
}

module.exports = { findSRLevels, findBreakoutRetest, detectFreshBreakoutOnly };
