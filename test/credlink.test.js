const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CredLink ZK", function () {
  let creditScoreZK, collateralManager, zkVerifier, lendingPool;
  let owner, verifier, borrower, lender;

  beforeEach(async function () {
    [owner, verifier, borrower, lender] = await ethers.getSigners();

    // Deploy CreditScoreZK
    const CreditScoreZK = await ethers.getContractFactory("CreditScoreZK");
    creditScoreZK = await CreditScoreZK.deploy();
    await creditScoreZK.waitForDeployment();

    // Deploy CollateralManager
    const CollateralManager = await ethers.getContractFactory("CollateralManager");
    collateralManager = await CollateralManager.deploy();
    await collateralManager.waitForDeployment();

    // Deploy ZKVerifier
    const ZKVerifier = await ethers.getContractFactory("ZKVerifier");
    zkVerifier = await ZKVerifier.deploy(await creditScoreZK.getAddress());
    await zkVerifier.waitForDeployment();

    // Deploy LendingPool
    const LendingPool = await ethers.getContractFactory("LendingPool");
    lendingPool = await LendingPool.deploy(
      await creditScoreZK.getAddress(),
      await collateralManager.getAddress()
    );
    await lendingPool.waitForDeployment();

    // Setup roles
    const VERIFIER_ROLE = await creditScoreZK.VERIFIER_ROLE();
    const LENDING_POOL_ROLE = await creditScoreZK.LENDING_POOL_ROLE();
    const CM_LENDING_POOL_ROLE = await collateralManager.LENDING_POOL_ROLE();

    await creditScoreZK.grantRole(VERIFIER_ROLE, await zkVerifier.getAddress());
    await creditScoreZK.grantRole(LENDING_POOL_ROLE, await lendingPool.getAddress());
    await collateralManager.grantRole(CM_LENDING_POOL_ROLE, await lendingPool.getAddress());

    // Seed pool with 10 ETH
    await lender.sendTransaction({
      to: await lendingPool.getAddress(),
      value: ethers.parseEther("10"),
    });
  });

  describe("CreditScoreZK", function () {
    it("should initialize with default values for new user", async function () {
      const [tier, collateralRatio] = await creditScoreZK.getUserTier(borrower.address);
      expect(tier).to.equal(0);
      expect(collateralRatio).to.equal(150);
    });

    it("should calculate collateral required correctly", async function () {
      const loanAmount = ethers.parseEther("1");
      const required = await creditScoreZK.getCollateralRequired(borrower.address, loanAmount);
      // Tier 0 = 150% collateral
      expect(required).to.equal(ethers.parseEther("1.5"));
    });

    it("should not allow non-verifier to update score", async function () {
      await expect(
        creditScoreZK.connect(borrower).updateScoreFromZK(borrower.address, 500)
      ).to.be.reverted;
    });
  });

  describe("ZKVerifier", function () {
    it("should verify mock proof and update score", async function () {
      const a = [1, 2];
      const b = [[1, 2], [3, 4]];
      const c = [1, 2];
      const publicSignals = [1, 1, 750]; // walletAgeValid, repaymentValid, score

      await zkVerifier.verifyAndUpdateScore(a, b, c, publicSignals, borrower.address);

      const [tier, collateralRatio] = await creditScoreZK.getUserTier(borrower.address);
      expect(tier).to.equal(3); // 750+ = Tier 3
      expect(collateralRatio).to.equal(110);
    });

    it("should reject proof with invalid wallet age", async function () {
      const a = [1, 2];
      const b = [[1, 2], [3, 4]];
      const c = [1, 2];
      const publicSignals = [0, 1, 750]; // walletAgeValid = 0 (invalid)

      await expect(
        zkVerifier.verifyAndUpdateScore(a, b, c, publicSignals, borrower.address)
      ).to.be.revertedWith("ZKVerifier: invalid proof");
    });

    it("should reject score above 1000", async function () {
      const a = [1, 2];
      const b = [[1, 2], [3, 4]];
      const c = [1, 2];
      const publicSignals = [1, 1, 1500]; // score > 1000

      await expect(
        zkVerifier.verifyAndUpdateScore(a, b, c, publicSignals, borrower.address)
      ).to.be.revertedWith("ZKVerifier: invalid proof");
    });
  });

  describe("LendingPool", function () {
    it("should allow borrowing with correct collateral", async function () {
      // First, give borrower a score via ZK verifier
      const a = [1, 2];
      const b = [[1, 2], [3, 4]];
      const c = [1, 2];
      const publicSignals = [1, 1, 500]; // Tier 2, 125% collateral
      await zkVerifier.verifyAndUpdateScore(a, b, c, publicSignals, borrower.address);

      const loanAmount = ethers.parseEther("1");
      const collateralRequired = await creditScoreZK.getCollateralRequired(borrower.address, loanAmount);

      const balanceBefore = await ethers.provider.getBalance(borrower.address);

      const tx = await lendingPool.connect(borrower).requestLoan(loanAmount, {
        value: collateralRequired,
      });
      await tx.wait();

      const loans = await lendingPool.getLoansByBorrower(borrower.address);
      expect(loans.length).to.equal(1);
      expect(loans[0].amount).to.equal(loanAmount);
      expect(loans[0].repaid).to.equal(false);
    });

    it("should reject loan with insufficient collateral", async function () {
      const loanAmount = ethers.parseEther("1");
      // Tier 0 needs 150% = 1.5 ETH, send only 1 ETH
      await expect(
        lendingPool.connect(borrower).requestLoan(loanAmount, {
          value: ethers.parseEther("1"),
        })
      ).to.be.revertedWith("LendingPool: insufficient collateral");
    });

    it("should allow repayment and increase score", async function () {
      // Setup: give Tier 2 score and take a loan
      const a = [1, 2];
      const b = [[1, 2], [3, 4]];
      const c = [1, 2];
      await zkVerifier.verifyAndUpdateScore(a, b, c, [1, 1, 500], borrower.address);

      const loanAmount = ethers.parseEther("1");
      const collateral = await creditScoreZK.getCollateralRequired(borrower.address, loanAmount);
      await lendingPool.connect(borrower).requestLoan(loanAmount, { value: collateral });

      // Repay with 2% interest
      const repayAmount = loanAmount * BigInt(102) / BigInt(100);
      const tx = await lendingPool.connect(borrower).repayLoan(0, { value: repayAmount });
      await tx.wait();

      const loans = await lendingPool.getLoansByBorrower(borrower.address);
      expect(loans[0].repaid).to.equal(true);

      // Score should have increased by 50
      const [score] = await creditScoreZK.getUserProfile(borrower.address);
      expect(score).to.equal(550); // 500 + 50
    });
  });

  describe("CollateralManager", function () {
    it("should not allow non-lending-pool to lock collateral", async function () {
      await expect(
        collateralManager.connect(borrower).lockCollateral(0, borrower.address, {
          value: ethers.parseEther("1"),
        })
      ).to.be.reverted;
    });
  });

  describe("Tier System", function () {
    it("should correctly assign tiers based on score", async function () {
      const a = [1, 2];
      const b = [[1, 2], [3, 4]];
      const c = [1, 2];

      // Tier 0: score < 200
      await zkVerifier.verifyAndUpdateScore(a, b, c, [1, 1, 100], borrower.address);
      let [tier] = await creditScoreZK.getUserTier(borrower.address);
      expect(tier).to.equal(0);

      // Tier 1: 200-499
      await zkVerifier.verifyAndUpdateScore(a, b, c, [1, 1, 300], borrower.address);
      [tier] = await creditScoreZK.getUserTier(borrower.address);
      expect(tier).to.equal(1);

      // Tier 2: 500-749
      await zkVerifier.verifyAndUpdateScore(a, b, c, [1, 1, 600], borrower.address);
      [tier] = await creditScoreZK.getUserTier(borrower.address);
      expect(tier).to.equal(2);

      // Tier 3: 750+
      await zkVerifier.verifyAndUpdateScore(a, b, c, [1, 1, 800], borrower.address);
      [tier] = await creditScoreZK.getUserTier(borrower.address);
      expect(tier).to.equal(3);
    });

    it("should set correct collateral ratios per tier", async function () {
      const a = [1, 2];
      const b = [[1, 2], [3, 4]];
      const c = [1, 2];

      await zkVerifier.verifyAndUpdateScore(a, b, c, [1, 1, 100], borrower.address);
      let [, ratio] = await creditScoreZK.getUserTier(borrower.address);
      expect(ratio).to.equal(150);

      await zkVerifier.verifyAndUpdateScore(a, b, c, [1, 1, 300], borrower.address);
      [, ratio] = await creditScoreZK.getUserTier(borrower.address);
      expect(ratio).to.equal(135);

      await zkVerifier.verifyAndUpdateScore(a, b, c, [1, 1, 600], borrower.address);
      [, ratio] = await creditScoreZK.getUserTier(borrower.address);
      expect(ratio).to.equal(125);

      await zkVerifier.verifyAndUpdateScore(a, b, c, [1, 1, 800], borrower.address);
      [, ratio] = await creditScoreZK.getUserTier(borrower.address);
      expect(ratio).to.equal(110);
    });
  });

  describe("Full Flow Integration", function () {
    it("should complete full flow: verify -> borrow -> repay -> score increase", async function () {
      // 1. Verify ZK proof to get Tier 3
      const a = [1, 2];
      const b = [[1, 2], [3, 4]];
      const c = [1, 2];
      await zkVerifier.verifyAndUpdateScore(a, b, c, [1, 1, 750], borrower.address);

      let [tier, ratio] = await creditScoreZK.getUserTier(borrower.address);
      expect(tier).to.equal(3);
      expect(ratio).to.equal(110);

      // 2. Request loan with Tier 3 collateral (110%)
      const loanAmount = ethers.parseEther("1");
      const collateral = await creditScoreZK.getCollateralRequired(borrower.address, loanAmount);
      expect(collateral).to.equal(ethers.parseEther("1.1"));

      await lendingPool.connect(borrower).requestLoan(loanAmount, { value: collateral });

      // 3. Repay loan
      const repayAmount = loanAmount * BigInt(102) / BigInt(100);
      await lendingPool.connect(borrower).repayLoan(0, { value: repayAmount });

      // 4. Verify score increased
      const [score, , , totalLoans, repaidLoans] = await creditScoreZK.getUserProfile(borrower.address);
      expect(score).to.equal(800); // 750 + 50
      expect(totalLoans).to.equal(1);
      expect(repaidLoans).to.equal(1);
    });
  });
});
