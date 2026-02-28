'use client';

import { useState, useEffect } from 'react';
import { CONTRACT_ADDRESSES } from '@/lib/contracts';

// ── Data ──────────────────────────────────────────────────────────────

interface NodeDef {
  id: string;
  label: string;
  desc: string;
  x: number;
  y: number;
  color: string;
  primary?: boolean;
}

const NODES: NodeDef[] = [
  { id: 'CreditScoreZK', label: 'CreditScore', desc: 'Core scoring engine', x: 280, y: 150, color: '#F5A623', primary: true },
  { id: 'LendingPool', label: 'LendingPool', desc: 'Borrow & lend protocol', x: 108, y: 62, color: '#00D2D3' },
  { id: 'CollateralManager', label: 'Collateral', desc: 'Collateral escrow', x: 452, y: 62, color: '#FF9F43' },
  { id: 'ZKVerifier', label: 'ZK Verifier', desc: 'Proof verification', x: 108, y: 238, color: '#00D084' },
  { id: 'CreditPassportNFT', label: 'Passport NFT', desc: 'Credit identity NFT', x: 452, y: 238, color: '#A855F7' },
  { id: 'CrossChainScoreOracle', label: 'Oracle', desc: 'Cross-chain bridge', x: 280, y: 290, color: '#EC4899' },
];

const EDGES = [
  { from: 'CreditScoreZK', to: 'LendingPool', label: 'reads score' },
  { from: 'CreditScoreZK', to: 'CollateralManager', label: 'tier data' },
  { from: 'ZKVerifier', to: 'CreditScoreZK', label: 'updates score' },
  { from: 'CreditScoreZK', to: 'CreditPassportNFT', label: 'mints passport' },
  { from: 'CreditScoreZK', to: 'CrossChainScoreOracle', label: 'bridges score' },
  { from: 'LendingPool', to: 'CollateralManager', label: 'locks collateral' },
];

// Deterministic particles — no hydration mismatch
const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  cx: ((i * 137.5 + 28) % 520) + 20,
  cy: ((i * 97.3 + 12) % 300) + 20,
  r: 0.4 + (i % 3) * 0.3,
  delay: (i * 0.83) % 6,
  dur: 3.5 + (i % 4) * 1.3,
}));

