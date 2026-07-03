module.exports = {
  // Deriv symbol codes (verify these via the "active_symbols" API call if alerts look wrong)
  SYMBOLS: {
    USDJPY: 'frxUSDJPY',
    GOLD: 'frxXAUUSD',
    // USOIL: dropped for now, symbol code TBD
  },

  // granularity in seconds: 900=15m, 3600=1h, 14400=4h
  TIMEFRAMES: {
    H4: 14400,
    H1: 3600,
    M15: 900,
  },

  CANDLE_COUNT: 300, // how many candles to pull per timeframe

  // Below this %, alert still fires but flagged as low confidence
  MIN_ALERT_STRENGTH: 50,

  // How often (ms) to re-scan the market for new setups
  SCAN_INTERVAL_MS: 60 * 1000, // every 1 min

  DERIV_WS_URL: 'wss://ws.derivws.com/websockets/v3?app_id=1089',
};
