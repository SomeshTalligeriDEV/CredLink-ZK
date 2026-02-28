# Frontend Architecture & Design Documentation

**CredLink ZK -- Privacy-Preserving Behavioral Credit Protocol**
**Version:** 1.0
**Last Updated:** February 2026
**Chain:** BNB Smart Chain Testnet (Chain ID 97) / opBNB Testnet (Chain ID 5611)

---

## Table of Contents

1. [Frontend Technology Stack](#1-frontend-technology-stack)
2. [Folder Structure & File Map](#2-folder-structure--file-map)
3. [Smart Contract Integration Layer](#3-smart-contract-integration-layer)
4. [Data Flow Architecture](#4-data-flow-architecture)
5. [Travel Mode UI](#5-travel-mode-ui)
6. [Lender Dashboard UI](#6-lender-dashboard-ui)
7. [Capital Efficiency Visual Engine](#7-capital-efficiency-visual-engine)
8. [Real-Time Validation System](#8-real-time-validation-system)
9. [UI Design Patterns & Theming](#9-ui-design-patterns--theming)
10. [Recommendations for Future Redesign](#10-recommendations-for-future-redesign)

---

## 1. Frontend Technology Stack

### Core Framework

| Technology | Version | Purpose |
|---|---|---|
| Next.js | 14.0.4 | React framework with App Router, server components, file-based routing |
| React | 18.2.x | UI rendering, hooks-based state management |
| TypeScript | 5.3.x | Static typing across all frontend code |
| Tailwind CSS | 3.4.x | Utility-first CSS, custom theme tokens |

### Web3 Stack

| Technology | Version | Purpose |
|---|---|---|
| wagmi | 2.5.0 | React hooks for Ethereum (useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt) |
| viem | 2.7.0 | Low-level EVM interaction, ABI encoding, address parsing, public client for health checks |
| @tanstack/react-query | 5.17.0 | Async state management, caching layer beneath wagmi |

### Visualization & UI

| Technology | Version | Purpose |
|---|---|---|
| recharts | 2.10.3 | Charting library (available but not currently used in pages) |
| lucide-react | 0.303.0 | Icon system (Shield, Brain, Wallet, TrendingUp, Zap, Lock, etc.) |
| qrcode | 1.5.4 | QR code generation for credit passport |

### Build & Configuration

| Technology | Purpose |
|---|---|
| PostCSS + Autoprefixer | CSS processing pipeline |
| @next/swc-darwin-arm64 | SWC compiler for macOS ARM builds |
| tsconfig target: ES5 | Broad browser compatibility (requires `BigInt()` constructor instead of `0n` literals) |

### Key Configuration Decisions

- **`reactStrictMode: true`** in `next.config.js` enables double-invocation of effects in development for detecting side effects.
- **Path alias `@/*`** maps to the `frontend/` root, enabling imports like `@/lib/contracts` and `@/components/WalletConnect`.
- **All pages are `'use client'`** components. The App Router is used for routing only; no React Server Components are currently utilized.

---

## 2. Folder Structure & File Map

```
frontend/
├── app/
│   ├── layout.tsx              Root layout: WagmiProvider, QueryClientProvider, nav, footer
│   ├── page.tsx                Dashboard: credit score, proof generation, AI advisor
│   ├── globals.css             Base styles, CSS variables, keyframe animations
│   ├── borrow/
│   │   └── page.tsx            3-step borrow flow with live contract calls
│   ├── repay/
│   │   └── page.tsx            Loan listing and repayment with live contract calls
│   ├── travel/
│   │   └── page.tsx            4-tab credit passport system (mock data)
│   └── lender/
│       └── page.tsx            Liquidity provider dashboard (simulated data)
├── components/
│   ├── WalletConnect.tsx       Wallet connection/disconnection with address dropdown
│   ├── CreditTierCard.tsx      SVG progress ring, tier badge, collateral ratio bar
│   ├── LoanForm.tsx            Loan amount input with collateral calculator
│   ├── AIAdvisor.tsx           AI risk assessment display panel
│   └── CapitalEfficiency.tsx   Bar chart comparing traditional vs tier-based collateral
├── lib/
│   ├── contract-addresses.json Deployed contract addresses (BSC Testnet, chain 97)
│   ├── contracts.ts            ABI definitions, CONTRACT_ADDRESSES exports, getCollateralForAmount()
│   ├── zk-proof.ts             Backend API client: analyzeWallet, generateProof, getRiskExplanation
│   ├── liveCheck.ts            On-chain health validation using viem public client
│   └── groq.ts                 AI anomaly detection API client
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
├── postcss.config.js
└── .env.local                  Environment variables (chain ID, contract addresses)
```

### File Responsibilities

| File | Lines | Contract Interaction | Data Source |
|---|---|---|---|
| `layout.tsx` | 110 | None (provider setup only) | wagmi config |
| `page.tsx` (Dashboard) | 196 | None directly (delegates to lib) | Backend API via zk-proof.ts |
| `borrow/page.tsx` | 268 | `useWriteContract` -> `requestLoan` | Live contract (LendingPool) |
| `repay/page.tsx` | 183 | `useReadContract` -> `getLoansByBorrower`, `useWriteContract` -> `repayLoan` | Live contract (LendingPool) |
| `travel/page.tsx` | 603 | None | Hardcoded mock + Backend API |
| `lender/page.tsx` | 384 | None | Simulated with `setTimeout` |

---

## 3. Smart Contract Integration Layer

### Architecture Overview

The frontend interacts with deployed smart contracts through two distinct pathways:

```
                     ┌─────────────────────────────┐
                     │       React Components       │
                     └──────┬──────────────┬────────┘
                            │              │
         ┌──────────────────▼──┐    ┌──────▼──────────────────┐
         │   wagmi hooks       │    │   viem public client    │
         │   (user actions)    │    │   (health checks)       │
         └──────────┬──────────┘    └──────────┬──────────────┘
                    │                          │
         ┌──────────▼──────────┐    ┌──────────▼──────────────┐
         │   contracts.ts      │    │   liveCheck.ts          │
         │   (ABIs + addrs)    │    │   (validation client)   │
         └──────────┬──────────┘    └──────────┬──────────────┘
                    │                          │
         ┌──────────▼──────────────────────────▼──────────────┐
         │          BNB Smart Chain Testnet (Chain ID 97)     │
         │   CreditScoreZK | LendingPool | ZKVerifier | ...  │
         └────────────────────────────────────────────────────┘
```

### Contract Address Resolution

Contract addresses are stored in `lib/contract-addresses.json` and loaded at build time:

```json
{
  "CreditScoreZK": "0x5ED05A35D14cae38Bf7A73AeCF295320DA17dF33",
  "CollateralManager": "0xBbEd9274652F6e82f33D2777970b0719FE2f1F99",
  "ZKVerifier": "0xc6a420075E19D85F350F0614A5153c4475b8718a",
  "LendingPool": "0x53c95d8dAFBD171b28B9D874C02534e7b60390E5",
  "CreditPassportNFT": "0x154F1EAB15a878b674cae2B8BF51eE179c4Dae05",
  "CrossChainScoreOracle": "0xc91Ef659166CBf9FeBEC263d32F1EDc41eaE1bfA",
  "GovernanceStub": "0xE5376869F728D464Ae445322D81b2E0ff928a970",
  "network": "BNB Smart Chain Testnet",
  "chainId": 97
}
```

`contracts.ts` re-exports these as typed `0x${string}` addresses for wagmi compatibility:

```typescript
export const CONTRACT_ADDRESSES = {
  CreditScoreZK: addresses.CreditScoreZK as `0x${string}`,
  CollateralManager: addresses.CollateralManager as `0x${string}`,
  ZKVerifier: addresses.ZKVerifier as `0x${string}`,
  LendingPool: addresses.LendingPool as `0x${string}`,
};
```

### ABI Definitions

Three contract ABIs are defined inline in `contracts.ts` using `as const` assertions for wagmi type inference:

| ABI Constant | Functions Exposed | Used By |
|---|---|---|
| `CREDITSCORE_ABI` | `getUserTier`, `getCollateralRequired`, `getUserProfile` | Dashboard (indirect), health checks |
| `LENDINGPOOL_ABI` | `requestLoan`, `repayLoan`, `depositToPool`, `getLoansByBorrower`, `totalBorrowed`, `liquidateLoan` | Borrow page, Repay page |
| `ZKVERIFIER_ABI` | `verifyAndUpdateScore` | Proof submission (not yet wired in frontend) |

### wagmi Hook Usage by Page

**Borrow Page (`borrow/page.tsx`):**
- `useAccount()` -- wallet connection state
- `useWriteContract()` -- sends `requestLoan` transaction to LendingPool
- `useWaitForTransactionReceipt({ hash: txHash })` -- tracks transaction confirmation
- Transaction sends `parseEther(loanAmount)` as the requested amount with `parseEther(collateralRequired)` as `msg.value`

**Repay Page (`repay/page.tsx`):**
- `useAccount()` -- wallet connection state
- `useReadContract()` -- calls `getLoansByBorrower(address)` to fetch active loans
- `useWriteContract()` -- sends `repayLoan(loanId)` with repayment amount as `msg.value`
- `useWaitForTransactionReceipt()` -- tracks repayment confirmation
- Repayment amount is computed as `loan.amount * 102n / 100n` (2% interest)

**Dashboard (`page.tsx`):**
- `useAccount()` -- wallet connection state
- No direct contract calls; delegates to `zk-proof.ts` which calls the backend API

### Chain Mismatch (Known Issue)

`layout.tsx` configures wagmi with **opBNB Testnet (Chain ID 5611)** via `defineChain()`:

```typescript
const opBNBTestnet = defineChain({
  id: 5611,
  name: 'opBNB Testnet',
  nativeCurrency: { name: 'BNB', symbol: 'tBNB', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://opbnb-testnet-rpc.bnbchain.org'] },
  },
});
```

However, all contracts are deployed to **BSC Testnet (Chain ID 97)**, and `contract-addresses.json` states `"chainId": 97`. The `.env.local` file also references `NEXT_PUBLIC_CHAIN_ID=5611`. The `liveCheck.ts` health check module correctly uses `bscTestnet` (chain 97).

This mismatch means wagmi-based contract calls (borrow, repay) will target opBNB Testnet while the contracts live on BSC Testnet. For the frontend to interact with the deployed contracts, the wagmi chain configuration must be updated to BSC Testnet (chain 97).

---

## 4. Data Flow Architecture

### Flow 1: Dashboard -- Wallet Analysis & ZK Proof Generation

```
User connects wallet
        │
        ▼
useAccount() provides address
        │
        ▼
useEffect triggers handleAnalyze()
        │
        ▼
zk-proof.ts → POST /api/credit/analyze { walletAddress }
        │
        ▼
Backend returns WalletAnalysis:
  { walletAge, txCount, balance, estimatedScore, repayments, defaultRatio, tier }
        │
        ▼
User clicks "Generate ZK Proof"
        │
        ▼
zk-proof.ts → POST /api/credit/generate-proof
  { walletAddress, walletAge, repayments, defaultRatio }
        │
        ▼
Backend returns ProofResult:
  { proof: {a, b, c}, publicSignals, score, tier, walletAgeValid, repaymentValid }
        │
        ▼
zk-proof.ts → POST /api/ai/risk-explanation
  { address, score, tier, totalLoans, repaidLoans }
        │
        ▼
AIAdvisor component displays explanation
```

**Fallback behavior:** If any API call fails, `zk-proof.ts` returns hardcoded mock data. This ensures the UI always renders, but the data is not from the blockchain. The mock returns: score 720, tier 2 (Gold), walletAge 365 days.

### Flow 2: Borrow -- 3-Step Loan Request

```
Step 1: Generate ZK Proof
  └── analyzeWallet() → generateProof() → sets proofResult state → advances to Step 2

Step 2: Set Loan Amount
  └── User enters BNB amount
  └── Collateral calculator computes: collateralRequired = amount * (collateralRatio / 100)
  └── UI shows savings vs. traditional 150% DeFi collateral
  └── User clicks "Continue" → advances to Step 3

Step 3: Lock Collateral & Request Loan
  └── writeContract({
        address: LendingPool,
        functionName: 'requestLoan',
        args: [parseEther(loanAmount)],
        value: parseEther(collateralRequired),
      })
  └── useWaitForTransactionReceipt tracks confirmation
  └── On success: shows tx hash with explorer link
```

### Flow 3: Repay -- Loan Listing & Repayment

```
Page loads
  └── useReadContract → getLoansByBorrower(address) → returns Loan[] array
  └── Filters to activeLoans (where !repaid && !liquidated)
  └── Computes totalOwed and totalCollateralLocked

User clicks "Repay Loan" on a loan card
  └── writeContract({
        address: LendingPool,
        functionName: 'repayLoan',
        args: [loan.id],
        value: loan.amount * 102n / 100n,
      })
  └── On success: displays score improvement message (+50 points)
```

### Flow 4: Backend API Surface

All backend calls target `NEXT_PUBLIC_API_URL` (default: `http://localhost:3001`):

| Endpoint | Method | Called From | Purpose |
|---|---|---|---|
| `/api/credit/analyze` | POST | `zk-proof.ts` | Analyze wallet on-chain behavior |
| `/api/credit/generate-proof` | POST | `zk-proof.ts` | Generate Groth16 ZK proof |
| `/api/ai/risk-explanation` | POST | `zk-proof.ts` | AI-powered credit risk narrative |
| `/api/ai/anomaly-detect` | POST | `groq.ts` | Sybil/anomaly detection |
| `/api/identity/register` | POST | `travel/page.tsx` | Bind Moca identity to wallet |
| `/api/identity/status/:address` | GET | `travel/page.tsx` | Check identity verification status |

---

## 5. Travel Mode UI

**File:** `app/travel/page.tsx` (603 lines)

### Purpose

Travel Mode represents the "credit passport" concept -- a portable, privacy-preserving credit identity that works across borders. This is the narrative centerpiece of the CredLink ZK protocol, designed to demonstrate the real-world use case of cross-border credit portability.

### Tab Architecture

The page uses a 4-tab system managed by `useState("passport")`:

| Tab | Label | Data Source | Contract Interaction |
|---|---|---|---|
| `passport` | My Passport | Hardcoded mock state | None |
| `verify` | Verify Passport | Backend API (`/api/identity/status`) | None |
| `connect` | Connect Moca | Backend API (`/api/identity/register`) | None |
| `migrate` | Migration Sim | Client-side computation | None |

### Tab 1: My Passport

**Data source:** Entirely from component-level `useState`:

```typescript
const [creditData, setCreditData] = useState({
  score: 782, tier: 3, tierName: "Platinum",
  collateralRatio: 110, mocaVerified: false,
  zkVerified: false, passportTokenId: null as number | null,
});
```

This data is static and hardcoded. It does not read from any contract or backend.

**Visual elements:**
- Passport card with tier-colored border (uses `tierColors` array: `["#FF4757", "#FF9F43", "#00D2D3", "#00D084"]`)
- SVG score ring (120x120 viewBox, radius 50, stroke dash computed as `(score / 1000) * 314`)
- Detail rows: Tier, Collateral Required, ZK Verified status, Moca Identity binding status
- Wallet address display (monospace, break-all)

**QR Code generation:**
- Uses dynamic import: `const QRCode = (await import("qrcode")).default`
- Encodes a JSON payload: wallet, tier, tierName, score, collateralRatio, zkVerified, mocaVerified, passportNFTTokenId, chain, timestamp
- Themed in brand colors: dark `#F0B90B` on light `#0D0D0D`
- Renders as a downloadable PNG via `QRCode.toDataURL()`
- Download button creates a temporary `<a>` element and triggers click

### Tab 2: Verify Passport

- Input: wallet address (0x...)
- Action: `GET /api/identity/status/${verifyAddress}` via `handleVerify()`
- Display: Identity verification result with mocaVerified, canBorrow, walletAddress fields
- Color-coded result card: green for verified, red for unverified

### Tab 3: Connect Moca

- Input: Moca Identity ID string
- Action: `POST /api/identity/register` with `{ walletAddress, mocaIdentityId }`
- On success: sets `creditData.mocaVerified = true`
- Informational panel explains why Moca binding matters (Sybil prevention, portable credit)

### Tab 4: Migration Simulation

- Inputs: origin country (6 options) and destination country (6 options) via `<select>` dropdowns
- Computation is entirely client-side, based on `creditData.tier` and `creditData.score`:
  - `rentalDepositReduction`: 40% for tier >= 2, 20% for tier >= 1, 0% otherwise
  - `microloanApproval`: true if score >= 500
  - `creditTransferTime`: "Instant" if zkVerified, else "24-48 hours"
  - `borrowingPower`: Full/Standard/Limited based on tier
  - `interestRate`: 2%/3%/4%/5% based on tier
- Visual comparison: "WITHOUT CREDLINK" vs "WITH CREDLINK ZK" side-by-side cards

### Design Note

The entire Travel Mode page operates on mock/simulated data. No contract reads or writes occur. The `creditData` state is initialized with hardcoded values and only modified locally when Moca registration succeeds. In a production implementation, this page would need to:
1. Read the user's on-chain credit score from `CreditScoreZK.getUserProfile()`
2. Check passport NFT ownership via `CreditPassportNFT.balanceOf()`
3. Verify ZK proof status via `ZKVerifier` contract state

---

## 6. Lender Dashboard UI

**File:** `app/lender/page.tsx` (384 lines)

### Purpose

The Lender Dashboard provides a liquidity provider interface for depositing BNB into the lending pool, tracking yield, and monitoring pool health metrics.

### Data Source: Fully Simulated

All data on this page is hardcoded or simulated. There are zero contract interactions.

**Pool data** is set via `useEffect` on mount:

```typescript
useEffect(() => {
  setPoolData({
    poolBalance: "125.4",
    totalBorrowed: "48.2",
    totalLiquidity: "150.0",
    interestEarned: "3.82",
    utilization: 28,
    currentAPY: 4,
  });
  if (address) {
    setLenderInfo({
      deposited: "10.0",
      estimatedYield: "0.40",
    });
  }
}, [address]);
```

**Deposit and Withdraw** actions use `setTimeout` to simulate a 2-second transaction delay:

```typescript
const handleDeposit = async () => {
  setDepositing(true);
  await new Promise((r) => setTimeout(r, 2000));
  // Updates local state only, no contract call
  setDepositing(false);
};
```

### Visual Components

**Pool Stats Row (4 cards):**
- Total Value Locked (gold `#F0B90B`)
- Total Borrowed (orange `#FF9F43`)
- Interest Earned (green `#00D084`)
- Current APY (cyan `#00D2D3`)

**Utilization Bar:**
- Full-width progress bar with gradient fill
- Color-coded: green (0-40%), gold (40-70%), red (70%+)
- 80% max line rendered as absolute-positioned red divider
- Below: 3 APY tier cards showing utilization-based yield tiers (4%, 6%, 8%)

**Lender Position Panel:**
- Your Deposits, Estimated Annual Yield, Current APY
- Deposit input + button
- Withdraw input + button (validates against deposited amount)

**Borrower Risk Distribution:**
- 4 tier bars (Bronze 15%, Silver 30%, Gold 35%, Platinum 20%) -- all hardcoded
- Each tier shows collateral requirement and percentage bar with tier-specific color
- Pool Safety note explaining over-collateralization

**Capital Efficiency Engine** (embedded in lender page):
- Uses a local `EfficiencyCard` component (defined at bottom of file, lines 331-383)
- 3 comparison cards: Traditional DeFi (150%), CredLink Gold (125%), CredLink Platinum (110%)
- Each card has a vertical bar visual showing collateral ratio proportionally
- Shows savings percentage badge

### Production Implementation Requirements

To make this page functional, it needs:
1. `useReadContract` calls to `LendingPool.getPoolSnapshot()` for real pool state
2. `useWriteContract` call to `LendingPool.depositToPool()` (payable, sends BNB as msg.value)
3. A withdraw function on the LendingPool contract (not currently in the ABI)
4. Event listener for deposit/withdrawal confirmations
5. Real tier distribution data from contract analytics

---

## 7. Capital Efficiency Visual Engine

The capital efficiency visualization appears in two locations with different implementations:

### Location 1: Dashboard Component (`components/CapitalEfficiency.tsx`)

**Props:** `{ tier: number, collateralRatio: number }`

**Visualization:**
- Two horizontal bar charts comparing Traditional DeFi (150%) vs. the user's tier-based rate
- Traditional bar: red gradient, always 100% width
- User bar: green gradient, width proportional to `(collateralRatio / 150) * 100`%
- Both bars show BNB amounts for a 1 BNB example loan

**Savings calculation:**
```typescript
const savings = 150 - collateralRatio;
const savingsPercent = ((savings / 150) * 100).toFixed(1);
const savedAmount = traditionalCollateral - yourCollateral;
```

**Tier breakdown grid:** 4 cells (T0-T3) showing ratios 150/135/125/110, with the user's current tier highlighted via gold border and background.

### Location 2: Lender Page Inline (`lender/page.tsx`, lines 287-325)

Uses the `EfficiencyCard` subcomponent with vertical bar visuals:
- Bar height calculated as `(collateral / 150) * 100`% of a 128px container
- Gradient fill from semi-transparent to solid tier color
- Shows "X% saved" badge for CredLink tiers, "Baseline" badge for traditional

### Collateral Ratio Mapping

Both implementations use the same underlying tier system:

| Tier | Name | Score Threshold | Collateral Ratio | Capital Saved vs 150% |
|---|---|---|---|---|
| 0 | Bronze | 0-199 | 150% | 0% |
| 1 | Silver | 200-499 | 135% | 10% |
| 2 | Gold | 500-749 | 125% | 16.7% |
| 3 | Platinum | 750-1000 | 110% | 26.7% |

These ratios are defined in `zk-proof.ts`:

```typescript
export function getCollateralRatio(tier: number): number {
  const ratios = [150, 135, 125, 110];
  return ratios[tier] || ratios[0];
}
```

And duplicated in `contracts.ts` (as decimal multipliers):

```typescript
const COLLATERAL_RATIOS = [1.5, 1.35, 1.25, 1.1];
```

---

## 8. Real-Time Validation System

### Frontend: `lib/liveCheck.ts`

**Purpose:** Provides a programmatic health check that validates all deployed contracts are live and properly configured on BSC Testnet. Designed to be called from the browser console or any component.

**Client Setup:**
```typescript
const client = createPublicClient({
  chain: bscTestnet,
  transport: http("https://data-seed-prebsc-1-s1.binance.org:8545/"),
});
```

Note: This uses the BSC Testnet RPC directly (chain 97), independent of the wagmi provider which is configured for opBNB (chain 5611).

**Validation Steps:**

| Step | What It Checks |
|---|---|
| 1. Network | `getChainId()` returns 97 |
| 2. Address validation | All 5 contract addresses present and non-zero |
| 3. Bytecode checks | `getCode()` returns non-empty bytecode for all 5 contracts |
| 4. State reads | LendingPool: `loanCounter`, `totalBorrowed`, `totalLiquidity`; CreditPassportNFT: `name()`, `symbol()`; ZKVerifier: `productionMode()`, `creditScoreZK()` |
| 5. Role verification | CreditScoreZK: `hasRole(VERIFIER_ROLE, ZKVerifier)`, `hasRole(LENDING_POOL_ROLE, LendingPool)` |

**Return type:** `LiveCheckResult` interface with nested objects for network, contracts, roles, state, and errors.

**Two export functions:**
- `validateLiveConnection()` -- returns full result object, logs to console
- `assertLiveConnection()` -- throws on any failure (use in `useEffect` guards)

### Backend: `scripts/systemHealthCheck.js`

The companion Node.js script (`scripts/systemHealthCheck.js`) runs 51 validation checks across 7 categories using ethers v6. It validates network connectivity, address consistency between manifest files, bytecode existence, role-based access control, live on-chain state reads, immutable reference integrity, and event scan capability (with graceful handling for BSC RPC rate limits).

---

## 9. UI Design Patterns & Theming

### Color System

Defined in `tailwind.config.ts` and `globals.css`:

| Token | Value | Usage |
|---|---|---|
| `gold` | `#F0B90B` | Primary brand color (BNB Chain gold), CTAs, highlights, tier labels |
| `gold-dark` | `#C99A0A` | Hover state for gold buttons |
| `dark` | `#0D0D0D` | Page background, deepest layer |
| `dark-card` | `#1A1A1A` | Card backgrounds, panels |
| `dark-border` | `#2A2A2A` | Card borders, dividers, input borders |

**Tier-specific colors** (used across CreditTierCard, Travel, Lender):

| Tier | Color | Hex |
|---|---|---|
| Bronze (0) | Red | `#FF4757` (Travel) / `#CD7F32` (Dashboard) |
| Silver (1) | Orange/Silver | `#FF9F43` (Travel) / `#C0C0C0` (Dashboard) |
| Gold (2) | Cyan/Gold | `#00D2D3` (Travel) / `#FFD700` (Dashboard) |
| Platinum (3) | Green/Platinum | `#00D084` (Travel) / `#E5E4E2` (Dashboard) |

Note: The tier color palettes differ between Travel Mode (`tierColors` array) and the Dashboard (`getTierColor()` in zk-proof.ts). This is a design inconsistency.

### CSS Animations

Defined in `globals.css`:

```css
@keyframes pulse-gold {
  0%, 100% { box-shadow: 0 0 0 0 rgba(240, 185, 11, 0.4); }
  50% { box-shadow: 0 0 20px 10px rgba(240, 185, 11, 0.1); }
}

@keyframes score-fill {
  from { stroke-dashoffset: 283; }  /* Full circumference for r=45 */
}
```

The `.score-ring` animation runs once on mount (1.5s ease-out) to animate the credit score SVG circle fill. The `.animate-pulse-gold` class provides a subtle glow effect.

### Layout Patterns

**Root Layout (`layout.tsx`):**
- Sticky navbar with `backdrop-blur-sm` and semi-transparent background
- Mobile hamburger menu with slide-down links
- Content area: `max-w-7xl mx-auto` with responsive padding
- Footer with mission statement and hackathon attribution

**Card Pattern:**
```
bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6
```

This pattern is used consistently across all pages for content panels. Some pages use `bg-[#0D0D12]` with `border-[#1A1A25]` as a slight variation.

**Button Patterns:**

| Type | Class Pattern |
|---|---|
| Primary (CTA) | `bg-gold text-black font-semibold rounded-lg hover:bg-gold-dark` |
| Secondary | `border border-gold/40 text-gold hover:bg-gold/10` |
| Disabled | `disabled:opacity-50 disabled:cursor-not-allowed` |

**Input Pattern:**
```
bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-4 py-3 text-white
focus:outline-none focus:border-gold transition-colors
```

Some pages use `bg-[#1A1A25]` with `border-[#2A2A35]` for slightly different depth.

### State Feedback Patterns

| State | Visual Pattern |
|---|---|
| Loading | `Loader2` icon with `animate-spin` + text like "Generating..." |
| Success | Green card: `bg-green-500/10 border border-green-500/20` with `Check` icon |
| Error | Red card: `bg-red-500/10 border border-red-500/20` with `AlertCircle` icon |
| Warning | Yellow text: `text-yellow-500/70` |
| Not connected | Gold shield icon + "Connect Your Wallet" message |

### SVG Score Ring Implementation

Used in both `CreditTierCard.tsx` and `travel/page.tsx`:

**CreditTierCard (Dashboard):**
- Viewbox: `0 0 200 200`, radius 80
- Circumference: `2 * PI * 80 = 502.65`
- Progress: `strokeDashoffset = circumference * (1 - score/1000)`
- Stroke width: 12, with round linecap

**Travel Passport:**
- Viewbox: `0 0 120 120`, radius 50
- Stroke dash array: `(score / 1000) * 314` out of 314 total
- Stroke width: 10, with round linecap
- Rotated -90deg to start from top

### Responsive Design

- Grid layouts use `grid-cols-1 md:grid-cols-2` or `lg:grid-cols-3` breakpoints
- Navigation links hidden on mobile (`hidden md:flex`), shown in hamburger menu
- Step indicators hide labels on small screens (`hidden sm:inline`)
- All containers use `max-w-{size} mx-auto` for centered content

### Icon System

All icons come from `lucide-react`. Commonly used icons:

| Icon | Context |
|---|---|
| `Shield` | ZK proof, security, wallet not connected |
| `Brain` | AI advisor |
| `Wallet` | Wallet connection, balance displays |
| `TrendingUp` | Capital efficiency, reputation |
| `Zap` | Proof generation action |
| `Lock` | Generate ZK proof button (pre-generation) |
| `Check` | Completed steps, successful actions |
| `Loader2` | Spinning loading indicator |
| `ExternalLink` | Explorer links |
| `AlertCircle` | Error messages |
| `ChevronDown` | Wallet dropdown |

---

## 10. Recommendations for Future Redesign

### Critical Fixes

**1. Chain ID Mismatch Resolution**

The wagmi config in `layout.tsx` must be updated to target BSC Testnet (chain 97) to match the deployed contracts. Current config points to opBNB Testnet (5611). This is a blocking issue for all contract interactions via wagmi hooks.

```typescript
// Current (incorrect for deployed contracts):
const opBNBTestnet = defineChain({ id: 5611, ... });

// Required:
import { bscTestnet } from 'viem/chains';
// Use bscTestnet in createConfig
```

**2. Environment Variable Alignment**

`.env.local` contains `NEXT_PUBLIC_CHAIN_ID=5611` and contract addresses set to zero (`0x0000...`). These must be updated to chain 97 and the actual deployed addresses. Consider removing the env-based addresses entirely in favor of the JSON file, which already contains correct values.

**3. Tier Color Inconsistency**

Two separate color palettes exist for the same tier system:
- `zk-proof.ts`: Bronze `#CD7F32`, Silver `#C0C0C0`, Gold `#FFD700`, Platinum `#E5E4E2`
- `travel/page.tsx`: `["#FF4757", "#FF9F43", "#00D2D3", "#00D084"]`

Consolidate into a single `tierColors` export from `zk-proof.ts` or a shared constants file.

### Functional Gaps

**4. Lender Page: Wire to Real Contracts**

Replace all `setTimeout` simulations with actual contract calls:
- `useReadContract` for `LendingPool.getPoolSnapshot()` (pool stats)
- `useWriteContract` for `LendingPool.depositToPool()` (deposit)
- Implement withdrawal function (may require new contract method)
- Replace hardcoded tier distribution with on-chain analytics

**5. Travel Page: Wire to Real Contracts**

Replace hardcoded `creditData` with:
- `CreditScoreZK.getUserProfile(address)` for score, tier, collateral ratio
- `CreditPassportNFT.balanceOf(address)` for passport ownership
- `ZKVerifier` state for ZK verification status
- Keep Moca identity binding via backend API (off-chain by design)

**6. ZK Proof On-Chain Submission**

The frontend generates ZK proofs via the backend but never submits them on-chain. Add a step after proof generation that calls `ZKVerifier.verifyAndUpdateScore()` with the proof's (a, b, c) parameters and public signals. The ABI is already defined in `contracts.ts`.

**7. Dashboard Contract Reads**

The dashboard currently relies entirely on the backend API for credit data. Add direct on-chain reads:
- `CreditScoreZK.getUserProfile(address)` for verified score
- `LendingPool.getLoansByBorrower(address)` for loan count
- Compare on-chain vs. API data for consistency

### Architectural Improvements

**8. Extract Shared State**

Multiple pages independently call `analyzeWallet()` and `generateProof()`. Consider a React context or zustand store for:
- Wallet analysis results (cached per session)
- Current proof result
- User's on-chain credit profile
- Tier and collateral ratio (currently computed independently on each page)

**9. Component Decomposition**

The `travel/page.tsx` (603 lines) and `lender/page.tsx` (384 lines) files are large single-file pages. Extract into focused components:
- `PassportCard`, `QRCodePanel`, `VerifyPanel`, `MocaConnectPanel`, `MigrationSim` (from Travel)
- `PoolStats`, `UtilizationBar`, `LenderPosition`, `TierDistribution` (from Lender)
- `EfficiencyCard` is already a separate component at the bottom of lender/page.tsx but should be moved to `/components/`

**10. Error Boundary & Loading States**

Add React error boundaries around contract-calling sections. Current error handling is per-function with `try/catch` but has no UI-level recovery. Consider:
- Suspense boundaries for contract read states
- Skeleton loaders for pool stats and loan lists
- Network error detection with chain switching prompts

**11. Remove Duplicate Collateral Logic**

Collateral ratios are defined in three places:
- `zk-proof.ts`: `getCollateralRatio()` returns `[150, 135, 125, 110]`
- `contracts.ts`: `COLLATERAL_RATIOS = [1.5, 1.35, 1.25, 1.1]` and `getCollateralForAmount()`
- Smart contracts (`CreditScoreZK.getCollateralRequired()`)

The source of truth should be the smart contract. Frontend should call `getCollateralRequired()` for authoritative ratios rather than maintaining local copies.

**12. TypeScript Strict Mode Coverage**

While `strict: true` is enabled in tsconfig, several patterns bypass type safety:
- `as any` casts in travel/page.tsx (lines 14, 20, 68)
- `as unknown as Record<string, string>` in liveCheck.ts (necessary due to mixed JSON types)
- Missing return type annotations on event handlers

Consider defining explicit interfaces for all API response types and removing `any` usage.

---

## Appendix: Real vs. Mock Contract Interactions

| Page | Feature | Data Source | Status |
|---|---|---|---|
| Dashboard | Credit score display | Backend API (with mock fallback) | Partially real |
| Dashboard | ZK proof generation | Backend API (with mock fallback) | Partially real |
| Dashboard | AI risk explanation | Backend API (with mock fallback) | Partially real |
| Borrow | Proof generation | Backend API | Partially real |
| Borrow | `requestLoan` transaction | Live contract (LendingPool) | Real |
| Repay | `getLoansByBorrower` read | Live contract (LendingPool) | Real |
| Repay | `repayLoan` transaction | Live contract (LendingPool) | Real |
| Travel | Credit passport data | Hardcoded state | Mock |
| Travel | QR code generation | Client-side from mock data | Mock |
| Travel | Moca registration | Backend API | Real (off-chain) |
| Travel | Identity verification | Backend API | Real (off-chain) |
| Travel | Migration simulation | Client-side computation | Mock |
| Lender | Pool stats | Hardcoded `useEffect` | Mock |
| Lender | Deposit/Withdraw | `setTimeout` simulation | Mock |
| Lender | Tier distribution | Hardcoded array | Mock |
| Lender | Capital efficiency | Hardcoded values | Mock |

---

*This document provides a complete architectural snapshot of the CredLink ZK frontend as of its current state. It is intended for technical reviewers, hackathon judges, and the development team planning the next iteration of the UI.*