function truncAddr(addr: string) {
  if (!addr || addr === 'undefined') return '0x...';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

// ── Component ─────────────────────────────────────────────────────────

export default function TrustNetworkGraph() {
  const W = 560;
  const H = 330;
  const [hovered, setHovered] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  const nodeMap = new Map(NODES.map((n) => [n.id, n]));

  // Build sets for highlight logic
  const activeEdgeSet = new Set<number>();
  const connectedSet = new Set<string>();
  if (hovered) {
    connectedSet.add(hovered);
    EDGES.forEach((e, i) => {
      if (e.from === hovered || e.to === hovered) {
        activeEdgeSet.add(i);
        connectedSet.add(e.from);
        connectedSet.add(e.to);
      }
    });
  }

  return (
    <div className="relative rounded-2xl overflow-hidden border border-white/[0.06]">
      {/* ── Depth layers ── */}
      <div className="absolute inset-0 bg-[#0F1115]" />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 55% at 50% 44%, rgba(245,166,35,0.045) 0%, transparent 100%)',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 45%, rgba(11,13,16,0.65) 100%)',
        }}
      />

      {/* ── Content ── */}
      <div className="relative z-10 p-5 pb-3">
        {/* Enhanced title */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs text-[#B0B3B8] uppercase tracking-[0.2em] font-semibold">
              Protocol Architecture
            </div>
            <div
              className="mt-1.5 h-[1.5px] rounded-full"
              style={{ width: 44, background: 'linear-gradient(90deg, #F5A623 60%, transparent)' }}
            />
          </div>
          <div className="text-[10px] text-[#6B6F76] font-mono px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] select-none">
            BSC Testnet (97)
          </div>
        </div>

        {/* ── SVG ── */}
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto select-none">
          <defs>
            {/* Glow filters */}
            <filter id="ng-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="ng-glow-intense" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="7" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Per-edge gradient */}
            {EDGES.map((edge, i) => {
              const f = nodeMap.get(edge.from);
              const t = nodeMap.get(edge.to);
              if (!f || !t) return null;
              return (
                <linearGradient
                  key={`eg${i}`}
                  id={`eg-${i}`}
                  x1={f.x}
                  y1={f.y}
                  x2={t.x}
                  y2={t.y}
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor={f.color} />
                  <stop offset="100%" stopColor={t.color} />
                </linearGradient>
              );
            })}

            {/* Per-node radial fill */}
            {NODES.map((n) => (
              <radialGradient key={`nf-${n.id}`} id={`nf-${n.id}`} cx="50%" cy="30%" r="70%">
                <stop offset="0%" stopColor={n.color} stopOpacity={n.primary ? 0.22 : 0.16} />
                <stop offset="100%" stopColor={n.color} stopOpacity="0.02" />
              </radialGradient>
            ))}
          </defs>

          {/* ── Ambient particles ── */}
          {PARTICLES.map((p, i) => (
            <circle key={`p${i}`} cx={p.cx} cy={p.cy} r={p.r} fill="#F5A623">
              <animate
                attributeName="opacity"
                values="0.06;0.22;0.06"
                dur={`${p.dur}s`}
                begin={`${p.delay}s`}
                repeatCount="indefinite"
              />
              <animateTransform
                attributeName="transform"
                type="translate"
                values="0,0;0,-5;0,0"
                dur={`${p.dur}s`}
                begin={`${p.delay}s`}
                repeatCount="indefinite"
              />
            </circle>
          ))}

          {/* ── Edges ── */}
          {EDGES.map((edge, i) => {
            const f = nodeMap.get(edge.from);
            const t = nodeMap.get(edge.to);
            if (!f || !t) return null;

            const dx = t.x - f.x;
            const dy = t.y - f.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const nx = dx / dist;
            const ny = dy / dist;
            const r1 = f.primary ? 40 : 32;
            const r2 = t.primary ? 40 : 32;
            const x1 = f.x + nx * r1;
            const y1 = f.y + ny * r1;
            const x2 = t.x - nx * r2;
            const y2 = t.y - ny * r2;

            const isActive = activeEdgeSet.has(i);
            const isDimmed = hovered !== null && !isActive;

            return (
              <g
                key={`e${i}`}
                style={{
                  opacity: visible ? 1 : 0,
                  transition: `opacity 0.6s ease ${0.3 + i * 0.06}s`,
                }}
              >
                {/* Base stroke */}
                <line
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={`url(#eg-${i})`}
                  strokeWidth={isActive ? 1.6 : 0.7}
                  opacity={isDimmed ? 0.04 : isActive ? 0.65 : 0.2}
                  style={{ transition: 'all 0.3s ease' }}
                />

                {/* Flowing dash overlay */}
                <line
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={`url(#eg-${i})`}
                  strokeWidth={isActive ? 2 : 0.7}
                  strokeDasharray="4 16"
                  opacity={isDimmed ? 0.02 : isActive ? 0.55 : 0.1}
                  style={{ transition: 'all 0.3s ease' }}
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from="20" to="0" dur="2s"
                    repeatCount="indefinite"
                  />
                </line>

                {/* Active glow line */}
                {isActive && (
                  <line
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke={`url(#eg-${i})`}
                    strokeWidth="3" opacity="0.12"
                    filter="url(#ng-glow)"
                  />
                )}

                {/* Edge label pill on hover */}
                {isActive && (() => {
                  const mx = (x1 + x2) / 2;
                  const my = (y1 + y2) / 2;
                  const tw = edge.label.length * 4.5 + 16;
                  return (
                    <g>
                      <rect
                        x={mx - tw / 2} y={my - 10}
                        width={tw} height={16} rx={5}
                        fill="#0B0D10" fillOpacity="0.9"
                        stroke="rgba(255,255,255,0.06)" strokeWidth="0.5"
                      />
                      <text
                        x={mx} y={my + 1}
                        textAnchor="middle" fill="#B0B3B8"
                        fontSize="6.5" fontWeight="500"
                      >
                        {edge.label}
                      </text>
                    </g>
                  );
                })()}
              </g>
            );
          })}

          {/* ── Nodes ── */}
          {NODES.map((node, i) => {
            const addr = (CONTRACT_ADDRESSES as unknown as Record<string, string>)[node.id] || '';
            const r = node.primary ? 36 : 28;
            const isHov = hovered === node.id;
            const isConn = connectedSet.has(node.id);
            const isDimmed = hovered !== null && !isHov && !isConn;

            const tooltipAbove = node.y > H * 0.6;
            const ty = tooltipAbove ? node.y - r - 30 : node.y + r + 10;

            return (
              <g
                key={node.id}
                style={{
                  opacity: visible ? (isDimmed ? 0.3 : 1) : 0,
                  transition: `opacity 0.5s ease ${0.12 + i * 0.09}s`,
                  cursor: 'pointer',
                }}
                onMouseEnter={() => setHovered(node.id)}
                onMouseLeave={() => setHovered(null)}
              >
                {/* Deep ambient glow */}
                <circle
                  cx={node.x} cy={node.y} r={r + 28}
                  fill={node.color}
                  opacity={isHov ? 0.08 : 0.012}
                  style={{ transition: 'opacity 0.35s ease' }}
                />

                {/* ── Primary: breathing rings ── */}
                {node.primary && (
                  <>
                    <circle cx={node.x} cy={node.y} r={r + 10}
                      fill="none" stroke="#F5A623" strokeWidth="0.8">
                      <animate attributeName="r"
                        values={`${r + 8};${r + 15};${r + 8}`}
                        dur="3s" repeatCount="indefinite" />
                      <animate attributeName="opacity"
                        values="0.18;0.35;0.18"
                        dur="3s" repeatCount="indefinite" />
                    </circle>
                    <circle cx={node.x} cy={node.y} r={r + 20}
                      fill="none" stroke="#F5A623" strokeWidth="0.4">
                      <animate attributeName="r"
                        values={`${r + 18};${r + 28};${r + 18}`}
                        dur="4.5s" repeatCount="indefinite" />
                      <animate attributeName="opacity"
                        values="0.05;0.14;0.05"
                        dur="4.5s" repeatCount="indefinite" />
                    </circle>
                  </>
                )}

                {/* Non-primary: hover ring */}
                {!node.primary && (
                  <circle
                    cx={node.x} cy={node.y} r={r + 5}
                    fill="none" stroke={node.color} strokeWidth="0.5"
                    opacity={isHov ? 0.55 : 0.07}
                    style={{ transition: 'opacity 0.3s ease' }}
                  />
                )}

                {/* Glass fill */}
                <circle cx={node.x} cy={node.y} r={r}
                  fill={`url(#nf-${node.id})`} />

                {/* Border ring */}
                <circle
                  cx={node.x} cy={node.y} r={r}
                  fill="none" stroke={node.color}
                  strokeWidth={node.primary ? 1.8 : 1}
                  opacity={isHov ? 1 : 0.4}
                  filter={isHov || node.primary ? 'url(#ng-glow)' : undefined}
                  style={{ transition: 'opacity 0.3s ease' }}
                />

                {/* Primary inner accent ring */}
                {node.primary && (
                  <circle
                    cx={node.x} cy={node.y} r={r - 5}
                    fill="none" stroke="#F5A623"
                    strokeWidth="0.3" opacity="0.12"
                  />
                )}

                {/* Label */}
                <text
                  x={node.x} y={node.y - (node.primary ? 5 : 3)}
                  textAnchor="middle" fill="#fff"
                  fontSize={node.primary ? '10.5' : '8.5'}
                  fontWeight="600" letterSpacing="0.03em"
                >
                  {node.label}
                </text>

                {/* Address */}
                <text
                  x={node.x} y={node.y + (node.primary ? 9 : 8)}
                  textAnchor="middle" fill="#6B6F76"
                  fontSize="6" fontFamily="monospace" opacity="0.55"
                >
                  {truncAddr(addr)}
                </text>

                {/* ── Hover tooltip ── */}
                {isHov && (
                  <g>
                    <rect
                      x={node.x - 68} y={ty}
                      width={136} height={22} rx={6}
                      fill="#0B0D10" fillOpacity="0.94"
                      stroke={node.color} strokeWidth="0.5" strokeOpacity="0.3"
                    />
                    <text
                      x={node.x} y={ty + 14}
                      textAnchor="middle" fill={node.color}
                      fontSize="7.5" fontWeight="600"
                    >
                      {node.desc}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
