'use client';

import { getTierName, getTierColor } from '@/lib/zk-proof';

interface CreditTierCardProps {
  score: number;
  tier: number;
  collateralRatio: number;
  isConnected: boolean;
}

export default function CreditTierCard({ score, tier, collateralRatio, isConnected }: CreditTierCardProps) {
  const tierName = getTierName(tier);
  const tierColor = getTierColor(tier);

  // SVG circle math
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const progress = score / 1000;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="bg-[#14171C] rounded-2xl shadow-card p-6 flex flex-col items-center">
      <h3 className="text-sm text-[#B0B3B8] mb-4 uppercase tracking-wider">Credit Score</h3>

      {/* Circular Score Display */}
      <div className="relative w-48 h-48 mb-6">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
          {/* Background ring */}
          <circle
            cx="100" cy="100" r={radius}
            fill="none"
            stroke="#1E2128"
            strokeWidth="12"
          />
          {/* Score ring */}
          <circle
            cx="100" cy="100" r={radius}
            fill="none"
            stroke={isConnected ? '#F5A623' : '#555'}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="score-ring transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold" style={{ color: isConnected ? '#F5A623' : '#888' }}>
            {isConnected ? score : '---'}
          </span>
          <span className="text-[#B0B3B8] text-sm">/ 1000</span>
        </div>
      </div>

      {/* Tier Badge */}
      <div
        className="px-4 py-1.5 rounded-full text-sm font-semibold mb-4"
        style={{
          backgroundColor: `${tierColor}20`,
          color: tierColor,
          border: `1px solid ${tierColor}40`,
        }}
      >
        {isConnected ? `Tier ${tier} — ${tierName}` : 'Connect Wallet'}
      </div>

      {/* Collateral Ratio */}
      <div className="w-full space-y-2 mt-2">
        <div className="flex justify-between text-sm">
          <span className="text-[#B0B3B8]">Collateral Ratio</span>
          <span className="text-gold font-medium">{collateralRatio}%</span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-2">
          <div
            className="h-2 rounded-full transition-all duration-500"
            style={{
              width: `${((150 - collateralRatio) / 50) * 100 + 20}%`,
              backgroundColor: '#F5A623',
            }}
          />
        </div>
        <p className="text-xs text-[#6B6F76] text-center">
          Lower ratio = Better terms (min 110%)
        </p>
      </div>
    </div>
  );
}
