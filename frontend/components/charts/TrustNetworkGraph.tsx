'use client';

import { CONTRACT_ADDRESSES } from '@/lib/contracts';

const NODES = [
  { id: 'CreditScoreZK', label: 'CreditScore', x: 260, y: 120, color: '#F5A623', primary: true },
  { id: 'LendingPool', label: 'LendingPool', x: 100, y: 50, color: '#00D2D3' },
  { id: 'CollateralManager', label: 'Collateral', x: 420, y: 50, color: '#FF9F43' },
  { id: 'ZKVerifier', label: 'ZK Verifier', x: 100, y: 190, color: '#00D084' },
  { id: 'CreditPassportNFT', label: 'Passport NFT', x: 420, y: 190, color: '#A855F7' },
  { id: 'CrossChainScoreOracle', label: 'Oracle', x: 260, y: 240, color: '#EC4899' },
];

const EDGES = [
  { from: 'CreditScoreZK', to: 'LendingPool', label: 'reads score' },
  { from: 'CreditScoreZK', to: 'CollateralManager', label: 'tier data' },
  { from: 'ZKVerifier', to: 'CreditScoreZK', label: 'updates score' },
  { from: 'CreditScoreZK', to: 'CreditPassportNFT', label: 'mints passport' },
  { from: 'CreditScoreZK', to: 'CrossChainScoreOracle', label: 'bridges score' },
  { from: 'LendingPool', to: 'CollateralManager', label: 'locks collateral' },
];

function truncate(addr: string) {
  if (!addr || addr === 'undefined') return '0x...';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function TrustNetworkGraph() {
  const W = 520;
  const H = 280;

  const nodeMap = new Map(NODES.map((n) => [n.id, n]));

  return (
    <div className="bg-[#14171C] rounded-2xl shadow-card border border-white/5 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs text-[#6B6F76] uppercase tracking-wider">Protocol Architecture</div>
        <div className="text-xs text-[#6B6F76]">BSC Testnet (97)</div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        <defs>
          <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
            <polygon points="0 0, 6 2, 0 4" fill="#6B6F76" opacity="0.4" />
          </marker>
        </defs>

        {/* Edges */}
        {EDGES.map((edge, i) => {
          const from = nodeMap.get(edge.from);
          const to = nodeMap.get(edge.to);
          if (!from || !to) return null;

          const dx = to.x - from.x;
          const dy = to.y - from.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const nx = dx / dist;
          const ny = dy / dist;

          const r1 = from.primary ? 32 : 26;
          const r2 = to.primary ? 32 : 26;
          const x1 = from.x + nx * r1;
          const y1 = from.y + ny * r1;
          const x2 = to.x - nx * r2;
          const y2 = to.y - ny * r2;

          return (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="#6B6F76" strokeWidth="1" opacity="0.2"
              markerEnd="url(#arrowhead)" />
          );
        })}

        {/* Nodes */}
        {NODES.map((node) => {
          const addr = (CONTRACT_ADDRESSES as Record<string, string>)[node.id] || '';
          const r = node.primary ? 30 : 24;

          return (
            <g key={node.id}>
              {/* Outer glow for primary */}
              {node.primary && (
                <circle cx={node.x} cy={node.y} r={r + 6}
                  fill="none" stroke={node.color} strokeWidth="1" opacity="0.15" />
              )}

              {/* Node circle */}
              <circle cx={node.x} cy={node.y} r={r}
                fill={`${node.color}15`} stroke={node.color} strokeWidth="1.5" />

              {/* Label */}
              <text x={node.x} y={node.y - 2} textAnchor="middle"
                fill="#fff" fontSize={node.primary ? '9' : '8'} fontWeight="bold">
                {node.label}
              </text>

              {/* Address */}
              <text x={node.x} y={node.y + 10} textAnchor="middle"
                fill="#6B6F76" fontSize="7" fontFamily="monospace">
                {truncate(addr)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
