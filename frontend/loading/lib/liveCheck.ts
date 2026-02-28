import { createPublicClient, http, getContract, type Address } from "viem";
import { bscTestnet } from "viem/chains";
import addresses from "./contract-addresses.json";

// ---------------------------------------------------------------------------
//  ABI Fragments (view-only functions for health checks)
// ---------------------------------------------------------------------------

const CREDITSCORE_HEALTH_ABI = [
  {
    inputs: [{ name: "user", type: "address" }],
    name: "getUserProfile",
    outputs: [
      { name: "score", type: "uint256" },
      { name: "tier", type: "uint8" },
      { name: "collateralRatio", type: "uint256" },
      { name: "totalLoans", type: "uint256" },
      { name: "repaidLoans", type: "uint256" },
      { name: "lastUpdated", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "user", type: "address" }],
    name: "getScore",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "VERIFIER_ROLE",
    outputs: [{ name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "LENDING_POOL_ROLE",
    outputs: [{ name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "role", type: "bytes32" },
      { name: "account", type: "address" },
    ],
    name: "hasRole",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const LENDINGPOOL_HEALTH_ABI = [
  {
    inputs: [],
    name: "totalBorrowed",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalLiquidity",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "loanCounter",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getPoolSnapshot",
    outputs: [
      { name: "poolBalance", type: "uint256" },
      { name: "borrowed", type: "uint256" },
      { name: "liquidity", type: "uint256" },
      { name: "interestEarned", type: "uint256" },
      { name: "utilizationPct", type: "uint256" },
      { name: "currentAPY", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

const PASSPORT_HEALTH_ABI = [
  {
    inputs: [],
    name: "name",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const ZKVERIFIER_HEALTH_ABI = [
  {
    inputs: [],
    name: "productionMode",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "creditScoreZK",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// ---------------------------------------------------------------------------
//  Types
// ---------------------------------------------------------------------------

export interface LiveCheckResult {
  status: "ok" | "error";
  network: {
    chainId: number;
    blockNumber: bigint;
    blockTimestamp: number;
  };
  contracts: {
    creditScoreZK: boolean;
    lendingPool: boolean;
    collateralManager: boolean;
    zkVerifier: boolean;
    creditPassportNFT: boolean;
  };
  roles: {
    verifierRoleActive: boolean;
    lendingPoolRoleActive: boolean;
  };
  state: {
    loanCounter: bigint;
    totalBorrowed: bigint;
    totalLiquidity: bigint;
    nftName: string;
    nftSymbol: string;
    productionMode: boolean;
    zkVerifierTarget: string;
  };
  errors: string[];
}

// ---------------------------------------------------------------------------
//  Public Client
// ---------------------------------------------------------------------------

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

function getAddresses() {
  const required = [
    "CreditScoreZK",
    "LendingPool",
    "CollateralManager",
    "ZKVerifier",
    "CreditPassportNFT",
  ] as const;

  for (const name of required) {
    const addr = (addresses as unknown as Record<string, string>)[name];
    if (!addr || addr === ZERO_ADDRESS) {
      throw new Error(`Contract address for ${name} is missing or zero. Check contract-addresses.json.`);
    }
  }

  return {
    creditScoreZK: (addresses as unknown as Record<string, string>).CreditScoreZK as Address,
    lendingPool: (addresses as unknown as Record<string, string>).LendingPool as Address,
    collateralManager: (addresses as unknown as Record<string, string>).CollateralManager as Address,
    zkVerifier: (addresses as unknown as Record<string, string>).ZKVerifier as Address,
    creditPassportNFT: (addresses as unknown as Record<string, string>).CreditPassportNFT as Address,
  };
}

// ---------------------------------------------------------------------------
//  Main Validation Function
// ---------------------------------------------------------------------------

/**
 * Validates live connection to all deployed contracts on BSC Testnet.
 * Reads on-chain state, verifies role grants, and confirms liveness.
 *
 * Call from any frontend component or browser console:
 *   import { validateLiveConnection } from '@/lib/liveCheck';
 *   const result = await validateLiveConnection();
 *   console.log(result);
 */
export async function validateLiveConnection(): Promise<LiveCheckResult> {
  const errors: string[] = [];

  const client = createPublicClient({
    chain: bscTestnet,
    transport: http("https://data-seed-prebsc-1-s1.binance.org:8545/"),
  });

  // 1. Network check.
  const chainId = await client.getChainId();
  if (chainId !== 97) {
    errors.push(`Wrong chain ID: expected 97, got ${chainId}`);
  }

  const block = await client.getBlock({ blockTag: "latest" });

  // 2. Address validation.
  const addr = getAddresses();

  // 3. Bytecode checks.
  const contractChecks = {
    creditScoreZK: false,
    lendingPool: false,
    collateralManager: false,
    zkVerifier: false,
    creditPassportNFT: false,
  };

  for (const [key, address] of Object.entries(addr)) {
    try {
      const code = await client.getCode({ address: address as Address });
      contractChecks[key as keyof typeof contractChecks] =
        code !== undefined && code !== "0x" && code !== "0x0";
    } catch (err) {
      errors.push(`Failed to check bytecode for ${key}: ${(err as Error).message}`);
    }
  }

  // 4. Read contract state.
  const creditScore = getContract({
    address: addr.creditScoreZK,
    abi: CREDITSCORE_HEALTH_ABI,
    client,
  });

  const pool = getContract({
    address: addr.lendingPool,
    abi: LENDINGPOOL_HEALTH_ABI,
    client,
  });

  const nft = getContract({
    address: addr.creditPassportNFT,
    abi: PASSPORT_HEALTH_ABI,
    client,
  });

  const verifier = getContract({
    address: addr.zkVerifier,
    abi: ZKVERIFIER_HEALTH_ABI,
    client,
  });

  let loanCounter = BigInt(0);
  let totalBorrowed = BigInt(0);
  let totalLiquidity = BigInt(0);
  let nftName = "";
  let nftSymbol = "";
  let productionMode = false;
  let zkVerifierTarget = "";
  let verifierRoleActive = false;
  let lendingPoolRoleActive = false;

  try {
    loanCounter = await pool.read.loanCounter();
  } catch (err) {
    errors.push(`LendingPool.loanCounter() failed: ${(err as Error).message}`);
  }

  try {
    totalBorrowed = await pool.read.totalBorrowed();
  } catch (err) {
    errors.push(`LendingPool.totalBorrowed() failed: ${(err as Error).message}`);
  }

  try {
    totalLiquidity = await pool.read.totalLiquidity();
  } catch (err) {
    errors.push(`LendingPool.totalLiquidity() failed: ${(err as Error).message}`);
  }

  try {
    nftName = await nft.read.name();
  } catch (err) {
    errors.push(`CreditPassportNFT.name() failed: ${(err as Error).message}`);
  }

  try {
    nftSymbol = await nft.read.symbol();
  } catch (err) {
    errors.push(`CreditPassportNFT.symbol() failed: ${(err as Error).message}`);
  }

  try {
    productionMode = await verifier.read.productionMode();
  } catch (err) {
    errors.push(`ZKVerifier.productionMode() failed: ${(err as Error).message}`);
  }

  try {
    zkVerifierTarget = await verifier.read.creditScoreZK();
  } catch (err) {
    errors.push(`ZKVerifier.creditScoreZK() failed: ${(err as Error).message}`);
  }

  // 5. Role verification.
  try {
    const verifierRole = await creditScore.read.VERIFIER_ROLE();
    verifierRoleActive = await creditScore.read.hasRole([
      verifierRole,
      addr.zkVerifier,
    ]);
  } catch (err) {
    errors.push(`VERIFIER_ROLE check failed: ${(err as Error).message}`);
  }

  try {
    const lpRole = await creditScore.read.LENDING_POOL_ROLE();
    lendingPoolRoleActive = await creditScore.read.hasRole([
      lpRole,
      addr.lendingPool,
    ]);
  } catch (err) {
    errors.push(`LENDING_POOL_ROLE check failed: ${(err as Error).message}`);
  }

  // 6. Build result.
  const result: LiveCheckResult = {
    status: errors.length === 0 ? "ok" : "error",
    network: {
      chainId,
      blockNumber: block.number,
      blockTimestamp: Number(block.timestamp),
    },
    contracts: contractChecks,
    roles: {
      verifierRoleActive,
      lendingPoolRoleActive,
    },
    state: {
      loanCounter,
      totalBorrowed,
      totalLiquidity,
      nftName,
      nftSymbol,
      productionMode,
      zkVerifierTarget,
    },
    errors,
  };

  // 7. Console output.
  console.log("====================================================");
  console.log("  CREDLINK ZK — LIVE CONNECTION CHECK");
  console.log("====================================================");
  console.log(`  Status:         ${result.status.toUpperCase()}`);
  console.log(`  Chain ID:       ${result.network.chainId}`);
  console.log(`  Block:          #${result.network.blockNumber}`);
  console.log(`  Block Time:     ${new Date(result.network.blockTimestamp * 1000).toISOString()}`);
  console.log("");
  console.log("  Contracts:");
  for (const [name, deployed] of Object.entries(result.contracts)) {
    console.log(`    ${name}: ${deployed ? "LIVE" : "NOT FOUND"}`);
  }
  console.log("");
  console.log("  Roles:");
  console.log(`    VERIFIER_ROLE active:      ${result.roles.verifierRoleActive}`);
  console.log(`    LENDING_POOL_ROLE active:   ${result.roles.lendingPoolRoleActive}`);
  console.log("");
  console.log("  State:");
  console.log(`    Loan counter:    ${result.state.loanCounter}`);
  console.log(`    Total borrowed:  ${result.state.totalBorrowed}`);
  console.log(`    Total liquidity: ${result.state.totalLiquidity}`);
  console.log(`    NFT name:        ${result.state.nftName}`);
  console.log(`    NFT symbol:      ${result.state.nftSymbol}`);
  console.log(`    Production mode: ${result.state.productionMode}`);
  console.log(`    ZKVerifier ref:  ${result.state.zkVerifierTarget}`);
  console.log("");

  if (errors.length > 0) {
    console.log("  Errors:");
    for (const err of errors) {
      console.log(`    - ${err}`);
    }
  } else {
    console.log("  All checks passed. System is live on BSC Testnet.");
  }

  console.log("====================================================");

  return result;
}

/**
 * Quick validation that throws on failure. Use in component mounting:
 *
 *   useEffect(() => {
 *     assertLiveConnection().catch(console.error);
 *   }, []);
 */
export async function assertLiveConnection(): Promise<void> {
  const result = await validateLiveConnection();
  if (result.status !== "ok") {
    throw new Error(
      `Live connection check failed with ${result.errors.length} error(s): ${result.errors.join("; ")}`
    );
  }
}
