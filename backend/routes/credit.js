const express = require('express');
const router = express.Router();
const { ethers } = require('ethers');
require('dotenv').config();

// Provider connecting to opBNB testnet
const provider = new ethers.JsonRpcProvider(
  process.env.RPC_URL || 'https://opbnb-testnet-rpc.bnbchain.org'
);

// Simple Map cache with 60-second TTL
const cache = new Map();
const CACHE_TTL = 60 * 1000; // 60 seconds

function getCached(key) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data;
  }
  cache.delete(key);
  return null;
}

function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

function calculateScore(walletAge, repayments, defaultRatio) {
  const raw = Math.floor(walletAge * 0.3 + repayments * 40 + (1 - defaultRatio) * 300);
  return Math.max(0, Math.min(1000, raw));
}

function getTier(score) {
  if (score >= 750) return 3;
  if (score >= 500) return 2;
  if (score >= 200) return 1;
  return 0;
}

function randomHex() {
  return '0x' + [...Array(64)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
}

// POST /analyze
router.post('/analyze', async (req, res) => {
  try {
    const { walletAddress } = req.body;

    // Validate walletAddress
    if (!walletAddress || !ethers.isAddress(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    // Check cache first
    const cached = getCached(walletAddress.toLowerCase());
    if (cached) {
      return res.json(cached);
    }

    // Get transaction count
    const txCount = await provider.getTransactionCount(walletAddress);

    // Get BNB balance
    const rawBalance = await provider.getBalance(walletAddress);
    const balance = ethers.formatEther(rawBalance);

    // Mock data
    const walletAge = Math.floor(Math.random() * 400) + 100; // 100-500 days
    const repayments = txCount > 10 ? Math.floor(txCount / 2) : txCount;
    const defaultRatio = parseFloat(balance) > 0.1 ? 0.05 : 0.2;

    // Calculate score and tier
    const estimatedScore = calculateScore(walletAge, repayments, defaultRatio);
    const tier = getTier(estimatedScore);

    const result = {
      walletAge,
      txCount,
      balance,
      estimatedScore,
      repayments,
      defaultRatio,
      tier
    };

    // Store in cache
    setCache(walletAddress.toLowerCase(), result);

    return res.json(result);
  } catch (error) {
    console.error('Error in /analyze:', error.message);
    return res.status(500).json({ error: 'Failed to analyze wallet' });
  }
});

// POST /generate-proof
router.post('/generate-proof', async (req, res) => {
  try {
    const { walletAddress, walletAge, repayments, defaultRatio } = req.body;

    // Calculate score, clamped 0-1000
    const score = calculateScore(walletAge, repayments, defaultRatio);

    // Validity checks
    const walletAgeValid = walletAge >= 30 ? 1 : 0;
    const repaymentValid = defaultRatio <= 0.2 ? 1 : 0;

    // Tier from score
    const tier = getTier(score);

    // Generate mock Groth16 proof arrays with random hex strings
    const a = [randomHex(), randomHex()];
    const b = [
      [randomHex(), randomHex()],
      [randomHex(), randomHex()]
    ];
    const c = [randomHex(), randomHex()];

    const publicSignals = [walletAgeValid, repaymentValid, score];

    return res.json({
      proof: { a, b, c },
      publicSignals,
      score,
      tier,
      walletAgeValid,
      repaymentValid
    });
  } catch (error) {
    console.error('Error in /generate-proof:', error.message);
    return res.status(500).json({ error: 'Failed to generate proof' });
  }
});

module.exports = router;
