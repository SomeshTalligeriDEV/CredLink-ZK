'use client';

interface Props {
  userTier: number | null;
  userCollateralRatio: number | null;
  isLoading: boolean;
}

const TIERS = [
  { name: 'Bronze', tier: 0, ratio: 150, color: '#FF4757' },
  { name: 'Silver', tier: 1, ratio: 135, color: '#FF9F43' },
  { name: 'Gold', tier: 2, ratio: 125, color: '#00D2D3' },
  { name: 'Platinum', tier: 3, ratio: 110, color: '#00D084' },
];

export default function CapitalEfficiencyChart({ userTier, userCollateralRatio, isLoading }: Props) {
  const W = 520;
  const H = 200;
  const PAD = { top: 12, right: 60, bottom: 12, left: 80 };
  const cw = W - PAD.left - PAD.right;
  const barHeight = 28;
  const barGap = 12;

  if (isLoading) {
    return (
      <div className="bg-[#14171C] rounded-2xl shadow-card border border-white/5 p-5">
        <div className="text-xs text-[#6B6F76] uppercase tracking-wider mb-4">Capital Efficiency</div>
        <div className="h-[180px] flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-[#F5A623]/30 border-t-[#F5A623] rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const hasProfile = userTier !== null && userCollateralRatio !== null;

  return (
    <div className="bg-[#14171C] rounded-2xl shadow-card border border-white/5 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs text-[#6B6F76] uppercase tracking-wider">Capital Efficiency</div>
        {hasProfile && (
          <div className="text-xs text-[#B0B3B8]">
            Your tier: <span className="text-[#F5A623] font-bold">{TIERS[userTier]?.name || `T${userTier}`}</span>
          </div>
        )}
      </div>

      {!hasProfile ? (
        <div className="h-[160px] flex flex-col items-center justify-center">
          <div className="text-[#6B6F76] text-sm">No on-chain profile detected</div>
          <div className="text-[#6B6F76]/60 text-xs mt-1">Connect wallet and submit a ZK proof</div>
        </div>
      ) : (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
            {TIERS.map((t, i) => {
              const y = PAD.top + i * (barHeight + barGap);
              const barW = (t.ratio / 150) * cw;
              const isUser = t.tier === userTier;

              return (
                <g key={t.tier}>
                  {/* Background track */}
                  <rect x={PAD.left} y={y} width={cw} height={barHeight} rx={4} fill="rgba(255,255,255,0.03)" />

                  {/* Bar */}
                  <rect x={PAD.left} y={y} width={barW} height={barHeight} rx={4}
                    fill={t.color} opacity={isUser ? 1 : 0.3} />

                  {/* Active indicator */}
                  {isUser && (
                    <rect x={PAD.left - 4} y={y} width={3} height={barHeight} rx={1.5} fill={t.color} />
                  )}

                  {/* Label */}
                  <text x={PAD.left - 10} y={y + barHeight / 2 + 4}
                    textAnchor="end" fill={isUser ? '#fff' : '#6B6F76'}
                    fontSize="11" fontWeight={isUser ? 'bold' : 'normal'}>
                    {t.name}
                  </text>

                  {/* Ratio value */}
                  <text x={PAD.left + barW + 8} y={y + barHeight / 2 + 4}
                    textAnchor="start" fill={isUser ? t.color : '#6B6F76'}
                    fontSize="11" fontWeight="bold" fontFamily="monospace">
                    {t.ratio}%
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Savings callout */}
          {userCollateralRatio < 150 && (
            <div className="mt-3 flex items-center justify-between bg-[#0B0D10] rounded-xl px-4 py-3">
              <span className="text-[#B0B3B8] text-sm">Collateral savings vs traditional DeFi</span>
              <span className="text-[#00D084] font-bold text-sm font-mono">
                {((1 - userCollateralRatio / 150) * 100).toFixed(1)}% less
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
