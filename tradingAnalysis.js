// Trading analysis module using HyperLiquid API
const axios = require('axios');

const HYPERLIQUID_API = 'https://api.hyperliquid.xyz/info';

async function getTradingAnalysis(symbol, timeframe = '1h') {
  try {
    // Convert symbol to HyperLiquid format (e.g., BTC-PERP -> BTC)
    const coin = symbol.replace('-PERP-INTX', '').replace('-PERP', '').replace('-USD', '');
    
    // Get current market data
    const metaResponse = await axios.post(HYPERLIQUID_API, {
      type: 'metaAndAssetCtxs'
    });
    
    const [meta, contexts] = metaResponse.data;
    const coinIndex = meta.universe.findIndex(u => u.name === coin);
    
    if (coinIndex === -1) {
      return { error: `Symbol ${symbol} not found on HyperLiquid` };
    }
    
    const ctx = contexts[coinIndex];
    const markPrice = parseFloat(ctx.markPx);
    const funding = parseFloat(ctx.funding);
    const openInterest = parseFloat(ctx.openInterest);
    const volume24h = parseFloat(ctx.dayNtlVlm);
    
    // Get candles for technical analysis
    const now = Date.now();
    const intervalMs = timeframe === '1h' ? 3600000 : timeframe === '4h' ? 14400000 : 86400000;
    const lookback = 50;
    const startTime = now - (intervalMs * lookback);
    
    const candlesResponse = await axios.post(HYPERLIQUID_API, {
      type: 'candleSnapshot',
      req: {
        coin: coin,
        interval: timeframe,
        startTime: startTime,
        endTime: now
      }
    });
    
    const candles = candlesResponse.data;
    
    if (!candles || candles.length < 20) {
      return { 
        symbol,
        timeframe,
        error: 'Insufficient candle data',
        currentPrice: markPrice,
        fundingRate: funding,
        openInterest,
        volume24h
      };
    }
    
    // Calculate EMA20
    const closes = candles.map(c => parseFloat(c.c));
    const ema20 = calculateEMA(closes, 20);
    
    // Calculate support/resistance (simple method)
    const lows = candles.map(c => parseFloat(c.l));
    const highs = candles.map(c => parseFloat(c.h));
    const support = Math.min(...lows.slice(-20));
    const resistance = Math.max(...highs.slice(-20));
    
    // Determine trend
    const priceVsEMA = ((markPrice - ema20) / ema20) * 100;
    let trend = 'neutral';
    let recommendation = 'Wait';
    
    if (priceVsEMA > 2) {
      trend = 'bullish';
      recommendation = markPrice > resistance * 0.98 ? 'Consider long on pullback' : 'Wait for breakout';
    } else if (priceVsEMA < -2) {
      trend = 'bearish';
      recommendation = markPrice < support * 1.02 ? 'Consider short on bounce' : 'Wait for breakdown';
    }
    
    // Calculate confidence based on data quality
    const confidence = Math.min(0.95, 0.5 + (candles.length / 100));
    
    return {
      symbol,
      timeframe,
      currentPrice: markPrice,
      ema20,
      priceVsEMA: priceVsEMA.toFixed(2),
      support: support.toFixed(2),
      resistance: resistance.toFixed(2),
      trend,
      recommendation,
      confidence: confidence.toFixed(2),
      fundingRate: (funding * 100).toFixed(4),
      openInterest: openInterest.toFixed(2),
      volume24h: volume24h.toFixed(0),
      dataSource: 'HyperLiquid',
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    return { 
      symbol, 
      timeframe, 
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

function calculateEMA(prices, period) {
  const multiplier = 2 / (period + 1);
  let ema = prices[0];
  
  for (let i = 1; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }
  
  return ema;
}

module.exports = { getTradingAnalysis };
