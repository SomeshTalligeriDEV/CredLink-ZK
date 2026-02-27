# CredLink ZK — Threat Model

> **Version:** 1.0
> **Date:** 2026-02-27
> **Scope:** All 7 Solidity contracts in `/contracts/`
> **Methodology:** STRIDE-inspired analysis + DeFi-specific attack taxonomy

---

## Table of Contents

1. [Sybil Attacks](#1-sybil-attacks)
2. [Flash Loan Manipulation](#2-flash-loan-manipulation)
3. [Identity Spoofing](#3-identity-spoofing)
4. [Economic Attacks](#4-economic-attacks)
5. [Liquidity Drain Vectors](#5-liquidity-drain-vectors)
6. [Governance Capture](#6-governance-capture)
7. [Oracle Manipulation](#7-oracle-manipulation)
8. [Reentrancy & Cross-Contract Exploits](#8-reentrancy--cross-contract-exploits)
9. [Denial of Service](#9-denial-of-service)
10. [Risk Matrix Summary](#10-risk-matrix-summary)

---

## 1. Sybil Attacks

### 1.1 Threat Description
An attacker creates many wallets to farm credit scores, earn multiple loans, or manipulate the tier distribution to extract economic value.

### 1.2 Attack Vectors

| Vector | Description | Severity |
|--------|-------------|----------|
| **Multi-wallet score farming** | Create N wallets, build credit on each, borrow from all simultaneously | HIGH |
| **Proof replay across wallets** | Submit the same ZK proof for different wallets | MEDIUM |
| **Collusion rings** | Group of wallets cross-lending to inflate each other's scores | MEDIUM |

### 1.3 Mitigations in Place

- **Moca Identity Binding** (`CreditScoreZK.bindIdentity`): Bijective mapping between identity hash and wallet. One identity = one wallet. ZK score updates require `identityVerified[user] == true`.
- **Anomaly Scoring** (`LendingPool.anomalyScore`): Admin can flag suspicious addresses. Score >= 3 blocks borrowing.
- **Proof is user-specific**: `verifyAndUpdateScore` takes an explicit `user` parameter; the CreditScoreZK contract updates that specific user.

### 1.4 Residual Risks

- **Off-chain identity verification**: Moca identity binding is admin-gated. If the off-chain identity system is weak (e.g., email-only verification), Sybil resistance depends on that system's strength.
- **No on-chain proof nullifiers**: The same proof data could theoretically be resubmitted for the same user (replay). Impact is limited since it just re-sets the same score, but it wastes gas and triggers unnecessary events.

### 1.5 Recommended Hardening

- Add proof nullifier tracking (hash of proof -> bool used) in ZKVerifier.
- Integrate decentralized identity (e.g., Worldcoin, Gitcoin Passport) alongside Moca.
- Add minimum score age requirement before borrowing eligibility.

---

## 2. Flash Loan Manipulation

### 2.1 Threat Description
An attacker uses a flash loan to temporarily inflate their collateral or pool balance within a single transaction, extract value, then repay the flash loan.

### 2.2 Attack Vectors

| Vector | Description | Severity |
|--------|-------------|----------|
| **Flash deposit + borrow** | Deposit via flash loan, borrow in same tx, default on loan | CRITICAL |
| **Flash collateral inflation** | Use flash loan to post collateral, borrow, withdraw collateral | HIGH |
| **Flash utilization manipulation** | Deposit to lower utilization, enabling borrowing at lower rates | MEDIUM |

### 2.3 Mitigations in Place

- **Same-block deposit+borrow prevention** (`LendingPool.lastDepositBlock`): `require(lastDepositBlock[msg.sender] < block.number)` — borrowing in the same block as a deposit is blocked.
- **1-hour minimum repay delay** (`MIN_REPAY_DELAY = 1 hours`): Prevents instant borrow-repay cycles within a single block.
- **7-day loan cooldown** (`LOAN_COOLDOWN = 7 days`): Prevents rapid loan cycling.
- **Collateral held in separate contract** (`CollateralManager`): Collateral is locked in a separate escrow, not directly accessible by the borrower.
- **ReentrancyGuard**: On all payable functions in LendingPool and CollateralManager.

### 2.4 Residual Risks

- **Cross-block flash loans**: If a flash loan protocol allows multi-block loans (unlikely but theoretically possible with some designs), the same-block check would be bypassed.
- **Collateral value is static**: Since collateral is native BNB and we don't use price oracles, the collateral value doesn't fluctuate within the loan. This is actually a safety feature.

### 2.5 Recommended Hardening

- Consider a minimum deposit age (e.g., 1 block) before funds are counted toward pool liquidity.
- Add a minimum collateral lock time independent of the 1-hour repay delay.

---

## 3. Identity Spoofing

### 3.1 Threat Description
An attacker impersonates another user's identity or manipulates the identity binding process to gain unauthorized access to credit privileges.

### 3.2 Attack Vectors

| Vector | Description | Severity |
|--------|-------------|----------|
| **Admin key compromise** | If the admin private key is stolen, attacker can bind fake identities | CRITICAL |
| **Identity hash collision** | Construct an identity that hashes to the same value as a legitimate identity | LOW (keccak256) |
| **Front-running identity binding** | Race to bind an identity hash before the legitimate user | MEDIUM |

### 3.3 Mitigations in Place

- **Admin-only identity binding** (`onlyRole(DEFAULT_ADMIN_ROLE)`): Only the protocol admin can call `bindIdentity`.
- **Bijective enforcement**: Both `identityToWallet` and `walletToIdentity` are checked — prevents double-binding.
- **Cryptographic hashing**: keccak256 is collision-resistant (pre-image resistance ~2^256).

### 3.4 Residual Risks

- **Single admin key**: If the deployer's private key is compromised, the attacker has full control over identity binding, score adjustment, and contract pausing.
- **No identity revocation**: Once an identity is bound, there is no function to unbind it. A compromised wallet cannot be re-bound to a new address.

### 3.5 Recommended Hardening

- Implement multi-sig or timelock for admin operations.
- Add `unbindIdentity` function with a cooling-off period.
- Move identity binding to a dedicated IdentityManager contract with its own access control.

---

## 4. Economic Attacks

### 4.1 Threat Description
An attacker exploits the protocol's economic mechanics to extract value beyond what the system intends to provide.

### 4.2 Attack Vectors

| Vector | Description | Severity |
|--------|-------------|----------|
| **Score manipulation for tier arbitrage** | Game the score to reach Tier 3 (110% collateral) then borrow at minimum collateral | HIGH |
| **Interest rate gaming** | Build high score, borrow at 2% (Platinum), then intentionally default | MEDIUM |
| **Decay griefing** | Call `applyDecay()` on other users to lower their scores before they can borrow | MEDIUM |
| **Liquidation MEV** | Front-run liquidations to extract collateral spreads | LOW |

### 4.3 Mitigations in Place

- **Asymmetric score adjustments**: +50 for repayment, -100 for liquidation. Defaulting costs 2x the score benefit.
- **7-day cooldown**: Prevents rapid loan cycling to farm repayment bonuses.
- **Max 3 active loans**: Limits total exposure per borrower.
- **Overcollateralization**: Even Tier 3 requires 110% collateral, providing a 10% buffer.
- **Reputation decay**: Inactive high-scoring accounts gradually lose their advantage.

### 4.4 Residual Risks

- **Score farming via small loans**: A borrower can take very small loans, repay them, and accumulate +50 per cycle. With a 7-day cooldown and 3 concurrent loans, they could earn +150/week. Reaching Tier 3 (score 750) from 0 would take ~35 weeks of perfect behavior.
- **Decay griefing**: Anyone can call `applyDecay()` on any user. While this is by design (permissionless incentive alignment), it could be used to target specific users before they try to borrow.

### 4.5 Recommended Hardening

- Implement diminishing score returns (e.g., +50 for first loan, +40 for second, etc.).
- Add minimum loan size to prevent micro-loan farming.
- Consider making decay callable only by admin or keepers.

---

## 5. Liquidity Drain Vectors

### 5.1 Threat Description
An attacker drains the lending pool's BNB reserves, leaving lenders unable to withdraw.

### 5.2 Attack Vectors

| Vector | Description | Severity |
|--------|-------------|----------|
| **Coordinated mass borrowing** | Multiple Sybil accounts borrow up to 80% utilization simultaneously | HIGH |
| **Withdrawal race** | Lenders panic-withdraw after large borrow event, causing bank run | MEDIUM |
| **Reentrancy via receive()** | Exploit the pool's `receive()` function during collateral liquidation | MEDIUM |

### 5.3 Mitigations in Place

- **80% utilization cap** (`MAX_UTILIZATION_BPS = 8000`): Pool must retain 20% liquidity at all times.
- **Withdrawal check**: `withdrawLiquidity` requires `address(this).balance >= amount + totalBorrowed`.
- **ReentrancyGuard**: On all state-changing functions.
- **CEI pattern**: All state mutations before external calls in `requestLoan`, `withdrawLiquidity`, etc.
- **Identity binding**: Sybil-resistant borrowing (one identity per wallet).

### 5.4 Residual Risks

- **Utilization ceiling is static**: The 80% cap is hardcoded. If market conditions require different thresholds, the contract cannot adapt without redeployment.
- **No withdrawal queue**: If multiple lenders try to withdraw simultaneously and the 20% buffer is insufficient, some withdrawals will fail.
- **Untracked deposits**: `depositToPool()` accepts BNB without per-lender accounting. This liquidity is not tracked and can only be recovered through admin action.

### 5.5 Recommended Hardening

- Connect utilization cap to GovernanceStub for dynamic adjustment.
- Implement a withdrawal queue/priority system.
- Consider deprecating `depositToPool()` in favor of tracked `depositLiquidity()`.

---

## 6. Governance Capture

### 6.1 Threat Description
An attacker gains control of the protocol's governance to change parameters in their favor or extract value.

### 6.2 Attack Vectors

| Vector | Description | Severity |
|--------|-------------|----------|
| **Admin key theft** | Steal the deployer's private key to control all admin functions | CRITICAL |
| **Malicious parameter change** | Set interest rates to 0%, increase max utilization to 95%, etc. | HIGH |
| **Role escalation** | Use DEFAULT_ADMIN_ROLE to grant roles to attacker-controlled contracts | HIGH |
| **Future DAO token concentration** | Accumulate governance tokens to control votes | MEDIUM (future) |

### 6.3 Mitigations in Place

- **OpenZeppelin AccessControl**: Role-based permissions with proper separation.
- **Bounds checking in GovernanceStub**: Interest rates capped to [1, 20], utilization to [5000, 9500] bps, etc.
- **Event emissions**: All parameter changes emit events for off-chain monitoring.
- **Separate role assignments**: VERIFIER_ROLE, LENDING_POOL_ROLE, MINTER_ROLE, BRIDGE_ROLE are distinct.

### 6.4 Residual Risks

- **Single admin key**: The deployer has DEFAULT_ADMIN_ROLE on all contracts. There is no timelock or multi-sig.
- **No parameter change delay**: Admin can change GovernanceStub parameters instantly.
- **GovernanceStub is not yet connected**: Protocol parameters are hardcoded as constants in the core contracts; GovernanceStub stores values but they are not read by other contracts yet.

### 6.5 Recommended Hardening

- Deploy a multi-sig (e.g., Gnosis Safe) and transfer DEFAULT_ADMIN_ROLE.
- Deploy an OpenZeppelin TimelockController with a 24-48 hour delay.
- Connect GovernanceStub parameters to LendingPool and CreditScoreZK.
- Add admin action cooldown to prevent rapid parameter changes.

---

## 7. Oracle Manipulation

### 7.1 Threat Description
An attacker manipulates price feeds or external data sources to cause incorrect collateral valuations or liquidation decisions.

### 7.2 Attack Vectors

| Vector | Description | Severity |
|--------|-------------|----------|
| **BNB price manipulation** | Crash BNB price on an AMM to trigger mass liquidations | MEDIUM |
| **Stale score oracle** | CrossChainScoreOracle accepts outdated scores from another chain | MEDIUM |
| **ZK proof manipulation** | Submit a forged proof in mock mode to set an arbitrary score | LOW (mock) |

### 7.3 Mitigations in Place

- **No external price oracle dependency**: Collateral is native BNB and valued at face value. The protocol does not use Chainlink or any external price feed, eliminating oracle manipulation as an attack vector for the current design.
- **Score range validation**: CreditScoreZK enforces scores in [0, 1000].
- **CrossChainScoreOracle access control**: `BRIDGE_ROLE` required for score syncing.
- **Mock mode safety**: `_groth16Verify` returns false in production mode if not replaced, preventing accidental bypass.

### 7.4 Residual Risks

- **No BNB price awareness**: The protocol cannot detect if BNB drops 90% intraday. The `isUndercollateralized` check is based on nominal BNB amounts, not USD value.
- **CrossChainScoreOracle has no staleness check**: A synced score from another chain could be days old.
- **Mock mode must be disabled in production**: If `productionMode` is never set to true, anyone can submit mock proofs with arbitrary scores.

### 7.5 Recommended Hardening

- Integrate Chainlink BNB/USD price feed for collateral valuation.
- Add a staleness threshold to CrossChainScoreOracle (e.g., reject scores older than 1 hour).
- Add a deployment script that verifies `productionMode` status.
- Add BNB price circuit breaker (pause if price drops > X% in Y blocks).

---

## 8. Reentrancy & Cross-Contract Exploits

### 8.1 Threat Description
An attacker exploits reentrancy in ETH transfers or cross-contract calls to drain funds or corrupt state.

### 8.2 Attack Vectors

| Vector | Description | Severity |
|--------|-------------|----------|
| **ETH transfer reentrancy** | Reenter via `receive()` during `requestLoan` BNB transfer to borrower | HIGH |
| **Cross-contract reentrancy** | Reenter LendingPool via CollateralManager during release | MEDIUM |
| **Read-only reentrancy** | Read stale state from a view function during an active transaction | LOW |

### 8.3 Mitigations in Place

- **ReentrancyGuard**: Applied to all state-changing functions in LendingPool and CollateralManager.
- **CEI Pattern enforced**: All state mutations (loan.repaid, totalBorrowed, activeLoanCount) happen before any external call or transfer in `requestLoan`, `repayLoan`, `liquidateLoan`, `withdrawLiquidity`, `releaseCollateral`, and `liquidateCollateral`.
- **Custom error on transfer failure**: `TransferFailed` reverts cleanly.

### 8.4 Residual Risks

- **OpenZeppelin ReentrancyGuard is per-contract**: If an attacker reenters LendingPool from a CollateralManager callback, the LendingPool's guard protects it. However, the CollateralManager's guard is separate, so cross-contract reentrancy between trusted contracts is theoretically possible (low risk since both are trusted).

### 8.5 Recommended Hardening

- Consider a global reentrancy lock shared between LendingPool and CollateralManager.
- Add reentrancy tests to the test suite.

---

## 9. Denial of Service

### 9.1 Threat Description
An attacker prevents legitimate users from using the protocol by consuming resources or triggering edge cases.

### 9.2 Attack Vectors

| Vector | Description | Severity |
|--------|-------------|----------|
| **Griefing via `applyDecay`** | Repeatedly call decay on users to reduce everyone's scores | MEDIUM |
| **Gas griefing on `getLoansByBorrower`** | Create thousands of micro-loans to make this view function exceed gas limits | LOW |
| **Pause abuse** | If admin key is compromised, attacker can pause all contracts | HIGH |

### 9.3 Mitigations in Place

- **Decay requires eligibility**: Can only apply decay if user is inactive 180+ days and has score > 0.
- **MAX_ACTIVE_LOANS = 3**: Limits the number of active loans per borrower, bounding the `_borrowerLoans` array growth per active period (historical records do grow unbounded).
- **Pausable with admin control**: Emergency pause available.

### 9.4 Recommended Hardening

- Add pagination to `getLoansByBorrower`.
- Add a decay cooldown per user (e.g., cannot apply decay more than once per 30 days).
- Implement admin multi-sig to prevent single-key pause abuse.

---

## 10. Risk Matrix Summary

| Threat Category | Likelihood | Impact | Current Risk | After Mitigations |
|----------------|-----------|--------|-------------|-------------------|
| Sybil Attacks | Medium | High | **MEDIUM** | Low (with proof nullifiers) |
| Flash Loan Manipulation | Low | Critical | **LOW** | Negligible |
| Identity Spoofing | Low | Critical | **MEDIUM** | Low (with multi-sig) |
| Economic Attacks | Medium | Medium | **MEDIUM** | Low (with min loan size) |
| Liquidity Drain | Low | Critical | **LOW** | Negligible |
| Governance Capture | Low | Critical | **HIGH** | Low (with timelock) |
| Oracle Manipulation | Low | High | **LOW** | Negligible |
| Reentrancy | Low | Critical | **LOW** | Negligible |
| Denial of Service | Medium | Medium | **MEDIUM** | Low |

### Priority Actions (Ordered by Risk Reduction)

1. **Deploy multi-sig for admin keys** — Reduces governance capture, identity spoofing, and DoS risks.
2. **Add proof nullifiers to ZKVerifier** — Eliminates proof replay.
3. **Connect GovernanceStub to core contracts** — Enables dynamic parameter management.
4. **Integrate Chainlink price feeds** — Enables proper collateral valuation.
5. **Add withdrawal queue** — Prevents bank run scenarios.
6. **Implement identity revocation** — Handles compromised wallet scenarios.

---

## Appendix: Contract-Level Security Properties

| Contract | ReentrancyGuard | Pausable | AccessControl | Custom Errors | CEI Pattern | Immutable Refs |
|----------|:-:|:-:|:-:|:-:|:-:|:-:|
| CreditScoreZK | Yes | Yes | Yes | Yes | N/A | N/A |
| LendingPool | Yes | Yes | Yes | Yes | Yes | Yes |
| ZKVerifier | No (no ETH) | No | Yes | Yes | N/A | Yes |
| CollateralManager | Yes | No | Yes | Yes | Yes | N/A |
| CreditPassportNFT | No (no ETH) | No | Yes | Yes | N/A | N/A |
| CrossChainScoreOracle | No (no ETH) | No | Yes | Yes | N/A | Yes |
| GovernanceStub | No (no ETH) | No | Yes | Yes | N/A | N/A |
