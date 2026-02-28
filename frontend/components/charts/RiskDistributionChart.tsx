'use client';

interface Props {
  totalLoans: number;
  repaidLoans: number;
  activeLoans: number;
  isLoading: boolean;
}

export default function RiskDistributionChart({ totalLoans, repaidLoans, activeLoans, isLoading }: Props) {
  const W = 260;
  const H = 260;
  const cx = W / 2;
  const cy = H / 2;
  const outerR = 100;
  const innerR = 65;

  if (isLoading) {
    return (
      <div className="bg-[#14171C] rounded-2xl shadow-card border border-white/5 p-5">
        <div className="text-xs text-[#6B6F76] uppercase tracking-wider mb-4">Loan Distribution</div>
        <div className="h-[220px] flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-[#F5A623]/30 border-t-[#F5A623] rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (totalLoans === 0) {
    return (
      <div className="bg-[#14171C] rounded-2xl shadow-card border border-white/5 p-5">
        <div className="text-xs text-[#6B6F76] uppercase tracking-wider mb-4">Loan Distribution</div>
        <div className="h-[220px] flex flex-col items-center justify-center">
          <div className="text-[#6B6F76] text-sm">No loan history on-chain</div>
          <div className="text-[#6B6F76]/60 text-xs mt-1">Borrow to build your repayment record</div>
        </div>
      </div>
    );
  }

  const defaulted = Math.max(0, totalLoans - repaidLoans - activeLoans);
  const segments = [
    { label: 'Repaid', value: repaidLoans, color: '#00D084' },
    { label: 'Active', value: activeLoans, color: '#F5A623' },
    { label: 'Defaulted', value: defaulted, color: '#FF4757' },
  ].filter((s) => s.value > 0);

  const total = segments.reduce((sum, s) => sum + s.value, 0);

  // Build arc paths
  let startAngle = -Math.PI / 2;
  const arcs = segments.map((seg) => {
    const angle = (seg.value / total) * Math.PI * 2;
    const endAngle = startAngle + angle;
    const largeArc = angle > Math.PI ? 1 : 0;

    const x1Outer = cx + outerR * Math.cos(startAngle);
    const y1Outer = cy + outerR * Math.sin(startAngle);
    const x2Outer = cx + outerR * Math.cos(endAngle);
    const y2Outer = cy + outerR * Math.sin(endAngle);
    const x1Inner = cx + innerR * Math.cos(endAngle);
    const y1Inner = cy + innerR * Math.sin(endAngle);
    const x2Inner = cx + innerR * Math.cos(startAngle);
    const y2Inner = cy + innerR * Math.sin(startAngle);

    const d = [
      `M${x1Outer},${y1Outer}`,
      `A${outerR},${outerR} 0 ${largeArc} 1 ${x2Outer},${y2Outer}`,
      `L${x1Inner},${y1Inner}`,
      `A${innerR},${innerR} 0 ${largeArc} 0 ${x2Inner},${y2Inner}`,
      'Z',
    ].join(' ');

    const result = { ...seg, d };
    startAngle = endAngle;
    return result;
  });

  const repaymentRate = totalLoans > 0 ? ((repaidLoans / totalLoans) * 100).toFixed(0) : '0';

  return (
    <div className="bg-[#14171C] rounded-2xl shadow-card border border-white/5 p-5">
      <div className="text-xs text-[#6B6F76] uppercase tracking-wider mb-4">Loan Distribution</div>
      <div className="flex flex-col items-center">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-48 h-48">
          {arcs.map((arc, i) => (
            <path key={i} d={arc.d} fill={arc.color} opacity="0.85" />
          ))}
          {/* Center text */}
          <text x={cx} y={cy - 6} textAnchor="middle" fill="#fff" fontSize="24" fontWeight="bold" fontFamily="monospace">
            {repaymentRate}%
          </text>
          <text x={cx} y={cy + 12} textAnchor="middle" fill="#6B6F76" fontSize="10">
            repayment rate
          </text>
        </svg>
        <div className="flex gap-4 mt-3">
          {segments.map((seg) => (
            <div key={seg.label} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: seg.color }} />
              <span className="text-xs text-[#B0B3B8]">{seg.label}: {seg.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
