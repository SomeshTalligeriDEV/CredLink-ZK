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
    <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6 flex flex-col items-center">
      <h3 className="text-sm text-gray-400 mb-4 uppercase tracking-wider">Credit Score</h3>

      {/* Circular Score Display */}
      <div className="relative w-48 h-48 mb-6">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
          {/* Background ring */}
          <circle
            cx="100" cy="100" r={radius}
            fill="none"
            stroke="#2A2A2A"
            strokeWidth="12"
          />
          {/* Score ring */}
          <circle
            cx="100" cy="100" r={radius}
            fill="none"
            stroke={isConnected ? '#F0B90B' : '#555'}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="score-ring transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold" style={{ color: isConnected ? '#F0B90B' : '#888' }}>
            {isConnected ? score : '---'}
          </span>
          <span className="text-gray-400 text-sm">/ 1000</span>
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
          <span className="text-gray-400">Collateral Ratio</span>
          <span className="text-gold font-medium">{collateralRatio}%</span>
        </div>
        <div className="w-full bg-[#2A2A2A] rounded-full h-2">
          <div
            className="h-2 rounded-full transition-all duration-500"
            style={{
              width: `${((150 - collateralRatio) / 50) * 100 + 20}%`,
              backgroundColor: '#F0B90B',
            }}
          />
        </div>
        <p className="text-xs text-gray-500 text-center">
          Lower ratio = Better terms (min 110%)
        </p>
      </div>
    </div>
  );
}
