// =============================================================================
// CredLink ZK — Production Deployment Script
// =============================================================================
// Deploys all 7 core contracts to BNB Smart Chain Testnet (Chain ID 97)
// in correct dependency order with full role wiring.
//
// Usage:
//   npx hardhat run scripts/deployAll.js --network bsctestnet
//
// Flags (via env):
//   FORCE_REDEPLOY=1  — redeploy even if manifest already exists
//
// Prerequisites:
//   - .env file with PRIVATE_KEY set (never commit .env)
//   - BNB testnet faucet funds in the deployer wallet
//   - Contracts compiled: npx hardhat compile
// =============================================================================

const hre = require("hardhat");
const { ethers } = hre;
const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
//  Constants
// ---------------------------------------------------------------------------

const TARGET_CHAIN_ID = 97;
const TARGET_NETWORK_NAME = "BNB Smart Chain Testnet";
const MANIFEST_PATH = path.join(__dirname, "..", "deployment-manifest.json");
const FRONTEND_ADDRESSES_PATH = path.join(
  __dirname, "..", "frontend", "lib", "contract-addresses.json"
);
const MIN_BALANCE_WEI = ethers.parseEther("0.01");
const LOW_BALANCE_WEI = ethers.parseEther("0.05");

// ---------------------------------------------------------------------------
//  Deployment Plan
// ---------------------------------------------------------------------------

/** @notice Ordered deployment plan with constructor dependency map. */
const DEPLOYMENT_PLAN = [
  // Phase 1: Independent contracts (no constructor dependencies)
  { name: "CreditScoreZK",         deps: [] },
  { name: "CollateralManager",     deps: [] },
  { name: "CreditPassportNFT",     deps: [] },
  { name: "GovernanceStub",        deps: [] },

  // Phase 2: Single-dependency contracts
  { name: "ZKVerifier",            deps: ["CreditScoreZK"] },
  { name: "CrossChainScoreOracle", deps: ["CreditScoreZK"] },

  // Phase 3: Multi-dependency contracts
  { name: "LendingPool",           deps: ["CreditScoreZK", "CollateralManager"] },
];

/** @notice Post-deploy role grants for cross-contract authorization. */
const ROLE_GRANTS = [
  {
    contract: "CreditScoreZK",
    role: "VERIFIER_ROLE",
    grantee: "ZKVerifier",
    description: "Allow ZKVerifier to set absolute scores",
  },
  {
    contract: "CreditScoreZK",
    role: "LENDING_POOL_ROLE",
    grantee: "LendingPool",
    description: "Allow LendingPool to adjust scores and track loans",
  },
  {
    contract: "CollateralManager",
    role: "LENDING_POOL_ROLE",
    grantee: "LendingPool",
    description: "Allow LendingPool to lock/release/liquidate collateral",
  },
];

// ---------------------------------------------------------------------------
//  State
// ---------------------------------------------------------------------------

/** Cache of deployed contract addresses (name → address). */
const deployed = {};

/** Deployment results for the summary table. */
const results = [];

/** Track which contracts were skipped (already deployed). */
const skipped = [];

/** Deployment start time. */
let deploymentStartTime;

// ---------------------------------------------------------------------------
//  Formatting Helpers
// ---------------------------------------------------------------------------

function formatBNB(wei) {
  return ethers.formatEther(wei) + " BNB";
}

function pad(str, width) {
  return str.length >= width ? str : str + " ".repeat(width - str.length);
}

function elapsed(startMs) {
  const seconds = ((Date.now() - startMs) / 1000).toFixed(1);
  return `${seconds}s`;
}

function section(title) {
  console.log("");
  console.log("=".repeat(70));
  console.log(`  ${title}`);
  console.log("=".repeat(70));
}

function step(msg) {
  console.log(`  → ${msg}`);
}

function fail(msg) {
  console.error("");
  console.error(`  ✗ FATAL: ${msg}`);
  console.error("");
  process.exit(1);
}

// ---------------------------------------------------------------------------
//  Manifest Handling (Skip Redeployment)
// ---------------------------------------------------------------------------

/**
 * @notice Loads an existing deployment manifest if present and valid.
 * @returns {object|null} The manifest object or null if not found / invalid.
 */
function loadExistingManifest() {
  try {
    if (!fs.existsSync(MANIFEST_PATH)) return null;

    const raw = fs.readFileSync(MANIFEST_PATH, "utf-8");
    const manifest = JSON.parse(raw);

    // Must match target chain.
    if (manifest.chainId !== TARGET_CHAIN_ID) return null;

    // Must have contracts section.
    if (!manifest.contracts || typeof manifest.contracts !== "object") return null;

    return manifest;
  } catch {
    return null;
  }
}

