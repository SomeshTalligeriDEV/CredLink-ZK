const router = require("express").Router();
const { ethers } = require("ethers");

// Contract ABI (only the functions we need)
const CREDITSCORE_ABI = [
  "function bindIdentity(bytes32 identityHash, address wallet) external",
  "function isIdentityVerified(address wallet) external view returns (bool)",
];

// In-memory store (production: use PostgreSQL or Redis)
const identityStore = new Map(); // identityHash -> walletAddress
const walletStore = new Map();   // walletAddress -> identityHash

/**
 * Get admin signer + contract instance for on-chain operations.
 * Returns null if env vars not configured.
 */
function getContract() {
  const adminKey = process.env.ADMIN_PRIVATE_KEY;
  const creditScoreAddress = process.env.CREDITSCORE_ADDRESS;
  const rpcUrl = process.env.RPC_URL || "https://opbnb-testnet-rpc.bnbchain.org";

  if (!adminKey || !creditScoreAddress) {
    return null;
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const adminSigner = new ethers.Wallet(adminKey, provider);
  const contract = new ethers.Contract(creditScoreAddress, CREDITSCORE_ABI, adminSigner);
  return contract;
}

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
      if (existingWallet.toLowerCase() !== walletAddress.toLowerCase()) {
        return res.status(409).json({
          error: "Identity already bound to another wallet"
        });
      }
    }

    // Store mapping
    identityStore.set(identityHash, walletAddress);
    walletStore.set(walletAddress, identityHash);

    // On-chain binding via CreditScoreZK.bindIdentity()
    let onChainBound = false;
    const contract = getContract();
    if (contract) {
      try {
        const alreadyVerified = await contract.isIdentityVerified(walletAddress);
        if (alreadyVerified) {
          console.log(`[Identity] Wallet ${walletAddress} already verified on-chain`);
          onChainBound = true;
        } else {
          console.log(`[Identity] Binding on-chain: ${identityHash} -> ${walletAddress}`);
          const tx = await contract.bindIdentity(identityHash, walletAddress);
          await tx.wait();
          console.log(`[Identity] On-chain binding successful (tx: ${tx.hash})`);
          onChainBound = true;
        }
      } catch (chainErr) {
        console.error("[Identity] On-chain binding failed:", chainErr.message);
      }
    } else {
      console.warn("[Identity] ADMIN_PRIVATE_KEY or CREDITSCORE_ADDRESS not configured. Skipping on-chain binding.");
    }

    console.log(`Identity bound: ${mocaIdentityId} -> ${walletAddress} (onChain: ${onChainBound})`);

    return res.json({
      success: true,
      identityHash,
      walletAddress,
      onChainBound,
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
