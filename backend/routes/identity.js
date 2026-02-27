const router = require("express").Router();
const { ethers } = require("ethers");

// In-memory store (production: use PostgreSQL or Redis)
const identityStore = new Map(); // identityHash -> walletAddress
const walletStore = new Map();   // walletAddress -> identityHash

// POST /api/identity/register
// Called after Moca Wallet login
router.post("/register", async (req, res) => {
  try {
    const { walletAddress, mocaIdentityId } = req.body;

    if (!ethers.isAddress(walletAddress)) {
      return res.status(400).json({ error: "Invalid wallet address" });
    }
    if (!mocaIdentityId) {
      return res.status(400).json({ error: "Missing Moca identity ID" });
    }

    // Hash the identity ID
    const identityHash = ethers.keccak256(
      ethers.toUtf8Bytes(mocaIdentityId)
    );

    // Check if identity already bound to different wallet
    if (identityStore.has(identityHash)) {
      const existingWallet = identityStore.get(identityHash);
      if (existingWallet !== walletAddress) {
        return res.status(409).json({
          error: "Identity already bound to another wallet"
        });
      }
    }

    // Store mapping
    identityStore.set(identityHash, walletAddress);
    walletStore.set(walletAddress, identityHash);

    // TODO production: call CreditScoreZK.bindIdentity(identityHash, wallet)
    // const contract = new ethers.Contract(CREDITSCORE_ADDRESS, ABI, signer)
    // await contract.bindIdentity(identityHash, walletAddress)

    console.log(`Identity bound: ${mocaIdentityId} -> ${walletAddress}`);

    return res.json({
      success: true,
      identityHash,
      walletAddress,
      message: "Identity successfully bound to wallet"
    });

  } catch (err) {
    console.error("Identity register error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/identity/verify/:walletAddress
router.get("/verify/:walletAddress", (req, res) => {
  const { walletAddress } = req.params;
  const identityHash = walletStore.get(walletAddress);

  return res.json({
    verified: !!identityHash,
    identityHash: identityHash || null,
    walletAddress
  });
});

// GET /api/identity/status/:walletAddress
router.get("/status/:walletAddress", (req, res) => {
  const { walletAddress } = req.params;
  const identityHash = walletStore.get(walletAddress);

  res.json({
    walletAddress,
    mocaVerified: !!identityHash,
    identityHash: identityHash || null,
    canBorrow: !!identityHash,
    message: identityHash
      ? "Moca identity verified. You can borrow."
      : "Connect Moca Wallet to verify identity."
  });
});

module.exports = router;
