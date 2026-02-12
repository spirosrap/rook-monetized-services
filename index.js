const express = require("express");
const { paymentMiddleware } = require("@x402/express");
const { HTTPFacilitatorClient, x402ResourceServer } = require("@x402/core/server");
const { registerExactEvmScheme } = require("@x402/evm/exact/server");
const { createCdpAuthHeaders } = require("@coinbase/x402");
const { getTradingAnalysis } = require("./tradingAnalysis");
const { getCodeReview } = require("./codeReview");

const app = express();
app.set('trust proxy', 1);

function parseLegacyCdpApiKey(rawValue) {
  if (!rawValue) {
    return {};
  }

  const trimmed = rawValue.trim();

  try {
    const parsed = JSON.parse(trimmed);
    const id = parsed.apiKeyId || parsed.name || parsed.apiKeyName || parsed.keyId;
    const secret = parsed.apiKeySecret || parsed.privateKey || parsed.secret;
    if (id && secret) {
      return { id, secret };
    }
  } catch (error) {
    // Not JSON, continue with heuristic parsing.
  }

  const lines = trimmed.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length >= 2) {
    return {
      id: lines[0],
      secret: lines.slice(1).join("\n"),
    };
  }

  const separatorIndex = trimmed.indexOf(":");
  if (separatorIndex > 0) {
    return {
      id: trimmed.slice(0, separatorIndex),
      secret: trimmed.slice(separatorIndex + 1),
    };
  }

  return {};
}

function normalizeFacilitatorUrl(rawUrl) {
  if (!rawUrl) {
    return rawUrl;
  }
  return rawUrl.endsWith("/") ? rawUrl.slice(0, -1) : rawUrl;
}

function formatX402Error(error) {
  if (!error) {
    return { message: "Unknown error" };
  }
  return {
    name: error.name,
    message: error.message,
    statusCode: error.statusCode,
    invalidReason: error.invalidReason,
    errorReason: error.errorReason,
    errorMessage: error.errorMessage,
    payer: error.payer,
  };
}

function parseRequestBody(body) {
  if (!body) {
    return {};
  }
  if (typeof body === "object" && !Buffer.isBuffer(body)) {
    return body;
  }
  const raw = Buffer.isBuffer(body) ? body.toString("utf8") : String(body);
  if (!raw.trim()) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

// Handle OPTIONS for x402 discovery
app.options('/api/code-review', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-PAYMENT, PAYMENT-SIGNATURE');
  res.status(200).end();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text({ type: "*/*" }));

// Your Coinbase Agentic Wallet address
const PAY_TO = "0x57CE15395828cB06Dcd514918df0d8D86F815011";
const parsedLegacyCdpKey = parseLegacyCdpApiKey(process.env.CDP_API_KEY);
const cdpApiKeyId =
  process.env.CDP_API_KEY_ID || process.env.CDP_API_KEY_NAME || parsedLegacyCdpKey.id;
const cdpApiKeySecret = process.env.CDP_API_KEY_SECRET || parsedLegacyCdpKey.secret
  ? (process.env.CDP_API_KEY_SECRET || parsedLegacyCdpKey.secret).replace(/\\n/g, "\n")
  : undefined;
const hasCdpAuth = Boolean(cdpApiKeyId && cdpApiKeySecret);
const x402Network = process.env.X402_NETWORK || (hasCdpAuth ? "eip155:8453" : "eip155:84532");

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
      maxTimeoutSeconds: 120,
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
      maxTimeoutSeconds: 300,
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
      maxTimeoutSeconds: 180,
    },
    description:
      "Get real-time trading analysis for any crypto pair on HyperLiquid. Returns EMA20, support/resistance, trend, and funding rate.",
    resource: "https://rook-monetized-services.onrender.com/api/trading-analysis",
  },
};

const cdpFacilitatorUrl = normalizeFacilitatorUrl(
  process.env.CDP_FACILITATOR_URL ||
    process.env.X402_FACILITATOR_URL ||
    (hasCdpAuth ? "https://api.cdp.coinbase.com/platform/v2/x402" : "https://www.x402.org/facilitator")
);

