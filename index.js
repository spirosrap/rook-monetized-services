const express = require("express");
const { paymentMiddleware } = require("x402-express");

const app = express();
app.use(express.json());

// Your Coinbase Agentic Wallet address
const PAY_TO = "0x57CE15395828cB06Dcd514918df0d8D86F815011";

// Payment middleware configuration
const payment = paymentMiddleware(PAY_TO, {
  // Trading Analysis Service - $0.25 per request
  "POST /api/trading-analysis": {
    price: "$0.25",
    network: "base",
    config: {
      description: "Get trading analysis for any crypto pair. Returns trend direction, support/resistance levels, and trade setup.",
      inputSchema: {
        bodyType: "json",
        bodyFields: {
          symbol: { 
            type: "string", 
            description: "Trading pair symbol (e.g., 'BTC-PERP', 'ETH-PERP')",
            required: true 
          },
          timeframe: { 
            type: "string", 
            description: "Chart timeframe (e.g., '1h', '4h', '1d')",
            default: "4h",
            required: false 
          }
        },
      },
      outputSchema: {
        type: "object",
        properties: {
          symbol: { type: "string" },
          trend: { type: "string", enum: ["bullish", "bearish", "neutral"] },
          support: { type: "number" },
          resistance: { type: "number" },
          recommendation: { type: "string" },
          confidence: { type: "number" }
        },
      },
    },
  },
  
  // Code Review Service - $0.50 per request
  "POST /api/code-review": {
    price: "$0.50",
    network: "base",
    config: {
      description: "AI-powered code review for Python, JavaScript, or TypeScript. Returns bugs, improvements, and security issues.",
      inputSchema: {
        bodyType: "json",
        bodyFields: {
          code: { 
            type: "string", 
            description: "Code to review (max 500 lines)",
            required: true 
          },
          language: { 
            type: "string", 
            description: "Programming language (python, javascript, typescript)",
            required: true 
          }
        },
      },
      outputSchema: {
        type: "object",
        properties: {
          issues: { 
            type: "array",
            items: {
              type: "object",
              properties: {
                severity: { type: "string", enum: ["critical", "warning", "info"] },
                line: { type: "number" },
                message: { type: "string" }
              }
            }
          },
          summary: { type: "string" },
          score: { type: "number" }
        },
      },
    },
  },
  
  // Crypto Research Service - $0.15 per request
  "GET /api/crypto-research": {
    price: "$0.15",
    network: "base",
    config: {
      description: "Get research on undervalued crypto projects with active communities. Returns 10 projects with metrics.",
      outputSchema: {
        type: "object",
        properties: {
          projects: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                symbol: { type: "string" },
                marketCap: { type: "number" },
                useCase: { type: "string" }
              }
            }
          }
        },
      },
    },
  },
  
  // Simple Ping Service - $0.01 per request
  "GET /api/ping": {
    price: "$0.01",
    network: "base",
    config: {
      description: "Simple health check that returns server status. Cheapest way to test payments.",
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
});

// Health check - FREE (no payment required)
app.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    service: "Rook's Monetized Agent Services",
    endpoints: [
      { path: "/api/ping", price: "$0.01", description: "Health check with payment test" },
      { path: "/api/crypto-research", price: "$0.15", description: "Undervalued crypto projects research" },
      { path: "/api/trading-analysis", price: "$0.25", description: "Trading analysis for crypto pairs" },
      { path: "/api/code-review", price: "$0.50", description: "AI code review" }
    ],
    wallet: PAY_TO,
    network: "base"
  });
});

// Protected endpoints (require payment)
app.get("/api/ping", payment, (req, res) => {
  res.json({ 
    status: "pong", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get("/api/crypto-research", payment, (req, res) => {
  // Return cached research data
  const projects = [
    { name: "Storj", symbol: "STORJ", marketCap: 13800000, useCase: "Decentralized cloud storage" },
    { name: "OriginTrail", symbol: "TRAC", marketCap: 170000000, useCase: "Supply chain data" },
    { name: "Arweave", symbol: "AR", marketCap: 557000000, useCase: "Permanent storage" },
    { name: "Livepeer", symbol: "LPT", marketCap: 400000000, useCase: "Video transcoding" },
    { name: "Ocean Protocol", symbol: "OCEAN", marketCap: 70000000, useCase: "Data marketplace for AI" },
    { name: "IoTeX", symbol: "IOTX", marketCap: 235000000, useCase: "IoT blockchain" },
    { name: "Mask Network", symbol: "MASK", marketCap: 210000000, useCase: "Web3 social bridge" },
    { name: "Crust Network", symbol: "CRU", marketCap: 28000000, useCase: "IPFS storage" },
    { name: "VeChain", symbol: "VET", marketCap: 2600000000, useCase: "Enterprise supply chain" },
    { name: "The Graph", symbol: "GRT", marketCap: 1270000000, useCase: "Web3 indexing" }
  ];
  
  res.json({ projects, count: projects.length, updated: "2026-02-11" });
});

app.post("/api/trading-analysis", payment, (req, res) => {
  const { symbol, timeframe = "4h" } = req.body;
  
  // Mock analysis (in production, this would query real market data)
  const mockAnalysis = {
    symbol: symbol || "BTC-PERP",
    timeframe: timeframe,
    trend: ["bullish", "bearish", "neutral"][Math.floor(Math.random() * 3)],
    support: Math.floor(Math.random() * 10000) + 20000,
    resistance: Math.floor(Math.random() * 10000) + 40000,
    recommendation: "Wait for breakout",
    confidence: Math.random() * 0.4 + 0.5,
    note: "This is a demo endpoint. Production version would query HyperLiquid/ real market data."
  };
  
  res.json(mockAnalysis);
});

app.post("/api/code-review", payment, (req, res) => {
  const { code, language } = req.body;
  
  // Mock code review (in production, this would call an AI model)
  const mockReview = {
    language: language || "javascript",
    linesAnalyzed: code ? code.split('\n').length : 0,
    issues: [
      { severity: "info", line: 1, message: "Consider adding JSDoc comments" },
      { severity: "warning", line: 5, message: "Variable 'x' could have a more descriptive name" },
      { severity: "info", line: 10, message: "Good use of error handling" }
    ],
    summary: "Code looks generally good. Minor style improvements suggested.",
    score: 0.85,
    note: "This is a demo endpoint. Production version would use Codex or Claude for actual review."
  };
  
  res.json(mockReview);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Rook's Monetized Agent Services running on port ${PORT}`);
  console.log(`💰 Payment address: ${PAY_TO}`);
  console.log(`🔗 Network: Base (mainnet)`);
  console.log(`\n📋 Available endpoints:`);
  console.log(`   GET  /health              - Free health check`);
  console.log(`   GET  /api/ping            - $0.01 - Payment test`);
  console.log(`   GET  /api/crypto-research - $0.15 - Crypto projects`);
  console.log(`   POST /api/trading-analysis- $0.25 - Trading signals`);
  console.log(`   POST /api/code-review     - $0.50 - Code review`);
  console.log(`\n🧪 Test with: curl http://localhost:${PORT}/health`);
});
