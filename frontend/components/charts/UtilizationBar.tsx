'use client';

interface Props {
  utilization: number;
  totalBorrowed: number;
  poolBalance: number;
  totalLiquidity: number;
  currentAPY: number;
  isLoading: boolean;
}

export default function UtilizationBar({
  utilization,
  totalBorrowed,
  poolBalance,
  totalLiquidity,
  currentAPY,
  isLoading,
}: Props) {
  if (isLoading) {
    return (
      <div className="bg-[#14171C] rounded-2xl shadow-card border border-white/5 p-5">
        <div className="text-xs text-[#6B6F76] uppercase tracking-wider mb-4">Pool Utilization</div>
        <div className="h-[120px] flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-[#F5A623]/30 border-t-[#F5A623] rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const getColor = (u: number) => {
    if (u > 70) return '#FF4757';
    if (u > 40) return '#F5A623';
    return '#00D084';
  };

  const color = getColor(utilization);
  const clampedUtil = Math.min(utilization, 100);

  return (
    <div className="bg-[#14171C] rounded-2xl shadow-card border border-white/5 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs text-[#6B6F76] uppercase tracking-wider">Pool Utilization</div>
        <div className="text-sm font-bold font-mono" style={{ color }}>
          {utilization.toFixed(1)}%
        </div>
      </div>

      {/* Bar */}
      <div className="w-full h-5 bg-white/5 rounded-full overflow-hidden relative">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{
            width: `${clampedUtil}%`,
            background: `linear-gradient(90deg, ${color}80, ${color})`,
          }}
        />
        {/* 80% threshold marker */}
        <div className="absolute top-0 h-full w-px bg-red-500/40" style={{ left: '80%' }} />
      </div>

      <div className="flex justify-between mt-1.5 text-[10px] text-[#6B6F76] font-mono">
        <span>0%</span>
        <span className="text-red-400/60">80% MAX</span>
        <span>100%</span>
      </div>

      {/* APY tiers */}
      <div className="grid grid-cols-3 gap-2 mt-4">
        {[
          { range: '0-40%', apy: '4%', active: utilization <= 40 },
          { range: '40-70%', apy: '6%', active: utilization > 40 && utilization <= 70 },
          { range: '70%+', apy: '8%', active: utilization > 70 },
        ].map((t) => (
          <div
            key={t.range}
            className={`rounded-lg p-2.5 text-center border transition-colors ${
              t.active
                ? 'bg-[#F5A623]/10 border-[#F5A623]/30'
                : 'bg-white/[0.02] border-white/5'
            }`}
          >
            <div className="text-[10px] text-[#6B6F76]">{t.range}</div>
            <div className={`text-sm font-bold font-mono ${t.active ? 'text-[#F5A623]' : 'text-[#6B6F76]'}`}>
              {t.apy}
            </div>
          </div>
        ))}
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/5">
        <div>
          <div className="text-[10px] text-[#6B6F76]">Available</div>
          <div className="text-sm font-bold font-mono text-[#00D084]">{poolBalance.toFixed(4)}</div>
        </div>
        <div>
          <div className="text-[10px] text-[#6B6F76]">Borrowed</div>
          <div className="text-sm font-bold font-mono text-[#F5A623]">{totalBorrowed.toFixed(4)}</div>
        </div>
        <div>
          <div className="text-[10px] text-[#6B6F76]">TVL</div>
          <div className="text-sm font-bold font-mono text-white">{totalLiquidity.toFixed(4)}</div>
        </div>
      </div>
    </div>
  );
}
