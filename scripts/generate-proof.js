const snarkjs = require("snarkjs");
const fs = require("fs");
const path = require("path");

/**
 * Generate wallet age ZK proof
 */
async function generateWalletAgeProof(walletAgeDays, threshold) {
  try {
    const wasmPath = path.join(__dirname, "../circuits/walletAgeProof.wasm");
    const zkeyPath = path.join(__dirname, "../circuits/walletAgeProof_final.zkey");

    // Check if compiled circuit files exist
    if (!fs.existsSync(wasmPath) || !fs.existsSync(zkeyPath)) {
      console.warn("Circuit files not found. Returning mock proof for hackathon demo.");
      return generateMockProof(walletAgeDays >= threshold ? 1 : 0);
    }

    const input = { walletAgeDays, threshold };
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, wasmPath, zkeyPath);
    return { proof, publicSignals };
  } catch (error) {
    console.error("Error generating wallet age proof:", error.message);
    return generateMockProof(walletAgeDays >= threshold ? 1 : 0);
  }
}

/**
 * Generate combined proof from all behavioral inputs
 */
async function generateCombinedProof(walletAge, repayments, defaultRatio) {
  try {
    // Calculate credit score based on inputs
    // Formula: age*0.3 + repayments*40 + (1-defaultRatio)*300
    let score = Math.floor(walletAge * 0.3 + repayments * 40 + (1 - defaultRatio) * 300);

    // Clamp score to 0-1000
    score = Math.max(0, Math.min(1000, score));

    // Determine validity of each component
    const walletAgeValid = walletAge >= 30 ? 1 : 0; // 30 days minimum
    const repaymentValid = defaultRatio <= 0.2 ? 1 : 0; // max 20% default rate

    // Generate mock Groth16 proof format
    const proofA = [
      "0x" + BigInt(Math.floor(Math.random() * 1e18)).toString(16).padStart(64, "0"),
      "0x" + BigInt(Math.floor(Math.random() * 1e18)).toString(16).padStart(64, "0")
    ];
    const proofB = [
      [
        "0x" + BigInt(Math.floor(Math.random() * 1e18)).toString(16).padStart(64, "0"),
        "0x" + BigInt(Math.floor(Math.random() * 1e18)).toString(16).padStart(64, "0")
      ],
      [
        "0x" + BigInt(Math.floor(Math.random() * 1e18)).toString(16).padStart(64, "0"),
        "0x" + BigInt(Math.floor(Math.random() * 1e18)).toString(16).padStart(64, "0")
      ]
    ];
    const proofC = [
      "0x" + BigInt(Math.floor(Math.random() * 1e18)).toString(16).padStart(64, "0"),
      "0x" + BigInt(Math.floor(Math.random() * 1e18)).toString(16).padStart(64, "0")
    ];

    const publicSignals = [walletAgeValid, repaymentValid, score];

    return {
      proofA,
      proofB,
      proofC,
      publicSignals,
      score,
      tier: scoreToTier(score),
      walletAgeValid,
      repaymentValid
    };
  } catch (error) {
    console.error("Error generating combined proof:", error.message);
    throw error;
  }
}

/**
 * Convert score to tier
 */
function scoreToTier(score) {
  if (score >= 750) return 3;
  if (score >= 500) return 2;
  if (score >= 200) return 1;
  return 0;
}

/**
 * Generate mock proof for hackathon demo
 */
function generateMockProof(valid) {
  return {
    proof: {
      pi_a: ["0x1", "0x2", "0x1"],
      pi_b: [["0x1", "0x2"], ["0x3", "0x4"], ["0x1", "0x0"]],
      pi_c: ["0x1", "0x2", "0x1"],
      protocol: "groth16",
      curve: "bn128"
    },
    publicSignals: [valid.toString()]
  };
}

module.exports = {
  generateWalletAgeProof,
  generateCombinedProof,
  scoreToTier
};