const facilitatorConfig = hasCdpAuth
  ? {
      url: cdpFacilitatorUrl,
      createAuthHeaders: createCdpAuthHeaders(cdpApiKeyId, cdpApiKeySecret),
    }
  : { url: cdpFacilitatorUrl };

const facilitatorClient = new HTTPFacilitatorClient(facilitatorConfig);
const resourceServer = registerExactEvmScheme(new x402ResourceServer(facilitatorClient));

resourceServer.onVerifyFailure(({ error, requirements }) => {
  console.error("x402_verify_failure", {
    network: requirements?.network,
    scheme: requirements?.scheme,
    payTo: requirements?.payTo,
    amount: requirements?.amount,
    error: formatX402Error(error),
  });
});

resourceServer.onBeforeVerify(({ paymentPayload, requirements }) => {
  const payload = paymentPayload?.payload;
  const payloadKeys =
    payload && typeof payload === "object" && !Array.isArray(payload) ? Object.keys(payload) : [];
  const payloadType =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? payload.authorization
        ? "authorization"
        : payload.transaction
          ? "transaction"
          : "object"
      : typeof payload;

  console.log("x402_before_verify", {
    x402Version: paymentPayload?.x402Version,
    acceptedScheme: paymentPayload?.accepted?.scheme,
    acceptedNetwork: paymentPayload?.accepted?.network,
    routeNetwork: requirements?.network,
    routeAmount: requirements?.amount,
    payloadType,
    payloadKeys,
    payloadJsonLength: payload ? JSON.stringify(payload).length : 0,
  });
});

resourceServer.onSettleFailure(({ error, requirements }) => {
  console.error("x402_settle_failure", {
    network: requirements?.network,
    scheme: requirements?.scheme,
    payTo: requirements?.payTo,
    amount: requirements?.amount,
    error: formatX402Error(error),
  });
});

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
  const body = parseRequestBody(req.body);
  const symbol = body.symbol || req.query.symbol;
  const timeframe = body.timeframe || req.query.timeframe || "1h";
  
  if (!symbol) {
    return res.status(200).json({
      ok: false,
      error: "Symbol is required",
      hint: "Send JSON body with {\"symbol\":\"BTC\",\"timeframe\":\"1h\"} or ?symbol=BTC",
      bodyType: typeof req.body,
    });
  }
  
  const analysis = await getTradingAnalysis(symbol, timeframe);
  res.json(analysis);
});

app.post("/api/code-review", payment, async (req, res) => {
  const body = parseRequestBody(req.body);
  const code = body.code || req.query.code;
  const language = body.language || req.query.language || "auto";
  
  if (!code) {
    return res.status(200).json({
      ok: false,
      error: "Code is required",
      hint: "Send JSON body with {\"code\":\"...\",\"language\":\"javascript\"} or ?code=...",
      bodyType: typeof req.body,
    });
  }
  
  const review = await getCodeReview(code, language);
  res.json(review);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Rook's Monetized Agent Services running on port ${PORT}`);
  console.log(`💰 Payment address: ${PAY_TO}`);
  console.log(`🔗 X402 network: ${x402Network}`);
  console.log(`🏦 Facilitator: ${cdpFacilitatorUrl}`);
  if (!hasCdpAuth && process.env.CDP_API_KEY) {
    console.log(
      "⚠️ CDP_API_KEY is set but x402 v2 requires CDP_API_KEY_ID + CDP_API_KEY_SECRET for mainnet facilitator auth."
    );
  }
  if (hasCdpAuth && !process.env.CDP_API_KEY_ID && !process.env.CDP_API_KEY_NAME && process.env.CDP_API_KEY) {
    console.log("ℹ️ Using credentials parsed from CDP_API_KEY fallback. Prefer CDP_API_KEY_ID + CDP_API_KEY_SECRET.");
  }
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
