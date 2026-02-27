const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // 1. Deploy CreditScoreZK
  console.log("\n--- Deploying CreditScoreZK ---");
  const CreditScoreZK = await hre.ethers.getContractFactory("CreditScoreZK");
  const creditScoreZK = await CreditScoreZK.deploy();
  await creditScoreZK.waitForDeployment();
  const creditScoreAddr = await creditScoreZK.getAddress();
  console.log("CreditScoreZK deployed to:", creditScoreAddr);

  // 2. Deploy CollateralManager
  console.log("\n--- Deploying CollateralManager ---");
  const CollateralManager = await hre.ethers.getContractFactory("CollateralManager");
  const collateralManager = await CollateralManager.deploy();
  await collateralManager.waitForDeployment();
  const collateralAddr = await collateralManager.getAddress();
  console.log("CollateralManager deployed to:", collateralAddr);

  // 3. Deploy ZKVerifier with CreditScoreZK address
  console.log("\n--- Deploying ZKVerifier ---");
  const ZKVerifier = await hre.ethers.getContractFactory("ZKVerifier");
  const zkVerifier = await ZKVerifier.deploy(creditScoreAddr);
  await zkVerifier.waitForDeployment();
  const zkVerifierAddr = await zkVerifier.getAddress();
  console.log("ZKVerifier deployed to:", zkVerifierAddr);

  // 4. Deploy LendingPool with CreditScoreZK and CollateralManager
  console.log("\n--- Deploying LendingPool ---");
  const LendingPool = await hre.ethers.getContractFactory("LendingPool");
  const lendingPool = await LendingPool.deploy(creditScoreAddr, collateralAddr);
  await lendingPool.waitForDeployment();
  const lendingPoolAddr = await lendingPool.getAddress();
  console.log("LendingPool deployed to:", lendingPoolAddr);

  // 5. Grant VERIFIER_ROLE to ZKVerifier in CreditScoreZK
  console.log("\n--- Setting up roles ---");
  const VERIFIER_ROLE = await creditScoreZK.VERIFIER_ROLE();
  let tx = await creditScoreZK.grantRole(VERIFIER_ROLE, zkVerifierAddr);
  await tx.wait();
  console.log("Granted VERIFIER_ROLE to ZKVerifier");

  // 6. Grant LENDING_POOL_ROLE to LendingPool in CreditScoreZK
  const LENDING_POOL_ROLE = await creditScoreZK.LENDING_POOL_ROLE();
  tx = await creditScoreZK.grantRole(LENDING_POOL_ROLE, lendingPoolAddr);
  await tx.wait();
  console.log("Granted LENDING_POOL_ROLE to LendingPool in CreditScoreZK");

  // 7. Grant LENDING_POOL_ROLE to LendingPool in CollateralManager
  const CM_LENDING_POOL_ROLE = await collateralManager.LENDING_POOL_ROLE();
  tx = await collateralManager.grantRole(CM_LENDING_POOL_ROLE, lendingPoolAddr);
  await tx.wait();
  console.log("Granted LENDING_POOL_ROLE to LendingPool in CollateralManager");

  // 8. Seed LendingPool with 1 BNB for demo
  console.log("\n--- Seeding LendingPool ---");
  tx = await deployer.sendTransaction({
    to: lendingPoolAddr,
    value: hre.ethers.parseEther("0.1")
  });
  await tx.wait();
  console.log("Seeded LendingPool with 0.1 BNB");

  // 9. Write addresses to frontend config
  const addresses = {
    CreditScoreZK: creditScoreAddr,
    CollateralManager: collateralAddr,
    ZKVerifier: zkVerifierAddr,
    LendingPool: lendingPoolAddr,
    network: "opBNB Testnet",
    chainId: 5611
  };

  const frontendDir = path.join(__dirname, "../frontend/lib");
  if (!fs.existsSync(frontendDir)) {
    fs.mkdirSync(frontendDir, { recursive: true });
  }
  fs.writeFileSync(
    path.join(frontendDir, "contract-addresses.json"),
    JSON.stringify(addresses, null, 2)
  );
  console.log("\nAddresses written to frontend/lib/contract-addresses.json");

  // Summary
  console.log("\n========================================");
  console.log("  CredLink ZK Deployment Summary");
  console.log("========================================");
  console.log("CreditScoreZK:    ", creditScoreAddr);
  console.log("CollateralManager: ", collateralAddr);
  console.log("ZKVerifier:        ", zkVerifierAddr);
  console.log("LendingPool:       ", lendingPoolAddr);
  console.log("========================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