/**
 * @notice Checks if a contract address from a manifest is still valid on-chain.
 * @param {string} address The contract address.
 * @returns {Promise<boolean>} True if there is code at the address.
 */
async function isContractDeployed(address) {
  if (!address || address === ethers.ZeroAddress) return false;
  try {
    const code = await ethers.provider.getCode(address);
    return code !== "0x" && code !== "0x0";
  } catch {
    return false;
  }
}

/**
 * @notice Pre-populates the deployed cache from an existing manifest.
 *         Only uses addresses that still have code on-chain.
 * @returns {Promise<number>} Number of contracts found already deployed.
 */
async function loadAlreadyDeployed() {
  if (process.env.FORCE_REDEPLOY === "1") {
    step("FORCE_REDEPLOY=1 — ignoring existing manifest.");
    return 0;
  }

  const manifest = loadExistingManifest();
  if (!manifest) return 0;

  step(`Found existing manifest from ${manifest.deployedAt || "unknown date"}`);

  let count = 0;
  for (const [name, info] of Object.entries(manifest.contracts)) {
    const addr = info.address;
    const onChain = await isContractDeployed(addr);
    if (onChain) {
      deployed[name] = addr;
      skipped.push(name);
      count++;
      step(`  ${name} → ${addr} (already deployed, skipping)`);
    } else {
      step(`  ${name} → ${addr} (no code on-chain, will redeploy)`);
    }
  }

  return count;
}

// ---------------------------------------------------------------------------
//  Core Deployment
// ---------------------------------------------------------------------------

/**
 * @notice Deploys a single contract with gas estimation and logging.
 * @param {string} name Contract name.
 * @param {string[]} deps Constructor dependency contract names.
 * @param {ethers.Signer} deployer The deployer signer.
 * @returns {Promise<ethers.BaseContract>} The deployed contract instance.
 */
async function deployContract(name, deps, deployer) {
  const contractStart = Date.now();

  section(`Deploying: ${name}`);

  // Resolve constructor arguments from deployed cache.
  const constructorArgs = deps.map((dep) => {
    const addr = deployed[dep];
    if (!addr) {
      throw new Error(`Dependency ${dep} not yet deployed (required by ${name})`);
    }
    step(`Constructor arg: ${dep} → ${addr}`);
    return addr;
  });

  // Get contract factory.
  const Factory = await ethers.getContractFactory(name, deployer);

  // Estimate gas before deploying.
  const deployTx = await Factory.getDeployTransaction(...constructorArgs);
  let estimatedGas = 0n;
  try {
    estimatedGas = await deployer.estimateGas(deployTx);
    step(`Estimated gas: ${estimatedGas.toString()}`);
  } catch (err) {
    console.warn(`  ⚠ Gas estimation failed: ${err.message}`);
  }

  // Deploy.
  step("Sending deployment transaction...");
  const contract = await Factory.deploy(...constructorArgs);

  const txHash = contract.deploymentTransaction().hash;
  step(`Tx hash: ${txHash}`);

  // Wait for on-chain confirmation.
  step("Waiting for confirmation...");
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  step(`Deployed at: ${address}`);

  // Get actual gas used from receipt.
  const receipt = await contract.deploymentTransaction().wait();
  const gasUsed = receipt.gasUsed;
  const gasPrice = receipt.gasPrice || 10000000000n;
  const cost = gasUsed * gasPrice;

  step(`Gas used:  ${gasUsed.toString()}`);
  step(`Cost:      ${formatBNB(cost)}`);
  step(`Time:      ${elapsed(contractStart)}`);

  // Cache address and record result.
  deployed[name] = address;
  results.push({
    name,
    address,
    gasUsed: gasUsed.toString(),
    cost: formatBNB(cost),
    costWei: cost,
    estimatedGas: estimatedGas.toString(),
    txHash,
    status: "DEPLOYED",
  });

  return contract;
}

/**
 * @notice Attaches to an already-deployed contract (for role granting on skipped deploys).
 * @param {string} name Contract name.
 * @param {ethers.Signer} deployer The deployer signer.
 * @returns {Promise<ethers.BaseContract>} The attached contract instance.
 */
async function attachContract(name, deployer) {
  const Factory = await ethers.getContractFactory(name, deployer);
  return Factory.attach(deployed[name]);
}

/**
 * @notice Grants a role on a contract to a grantee address.
 * @param {object} grant The role grant specification.
 * @param {object} contracts Map of contract name → contract instance.
 */
