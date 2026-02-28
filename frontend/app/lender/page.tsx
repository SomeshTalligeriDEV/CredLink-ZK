'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { Loader2, Check, ExternalLink } from 'lucide-react';
import { usePoolMetrics } from '@/hooks/useContractData';
import { CONTRACT_ADDRESSES, LENDINGPOOL_ABI } from '@/lib/contracts';
import UtilizationBar from '@/components/charts/UtilizationBar';

export default function LenderPage() {
  const { address, isConnected } = useAccount();
  const {
    totalBorrowed,
    poolBalance,
    totalLiquidity,
    utilization,
    currentAPY,
    isLoading: poolLoading,
  } = usePoolMetrics();

  const [depositAmount, setDepositAmount] = useState('');

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  function handleDeposit() {
    if (!depositAmount || parseFloat(depositAmount) <= 0) return;
    writeContract({
      address: CONTRACT_ADDRESSES.LendingPool,
      abi: LENDINGPOOL_ABI,
      functionName: 'depositToPool',
      value: parseEther(depositAmount),
    });
  }

  const isDepositing = isPending || isConfirming;

  return (
    <div>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Liquidity Provider</h1>
          <p className="text-[#6B6F76] text-sm mt-1">Pool metrics and deposit interface</p>
        </div>

        {/* Pool Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Pool Balance', value: poolLoading ? '...' : `${poolBalance.toFixed(4)} BNB`, color: '#F5A623' },
            { label: 'Total Borrowed', value: poolLoading ? '...' : `${totalBorrowed.toFixed(4)} BNB`, color: '#FF9F43' },
            { label: 'Total Liquidity', value: poolLoading ? '...' : `${totalLiquidity.toFixed(4)} BNB`, color: '#00D2D3' },
            { label: 'Current APY', value: poolLoading ? '...' : `${currentAPY}%`, color: '#00D084' },
          ].map((stat) => (
            <div key={stat.label} className="bg-[#14171C] border border-white/5 rounded-2xl shadow-card p-4">
              <div className="text-[10px] text-[#6B6F76] uppercase tracking-wider mb-1">{stat.label}</div>
              <div className="text-xl font-bold font-mono" style={{ color: stat.color }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Utilization Bar */}
        <UtilizationBar
          utilization={utilization}
          totalBorrowed={totalBorrowed}
          poolBalance={poolBalance}
          totalLiquidity={totalLiquidity}
          currentAPY={currentAPY}
          isLoading={poolLoading}
        />

        {/* Deposit Section */}
        <div className="bg-[#14171C] border border-white/5 rounded-2xl shadow-card p-6">
          <h3 className="font-bold text-sm uppercase tracking-wider text-[#6B6F76] mb-4">Deposit to Pool</h3>

          {!isConnected ? (
            <div className="text-center py-8">
              <p className="text-[#6B6F76] text-sm">Connect your wallet to deposit</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-[#6B6F76] mb-1.5 block">Amount (BNB)</label>
                <div className="flex gap-3">
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    placeholder="0.0"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="flex-1 bg-[#0B0D10] border border-white/10 rounded-xl px-4 py-3 text-sm font-mono text-white placeholder-[#6B6F76] focus:outline-none focus:border-[#F5A623]/50"
                  />
                  <button
                    onClick={handleDeposit}
                    disabled={isDepositing || !depositAmount || parseFloat(depositAmount) <= 0}
                    className="bg-[#F5A623] text-black font-bold px-6 py-3 rounded-full hover:shadow-gold-glow transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {isDepositing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {isPending ? 'Confirm...' : 'Confirming...'}
                      </>
                    ) : (
                      'Deposit'
                    )}
                  </button>
                </div>
              </div>

              {isSuccess && txHash && (
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-400" />
                  <span className="text-green-400 text-sm">Deposit confirmed</span>
                  <a
                    href={`https://testnet.bscscan.com/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#F5A623] text-xs flex items-center gap-1 ml-auto hover:underline"
                  >
                    View <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              <div className="bg-[#0B0D10] rounded-xl p-4 text-xs text-[#6B6F76] space-y-1">
                <div className="flex justify-between">
                  <span>Contract</span>
                  <span className="font-mono text-[#B0B3B8]">
                    {CONTRACT_ADDRESSES.LendingPool.slice(0, 6)}...{CONTRACT_ADDRESSES.LendingPool.slice(-4)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Function</span>
                  <span className="font-mono text-[#B0B3B8]">depositToPool()</span>
                </div>
                <div className="flex justify-between">
                  <span>Network</span>
                  <span className="font-mono text-[#B0B3B8]">BSC Testnet (97)</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pool Info */}
        <div className="bg-[#14171C] border border-white/5 rounded-2xl shadow-card p-6">
          <h3 className="font-bold text-sm uppercase tracking-wider text-[#6B6F76] mb-4">Pool Information</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <span className="text-[#B0B3B8]">Collateral Requirements</span>
              <span className="text-[#F5A623] font-mono">110% - 150%</span>
            </div>
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <span className="text-[#B0B3B8]">Tier-Based Rates</span>
              <span className="text-[#B0B3B8] font-mono">Bronze 150% / Silver 135% / Gold 125% / Platinum 110%</span>
            </div>
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <span className="text-[#B0B3B8]">Max Utilization</span>
              <span className="text-red-400 font-mono">80%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#B0B3B8]">Interest Rate</span>
              <span className="text-[#B0B3B8] font-mono">2% flat</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
