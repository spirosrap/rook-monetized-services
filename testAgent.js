/**
 * Test agent for Rook's x402 monetized services
 * Run: node testAgent.js <agent_name> <private_key>
 * 
 * Example: node testAgent.js tester1 0x...
 */

const { payAndRequest } = require('@coinbase/x402');
const { ethers } = require('ethers');

const SERVICE_URL = process.env.SERVICE_URL || 'https://rook-monetized-services.onrender.com';

async function testEndpoint(agentName, privateKey) {
  console.log(`\n🤖 ${agentName} testing x402 payments...\n`);
  
  const wallet = new ethers.Wallet(privateKey);
  console.log(`�钱包: ${wallet.address}`);
  
  try {
    // Test 1: Ping ($0.01)
    console.log('🧪 Testing /api/ping ($0.01)...');
    const pingResult = await payAndRequest(
      wallet,
      `${SERVICE_URL}/api/ping`
    );
    console.log(`✅ Ping result: ${JSON.stringify(pingResult, null, 2)}`);
    
    // Test 2: Code Review ($0.50)
    console.log('\n🧪 Testing /api/code-review ($0.50)...');
    const testCode = `
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// Bug: no memoization, exponential time complexity
console.log(fibonacci(50));
    `.trim();
    
    const codeResult = await payAndRequest(
      wallet,
      `${SERVICE_URL}/api/code-review`,
      {
        code: testCode,
        language: 'javascript'
      }
    );
    console.log(`✅ Code review: ${JSON.stringify(codeResult, null, 2)}`);
    
    console.log('\n🎉 All tests passed!');
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// Usage: node testAgent.js <agent_name> <private_key>
const agentName = process.argv[2] || 'TestAgent';
const privateKey = process.argv[3];

if (!privateKey) {
  console.log(`Usage: node ${process.argv[1]} <agent_name> <private_key>`);
  console.log(`\nExample:`);
  console.log(`  node testAgent.js tester1 0xabc123...def456`);
  console.log(`\nSet SERVICE_URL env var to override default URL`);
  process.exit(1);
}

testEndpoint(agentName, privateKey);
