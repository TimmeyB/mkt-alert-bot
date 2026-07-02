// Candle Range Theory (CRT):
// Candle 1 = "range" candle, sets a high/low.
// Candle 2 = "manipulation" candle, sweeps beyond candle1's high or low (liquidity grab).
// Candle 3 = "confirmation" candle, closes back inside candle1's range -> reversal signal
// in the OPPOSITE direction of the sweep.

function findCRT(candles) {
  const setups = [];
  for (let i = 2; i < candles.length; i++) {
    const c1 = candles[i - 2];
    const c2 = candles[i - 1];
    const c3 = candles[i];

    const sweptHigh = c2.high > c1.high;
    const sweptLow = c2.low < c1.low;
    const closedInsideRange = c3.close <= c1.high && c3.close >= c1.low;

    // Swept the high, then closed back inside/below -> bearish reversal
    if (sweptHigh && !sweptLow && closedInsideRange && c3.close < c2.close) {
      setups.push({
        type: 'bearish',
        rangeHigh: c1.high,
        rangeLow: c1.low,
        sweepPrice: c2.high,
        index: i,
      });
    }

    // Swept the low, then closed back inside/above -> bullish reversal
    if (sweptLow && !sweptHigh && closedInsideRange && c3.close > c2.close) {
      setups.push({
        type: 'bullish',
        rangeHigh: c1.high,
        rangeLow: c1.low,
        sweepPrice: c2.low,
        index: i,
      });
    }
  }
  return setups;
}

// Only care if the most recent candle is the confirmation candle (fresh signal)
function getFreshCRT(candles) {
  const setups = findCRT(candles);
  if (!setups.length) return null;
  const last = setups[setups.length - 1];
  if (last.index === candles.length - 1) return last;
  return null;
}

module.exports = { findCRT, getFreshCRT };
