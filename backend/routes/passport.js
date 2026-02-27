const express = require('express');
const router = express.Router();
const { ethers } = require('ethers');

// In-memory cache for passport data (60s TTL)
const passportCache = new Map();
const CACHE_TTL = 60_000;

/**
 * GET /api/passport/public/:wallet
 *
 * Public endpoint for verifying a wallet's credit passport.
 * Returns: score, tier, tierName, NFT token ID, ZK verified,
 * identity verified, collateral ratio, loan history.
 * No personal data is revealed — privacy preserved.
 */
router.get('/public/:wallet', async (req, res) => {
  try {
    const { wallet } = req.params;

    if (!ethers.isAddress(wallet)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid wallet address',
      });
    }

    const normalizedWallet = wallet.toLowerCase();

    // Check cache
    const cached = passportCache.get(normalizedWallet);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return res.json({ ...cached.data, cached: true });
    }

    // Simulate on-chain data lookup (in production, this would query the contracts)
    // For hackathon demo: generate deterministic data from wallet address
    const walletHash = ethers.keccak256(ethers.toUtf8Bytes(normalizedWallet));
    const seed = parseInt(walletHash.slice(2, 10), 16);

    const score = (seed % 801) + 200; // 200-1000 range
    let tier, tierName, collateralRatio;

    if (score >= 750) {
      tier = 3;
      tierName = 'Platinum';
      collateralRatio = 110;
    } else if (score >= 500) {
      tier = 2;
      tierName = 'Gold';
      collateralRatio = 125;
    } else if (score >= 200) {
      tier = 1;
      tierName = 'Silver';
      collateralRatio = 135;
    } else {
      tier = 0;
      tierName = 'Bronze';
      collateralRatio = 150;
    }

    const totalLoans = seed % 20;
    const repaidLoans = Math.floor(totalLoans * ((seed % 40 + 60) / 100));
    const zkProofCount = seed % 12;

    let zkBadge;
    if (zkProofCount >= 10) zkBadge = 'Platinum';
    else if (zkProofCount >= 5) zkBadge = 'Gold';
    else if (zkProofCount >= 3) zkBadge = 'Silver';
    else if (zkProofCount >= 1) zkBadge = 'Bronze';
    else zkBadge = 'None';

    const passportData = {
      success: true,
      wallet: normalizedWallet,
      passport: {
        score,
        tier,
        tierName,
        collateralRatio,
        zkVerified: zkProofCount > 0,
        identityVerified: seed % 3 !== 0, // ~66% verified
        zkBadge,
        zkProofCount,
        totalLoans,
        repaidLoans,
        repaymentRate: totalLoans > 0
          ? Math.round((repaidLoans / totalLoans) * 100)
          : 0,
        nftTokenId: seed % 2 === 0 ? (seed % 500) + 1 : null,
      },
      chain: 'opBNB Testnet',
      protocol: 'CredLink ZK',
      verifiedAt: new Date().toISOString(),
    };

    // Cache the result
    passportCache.set(normalizedWallet, {
      data: passportData,
      timestamp: Date.now(),
    });

    res.json(passportData);
  } catch (err) {
    console.error('[passport] Error:', err.message);
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching passport data',
    });
  }
});

/**
 * GET /api/passport/public/:wallet/badge
 *
 * Returns just the ZK badge information for a wallet.
 * Lightweight endpoint for badge display widgets.
 */
router.get('/public/:wallet/badge', async (req, res) => {
  try {
    const { wallet } = req.params;

    if (!ethers.isAddress(wallet)) {
      return res.status(400).json({ success: false, error: 'Invalid wallet address' });
    }

    const walletHash = ethers.keccak256(ethers.toUtf8Bytes(wallet.toLowerCase()));
    const seed = parseInt(walletHash.slice(2, 10), 16);
    const zkProofCount = seed % 12;

    let zkBadge;
    if (zkProofCount >= 10) zkBadge = 'Platinum';
    else if (zkProofCount >= 5) zkBadge = 'Gold';
    else if (zkProofCount >= 3) zkBadge = 'Silver';
    else if (zkProofCount >= 1) zkBadge = 'Bronze';
    else zkBadge = 'None';

    res.json({
      success: true,
      wallet: wallet.toLowerCase(),
      zkBadge,
      zkProofCount,
      nextBadge: zkBadge === 'Platinum' ? null :
        zkBadge === 'Gold' ? { level: 'Platinum', proofsNeeded: 10 - zkProofCount } :
        zkBadge === 'Silver' ? { level: 'Gold', proofsNeeded: 5 - zkProofCount } :
        zkBadge === 'Bronze' ? { level: 'Silver', proofsNeeded: 3 - zkProofCount } :
        { level: 'Bronze', proofsNeeded: 1 - zkProofCount },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
