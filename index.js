const express = require("express");
const { paymentMiddleware } = require("x402-express");
const { getTradingAnalysis } = require("./tradingAnalysis");

const app = express();
app.use(express.json());

// Your Coinbase Agentic Wallet address
const PAY_TO = "0x57CE15395828cB06Dcd514918df0d8D86F815011";

// Root route - service info (no payment required)
app.get("/", (req, res) => {
  res.json({
    name: "Rook Monetized Services",
    description: "AI-powered services for agents and developers",
    endpoints: [
      {
        path: "/api/ping",
        price: "$0.01",
        description: "Health check with payment test",
        method: "GET"
      },
      {
        path: "/api/trading-analysis",
        price: "$0.25",
        description: "Real-time trading analysis via HyperLiquid",
        method: "POST"
      }
    ],
    wallet: PAY_TO,
    network: "base",
    version: "1.1.0",
    status: "Trading analysis live - code review coming soon"
  });
});

// Payment middleware configuration
const payment = paymentMiddleware(PAY_TO, {
  // Simple Ping Service - $0.01 per request
  "GET /api/ping": {
    price: "$0.01",
    network: "base",
    config: {
      description: "Simple health check that returns server status. Cheapest way to test x402 payments.",
      outputSchema: {
        type: "object",
        properties: {
          status: { type: "string" },
          timestamp: { type: "string" },
          uptime: { type: "number" }
        },
      },
    },
  },
  // Trading Analysis Service - $0.25 per request
  "POST /api/trading-analysis": {
    price: "$0.25",
    network: "base",
    config: {
      description: "Get real-time trading analysis for any crypto pair on HyperLiquid. Returns EMA20, support/resistance, trend, and funding rate.",
      inputSchema: {
        bodyType: "json",
        bodyFields: {
          symbol: {
            type: "string",
            description: "Trading pair symbol (e.g., 'BTC', 'ETH', 'SOL')",
            required: true
          },
          timeframe: {
            type: "string",
            description: "Chart timeframe: '1h', '4h', or '1d'",
            default: "1h",
            required: false
          }
        },
      },
      outputSchema: {
        type: "object",
        properties: {
          symbol: { type: "string" },
          currentPrice: { type: "number" },
          ema20: { type: "number" },
          trend: { type: "string" },
          support: { type: "number" },
          resistance: { type: "number" },
          recommendation: { type: "string" },
          fundingRate: { type: "string" },
          dataSource: { type: "string" }
        },
      },
    },
  },
});

// Health check - FREE (no payment required)
app.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    service: "Rook's Monetized Agent Services",
    endpoints: [
      { path: "/api/ping", price: "$0.01", description: "Health check with payment test" },
      { path: "/api/trading-analysis", price: "$0.25", description: "Real-time trading analysis via HyperLiquid" }
    ],
    wallet: PAY_TO,
    network: "base",
    note: "Trading analysis live using HyperLiquid real-time data"
  });
});

// Protected endpoints (require payment)
app.get("/api/ping", payment, (req, res) => {
  res.json({ 
    status: "pong", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    note: "x402 payment successful!"
  });
});

app.post("/api/trading-analysis", payment, async (req, res) => {
  const { symbol, timeframe = '1h' } = req.body;
  
  if (!symbol) {
    return res.status(400).json({ error: 'Symbol is required' });
  }
  
  const analysis = await getTradingAnalysis(symbol, timeframe);
  res.json(analysis);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Rook's Monetized Agent Services running on port ${PORT}`);
  console.log(`💰 Payment address: ${PAY_TO}`);
  console.log(`🔗 Network: Base (mainnet)`);
  console.log(`\n📋 Available endpoints:`);
  console.log(`   GET  /health              - Free health check`);
  console.log(`   GET  /api/ping            - $0.01 - Payment test`);
  console.log(`   POST /api/trading-analysis - $0.25 - Real-time trading analysis`);
  console.log(`\n🧪 Test with: curl http://localhost:${PORT}/health`);
  console.log(`\n📈 Trading analysis powered by HyperLiquid real-time data`);
});
