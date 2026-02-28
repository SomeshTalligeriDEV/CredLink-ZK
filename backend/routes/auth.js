const router = require("express").Router();
const { ethers } = require("ethers");

// Contract ABI (only the functions we need)
const CREDITSCORE_ABI = [
  "function bindIdentity(bytes32 identityHash, address wallet) external",
  "function isIdentityVerified(address wallet) external view returns (bool)",
];

// Shared in-memory stores (imported pattern matches identity.js)
const identityStore = new Map(); // identityHash -> walletAddress
const walletStore = new Map(); // walletAddress -> identityHash

// Export stores so identity.js can share state
module.exports.identityStore = identityStore;
module.exports.walletStore = walletStore;

/**
 * POST /api/auth/moca
 * Main Moca OAuth authentication endpoint.
 * 1. Validates the OAuth code (mock for hackathon)
 * 2. Generates identityHash from mocaId
 * 3. Calls CreditScoreZK.bindIdentity() on-chain with admin signer
 * 4. Returns verification result
 */
router.post("/moca", async (req, res) => {
  try {
    const { code, walletAddress } = req.body;

    // Validate inputs
    if (!code) {
      return res.status(400).json({ success: false, error: "Missing authorization code" });
    }
    if (!walletAddress || !ethers.isAddress(walletAddress)) {
      return res.status(400).json({ success: false, error: "Invalid wallet address" });
    }

    // Mock Moca OAuth verification
    // In production: verify code with Moca's OAuth server to get user profile
    const mocaId = `moca_user_${code}`;
    console.log(`[Moca Auth] Verifying code for wallet ${walletAddress}, mocaId: ${mocaId}`);

    // Generate identity hash
    const identityHash = ethers.keccak256(ethers.toUtf8Bytes(mocaId));

    // Check if identity already bound to a different wallet
    if (identityStore.has(identityHash)) {
      const existingWallet = identityStore.get(identityHash);
      if (existingWallet.toLowerCase() !== walletAddress.toLowerCase()) {
        return res.status(409).json({
          success: false,
          error: "This Moca identity is already bound to another wallet",
        });
      }
      // Already bound to same wallet — return success (idempotent)
      return res.json({
        success: true,
        mocaId,
        identityHash,
        walletAddress,
        onChainBound: true,
        message: "Identity already verified",
      });
    }

    // Attempt on-chain binding
    let onChainBound = false;
    const adminKey = process.env.ADMIN_PRIVATE_KEY;
    const creditScoreAddress = process.env.CREDITSCORE_ADDRESS;
    const rpcUrl = process.env.RPC_URL || "https://opbnb-testnet-rpc.bnbchain.org";

    if (adminKey && creditScoreAddress) {
      try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const adminSigner = new ethers.Wallet(adminKey, provider);
        const contract = new ethers.Contract(creditScoreAddress, CREDITSCORE_ABI, adminSigner);

        // Check if already verified on-chain (idempotency)
        const alreadyVerified = await contract.isIdentityVerified(walletAddress);
        if (alreadyVerified) {
          console.log(`[Moca Auth] Wallet ${walletAddress} already verified on-chain`);
          onChainBound = true;
        } else {
          console.log(`[Moca Auth] Binding identity on-chain: ${identityHash} -> ${walletAddress}`);
          const tx = await contract.bindIdentity(identityHash, walletAddress);
          console.log(`[Moca Auth] Tx sent: ${tx.hash}`);
          await tx.wait();
          console.log(`[Moca Auth] Identity bound on-chain successfully`);
          onChainBound = true;
        }
      } catch (chainErr) {
        console.error("[Moca Auth] On-chain binding failed:", chainErr.message);
        // Continue with off-chain binding even if on-chain fails
        // This allows the demo to work without admin key configured
      }
    } else {
      console.warn("[Moca Auth] ADMIN_PRIVATE_KEY or CREDITSCORE_ADDRESS not set. Skipping on-chain binding.");
    }

    // Store in memory
    identityStore.set(identityHash, walletAddress);
    walletStore.set(walletAddress, identityHash);

    console.log(`[Moca Auth] Identity verified: ${mocaId} -> ${walletAddress} (onChain: ${onChainBound})`);

    return res.json({
      success: true,
      mocaId,
      identityHash,
      walletAddress,
      onChainBound,
      message: onChainBound
        ? "Identity verified and bound on-chain"
        : "Identity verified (off-chain only — configure ADMIN_PRIVATE_KEY for on-chain binding)",
    });
  } catch (err) {
    console.error("[Moca Auth] Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
module.exports.identityStore = identityStore;
module.exports.walletStore = walletStore;
