'use client';

import { TrendingUp } from 'lucide-react';

interface CapitalEfficiencyProps {
  tier: number;
  collateralRatio: number;
}

export default function CapitalEfficiency({ tier, collateralRatio }: CapitalEfficiencyProps) {
  const savings = 150 - collateralRatio;
  const savingsPercent = ((savings / 150) * 100).toFixed(1);

  // Example: for 1 BNB loan
  const exampleLoan = 1;
  const traditionalCollateral = exampleLoan * 1.5;
  const yourCollateral = exampleLoan * (collateralRatio / 100);
  const savedAmount = traditionalCollateral - yourCollateral;

  const tierNames = ['Bronze (Tier 0)', 'Silver (Tier 1)', 'Gold (Tier 2)', 'Platinum (Tier 3)'];

  return (
    <div className="bg-[#14171C] rounded-2xl shadow-card p-6 h-full">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="w-5 h-5 text-gold" />
        <h3 className="text-lg font-semibold">Capital Efficiency</h3>
      </div>

      <div className="space-y-6">
        {/* Bar Chart */}
        <div className="space-y-4">
          {/* Traditional DeFi */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-[#B0B3B8]">Traditional DeFi</span>
              <span className="text-red-400 font-medium">150%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-8 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full flex items-center justify-end pr-3 transition-all duration-1000"
                style={{ width: '100%' }}
              >
                <span className="text-xs font-medium text-white">{traditionalCollateral.toFixed(2)} BNB</span>
              </div>
            </div>
          </div>

          {/* Your Tier */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-[#B0B3B8]">Your Rate — {tierNames[tier]}</span>
              <span className="text-green-400 font-medium">{collateralRatio}%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-8 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-600 to-green-400 rounded-full flex items-center justify-end pr-3 transition-all duration-1000"
                style={{ width: `${(collateralRatio / 150) * 100}%` }}
              >
                <span className="text-xs font-medium text-white">{yourCollateral.toFixed(2)} BNB</span>
              </div>
            </div>
          </div>
        </div>

        {/* Savings Display */}
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-400 font-semibold text-lg">You save {savingsPercent}%</p>
              <p className="text-[#B0B3B8] text-sm">
                {savedAmount.toFixed(2)} BNB saved per {exampleLoan} BNB borrowed
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-green-400">{savings}%</p>
              <p className="text-[#6B6F76] text-xs">less collateral</p>
            </div>
          </div>
        </div>

        {/* Tier Breakdown */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { name: 'T0', ratio: 150, color: '#CD7F32' },
            { name: 'T1', ratio: 135, color: '#C0C0C0' },
            { name: 'T2', ratio: 125, color: '#FFD700' },
            { name: 'T3', ratio: 110, color: '#E5E4E2' },
          ].map((t, i) => (
            <div
              key={t.name}
              className={`text-center p-2 rounded-lg border transition-colors ${
                i === tier
                  ? 'border-gold bg-gold/10'
                  : 'border-white/5 bg-[#0B0D10]'
              }`}
            >
              <p className="text-xs font-medium" style={{ color: t.color }}>{t.name}</p>
              <p className="text-sm font-bold">{t.ratio}%</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
