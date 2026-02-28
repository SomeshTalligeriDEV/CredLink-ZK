'use client';

import type { ScoreEvent } from '@/hooks/useContractData';

interface Props {
  events: ScoreEvent[];
  isLoading: boolean;
}

const TIER_COLORS = ['#FF4757', '#FF9F43', '#00D2D3', '#00D084'];

export default function ScoreEvolutionChart({ events, isLoading }: Props) {
  const W = 520;
  const H = 220;
  const PAD = { top: 24, right: 16, bottom: 28, left: 44 };
  const cw = W - PAD.left - PAD.right;
  const ch = H - PAD.top - PAD.bottom;

  if (isLoading) {
    return (
      <div className="bg-[#14171C] rounded-2xl shadow-card border border-white/5 p-5">
        <div className="text-xs text-[#6B6F76] uppercase tracking-wider mb-4">Score Evolution</div>
        <div className="h-[180px] flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-[#F5A623]/30 border-t-[#F5A623] rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="bg-[#14171C] rounded-2xl shadow-card border border-white/5 p-5">
        <div className="text-xs text-[#6B6F76] uppercase tracking-wider mb-4">Score Evolution</div>
        <div className="h-[180px] flex flex-col items-center justify-center">
          <div className="text-[#6B6F76] text-sm">No score updates recorded on-chain</div>
          <div className="text-[#6B6F76]/60 text-xs mt-1">Submit a ZK proof to initialize your score</div>
        </div>
      </div>
    );
  }

  const points = events.map((e, i) => {
    const x = PAD.left + (i / Math.max(events.length - 1, 1)) * cw;
    const y = PAD.top + ch - (e.score / 1000) * ch;
    return { x, y, score: e.score, tier: e.tier };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath = `${linePath} L${points[points.length - 1].x},${PAD.top + ch} L${points[0].x},${PAD.top + ch} Z`;

  return (
    <div className="bg-[#14171C] rounded-2xl shadow-card border border-white/5 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs text-[#6B6F76] uppercase tracking-wider">Score Evolution</div>
        <div className="text-xs text-[#B0B3B8]">{events.length} update{events.length !== 1 ? 's' : ''}</div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        <defs>
          <linearGradient id="scoreAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F5A623" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#F5A623" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Y-axis grid lines */}
        {[0, 250, 500, 750, 1000].map((v) => {
          const y = PAD.top + ch - (v / 1000) * ch;
          return (
            <g key={v}>
              <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="rgba(255,255,255,0.04)" />
              <text x={PAD.left - 8} y={y + 3} textAnchor="end" fill="#6B6F76" fontSize="9" fontFamily="monospace">
                {v}
              </text>
            </g>
          );
        })}

        {/* Tier threshold zones */}
        {[200, 500, 750].map((threshold) => {
          const y = PAD.top + ch - (threshold / 1000) * ch;
          return (
            <line key={`t${threshold}`} x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
              stroke="rgba(245,166,35,0.1)" strokeDasharray="4,4" />
          );
        })}

        {/* Area fill */}
        <path d={areaPath} fill="url(#scoreAreaGrad)" />

        {/* Line */}
        <path d={linePath} fill="none" stroke="#F5A623" strokeWidth="2" strokeLinejoin="round" />

        {/* Data points */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3.5"
            fill={TIER_COLORS[p.tier] || '#F5A623'}
            stroke="#14171C" strokeWidth="1.5" />
        ))}

        {/* Latest score label */}
        {points.length > 0 && (
          <text
            x={points[points.length - 1].x}
            y={points[points.length - 1].y - 10}
            textAnchor="middle" fill="#F5A623" fontSize="11" fontWeight="bold" fontFamily="monospace"
          >
            {points[points.length - 1].score}
          </text>
        )}
      </svg>
    </div>
  );
}
