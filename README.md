# CredLink ZK

[![Built on BNB Chain](https://img.shields.io/badge/Built%20on-BNB%20Chain-F0B90B?style=for-the-badge)](https://www.bnbchain.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![BSC Testnet](https://img.shields.io/badge/Network-BSC%20Testnet-green?style=for-the-badge)](https://testnet.bscscan.com/)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-363636?style=for-the-badge)](https://soliditylang.org/)

**Privacy-Preserving Behavioral Credit Infrastructure for Cross-Border Financial Inclusion**

---

## Table of Contents

1. [Overview](#overview)
2. [Problem Statement](#problem-statement)
3. [Solution Architecture](#solution-architecture)
4. [Smart Contract Architecture](#smart-contract-architecture)
5. [Economic Model](#economic-model)
6. [Zero-Knowledge Design](#zero-knowledge-design)
7. [Security and Threat Model](#security-and-threat-model)
8. [Deployed Contracts (BSC Testnet - Chain ID 97)](#deployed-contracts-bsc-testnet---chain-id-97)
9. [Deployment Details](#deployment-details)
10. [Frontend Features](#frontend-features)
11. [Backend API](#backend-api)
12. [Technology Stack](#technology-stack)
13. [Getting Started](#getting-started)
14. [Future Roadmap](#future-roadmap)
15. [License](#license)

---

## Overview

CredLink ZK is a zero-knowledge behavioral credit protocol built on BNB Chain that addresses a fundamental problem in global finance: credit invisibility. When individuals migrate across borders, their established credit history does not transfer. They restart from zero, facing overcollateralized lending terms regardless of their actual financial behavior.

CredLink ZK solves this by constructing a portable, privacy-preserving, on-chain credit passport. Instead of exposing wallet balances, transaction histories, and financial strategies to lenders, MEV bots, and surveillance systems, borrowers prove their creditworthiness through a single zero-knowledge proof. The lender learns only: "Tier 3 approved." The borrower's actual wallet age, repayment history, and default ratio remain mathematically sealed.

The protocol introduces a tiered collateral system (110% to 150%) based on verifiable on-chain behavioral proofs, unlocking up to 26.7% more capital for borrowers with proven track records. Combined with AI-powered risk assessment, Sybil-resistant identity binding, soulbound NFT credentials, and a fully on-chain lending engine, CredLink ZK delivers the credit infrastructure layer that 1.4 billion unbanked adults worldwide have been excluded from.

### Core Capabilities

- **Zero-Knowledge Credit Proofs**: Prove wallet age, repayment history, and default rates without revealing underlying data
- **Moca Identity Binding**: One-person-one-wallet Sybil resistance through bijective identity mapping
- **Soulbound NFT Passport**: Non-transferable ERC721 credential encoding credit tier, ZK verification status, and country
- **Tier-Based Dynamic Collateral**: Collateral requirements from 150% (Bronze) down to 110% (Platinum) based on behavioral score
- **On-Chain Lending Protocol**: Full lending lifecycle with collateral escrow, interest calculation, liquidation, and reputation adjustment
- **AI Risk Assessment**: Groq-powered natural language risk explanations and Sybil anomaly detection
- **Cross-Chain Readiness**: Oracle infrastructure for porting credit scores across BNB Chain, Ethereum, Polygon, Arbitrum, and Base

---

## Problem Statement

### Credit Invisibility Across Borders

Traditional credit systems are siloed within national boundaries. A borrower with a decade of perfect repayment history in one country becomes a financial unknown upon crossing a border. This affects an estimated 281 million international migrants globally, forcing them to:

- Restart financial trust from zero in their destination country
- Accept predatory lending terms due to lack of local credit history
- Provide excessive collateral or guarantors for basic financial services
- Wait years to rebuild a credit profile that already existed elsewhere

### Overcollateralization in Decentralized Finance

Current DeFi lending protocols (Aave, Compound, MakerDAO) require 150% or higher collateralization regardless of borrower history. A first-time borrower and a borrower with 100 successful repayments receive identical terms. This static model:

- Destroys capital efficiency by locking 50% more value than necessary
- Excludes borrowers who cannot meet high collateral thresholds
- Ignores behavioral signals that traditional finance uses to reduce risk
- Creates no incentive for borrowers to build on-chain reputation

### Privacy Risks of Financial Exposure

Lending protocols that do attempt credit scoring require borrowers to expose their full financial history on-chain. This creates:

- Surveillance risk from wallet analysis tools and chain analytics firms
- MEV extraction opportunities for front-runners who see borrower positions
- Blacklisting vulnerability where past financial distress permanently excludes users
- Strategic exposure where competitors can observe financial positions

---

## Solution Architecture

CredLink ZK is organized into four distinct layers, each with a clear responsibility boundary.

### Layer 1: Identity Layer

The identity layer establishes Sybil resistance through bijective wallet-to-identity mapping.

**Components**:
- `CreditScoreZK.bindIdentity()`: Admin-gated function that creates a one-to-one mapping between a Moca identity hash and a wallet address. Both `identityToWallet` and `walletToIdentity` mappings are enforced, preventing double-binding from either direction.
- `CreditPassportNFT`: Soulbound ERC721 token that encodes credit score, tier, ZK verification status, Moca verification status, and country. Transfer, approval, and delegation functions all revert, making the credential non-transferable.
- **Backend Identity Service**: Handles Moca Wallet registration, keccak256 identity hashing, and verification status queries.

**Design Rationale**: Identity binding is admin-gated rather than permissionless to allow integration with off-chain KYC/identity providers (Moca Wallet, Worldcoin, Gitcoin Passport) without hardcoding any single identity standard into the contract.

### Layer 2: ZK Verification Layer

The ZK layer serves as the trust boundary between off-chain computation and on-chain state.

**Components**:
- Three Circom 2.0 circuits (`walletAgeProof`, `repaymentProof`, `defaultRatioProof`) that generate Groth16 proofs
- `ZKVerifier` contract that validates proofs and forwards verified scores to the credit engine
- Gamification system that awards Bronze, Silver, Gold, and Platinum badges based on cumulative proof submissions

**Design Rationale**: ZK proofs allow the protocol to verify credit-relevant assertions (wallet age >= 30 days, repayment rate >= 80%, default rate <= 20%) without the verifier learning the actual values. The prover reveals only the boolean result and the computed score.

### Layer 3: Credit Scoring Engine

The scoring engine maintains the on-chain source of truth for all user credit profiles.

**Components**:
- `CreditScoreZK` contract: Stores scores (0-1000), deterministically maps scores to tiers (0-3), calculates required collateral ratios, and tracks loan/repayment counters
- Reputation decay system: Penalizes inactive accounts (-20 points after 180 days, -50 points after 365 days) to ensure scores reflect current behavior
- `CrossChainScoreOracle`: Receives and stores scores synced from other chains via bridge protocols

**Design Rationale**: The scoring engine is separated from both the verification layer and the lending layer. ZKVerifier can only set absolute scores; LendingPool can only adjust scores by fixed deltas (+50/-100). This separation of privilege prevents any single contract from having unconstrained control over user scores.

### Layer 4: Lending and Liquidity Layer

The lending layer implements the full loan lifecycle with collateral escrow.

**Components**:
- `LendingPool` contract: Accepts liquidity deposits, issues loans with tier-based collateral requirements, processes repayments with interest, and executes liquidations
- `CollateralManager` contract: Single-purpose escrow that locks, releases, and liquidates BNB collateral. Only the LendingPool can trigger state transitions.
- `GovernanceStub` contract: Parameter registry storing interest rate bounds, decay settings, tier thresholds, and pool constraints. Designed for future DAO governance via TimelockController.

**Design Rationale**: Collateral is held in a separate escrow contract rather than within the LendingPool itself. This reduces the attack surface of the lending pool, simplifies reentrancy analysis, and allows the escrow logic to be audited independently.

### System Interaction Diagram

```
                         +-----------------------+
                         |      ZKVerifier       |
                         |  Validates ZK proofs  |
                         |  Awards ZK badges     |
                         +----------+------------+
                                    |
                         updateScoreFromZK(user, score)
                                    |
                                    v
+-------------------+    +-------------------------+    +------------------------+
| CreditPassportNFT |    |     CreditScoreZK       |    | CrossChainScoreOracle  |
| Soulbound ERC721  |    |  Score: 0-1000          |    | Receives scores from   |
| Non-transferable   |    |  Tier: 0-3              |    | other chains via       |
| On-chain metadata  |    |  Identity binding       |    | BRIDGE_ROLE            |
+-------------------+    |  Decay management       |    +------------------------+
                         +-----+-------------+-----+
                               |             |
            getCollateralRequired()    adjustScore(+50/-100)
            incrementLoans()           incrementRepaidLoans()
                               |             |
                               v             ^
                         +-------------------------+    +------------------------+
                         |      LendingPool        |--->|   GovernanceStub       |
                         |  Loan origination       |    |   Parameter registry   |
                         |  Repayment processing   |    |   Interest bounds      |
                         |  Liquidation execution  |    |   Tier thresholds      |
                         |  Liquidity management   |    |   Pool constraints     |
                         +----------+--------------+    +------------------------+
                                    |
                    lockCollateral() | releaseCollateral()
                                    | liquidateCollateral()
                                    v
                         +-------------------------+
                         |   CollateralManager     |
                         |   BNB escrow            |
                         |   Lock -> Release       |
                         |   Lock -> Liquidate     |
                         +-------------------------+
```

---

## Smart Contract Architecture

All contracts are written in Solidity 0.8.20 with OpenZeppelin 5.x libraries. Every contract uses custom errors (no string reverts), full NatSpec documentation, and formal invariant comments.

### CreditScoreZK

**Role**: Central reputation registry and single source of truth for all user credit profiles.

| Property | Value |
|----------|-------|
| Inheritance | AccessControl, ReentrancyGuard, Pausable |
| Score Range | 0 to 1000 (clamped) |
| Tier Mapping | Deterministic: score -> tier -> collateral ratio |
| Identity Model | Bijective: one identity hash <-> one wallet address |
| Decay | -20 at 180 days inactive, -50 at 365 days inactive |

**Key Functions**:
- `updateScoreFromZK(user, score)` -- Sets absolute score from ZK proof (VERIFIER_ROLE)
- `adjustScore(user, delta)` -- Applies +50 (repayment) or -100 (liquidation) delta (LENDING_POOL_ROLE)
- `bindIdentity(identityHash, wallet)` -- Links Moca identity to wallet (DEFAULT_ADMIN_ROLE)
- `applyDecay(user)` -- Applies inactivity penalty (permissionless)
- `getCollateralRequired(user, loanAmount)` -- Returns required collateral in wei
- `getUserTier(user)` -- Returns (score, tier, collateralRatioBps)

**Formal Invariants**:
- INV-1: `score[user] <= 1000` for all users at all times
- INV-2: `tier(score)` is monotonically non-decreasing with score
- INV-3: `collateralRatio(tier)` is monotonically non-increasing with tier
- INV-4: Identity mapping is bijective -- no two wallets share an identity, no two identities share a wallet

### ZKVerifier

**Role**: Trust boundary between off-chain ZK computation and on-chain state. Accepts Groth16 proofs, validates public signals, and forwards verified scores.

| Property | Value |
|----------|-------|
| Inheritance | AccessControl |
| Proof Format | Groth16 (a, b, c matrices + publicSignals array) |
| Public Signals | [walletAgeValid, repaymentValid, scoreOutput] |
| Badge System | Bronze (1), Silver (3), Gold (5), Platinum (10) proofs |

**Key Functions**:
- `verifyAndUpdateScore(a, b, c, publicSignals, user)` -- Validates proof and updates score on CreditScoreZK
- `setProductionVerifier(enabled)` -- Toggles mock/production mode (DEFAULT_ADMIN_ROLE)
- `getZKBadgeLevel(user)` -- Returns badge tier based on cumulative proof count

**Verification Model**:
- Mock mode (development): Validates `walletAgeValid == 1 AND repaymentValid == 1 AND score <= 1000`
- Production mode: Delegates to Groth16 verifier generated by snarkjs `exportSolidityVerifier`

### LendingPool

**Role**: Core DeFi lending engine. Coordinates borrowing, repayment, liquidation, and liquidity management.

| Property | Value |
|----------|-------|
| Inheritance | AccessControl, ReentrancyGuard, Pausable |
| Loan Duration | 30 days |
| Interest Rates | 2% (Platinum) to 5% (Bronze) per loan |
| Max Utilization | 80% of total pool assets |
| Max Active Loans | 3 per borrower |
| Loan Cooldown | 7 days between loans |
| Min Repay Delay | 1 hour after origination |

**Key Functions**:
- `depositLiquidity()` -- Lenders deposit BNB (tracked per lender)
- `withdrawLiquidity(amount)` -- Lenders withdraw with reserve checks
- `requestLoan(amount)` -- Borrower requests loan with collateral as msg.value
- `repayLoan(loanId)` -- Borrower repays principal + interest, receives collateral back
- `liquidateLoan(loanId)` -- Anyone can liquidate overdue or undercollateralized loans
- `flagAnomaly(user, reason)` / `clearAnomaly(user)` -- Admin-controlled Sybil flagging

**Formal Invariants**:
- INV-1: `totalBorrowed <= (poolBalance + totalBorrowed) * 80%`
- INV-2: Every active loan has corresponding locked collateral in CollateralManager
- INV-3: `activeLoanCount[user] <= 3` at all times
- INV-4: CEI pattern -- all state mutations complete before any external call or BNB transfer

### CollateralManager

**Role**: Single-purpose BNB escrow. Holds collateral during loan lifecycle.

| Property | Value |
|----------|-------|
| Inheritance | AccessControl, ReentrancyGuard |
| State Transitions | locked -> released (repayment) OR locked -> liquidated (default) |
| Transfer Pattern | CEI: state zeroed before BNB transfer |

**Key Functions**:
- `lockCollateral(loanId, borrower)` -- Locks msg.value as collateral (LENDING_POOL_ROLE)
- `releaseCollateral(loanId, to)` -- Returns collateral to borrower (LENDING_POOL_ROLE)
- `liquidateCollateral(loanId, pool)` -- Sends collateral to pool (LENDING_POOL_ROLE)
- `isUndercollateralized(loanId, loanAmount)` -- Returns true if collateral < 120% of loan

### CreditPassportNFT

**Role**: Soulbound ERC721 credential encoding credit identity.

| Property | Value |
|----------|-------|
| Inheritance | ERC721, AccessControl |
| Token Name | CredLink ZK Credit Passport |
| Symbol | CLZK-PASS |
| Transferability | None (soulbound) |
| Metadata | On-chain Base64-encoded JSON |

**Key Functions**:
- `mintPassport(user, score, tier, zkVerified, mocaVerified, country)` -- Creates passport (MINTER_ROLE)
- `updatePassport(user, score, tier)` -- Updates existing passport data
- `getPassport(user)` -- Returns PassportData struct and tokenId
- `tokenURI(tokenId)` -- Returns fully on-chain Base64-encoded JSON metadata

**Soulbound Enforcement**: `transferFrom`, `safeTransferFrom`, `approve`, and `setApprovalForAll` all revert unconditionally.

### CrossChainScoreOracle

**Role**: Receives and stores credit scores synced from other blockchains.

| Property | Value |
|----------|-------|
| Inheritance | AccessControl |
| Bridge Integration | BRIDGE_ROLE (LayerZero/Axelar endpoint) |
| Score Validation | Must be in [0, 1000] range |

**Key Functions**:
- `syncScoreFromOtherChain(user, score, sourceChainId, proof)` -- Records synced score (BRIDGE_ROLE)
- `getSyncedScore(user)` -- Returns synced score and last sync timestamp

### GovernanceStub

**Role**: Protocol parameter registry. Stores configurable values with bounds validation. Designed for future DAO governance.

| Parameter | Default | Bounds |
|-----------|---------|--------|
| Interest Rate Range | 2% - 5% | [1%, 20%] |
| Moderate Decay | 180 days / -20 pts | Days ascending |
| Severe Decay | 365 days / -50 pts | Days ascending |
| Tier Thresholds | 200 / 500 / 750 | Ascending, max 1000 |
| Max Utilization | 80% (8000 bps) | [50%, 95%] |
| Loan Duration | 30 days | [1 day, 365 days] |
| Loan Cooldown | 7 days | [1 hour, 30 days] |
| Max Active Loans | 3 | [1, 10] |

**Upgrade Path**: Deploy OpenZeppelin Governor + TimelockController, transfer DEFAULT_ADMIN_ROLE to Timelock, all parameter changes then require DAO vote + delay period.

---

## Economic Model

### Tier-Based Collateral Ratios

The protocol uses a four-tier system where higher credit scores unlock lower collateral requirements. Tier boundaries are deterministic functions of the on-chain score.

| Tier | Name | Score Range | Collateral Ratio | Capital Efficiency Gain |
|------|------|-------------|-------------------|------------------------|
| 0 | Bronze | 0 - 199 | 150% | Baseline (standard DeFi) |
| 1 | Silver | 200 - 499 | 135% | 10.0% reduction |
| 2 | Gold | 500 - 749 | 125% | 16.7% reduction |
| 3 | Platinum | 750 - 1000 | 110% | 26.7% reduction |

**Example**: A Platinum-tier borrower requesting a 1 BNB loan posts 1.10 BNB collateral instead of the standard 1.50 BNB, freeing 0.40 BNB of capital per loan.

### Tier-Based Interest Rates

Interest rates decrease with tier, rewarding borrowers who maintain strong behavioral profiles.

| Tier | Interest Rate (per 30-day loan) |
|------|-------------------------------|
| Platinum (3) | 2% |
| Gold (2) | 3% |
| Silver (1) | 4% |
| Bronze (0) | 5% |

**Calculation**: `interestOwed = (loanPrincipal * tierRate) / 100`

### Lender APY

Lender returns are dynamic, scaling with pool utilization to incentivize deposits when liquidity is scarce.

| Pool Utilization | Lender APY |
|-----------------|-----------|
| 0% - 40% | 4% |
| 40% - 70% | 6% |
| 70%+ | 8% |

### Reputation Scoring

Score adjustments are asymmetric by design. The cost of default exceeds the reward of repayment, creating a strong deterrent against strategic default.

| Event | Score Delta | Net Effect |
|-------|------------|------------|
| Successful Repayment | +50 | Requires 2 defaults to erase 1 repayment |
| Liquidation (default) | -100 | Requires 2 repayments to recover from 1 default |
| Moderate Inactivity (180+ days) | -20 | Encourages continued participation |
| Severe Inactivity (365+ days) | -50 | Prevents stale high scores |

**Score Farming Analysis**: With a 7-day cooldown and 3 concurrent loan maximum, a borrower can earn at most +150 points per week. Reaching Platinum (750) from zero requires approximately 35 weeks of perfect behavior -- a meaningful time investment that resists casual exploitation.

### Anti-Abuse Protection

| Mechanism | Constraint | Purpose |
|-----------|-----------|---------|
| Loan Cooldown | 7 days between successive loans | Prevents rapid cycling |
| Max Active Loans | 3 concurrent loans per borrower | Caps per-borrower exposure |
| Min Repay Delay | 1 hour after loan origination | Blocks same-block flash loan attacks |
| Same-Block Prevention | `lastDepositBlock[user] < block.number` | Blocks deposit-then-borrow in one transaction |
| Anomaly Scoring | 3 admin flags = borrowing blocked | Manual Sybil intervention |
| Pool Utilization Cap | 80% maximum | Ensures 20% liquidity reserve for withdrawals |
| Undercollateralization Threshold | 120% triggers liquidation eligibility | Protects lender capital |

### Flash Loan Mitigation

The protocol implements five independent defenses against flash loan exploitation:

1. **Same-block deposit prevention**: Borrowing requires `lastDepositBlock[msg.sender] < block.number`
2. **One-hour minimum lock**: Repayment reverts if less than 1 hour has elapsed since origination
3. **Collateral requirement**: All loans must be overcollateralized (minimum 110%)
4. **ReentrancyGuard**: Applied to all payable functions in LendingPool and CollateralManager
5. **Checks-Effects-Interactions pattern**: All state mutations complete before BNB transfers

---

## Zero-Knowledge Design

### What the Circuits Prove

CredLink ZK uses three Circom 2.0 circuits, each producing a Groth16 proof that attests to a specific behavioral property without revealing the underlying data.

| Circuit | Private Inputs | Public Inputs | Assertion |
|---------|---------------|---------------|-----------|
| `walletAgeProof` | `walletAgeDays` | `threshold` | Wallet age >= threshold (e.g., 30 days) |
| `repaymentProof` | `totalLoans`, `repaidLoans` | `minRepaymentRate` | Repayment rate >= minimum (e.g., 80%) |
| `defaultRatioProof` | `totalLoans`, `defaultedLoans` | `maxDefaultRate` | Default rate <= maximum (e.g., 20%) |

### Why Privacy Matters

In a transparent blockchain environment, credit scoring without ZK proofs would require borrowers to expose:

- **Wallet age**: Reveals when the user entered crypto, enabling targeted social engineering
- **Transaction count and patterns**: Exposes trading strategies, DeFi positions, and income patterns
- **Repayment/default counts**: Creates permanent, public stigma for past financial distress
- **Balance history**: Enables competitor surveillance and MEV targeting

Zero-knowledge proofs allow the protocol to verify credit-relevant assertions while revealing only the boolean result (pass/fail) and the computed score. The verifier learns nothing about the actual wallet age, loan count, or balance.

### On-Chain Verification Model

```
Off-Chain (User's Device)               On-Chain (BSC Testnet)
+---------------------------+           +-----------------------------+
| 1. Fetch wallet metrics   |           |                             |
|    (age, tx count, etc.)  |           |                             |
|                           |           |                             |
| 2. Compute score from     |           |                             |
|    behavioral formula     |           |                             |
|                           |           |                             |
| 3. Generate Groth16 proof |           |                             |
|    - Private: raw metrics |           |                             |
|    - Public: thresholds   |    tx     |                             |
|    - Output: proof + sigs |---------->| 4. ZKVerifier validates     |
|                           |           |    proof structure           |
+---------------------------+           |                             |
                                        | 5. Check public signals:    |
                                        |    walletAgeValid == 1      |
                                        |    repaymentValid == 1      |
                                        |    score <= 1000            |
                                        |                             |
                                        | 6. Forward score to         |
                                        |    CreditScoreZK            |
                                        |                             |
                                        | 7. Update tier, collateral  |
                                        |    ratio, badge level       |
                                        +-----------------------------+
```

### Public Signals vs Private Inputs

| Data | Visibility | Rationale |
|------|-----------|-----------|
| Wallet age in days | Private | Prevents age-based targeting |
| Total loan count | Private | Protects financial history |
| Repaid loan count | Private | Prevents reputation profiling |
| Defaulted loan count | Private | Prevents permanent stigma |
| Age threshold (e.g., 30 days) | Public | Verifier must know the standard |
| Repayment rate minimum (e.g., 80%) | Public | Verifier must know the standard |
| Default rate maximum (e.g., 20%) | Public | Verifier must know the standard |
| Pass/fail boolean | Public | The verifier's decision input |
| Computed credit score | Public | Written to on-chain state |

---

## Security and Threat Model

A comprehensive threat analysis is maintained in [THREAT_MODEL.md](./THREAT_MODEL.md). The following summarizes the protocol's security posture.

### Sybil Resistance

- **Identity Binding**: `CreditScoreZK.bindIdentity()` enforces a bijective mapping between Moca identity hashes and wallet addresses. One identity, one wallet, one score.
- **Anomaly Scoring**: Admin can flag suspicious addresses. Three flags block borrowing. Clearable upon investigation.
- **AI Anomaly Detection**: Groq-powered backend endpoint analyzes transaction patterns for Sybil indicators (airdrop farming, wash trading, coordinated behavior).

### Wallet Farming Prevention

- **7-day loan cooldown** prevents rapid cycling to farm +50 score bonuses
- **3 concurrent loan maximum** caps exposure and score accumulation rate
- **Asymmetric scoring** (-100 for default vs +50 for repayment) makes farming costly if any loan defaults
- **Reputation decay** erodes scores of inactive accounts, preventing "set and forget" strategies

### Flash Loan Attack Mitigation

- **Same-block deposit+borrow prevention** via `lastDepositBlock` check
- **1-hour minimum repay delay** prevents instant borrow-repay cycles
- **Collateral held in separate escrow** (CollateralManager), not directly accessible
- **ReentrancyGuard** on all state-changing payable functions
- **CEI pattern** enforced across all contracts

### Liquidity Drain Protection

- **80% utilization cap** ensures the pool retains 20% liquidity at all times
- **Withdrawal reserve check** prevents withdrawals that would reduce balance below outstanding loans
- **Identity binding** limits each verified identity to one wallet, bounding aggregate exposure

### Role-Based Access Control

| Role | Granted To | Permissions |
|------|-----------|------------|
| DEFAULT_ADMIN_ROLE | Deployer | Pause/unpause, bind identities, grant roles, manage anomaly flags |
| VERIFIER_ROLE | ZKVerifier contract | Set absolute scores from ZK proofs |
| LENDING_POOL_ROLE | LendingPool contract | Adjust scores, increment counters, manage collateral |
| MINTER_ROLE | Admin (initially) | Mint and update credit passport NFTs |
| BRIDGE_ROLE | Bridge endpoint (future) | Sync scores from other chains |

### Contract-Level Security Properties

| Contract | ReentrancyGuard | Pausable | AccessControl | Custom Errors | CEI Pattern |
|----------|:-:|:-:|:-:|:-:|:-:|
| CreditScoreZK | Yes | Yes | Yes | Yes | N/A (no ETH transfers) |
| LendingPool | Yes | Yes | Yes | Yes | Yes |
| CollateralManager | Yes | No | Yes | Yes | Yes |
| ZKVerifier | No (no ETH) | No | Yes | Yes | N/A |
| CreditPassportNFT | No (no ETH) | No | Yes | Yes | N/A |
| CrossChainScoreOracle | No (no ETH) | No | Yes | Yes | N/A |
| GovernanceStub | No (no ETH) | No | Yes | Yes | N/A |

### Risk Matrix

| Threat | Likelihood | Impact | Residual Risk |
|--------|-----------|--------|---------------|
| Sybil Attacks | Medium | High | Medium |
| Flash Loan Exploitation | Low | Critical | Low |
| Identity Spoofing | Low | Critical | Medium |
| Economic Gaming | Medium | Medium | Medium |
| Liquidity Drain | Low | Critical | Low |
| Governance Capture | Low | Critical | High (single admin key) |
| Oracle Manipulation | Low | High | Low |
| Reentrancy | Low | Critical | Low |
| Denial of Service | Medium | Medium | Medium |

**Priority Hardening** (see THREAT_MODEL.md for details):
1. Deploy multi-sig for admin keys
2. Add proof nullifiers to ZKVerifier
3. Connect GovernanceStub to core contracts
4. Integrate Chainlink price feeds for collateral valuation
5. Implement withdrawal queue for lender protection

---

## Deployed Contracts (BSC Testnet - Chain ID 97)

All contracts are deployed and verified on BNB Smart Chain Testnet. Addresses are sourced from `deployment-manifest.json`.

| Contract | Address | Role |
|----------|---------|------|
| CreditScoreZK | `0x5ED05A35D14cae38Bf7A73AeCF295320DA17dF33` | Core Credit Engine |
| ZKVerifier | `0xc6a420075E19D85F350F0614A5153c4475b8718a` | ZK Proof Verification |
| LendingPool | `0x53c95d8dAFBD171b28B9D874C02534e7b60390E5` | Borrowing Logic |
| CollateralManager | `0xBbEd9274652F6e82f33D2777970b0719FE2f1F99` | Escrow Management |
| CreditPassportNFT | `0x154F1EAB15a878b674cae2B8BF51eE179c4Dae05` | Soulbound Identity Passport |
| CrossChainScoreOracle | `0xc91Ef659166CBf9FeBEC263d32F1EDc41eaE1bfA` | Cross-Chain Score Sync |
| GovernanceStub | `0xE5376869F728D464Ae445322D81b2E0ff928a970` | Governance Parameter Registry |

**Block Explorer**: [BscScan Testnet](https://testnet.bscscan.com/)

**Role Grants Verified**:
- VERIFIER_ROLE on CreditScoreZK granted to ZKVerifier
- LENDING_POOL_ROLE on CreditScoreZK granted to LendingPool
- LENDING_POOL_ROLE on CollateralManager granted to LendingPool

---

## Deployment Details

### Network Configuration

| Parameter | Value |
|-----------|-------|
| Network | BNB Smart Chain Testnet |
| Chain ID | 97 |
| RPC | `https://data-seed-prebsc-1-s1.binance.org:8545/` |
| Gas Price | 10 gwei (fixed) |
| Solidity Version | 0.8.20 |
| Optimizer | Enabled, 200 runs |

### Constructor Dependency Graph

Contracts are deployed in strict dependency order across three phases:

```
Phase 1 (Independent - no constructor dependencies):
  CreditScoreZK
  CollateralManager
  CreditPassportNFT
  GovernanceStub

Phase 2 (Single dependency):
  ZKVerifier(CreditScoreZK.address)
  CrossChainScoreOracle(CreditScoreZK.address)

Phase 3 (Multi-dependency):
  LendingPool(CreditScoreZK.address, CollateralManager.address)

Phase 4 (Post-deploy role grants):
  CreditScoreZK.grantRole(VERIFIER_ROLE, ZKVerifier)
  CreditScoreZK.grantRole(LENDING_POOL_ROLE, LendingPool)
  CollateralManager.grantRole(LENDING_POOL_ROLE, LendingPool)
```

### Deployment Script

The production deployment script (`scripts/deployAll.js`) implements:

- **Pre-flight checks**: Verifies PRIVATE_KEY, deployer balance, chain ID, compiled artifacts
- **Manifest-based redeployment prevention**: Reads `deployment-manifest.json`, verifies each address has code on-chain via `getCode()`, skips already-deployed contracts
- **Per-contract gas estimation**: Estimates gas before each deployment transaction
- **Role grant deduplication**: Checks `hasRole()` before granting to avoid redundant transactions
- **Post-deploy verification**: Confirms all three role grants are active on-chain
- **Artifact generation**: Writes `deployment-manifest.json` and `frontend/lib/contract-addresses.json`
- **Recovery support**: On failure, prints partial deployment state; rerun resumes from where it stopped

```bash
# Full deployment
npx hardhat run scripts/deployAll.js --network bsctestnet

# Force redeploy (ignores existing manifest)
FORCE_REDEPLOY=1 npx hardhat run scripts/deployAll.js --network bsctestnet
```

### Gas Optimization

- All `require` strings replaced with custom errors (saves ~24 bytes per revert path)
- Constructor-set cross-contract references use `immutable` storage (2100 gas saved per read vs regular storage)
- Optimizer enabled at 200 runs (balanced for deployment cost and runtime efficiency)
- Score clamping uses conditional assignment instead of `Math.min`/`Math.max`

---

## Frontend Features

The frontend is a Next.js 14 application with five primary interfaces.

### Dashboard

The main dashboard displays the user's credit profile after wallet connection:

- **Credit Tier Card**: Animated circular SVG progress ring (0-1000 scale) with tier badge (Bronze, Silver, Gold, Platinum) and collateral ratio indicator
- **Capital Efficiency Visualization**: Side-by-side bar chart comparing traditional 150% DeFi collateral against the user's tier-based rate, with savings percentage and BNB amount
- **ZK Proof Generation**: One-click proof generation with status display (proof structure, public signals, verification result)
- **AI Risk Advisor**: Groq-powered natural language risk assessment with color-coded risk level badge (Low/Medium/Elevated/High) and model attribution
- **Statistics Row**: Total borrowed, active loans, and reputation points

### Borrow Interface

Three-step guided borrowing flow:

1. **Generate ZK Proof**: Triggers wallet analysis and proof generation. Displays proof validity flags and computed score.
2. **Set Loan Amount**: Numeric input with real-time collateral calculation. Shows required collateral, traditional DeFi collateral, savings delta, and interest rate.
3. **Lock Collateral and Confirm**: Transaction summary with one-click submission. Displays transaction hash with block explorer link upon success.

### Repay Interface

Loan management dashboard:

- **Summary Header**: Total owed, collateral locked, and active loan count
- **Loan Cards**: Individual cards per active loan showing loan ID, principal, collateral, due date, interest, and total repayment amount. Overdue loans are visually flagged.
- **Repayment Confirmation**: Single-click repay with +50 score bonus indication and tier upgrade notification

### Travel Mode

Portable credit passport system with four tabs:

- **My Passport**: Visual credit passport card with tier-colored border, circular score ring, ZK verification badge, Moca identity status, and wallet address. Includes downloadable QR code containing score, tier, ZK status, and chain identifier for privacy-preserving verification by lenders.

- **Verify Passport**: Wallet address lookup tool for lenders to verify borrower credentials. Returns identity verification status, Moca binding confirmation, and borrowing eligibility.

- **Connect Moca**: Moca Wallet identity binding interface. Guides users through identity registration for Sybil resistance, with explanation of benefits (one person, one score, credit portability).

- **Migration Simulation**: Country-to-country migration scenario tool. Calculates rental deposit reduction (40% for Tier 2+), microloan pre-approval status, credit transfer speed, borrowing power by tier, and interest rate comparison. Shows side-by-side comparison of outcomes with and without CredLink ZK.

### Lender Dashboard

Liquidity provider interface:

- **Pool Statistics**: Total Value Locked, Total Borrowed, Interest Earned, Current APY
- **Utilization Visualization**: Gradient bar with 80% threshold marker and APY tier breakpoints (4%/6%/8%)
- **Position Management**: Deposit and withdrawal inputs with dynamic yield calculation
- **Borrower Risk Distribution**: Tier-wise loan distribution with color-coded percentage bars and collateral ratio per tier
- **Capital Efficiency Engine**: Three-card comparison grid showing Traditional DeFi (150%), CredLink Gold (125%), and CredLink Platinum (110%) with savings percentages

---

## Backend API

The backend is an Express.js server providing four API modules.

### Credit Analysis (`/api/credit`)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/credit/analyze` | POST | Analyzes wallet on-chain behavior (tx count, balance, age) and returns credit score, tier, and behavioral metrics |
| `/api/credit/generate-proof` | POST | Generates Groth16 ZK proof structure with public signals [walletAgeValid, repaymentValid, score] |

### AI Risk Assessment (`/api/ai`)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/ai/risk-explanation` | POST | Generates natural language risk assessment using Groq LLaMA 3-8B (temperature 0.7) |
| `/api/ai/anomaly-detect` | POST | Detects Sybil attacks, airdrop farming, and wash trading using Groq LLaMA 3-8B (temperature 0.3) |

### Identity Management (`/api/identity`)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/identity/register` | POST | Binds Moca Wallet identity to blockchain wallet via keccak256 hash |
| `/api/identity/verify/:wallet` | GET | Checks if wallet has verified Moca identity |
| `/api/identity/status/:wallet` | GET | Returns detailed identity and borrowing eligibility status |

### Passport Queries (`/api/passport`)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/passport/public/:wallet` | GET | Returns complete credit passport (score, tier, ZK status, Moca status, badge, loan history) |
| `/api/passport/public/:wallet/badge` | GET | Returns ZK badge level and progression to next badge |

All endpoints include 60-second response caching and graceful fallback behavior when external services are unavailable.

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Smart Contracts | Solidity 0.8.20, OpenZeppelin 5.x, Hardhat | On-chain logic, access control, security |
| ZK Circuits | Circom 2.0, snarkjs, Groth16 | Privacy-preserving behavioral proofs |
| Frontend | Next.js 14, TypeScript, Tailwind CSS, wagmi v2, viem, Recharts | User interface and wallet integration |
| Backend | Express.js, ethers.js v6, Groq SDK | API services, wallet analysis, AI integration |
| AI | Groq (LLaMA 3-8B-8192) | Risk assessment and anomaly detection |
| Network | BNB Smart Chain Testnet (Chain ID 97) | Deployment target |
| Identity | Moca Wallet, keccak256 hashing | Sybil-resistant identity binding |

---

## Getting Started

### Prerequisites

- Node.js >= 18
- npm or yarn
- MetaMask or compatible Web3 wallet
- BNB Testnet tokens from [BNB Chain Faucet](https://www.bnbchain.org/en/testnet-faucet)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/credlink-zk.git
cd credlink-zk

# Install root dependencies (Hardhat, contracts)
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..

# Install backend dependencies
cd backend && npm install && cd ..
```

### Environment Configuration

```bash
# Root .env (never commit)
PRIVATE_KEY=your_wallet_private_key
OPBNB_RPC_URL=https://opbnb-testnet-rpc.bnbchain.org
BSCSCAN_API_KEY=your_bscscan_api_key

# frontend/.env.local
NEXT_PUBLIC_CHAIN_ID=97
NEXT_PUBLIC_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/
NEXT_PUBLIC_API_URL=http://localhost:3001

# backend/.env
PORT=3001
GROQ_API_KEY=your_groq_api_key
RPC_URL=https://opbnb-testnet-rpc.bnbchain.org
```

### Compile and Deploy Contracts

```bash
# Compile all contracts
npx hardhat compile

# Deploy to BSC Testnet (Chain ID 97)
npx hardhat run scripts/deployAll.js --network bsctestnet

# Verify on BscScan (optional)
npx hardhat verify --network bsctestnet <contract_address>
```

### Run Development Servers

```bash
# Terminal 1: Backend API (port 3001)
cd backend && node server.js

# Terminal 2: Frontend (port 3000)
cd frontend && npm run dev
```

Open `http://localhost:3000` in a browser with MetaMask configured for BSC Testnet.

---

## Future Roadmap

### Cross-Chain Credit Portability

Integrate LayerZero or Axelar messaging to propagate credit scores from BNB Chain to Ethereum, Polygon, Arbitrum, and Base. The `CrossChainScoreOracle` contract is already deployed with `BRIDGE_ROLE` access control, requiring only the bridge endpoint integration.

### DAO Governance

Transition from single-admin-key governance to a decentralized autonomous organization. Deploy OpenZeppelin Governor and TimelockController, transfer DEFAULT_ADMIN_ROLE to the Timelock, and enable token-weighted voting on protocol parameters (interest rates, tier thresholds, decay settings, utilization caps).

### Real ZK Multi-Proof Aggregation

Replace mock Groth16 proofs with production-grade verification using snarkjs `exportSolidityVerifier`. Aggregate the three circuit proofs (wallet age, repayment rate, default ratio) into a single recursive proof to reduce on-chain verification gas from ~3x to ~1x.

### Institutional Integration

Develop standardized APIs for traditional financial institutions to query CredLink ZK credit passports (with user consent via signed authorization). Enable banks and fintech providers in destination countries to accept on-chain credit scores as supplementary credit data.

### Migrant Microcredit Pools

Create purpose-built lending pools for migrant communities with reduced minimum loan sizes, extended repayment periods, and community-backed liquidity. Integrate with remittance corridors to allow credit building through regular cross-border transfers.

### Protocol Hardening

- Deploy Gnosis Safe multi-sig for all admin roles
- Add proof nullifier tracking to prevent proof replay
- Integrate Chainlink BNB/USD price feed for collateral valuation
- Implement lender withdrawal queue with priority ordering
- Add identity revocation with cooling-off period for compromised wallets

---

## License

MIT

---

## Acknowledgments

Built for the BNB Chain x YZI Labs Hackathon -- Bengaluru 2026.

Protocol design informed by research in privacy-preserving credit scoring, behavioral DeFi, and financial inclusion for cross-border migrants. Built on OpenZeppelin security standards and BNB Chain infrastructure.
