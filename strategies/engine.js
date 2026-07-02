const { getMarketStructure } = require('./structure');
const { detectBreakoutRetest } = require('./support-resistance');
const { getLatestValidFVG } = require('./fvg');
const { getFreshCRT } = require('./crt');

function rr2(direction, entry, sl) {
  const risk = Math.abs(entry - sl);
  const tp = direction === 'bullish' ? entry + risk * 2 : entry - risk * 2;
  return { sl, tp };
}

// --- Strategy 1: Breakout + Retest on Support/Resistance ---
// H4 breakout+retest sets bias, H1 confirms same direction, M15 gives entry trigger.
function checkBreakoutRetest(candlesH4, candlesH1, candlesM15) {
  const h4 = detectBreakoutRetest(candlesH4);
  if (!h4) return null;

  let score = 25;
  const notes = [`H4 breakout+retest on ${h4.level.toFixed(3)} (${h4.direction})`];

  const h1 = detectBreakoutRetest(candlesH1);
  if (h1 && h1.direction === h4.direction) {
    score += 25;
    notes.push(`H1 confirms same-direction retest`);
  }

  const m15 = detectBreakoutRetest(candlesM15);
  if (m15 && m15.direction === h4.direction && m15.fresh) {
    score += 50; // fresh M15 trigger is the actual entry signal
    notes.push(`M15 fresh retest trigger — entry now`);
  } else if (m15 && m15.direction === h4.direction) {
    score += 25;
    notes.push(`M15 retest aligns but not fresh this candle`);
  }

  if (!m15 || !m15.fresh) return null; // only alert when M15 gives an actual fresh trigger

  const direction = h4.direction;
  const entry = candlesM15[candlesM15.length - 1].close;
  const { sl, tp } = rr2(direction, entry, h4.level);

  return { strategy: 'Breakout + Retest (S/R)', direction, strength: Math.min(score, 100), entry, sl, tp, notes };
}

// --- Strategy 2: Fair Value Gap (top-down) ---
// H4 FVG sets bias, H1 FVG same direction confirms, M15 fresh FVG = entry trigger.
function checkFVG(candlesH4, candlesH1, candlesM15) {
  const fvgH4 = getLatestValidFVG(candlesH4);
  if (!fvgH4) return null;

  let score = 25;
  const notes = [`H4 valid ${fvgH4.type} FVG`];

  const fvgH1 = getLatestValidFVG(candlesH1);
  if (fvgH1 && fvgH1.type === fvgH4.type) {
    score += 25;
    notes.push(`H1 confirms same-direction FVG`);
  }

  const fvgM15 = getLatestValidFVG(candlesM15);
  const freshM15 = fvgM15 && fvgM15.index === candlesM15.length - 1;
  if (fvgM15 && fvgM15.type === fvgH4.type && freshM15) {
    score += 50;
    notes.push(`M15 fresh ${fvgM15.type} FVG — entry now`);
  } else if (fvgM15 && fvgM15.type === fvgH4.type) {
    score += 25;
    notes.push(`M15 FVG aligns but not fresh this candle`);
  }

  if (!fvgM15 || fvgM15.type !== fvgH4.type || !freshM15) return null;

  const direction = fvgH4.type;
  const entry = candlesM15[candlesM15.length - 1].close;
  const slLevel = direction === 'bullish' ? fvgM15.bottom : fvgM15.top;
  const { sl, tp } = rr2(direction, entry, slLevel);

  return { strategy: 'Fair Value Gap (H4→H1→M15)', direction, strength: Math.min(score, 100), entry, sl, tp, notes };
}

// --- Strategy 3: Candle Range Theory (CRT) ---
// M15 fresh CRT reversal, weighted up if it aligns with H4/H1 structure bias.
function checkCRT(candlesH4, candlesH1, candlesM15) {
  const crt = getFreshCRT(candlesM15);
  if (!crt) return null;

  let score = 50; // base: fresh M15 CRT trigger is itself the entry
  const notes = [`Fresh M15 CRT ${crt.type} reversal (swept ${crt.sweepPrice.toFixed(3)})`];

  const structH4 = getMarketStructure(candlesH4);
  if (structH4.bias === crt.type) {
    score += 25;
    notes.push(`Aligns with H4 structure bias (${structH4.bias})`);
  }

  const structH1 = getMarketStructure(candlesH1);
  if (structH1.bias === crt.type) {
    score += 25;
    notes.push(`Aligns with H1 structure bias (${structH1.bias})`);
  }

  const direction = crt.type;
  const entry = candlesM15[candlesM15.length - 1].close;
  const { sl, tp } = rr2(direction, entry, crt.sweepPrice);

  return { strategy: 'Candle Range Theory (CRT)', direction, strength: Math.min(score, 100), entry, sl, tp, notes };
}

// Runs all 3 strategies. Priority order if multiple fire on the same scan:
// 1) Breakout+Retest  2) FVG  3) CRT — "whichever detects first" wins.
function analyzeSymbol(candlesH4, candlesH1, candlesM15) {
  return (
    checkBreakoutRetest(candlesH4, candlesH1, candlesM15) ||
    checkFVG(candlesH4, candlesH1, candlesM15) ||
    checkCRT(candlesH4, candlesH1, candlesM15) ||
    null
  );
}

module.exports = { analyzeSymbol };
