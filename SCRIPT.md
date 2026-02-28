# CredLink ZK — 2-Minute Pitch Script

> **Duration**: 2 minutes (strict)
> **Evaluation criteria hit**: Design & Usability, Scalability, Innovation, Open Source, Integration
> **Pace**: ~300 words, natural speaking speed

---

## [0:00 – 0:20] THE PROBLEM

> "1.4 billion people have no credit history — not because they're irresponsible, but because they moved countries and their financial identity didn't move with them.
>
> In DeFi it's worse: every borrower locks 150% collateral regardless of history. Billions in capital, frozen.
>
> CredLink ZK fixes this."

---

## [0:20 – 0:50] WHAT WE BUILT (Innovation + Integration)

> "CredLink is a zero-knowledge credit protocol on BNB Chain. It does three things:
>
> First — it analyzes on-chain behavior and generates a ZK proof. The verifier learns 'this person has above 80% repayment rate' — but never sees the raw data. That's Circom circuits with Groth16 proofs.
>
> Second — the proof creates an on-chain credit score, 0 to 1000, mapped to four tiers. Each tier unlocks lower collateral — from 150% down to 110%. A 40% capital efficiency gain for responsible borrowers, while lenders stay fully protected.
>
> Third — Moca Wallet integration for identity binding prevents Sybil attacks, and Groq LLaMA 3 runs real-time anomaly detection. ZK for privacy, AI for security."

---

## [0:50 – 1:15] WHAT'S LIVE (Design & Usability)

> "This is fully deployed — seven smart contracts on BSC Testnet, three ZK circuits, five frontend pages reading live contract data, zero mock values.
>
> The UI is institutional-grade: dark fintech aesthetic, five custom SVG chart components with no external dependencies, interactive protocol architecture visualization, and a soulbound Credit Passport NFT with a downloadable QR code.
>
> Every number on screen is a real contract read. No data means 'no on-chain activity detected' — not fake numbers."

---

## [1:15 – 1:40] SCALABILITY + OPEN SOURCE + BUSINESS MODEL

> "Scalability: CrossChainScoreOracle is already deployed — scores bridge to any EVM chain via LayerZero. Groth16 verification is O(1) on-chain regardless of proof complexity. GovernanceStub holds every tunable parameter, ready for DAO migration with a single role transfer.
>
> Fully MIT-licensed — seven contracts, three circuits, full-stack app, 850 lines of documentation. Our Circom circuits are generic enough to be published as a reusable ZK credit library.
>
> Revenue: 0.1–0.3% protocol fee on loan origination, B2B API for DeFi integrations, cross-chain relay fees. Self-sustaining at 10,000 monthly loans. Over 95% gross margin per transaction."

---

## [1:40 – 2:00] CLOSE

> "Seven contracts. Three ZK circuits. Five pages. Twelve API endpoints. All deployed, all functional, all open source, all on BNB Chain.
>
> The first protocol to solve portable, private, verifiable credit wins a massive market — 280 million cross-border migrants, $15 billion DeFi lending TVL, 2 million daily BSC addresses.
>
> CredLink ZK is that protocol. Thank you."

---

## TIMING GUIDE

| Section | Duration | Criteria Covered |
|---------|----------|-----------------|
| Problem | 20s | — |
| What we built | 30s | Innovation, Integration |
| What's live | 25s | Design & Usability |
| Scale + OSS + Business | 25s | Scalability, Open Source, Sustainability |
| Close | 20s | Roadmap (implied), Community (implied) |

**Total: 2:00**

---

## IF JUDGES ASK FOLLOW-UPS

**"Roadmap?"**
> Phase 2: Security audit + mainnet. Phase 3: Multi-chain via LayerZero. Phase 4: DAO governance. Phase 5: Institutional API and regulatory compliance.

**"Community engagement?"**
> ZK Badge gamification is already in the contract — Bronze through Platinum based on proof count. Circuit library for developers. GovernanceStub designed for community parameter control.

**"How does ZK actually work here?"**
> Three Circom circuits take private inputs — wallet age, loan counts, defaults — and output booleans plus a score. Groth16 proof: constant size, constant verification cost. Verifier contract never sees private data.

**"What if someone defaults?"**
> Collateral liquidated, score drops 100 points, tier may decrease. Lenders always protected — minimum collateral is 110%.

**"Why BNB Chain?"**
> Lowest gas for emerging market users, largest DeFi base in developing regions, Moca ecosystem for identity. Cross-chain oracle ready for expansion.
