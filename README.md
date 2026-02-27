# CredLink ZK

[![Built on BNB Chain](https://img.shields.io/badge/Built%20on-BNB%20Chain-F0B90B?style=for-the-badge)](https://www.bnbchain.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![opBNB Testnet](https://img.shields.io/badge/Network-opBNB%20Testnet-green?style=for-the-badge)](https://testnet.opbnbscan.com/)

**Privacy-Preserving Behavioral Credit Infrastructure**

## Overview

CredLink ZK is a zero-knowledge behavioral credit protocol built on BNB Chain that enables privacy-preserving creditworthiness assessment for DeFi lending. Instead of exposing your entire financial fingerprint — every transaction, balance, and strategy — to lenders, MEV bots, and blacklists, CredLink ZK lets you prove your credit tier with a single ZK proof. The lender only learns: "Tier 3 approved." Your actual wallet age, repayment history, and balance remain mathematically sealed.

Traditional DeFi lending demands 150% overcollateralization regardless of borrower history, destroying capital efficiency. CredLink ZK introduces a tiered collateral system (110%–150%) based on on-chain behavioral proofs, unlocking up to 26% more capital for proven borrowers. Combined with Groq-powered AI risk assessment and Sybil detection, it delivers the DeFi credit layer that 600 million unbanked users have been waiting for.

## Live Demo

- **Frontend**: [Live on opBNB Testnet](https://credlink-zk.vercel.app) *(update after deployment)*
- **Backend API**: [Render Deployment](https://credlink-zk-api.onrender.com) *(update after deployment)*

## Architecture

```
User Wallet
    │
    ▼
ZK Proof Generator (Client-side)
    │
    ▼
ZKVerifier.sol ──────► CreditScoreZK.sol
                            │
                            ▼
                      LendingPool.sol ◄──► CollateralManager.sol
                            │
                            ▼
                   Groq AI Risk Advisor
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contracts | Solidity 0.8.20, OpenZeppelin, Hardhat |
| ZK Layer | Circom 2.0, snarkjs, Groth16 proofs |
| Frontend | Next.js 14, TypeScript, Tailwind CSS, wagmi v2, viem |
| Backend | Express.js, ethers.js v6 |
| AI | Groq SDK (llama3-8b-8192) — Risk assessment & Sybil detection |
| Network | opBNB Testnet (Chain ID: 5611) |

## Credit Tier System

| Tier | Score Range | Collateral Ratio | Benefit |
|------|-------------|-------------------|---------|
| Tier 0 (Bronze) | 0 – 199 | 150% | Standard DeFi terms |
| Tier 1 (Silver) | 200 – 499 | 135% | 10% collateral reduction |
| Tier 2 (Gold) | 500 – 749 | 125% | 17% collateral reduction |
| Tier 3 (Platinum) | 750 – 1000 | 110% | 26% collateral reduction |

## Getting Started

### Prerequisites

- Node.js >= 18
- npm or yarn
- MetaMask or compatible Web3 wallet
- opBNB Testnet BNB from [faucet](https://www.bnbchain.org/en/testnet-faucet)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/credlink-zk.git
cd credlink-zk

# Install root dependencies (Hardhat + contracts)
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..

# Install backend dependencies
cd backend && npm install && cd ..
```

### Environment Setup

```bash
# Root .env
PRIVATE_KEY=your_wallet_private_key
OPBNB_RPC_URL=https://opbnb-testnet-rpc.bnbchain.org
BSCSCAN_API_KEY=your_bscscan_key

# frontend/.env.local
NEXT_PUBLIC_CHAIN_ID=5611
NEXT_PUBLIC_RPC_URL=https://opbnb-testnet-rpc.bnbchain.org
NEXT_PUBLIC_API_URL=http://localhost:3001

# backend/.env
PORT=3001
GROQ_API_KEY=your_groq_key
RPC_URL=https://opbnb-testnet-rpc.bnbchain.org
```

### Compile & Deploy Contracts

```bash
npx hardhat compile
npx hardhat test
npx hardhat run scripts/deploy.js --network opbnb_testnet
```

### Run Development Servers

```bash
# Terminal 1 — Backend
cd backend && node server.js

# Terminal 2 — Frontend
cd frontend && npm run dev
```

## Smart Contract Addresses (opBNB Testnet)

| Contract | Address |
|----------|---------|
| CreditScoreZK | `0x...` *(update after deployment)* |
| CollateralManager | `0x...` *(update after deployment)* |
| ZKVerifier | `0x...` *(update after deployment)* |
| LendingPool | `0x...` *(update after deployment)* |

## How It Works

1. **Connect Wallet** — User connects MetaMask to opBNB Testnet
2. **Analyze Behavior** — Backend analyzes on-chain activity (wallet age, tx count, balance)
3. **Generate ZK Proof** — Client generates a Groth16 proof of behavioral creditworthiness
4. **Verify On-Chain** — ZKVerifier contract validates the proof and assigns a credit tier
5. **Borrow with Reduced Collateral** — Higher tiers unlock lower collateral requirements
6. **Repay & Build Score** — Timely repayments increase credit score by 50 points each
7. **AI Risk Assessment** — Groq-powered advisor provides real-time risk explanations

## License

MIT

## Contributing

All ZK circuits are MIT licensed. Fork freely.

Built for the BNB Chain x YZI Labs Hackathon — Bengaluru 2026.
