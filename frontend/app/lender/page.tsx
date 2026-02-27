"use client";
import { useState, useEffect } from "react";
import { useAccount } from "wagmi";

export default function LenderPage() {
  const { address, isConnected } = useAccount();
  const [poolData, setPoolData] = useState({
    poolBalance: "0",
    totalBorrowed: "0",
    totalLiquidity: "0",
    interestEarned: "0",
    utilization: 0,
    currentAPY: 4,
  });
  const [lenderInfo, setLenderInfo] = useState({
    deposited: "0",
    estimatedYield: "0",
  });
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [depositing, setDepositing] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  // Simulated pool data (in production, reads from contract)
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

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) return;
    setDepositing(true);
    // Simulated tx
    await new Promise((r) => setTimeout(r, 2000));
    const newDeposited = (parseFloat(lenderInfo.deposited) + parseFloat(depositAmount)).toFixed(2);
    setLenderInfo((prev) => ({
      ...prev,
      deposited: newDeposited,
      estimatedYield: ((parseFloat(newDeposited) * poolData.currentAPY) / 100).toFixed(2),
    }));
    setDepositAmount("");
    setDepositing(false);
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) return;
    if (parseFloat(withdrawAmount) > parseFloat(lenderInfo.deposited)) return;
    setWithdrawing(true);
    await new Promise((r) => setTimeout(r, 2000));
    const newDeposited = (parseFloat(lenderInfo.deposited) - parseFloat(withdrawAmount)).toFixed(2);
    setLenderInfo((prev) => ({
      ...prev,
      deposited: newDeposited,
      estimatedYield: ((parseFloat(newDeposited) * poolData.currentAPY) / 100).toFixed(2),
    }));
    setWithdrawAmount("");
    setWithdrawing(false);
  };

  // Utilization bar color
  const getUtilColor = (u: number) => {
    if (u > 70) return "#FF4757";
    if (u > 40) return "#F0B90B";
    return "#00D084";
  };

  // Tier risk distribution (simulated)
  const tierDistribution = [
    { tier: "Bronze", pct: 15, color: "#FF4757", collateral: "150%" },
    { tier: "Silver", pct: 30, color: "#FF9F43", collateral: "135%" },
    { tier: "Gold", pct: 35, color: "#00D2D3", collateral: "125%" },
    { tier: "Platinum", pct: 20, color: "#00D084", collateral: "110%" },
  ];

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-[#F0B90B]/10 border border-[#F0B90B]/30 rounded-full px-4 py-2 mb-4">
            <span className="text-[#F0B90B] text-sm font-bold">LENDER DASHBOARD</span>
          </div>
          <h1 className="text-4xl font-bold mb-2">
            Liquidity <span className="text-[#F0B90B]">Provider</span> Dashboard
          </h1>
          <p className="text-gray-400">
            Earn dynamic yield by providing liquidity to the CredLink ZK lending pool
          </p>
        </div>

        {/* Pool Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Value Locked", value: `${poolData.poolBalance} BNB`, color: "#F0B90B" },
            { label: "Total Borrowed", value: `${poolData.totalBorrowed} BNB`, color: "#FF9F43" },
            { label: "Interest Earned", value: `${poolData.interestEarned} BNB`, color: "#00D084" },
            { label: "Current APY", value: `${poolData.currentAPY}%`, color: "#00D2D3" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-[#0D0D12] border border-[#1A1A25] rounded-xl p-4"
            >
              <div className="text-xs text-gray-500 mb-1">{stat.label}</div>
              <div className="text-2xl font-bold" style={{ color: stat.color }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Utilization Bar */}
        <div className="bg-[#0D0D12] border border-[#1A1A25] rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-gray-300">Pool Utilization</span>
            <span
              className="text-sm font-bold"
              style={{ color: getUtilColor(poolData.utilization) }}
            >
              {poolData.utilization}% / 80% max
            </span>
          </div>
          <div className="w-full h-4 bg-[#1A1A25] rounded-full overflow-hidden relative">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${poolData.utilization}%`,
                background: `linear-gradient(90deg, ${getUtilColor(poolData.utilization)}80, ${getUtilColor(poolData.utilization)})`,
              }}
            />
            {/* 80% max line */}
            <div
              className="absolute top-0 h-full w-px bg-red-500/50"
              style={{ left: "80%" }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>0%</span>
            <span className="text-red-400">80% MAX</span>
            <span>100%</span>
          </div>

          {/* APY Tiers */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { range: "0-40%", apy: "4%", active: poolData.utilization <= 40 },
              { range: "40-70%", apy: "6%", active: poolData.utilization > 40 && poolData.utilization <= 70 },
              { range: "70%+", apy: "8%", active: poolData.utilization > 70 },
            ].map((t) => (
              <div
                key={t.range}
                className={`rounded-lg p-3 text-center border ${
                  t.active
                    ? "bg-[#F0B90B]/10 border-[#F0B90B]/30"
                    : "bg-[#1A1A25] border-[#2A2A35]"
                }`}
              >
                <div className="text-xs text-gray-500">Utilization {t.range}</div>
                <div className={`text-lg font-bold ${t.active ? "text-[#F0B90B]" : "text-gray-500"}`}>
                  {t.apy} APY
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Deposit / Withdraw */}
          <div className="bg-[#0D0D12] border border-[#1A1A25] rounded-xl p-6">
            <h3 className="font-bold text-lg mb-4">Your Position</h3>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Your Deposits</span>
                <span className="font-bold text-[#F0B90B]">{lenderInfo.deposited} BNB</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Estimated Annual Yield</span>
                <span className="font-bold text-green-400">{lenderInfo.estimatedYield} BNB</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Current APY</span>
                <span className="font-bold text-[#00D2D3]">{poolData.currentAPY}%</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Deposit BNB</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="0.0"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="flex-1 bg-[#1A1A25] border border-[#2A2A35] rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#F0B90B]"
                  />
                  <button
                    onClick={handleDeposit}
                    disabled={depositing || !depositAmount}
                    className="bg-[#F0B90B] text-black font-bold px-5 py-3 rounded-lg hover:bg-yellow-400 transition-all disabled:opacity-50"
                  >
                    {depositing ? "..." : "Deposit"}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1 block">Withdraw BNB</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="0.0"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="flex-1 bg-[#1A1A25] border border-[#2A2A35] rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#F0B90B]"
                  />
                  <button
                    onClick={handleWithdraw}
                    disabled={withdrawing || !withdrawAmount}
                    className="border border-[#F0B90B]/40 text-[#F0B90B] font-bold px-5 py-3 rounded-lg hover:bg-[#F0B90B]/10 transition-all disabled:opacity-50"
                  >
                    {withdrawing ? "..." : "Withdraw"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Tier Risk Distribution */}
          <div className="bg-[#0D0D12] border border-[#1A1A25] rounded-xl p-6">
            <h3 className="font-bold text-lg mb-4">Borrower Risk Distribution</h3>
            <p className="text-gray-400 text-sm mb-4">
              How the pool&apos;s loans are distributed across credit tiers
            </p>

            <div className="space-y-4">
              {tierDistribution.map((t) => (
                <div key={t.tier}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ background: t.color }}
                      />
                      <span className="text-sm font-bold" style={{ color: t.color }}>
                        {t.tier}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500">{t.collateral}</span>
                      <span className="text-sm font-bold">{t.pct}%</span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-[#1A1A25] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${t.pct}%`, background: t.color }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 bg-[#F0B90B]/5 border border-[#F0B90B]/20 rounded-lg p-3">
              <div className="text-xs text-[#F0B90B] font-bold mb-1">Pool Safety</div>
              <div className="text-xs text-gray-400">
                All loans are over-collateralized (110-150%). Collateral is held in escrow
                by the CollateralManager contract. Lender funds never directly fund undercollateralized positions.
              </div>
            </div>
          </div>
        </div>

        {/* Capital Efficiency Visual (Upgrade 4) */}
        <div className="bg-[#0D0D12] border border-[#1A1A25] rounded-xl p-6 mb-8">
          <h3 className="font-bold text-lg mb-2">Capital Efficiency Engine</h3>
          <p className="text-gray-400 text-sm mb-6">
            How much capital the protocol saves vs. traditional 150% collateral DeFi lending
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <EfficiencyCard
              label="Traditional DeFi"
              collateral={150}
              loanAmount={100}
              color="#FF4757"
              isBase
            />
            <EfficiencyCard
              label="CredLink Gold"
              collateral={125}
              loanAmount={100}
              color="#00D2D3"
              savings={16.7}
            />
            <EfficiencyCard
              label="CredLink Platinum"
              collateral={110}
              loanAmount={100}
              color="#00D084"
              savings={26.7}
            />
          </div>

          <div className="mt-6 text-center">
            <div className="text-3xl font-bold text-[#F0B90B]">
              {poolData.totalBorrowed} BNB
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Total capital unlocked through ZK-based reduced collateral
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EfficiencyCard({
  label,
  collateral,
  loanAmount,
  color,
  isBase,
  savings,
}: {
  label: string;
  collateral: number;
  loanAmount: number;
  color: string;
  isBase?: boolean;
  savings?: number;
}) {
  const barHeight = (collateral / 150) * 100;

  return (
    <div className="bg-[#0A0A12] rounded-xl p-4 text-center">
      <div className="text-sm font-bold mb-3" style={{ color }}>
        {label}
      </div>

      {/* Bar visual */}
      <div className="flex justify-center mb-3">
        <div className="w-16 h-32 bg-[#1A1A25] rounded-lg relative overflow-hidden">
          <div
            className="absolute bottom-0 w-full rounded-b-lg transition-all duration-1000"
            style={{
              height: `${barHeight}%`,
              background: `linear-gradient(to top, ${color}40, ${color})`,
            }}
          />
        </div>
      </div>

      <div className="text-lg font-bold" style={{ color }}>
        {collateral}%
      </div>
      <div className="text-xs text-gray-500 mb-2">Collateral Required</div>

      {savings && (
        <div className="bg-green-400/10 text-green-400 text-xs font-bold px-2 py-1 rounded-full inline-block">
          {savings}% saved
        </div>
      )}
      {isBase && (
        <div className="bg-red-400/10 text-red-400 text-xs font-bold px-2 py-1 rounded-full inline-block">
          Baseline
        </div>
      )}
    </div>
  );
}
