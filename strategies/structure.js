// Simple fractal-based swing detection + break of structure (BOS)

function findSwings(candles, lookback = 2) {
  const swings = []; // { type: 'high'|'low', price, index }
  for (let i = lookback; i < candles.length - lookback; i++) {
    const slice = candles.slice(i - lookback, i + lookback + 1);
    const current = candles[i];
    const isHigh = slice.every((c) => c.high <= current.high);
    const isLow = slice.every((c) => c.low >= current.low);
    if (isHigh) swings.push({ type: 'high', price: current.high, index: i });
    if (isLow) swings.push({ type: 'low', price: current.low, index: i });
  }
  return swings;
}

// Returns { bias: 'bullish'|'bearish'|'ranging', lastBOS: {price, index} | null }
function getMarketStructure(candles) {
  const swings = findSwings(candles);
  if (swings.length < 4) return { bias: 'ranging', lastBOS: null };

  const highs = swings.filter((s) => s.type === 'high');
  const lows = swings.filter((s) => s.type === 'low');
  if (highs.length < 2 || lows.length < 2) return { bias: 'ranging', lastBOS: null };

  const lastHigh = highs[highs.length - 1];
  const prevHigh = highs[highs.length - 2];
  const lastLow = lows[lows.length - 1];
  const prevLow = lows[lows.length - 2];

  const higherHighs = lastHigh.price > prevHigh.price;
  const higherLows = lastLow.price > prevLow.price;
  const lowerHighs = lastHigh.price < prevHigh.price;
  const lowerLows = lastLow.price < prevLow.price;

  const price = candles[candles.length - 1].close;

  // bullish BOS: price breaks above last swing high in an uptrend context
  if (higherHighs && higherLows && price > lastHigh.price) {
    return { bias: 'bullish', lastBOS: lastHigh };
  }
  // bearish BOS: price breaks below last swing low in a downtrend context
  if (lowerHighs && lowerLows && price < lastLow.price) {
    return { bias: 'bearish', lastBOS: lastLow };
  }
  if (higherHighs && higherLows) return { bias: 'bullish', lastBOS: null };
  if (lowerHighs && lowerLows) return { bias: 'bearish', lastBOS: null };

  return { bias: 'ranging', lastBOS: null };
}

module.exports = { getMarketStructure, findSwings };