async function grantRole(grant, contracts) {
  const { contract: contractName, role: roleName, grantee: granteeName, description } = grant;

  step(`Granting ${roleName} on ${contractName} to ${granteeName}`);
  step(`  Purpose: ${description}`);

  const contract = contracts[contractName];
  const granteeAddress = deployed[granteeName];

  if (!contract || !granteeAddress) {
    throw new Error(
      `Cannot grant role: ${contractName} or ${granteeName} not deployed`
    );
  }

  // Read the role hash from the contract.
  const roleHash = await contract[roleName]();

  // Check if role is already granted (skip if so).
  const alreadyGranted = await contract.hasRole(roleHash, granteeAddress);
  if (alreadyGranted) {
    step(`  Already granted — skipping.`);
    return;
  }

  // Grant the role.
  const tx = await contract.grantRole(roleHash, granteeAddress);
  const receipt = await tx.wait();
  step(`  Tx: ${tx.hash} (gas: ${receipt.gasUsed.toString()})`);
}

// ---------------------------------------------------------------------------
//  Artifact Writers
// ---------------------------------------------------------------------------

function writeDeploymentArtifacts() {
  // Frontend contract-addresses.json
  const addressConfig = {
    CreditScoreZK: deployed.CreditScoreZK || ethers.ZeroAddress,
    CollateralManager: deployed.CollateralManager || ethers.ZeroAddress,
    ZKVerifier: deployed.ZKVerifier || ethers.ZeroAddress,
    LendingPool: deployed.LendingPool || ethers.ZeroAddress,
    CreditPassportNFT: deployed.CreditPassportNFT || ethers.ZeroAddress,
    CrossChainScoreOracle: deployed.CrossChainScoreOracle || ethers.ZeroAddress,
    GovernanceStub: deployed.GovernanceStub || ethers.ZeroAddress,
    network: TARGET_NETWORK_NAME,
    chainId: TARGET_CHAIN_ID,
  };

  try {
    fs.writeFileSync(FRONTEND_ADDRESSES_PATH, JSON.stringify(addressConfig, null, 2) + "\n");
    step(`Frontend addresses → ${FRONTEND_ADDRESSES_PATH}`);
  } catch {
    console.warn("  ⚠ Could not write frontend addresses (directory may not exist)");
  }

  // Deployment manifest.
  const manifest = {
    network: "bsctestnet",
    chainId: TARGET_CHAIN_ID,
    deployedAt: new Date().toISOString(),
    deployer: results.length > 0 ? "see logs" : "N/A",
    contracts: {},
  };

  // Merge newly deployed + previously skipped.
  for (const name of DEPLOYMENT_PLAN.map((p) => p.name)) {
    const result = results.find((r) => r.name === name);
    manifest.contracts[name] = {
      address: deployed[name] || ethers.ZeroAddress,
      gasUsed: result ? result.gasUsed : "0 (reused)",
      cost: result ? result.cost : "0 BNB (reused)",
      txHash: result ? result.txHash : "N/A (reused)",
      status: result ? "DEPLOYED" : "REUSED",
    };
  }

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");
  step(`Deployment manifest → ${MANIFEST_PATH}`);
}

// ---------------------------------------------------------------------------
//  Summary Printer
// ---------------------------------------------------------------------------

function printSummary() {
  section("DEPLOYMENT SUMMARY");
  console.log("");

  const nw = 26;  // name width
  const aw = 44;  // address width
  const gw = 14;  // gas width
  const cw = 24;  // cost width
  const sw = 10;  // status width

  // Header.
  console.log(
    `  ${pad("Contract", nw)} ${pad("Address", aw)} ${pad("Gas Used", gw)} ${pad("Cost", cw)} ${pad("Status", sw)}`
  );
  console.log("  " + "-".repeat(nw + aw + gw + cw + sw + 4));

  // Rows — all contracts in order.
  let totalGas = 0n;
  let totalCost = 0n;

  for (const plan of DEPLOYMENT_PLAN) {
    const result = results.find((r) => r.name === plan.name);
    const address = deployed[plan.name] || "NOT DEPLOYED";

    if (result) {
      console.log(
        `  ${pad(result.name, nw)} ${pad(result.address, aw)} ${pad(result.gasUsed, gw)} ${pad(result.cost, cw)} ${pad("NEW", sw)}`
      );
      totalGas += BigInt(result.gasUsed);
      totalCost += result.costWei;
    } else if (skipped.includes(plan.name)) {
      console.log(
        `  ${pad(plan.name, nw)} ${pad(address, aw)} ${pad("—", gw)} ${pad("— (reused)", cw)} ${pad("REUSED", sw)}`
      );
    }
  }

  console.log("  " + "-".repeat(nw + aw + gw + cw + sw + 4));
  console.log(
    `  ${pad("TOTAL (new)", nw)} ${pad("", aw)} ${pad(totalGas.toString(), gw)} ${pad(formatBNB(totalCost), cw)} ${pad(results.length + "/" + DEPLOYMENT_PLAN.length, sw)}`
  );

  console.log("");
  console.log(`  Total time: ${elapsed(deploymentStartTime)}`);
  if (skipped.length > 0) {
    console.log(`  Reused:     ${skipped.length} contract(s) from previous deployment`);
  }
  console.log("");
}

