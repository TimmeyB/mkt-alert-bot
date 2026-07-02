// 3-candle FVG detection.
// Bullish FVG: candle1.high < candle3.low  (gap between them, candle2 is the impulse)
// Bearish FVG: candle1.low  > candle3.high

function findFVGs(candles) {
  const fvgs = []; // { type, top, bottom, index (of candle3) }
  for (let i = 2; i < candles.length; i++) {
    const c1 = candles[i - 2];
    const c3 = candles[i];

    if (c1.high < c3.low) {
      fvgs.push({ type: 'bullish', top: c3.low, bottom: c1.high, index: i });
    }
    if (c1.low > c3.high) {
      fvgs.push({ type: 'bearish', top: c1.low, bottom: c3.high, index: i });
    }
  }
  return fvgs;
}

// Checks if a given FVG (from a higher timeframe) is still "valid" (unfilled)
// on the current candle set, and hasn't been fully closed through.
function isFVGStillValid(fvg, candles) {
  const afterCandles = candles.slice(fvg.index + 1);
  for (const c of afterCandles) {
    if (fvg.type === 'bullish' && c.close < fvg.bottom) return false;
    if (fvg.type === 'bearish' && c.close > fvg.top) return false;
  }
  return true;
}

// Get the most recent unfilled FVG, if any
function getLatestValidFVG(candles) {
  const fvgs = findFVGs(candles);
  for (let i = fvgs.length - 1; i >= 0; i--) {
    if (isFVGStillValid(fvgs[i], candles)) return fvgs[i];
  }
  return null;
}

module.exports = { findFVGs, isFVGStillValid, getLatestValidFVG };
