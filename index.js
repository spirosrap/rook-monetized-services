const express = require("express");
const { paymentMiddleware } = require("@x402/express");
const { HTTPFacilitatorClient, x402ResourceServer } = require("@x402/core/server");
const { registerExactEvmScheme } = require("@x402/evm/exact/server");
const { getTradingAnalysis } = require("./tradingAnalysis");
const { getCodeReview } = require("./codeReview");

const app = express();
app.set('trust proxy', 1);

// Handle OPTIONS for x402 discovery
app.options('/api/code-review', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-PAYMENT, PAYMENT-SIGNATURE');
  res.status(200).end();
});

app.use(express.json());

// Your Coinbase Agentic Wallet address
const PAY_TO = "0x57CE15395828cB06Dcd514918df0d8D86F815011";
const cdpApiKey = process.env.CDP_API_KEY;
const x402Network = process.env.X402_NETWORK || (cdpApiKey ? "eip155:8453" : "eip155:84532");

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
        path: "/api/code-review",
        price: "$0.50",
        description: "AI code review via OpenAI Codex - finds bugs, security issues, and suggestions",
        method: "POST"
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
    version: "1.2.0",
    status: "Trading analysis + Code review live!"
  });
});

// Payment middleware configuration with CDP facilitator
const routes = {
  // Simple Ping Service - $0.01 per request
  "GET /api/ping": {
    accepts: {
      scheme: "exact",
      payTo: PAY_TO,
      price: "$0.01",
      network: x402Network,
      maxTimeoutSeconds: 60,
    },
    description: "Simple health check that returns server status. Cheapest way to test x402 payments.",
    resource: "https://rook-monetized-services.onrender.com/api/ping",
  },
  // Code Review Service - $0.50 per request
  "POST /api/code-review": {
    accepts: {
      scheme: "exact",
      payTo: PAY_TO,
      price: "$0.50",
      network: x402Network,
      maxTimeoutSeconds: 60,
    },
    description:
      "AI-powered code review using OpenAI o3-mini. Finds bugs, security issues, performance problems, and best practice violations.",
    resource: "https://rook-monetized-services.onrender.com/api/code-review",
  },
  // Trading Analysis Service - $0.25 per request
  "POST /api/trading-analysis": {
    accepts: {
      scheme: "exact",
      payTo: PAY_TO,
      price: "$0.25",
      network: x402Network,
      maxTimeoutSeconds: 60,
    },
    description:
      "Get real-time trading analysis for any crypto pair on HyperLiquid. Returns EMA20, support/resistance, trend, and funding rate.",
    resource: "https://rook-monetized-services.onrender.com/api/trading-analysis",
  },
};

const cdpFacilitatorUrl =
  process.env.CDP_FACILITATOR_URL ||
  process.env.X402_FACILITATOR_URL ||
  (cdpApiKey ? "https://api.cdp.coinbase.com/platform/v2/x402" : "https://www.x402.org/facilitator");

const facilitatorConfig = cdpApiKey
  ? {
      url: cdpFacilitatorUrl,
      createAuthHeaders: async () => {
        const auth = { Authorization: `Bearer ${cdpApiKey}` };
        return {
          verify: auth,
          settle: auth,
          supported: auth,
        };
      },
    }
  : { url: cdpFacilitatorUrl };

const facilitatorClient = new HTTPFacilitatorClient(facilitatorConfig);
const resourceServer = registerExactEvmScheme(new x402ResourceServer(facilitatorClient));
const rawPaymentMiddleware = paymentMiddleware(routes, resourceServer);
const payment = (req, res, next) =>
  Promise.resolve(rawPaymentMiddleware(req, res, next)).catch(next);

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

app.post("/api/code-review", payment, async (req, res) => {
  const { code, language = 'auto' } = req.body;
  
  if (!code) {
    return res.status(400).json({ error: 'Code is required' });
  }
  
  const review = await getCodeReview(code, language);
  res.json(review);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Rook's Monetized Agent Services running on port ${PORT}`);
  console.log(`💰 Payment address: ${PAY_TO}`);
  console.log(`🔗 Network: Base (mainnet)`);
  console.log(`\n📋 Available endpoints:`);
  console.log(`   GET  /health               - Free health check`);
  console.log(`   GET  /api/ping             - $0.01 - Payment test`);
  console.log(`   POST /api/code-review       - $0.50 - AI code review (OpenAI o3-mini)`);
  console.log(`   POST /api/trading-analysis  - $0.25 - Real-time trading analysis`);
  console.log(`\n🧪 Test with: curl http://localhost:${PORT}/health`);
  console.log(`\n📈 Trading analysis powered by HyperLiquid`);
  console.log(`\n🤖 Code review powered by OpenAI gpt-5-mini`);
});

app.use((err, req, res, next) => {
  if (!err) {
    return next();
  }
  console.error(err);
  if (res.headersSent) {
    return next(err);
  }
  return res.status(500).json({
    error: "Payment middleware error",
    details: err.message || "Unknown error",
  });
});