// ---------------------------------------------------------------------------
//  Main Execution
// ---------------------------------------------------------------------------

async function main() {
  deploymentStartTime = Date.now();

  // =====================================================================
  //  PHASE 0: PRE-FLIGHT CHECKS
  // =====================================================================
  section("PRE-FLIGHT CHECKS");

  // 0a. Verify PRIVATE_KEY is set.
  if (!process.env.PRIVATE_KEY) {
    fail(
      "PRIVATE_KEY not set in .env file.\n" +
      "    Add PRIVATE_KEY=<your_key> to your .env (never commit this file)."
    );
  }
  step("PRIVATE_KEY: set (not displayed)");

  // 0b. Get deployer signer.
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  step(`Deployer:  ${deployerAddress}`);

  // 0c. Verify network.
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  step(`Network:   ${network.name}`);
  step(`Chain ID:  ${chainId}`);

  if (chainId !== TARGET_CHAIN_ID) {
    fail(
      `Wrong network. Expected Chain ID ${TARGET_CHAIN_ID} (BSC Testnet), got ${chainId}.\n` +
      `    Run with: npx hardhat run scripts/deployAll.js --network bsctestnet`
    );
  }

  // 0d. Check balance.
  const balance = await ethers.provider.getBalance(deployerAddress);
  step(`Balance:   ${formatBNB(balance)}`);

  if (balance === 0n) {
    fail(
      "Deployer wallet has zero balance.\n" +
      "    Get testnet BNB from https://testnet.bnbchain.org/faucet-smart"
    );
  }

  if (balance < MIN_BALANCE_WEI) {
    fail(
      `Balance too low (${formatBNB(balance)}). Need at least ${formatBNB(MIN_BALANCE_WEI)}.\n` +
      "    Get testnet BNB from https://testnet.bnbchain.org/faucet-smart"
    );
  }

  if (balance < LOW_BALANCE_WEI) {
    console.warn(`  ⚠ Low balance (${formatBNB(balance)}). Deployment may fail on later contracts.`);
  }

  // 0e. Verify artifacts compiled.
  step("Verifying compiled artifacts...");
  for (const plan of DEPLOYMENT_PLAN) {
    try {
      await ethers.getContractFactory(plan.name, deployer);
    } catch (err) {
      fail(
        `Artifact not found for ${plan.name}. Run: npx hardhat compile\n` +
        `    ${err.message}`
      );
    }
  }
  step("All 7 contract artifacts verified.");

  // 0f. Check for existing deployment (skip redeployment).
  step("Checking for existing deployment...");
  const alreadyCount = await loadAlreadyDeployed();
  if (alreadyCount === DEPLOYMENT_PLAN.length) {
    step("All contracts already deployed. Will verify roles and skip deploys.");
    step("To force redeploy: FORCE_REDEPLOY=1 npx hardhat run scripts/deployAll.js --network bsctestnet");
  } else if (alreadyCount > 0) {
    step(`${alreadyCount} contract(s) reused from previous deployment.`);
  } else {
    step("No existing deployment found — full deploy.");
  }

  // =====================================================================
  //  PHASE 1-3: DEPLOY CONTRACTS
  // =====================================================================
  const contracts = {};

  for (const plan of DEPLOYMENT_PLAN) {
    // Skip if already deployed.
    if (deployed[plan.name]) {
      section(`Skipping: ${plan.name} (already at ${deployed[plan.name]})`);
      contracts[plan.name] = await attachContract(plan.name, deployer);
      continue;
    }

    try {
      const contract = await deployContract(plan.name, plan.deps, deployer);
      contracts[plan.name] = contract;
    } catch (err) {
      console.error("");
      console.error(`  ✗ DEPLOYMENT FAILED: ${plan.name}`);
      console.error(`    Error: ${err.message}`);
      if (err.code) console.error(`    Code:  ${err.code}`);
      console.error("");
      console.error("  Stopping deployment. Contracts deployed so far:");
      for (const [name, addr] of Object.entries(deployed)) {
        console.error(`    ${name} → ${addr}`);
      }
      console.error("");
      console.error("  These contracts are live on-chain. Rerun this script to");
      console.error("  resume from where it left off (already-deployed will be reused).");
      process.exit(1);
    }
  }

  // =====================================================================
  //  PHASE 4: ROLE GRANTS
  // =====================================================================
  section("ROLE GRANTS");

  for (const grant of ROLE_GRANTS) {
    try {
      await grantRole(grant, contracts);
    } catch (err) {
      console.error(`  ✗ Role grant failed: ${grant.role} on ${grant.contract} → ${grant.grantee}`);
      console.error(`    Error: ${err.message}`);
      console.error("");
      console.error("  Contracts are deployed but roles are incomplete.");
      console.error("  Rerun to retry role grants (deploy phase will be skipped).");
      process.exit(1);
    }
  }

  step("All roles granted successfully.");

  // =====================================================================
  //  PHASE 5: WRITE ARTIFACTS
  // =====================================================================
  section("WRITING ARTIFACTS");
  writeDeploymentArtifacts();

  // =====================================================================
  //  PHASE 6: POST-DEPLOY VERIFICATION
  // =====================================================================
  section("POST-DEPLOY VERIFICATION");

  const creditScoreZK = contracts["CreditScoreZK"];
  const collateralMgr = contracts["CollateralManager"];

  // Verify VERIFIER_ROLE → ZKVerifier.
  const verifierRole = await creditScoreZK.VERIFIER_ROLE();
  const hasVerifier = await creditScoreZK.hasRole(verifierRole, deployed.ZKVerifier);
  step(`CreditScoreZK.hasRole(VERIFIER_ROLE, ZKVerifier):         ${hasVerifier ? "PASS" : "FAIL"}`);

  // Verify LENDING_POOL_ROLE → LendingPool on CreditScoreZK.
  const lpRole = await creditScoreZK.LENDING_POOL_ROLE();
  const hasLP = await creditScoreZK.hasRole(lpRole, deployed.LendingPool);
  step(`CreditScoreZK.hasRole(LENDING_POOL_ROLE, LendingPool):    ${hasLP ? "PASS" : "FAIL"}`);

  // Verify LENDING_POOL_ROLE → LendingPool on CollateralManager.
  const cmLPRole = await collateralMgr.LENDING_POOL_ROLE();
  const hasCMLP = await collateralMgr.hasRole(cmLPRole, deployed.LendingPool);
  step(`CollateralManager.hasRole(LENDING_POOL_ROLE, LendingPool): ${hasCMLP ? "PASS" : "FAIL"}`);

  if (!hasVerifier || !hasLP || !hasCMLP) {
    console.error("");
    console.error("  ✗ Post-deploy verification FAILED.");
    console.error("    One or more role grants are missing. Check logs above.");
    process.exit(1);
  }

  step("All 3 role verifications passed.");

  // =====================================================================
  //  PHASE 7: SUMMARY
  // =====================================================================
  printSummary();

  console.log("  Deployment complete. All contracts are live on BSC Testnet (Chain ID 97).");
  console.log("");
  console.log("  Next steps:");
  console.log("    1. Verify contracts on BscScan: npx hardhat verify --network bsctestnet <address>");
  console.log("    2. Fund the LendingPool with testnet BNB for initial liquidity");
  console.log("    3. Bind Moca identities via CreditScoreZK.bindIdentity()");
  console.log("    4. Start the frontend: cd frontend && npm run dev");
  console.log("");
}

// ---------------------------------------------------------------------------
//  Entry Point — Top-Level Error Boundary
// ---------------------------------------------------------------------------

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("");
    console.error("=".repeat(70));
    console.error("  UNHANDLED DEPLOYMENT ERROR");
    console.error("=".repeat(70));
    console.error("");
    if (error.message) console.error(`  Message: ${error.message}`);
    if (error.code) console.error(`  Code:    ${error.code}`);
    if (error.reason) console.error(`  Reason:  ${error.reason}`);
    console.error("");

    // Print partial deployment state for recovery.
    if (Object.keys(deployed).length > 0) {
      console.error("  Partially deployed contracts (reusable on rerun):");
      for (const [name, addr] of Object.entries(deployed)) {
        console.error(`    ${name} → ${addr}`);
      }
      console.error("");
    }

    process.exit(1);
  });
