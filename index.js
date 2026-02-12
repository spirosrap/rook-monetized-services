const express = require("express");
const { paymentMiddleware } = require("x402-express");

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
      }
    ],
    wallet: PAY_TO,
    network: "base",
    version: "1.0.0",
    status: "Demo service - real endpoints coming soon"
  });
});

// Payment middleware configuration - only ping endpoint
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
});

// Health check - FREE (no payment required)
app.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    service: "Rook's Monetized Agent Services",
    endpoints: [
      { path: "/api/ping", price: "$0.01", description: "Health check with payment test" }
    ],
    wallet: PAY_TO,
    network: "base",
    note: "Real services coming soon. Currently for x402 payment testing only."
  });
});

// Protected endpoints (require payment)
app.get("/api/ping", payment, (req, res) => {
  res.json({ 
    status: "pong", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    note: "x402 payment successful! Real endpoints coming soon."
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Rook's Monetized Agent Services running on port ${PORT}`);
  console.log(`💰 Payment address: ${PAY_TO}`);
  console.log(`🔗 Network: Base (mainnet)`);
  console.log(`\n📋 Available endpoints:`);
  console.log(`   GET  /health              - Free health check`);
  console.log(`   GET  /api/ping            - $0.01 - Payment test`);
  console.log(`\n🧪 Test with: curl http://localhost:${PORT}/health`);
  console.log(`\n⚠️  Note: Real services (trading analysis, code review) coming soon.`);
});
