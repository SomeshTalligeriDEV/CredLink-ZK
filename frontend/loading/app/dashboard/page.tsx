'use client';

import { useAccount } from 'wagmi';
import { useState, useEffect } from 'react';
import { Shield, Wallet, Activity, TrendingUp, Zap, Lock, ShieldCheck } from 'lucide-react';
import { analyzeWallet, generateProof, getRiskExplanation, getCollateralRatio, getTierName } from '@/lib/zk-proof';
import type { WalletAnalysis, ProofResult } from '@/lib/zk-proof';
import { useUserProfile, usePoolMetrics, useUserLoans, useScoreHistory } from '@/hooks/useContractData';
import { useMocaAuth } from '@/contexts/AuthContext';
import CreditTierCard from '@/components/CreditTierCard';
import AIAdvisor from '@/components/AIAdvisor';
import ScoreEvolutionChart from '@/components/charts/ScoreEvolutionChart';
import CapitalEfficiencyChart from '@/components/charts/CapitalEfficiencyChart';
import TrustNetworkGraph from '@/components/charts/TrustNetworkGraph';
import RiskDistributionChart from '@/components/charts/RiskDistributionChart';

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const { mocaVerified, identityHash, loginWithMoca, loading: mocaLoading } = useMocaAuth();

  // On-chain data hooks
  const { profile, isLoading: profileLoading } = useUserProfile();
  const { totalBorrowed, poolBalance, isLoading: poolLoading } = usePoolMetrics();
  const { activeLoans, loans, isLoading: loansLoading } = useUserLoans();
  const { events: scoreHistory, isLoading: historyLoading } = useScoreHistory();

  // ZK proof state
  const [analysis, setAnalysis] = useState<WalletAnalysis | null>(null);
  const [proofResult, setProofResult] = useState<ProofResult | null>(null);
  const [riskExplanation, setRiskExplanation] = useState('');
  const [loading, setLoading] = useState(false);
  const [proofGenerated, setProofGenerated] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Fade-in effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Derive values from on-chain profile (0 if no profile)
  const score = profile?.score ?? 0;
  const tier = profile?.tier ?? 0;
  const collateralRatio = profile?.collateralRatio ?? getCollateralRatio(tier);

  async function handleGenerateProof() {
    if (!address) return;
    setLoading(true);
    try {
      const walletAnalysis = await analyzeWallet(address);
      setAnalysis(walletAnalysis);
      const proof = await generateProof(address, walletAnalysis);
      setProofResult(proof);
      setProofGenerated(true);

      const explanation = await getRiskExplanation({
        address,
        score: proof.score,
        tier: proof.tier,
        totalLoans: walletAnalysis.txCount,
        repaidLoans: walletAnalysis.repayments,
      });
      setRiskExplanation(explanation);
    } catch (err) {
      console.error('Proof generation error:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`space-y-6 transition-opacity duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Credit Dashboard</h1>
        <p className="text-[#6B6F76] text-sm mt-1">On-chain credit score and protocol metrics</p>
      </div>

      {/* Moca Identity Status */}
      {isConnected && (
        <div className={`rounded-2xl shadow-card border p-4 ${
          mocaVerified
            ? 'bg-green-500/5 border-green-500/20'
            : 'bg-[#F5A623]/5 border-[#F5A623]/20'
        }`}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${mocaVerified ? 'bg-green-500/10' : 'bg-[#F5A623]/10'}`}>
                <ShieldCheck className={`w-4 h-4 ${mocaVerified ? 'text-green-400' : 'text-[#F5A623]'}`} />
              </div>
              <div>
                <h3 className="text-sm font-semibold">
                  {mocaVerified ? 'Moca Identity Verified' : 'Moca Identity Not Linked'}
                </h3>
                <p className="text-xs text-[#6B6F76]">
                  {mocaVerified
                    ? `Bound on-chain${identityHash ? ` (${identityHash.slice(0, 10)}...${identityHash.slice(-6)})` : ''}`
                    : 'Link your Moca identity to unlock borrowing'}
                </p>
              </div>
            </div>
            {!mocaVerified && (
              <button
                onClick={loginWithMoca}
                disabled={mocaLoading}
                className="px-4 py-2 bg-[#F5A623] text-[#0B0D10] font-semibold text-sm rounded-full hover:shadow-gold-glow transition-all disabled:opacity-50"
              >
                {mocaLoading ? 'Connecting...' : 'Link Moca ID'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Connect Wallet or ZK Proof Section */}
      {!isConnected ? (
        <div className="bg-[#14171C] rounded-2xl shadow-card border border-white/5 p-8 text-center">
          <div className="inline-flex p-4 rounded-full bg-[#F5A623]/10 mb-4">
            <Wallet className="w-8 h-8 text-[#F5A623]" />
          </div>
          <h2 className="text-xl font-bold mb-2">Connect Your Wallet</h2>
          <p className="text-[#6B6F76] mb-6">Connect your wallet to view your credit score and generate proofs</p>
        </div>
      ) : (
        <>
          {/* Credit Score Overview */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="bg-[#14171C] rounded-2xl shadow-card border border-white/5 p-6">
              <div className="flex items-center gap-3 mb-2">
                <Shield className="w-5 h-5 text-[#F5A623]" />
                <h3 className="font-semibold text-sm text-[#6B6F76]">Credit Score</h3>
              </div>
              <p className="text-3xl font-bold mt-2">{score}</p>
              <p className="text-xs text-[#6B6F76] mt-1">{getTierName(tier)}</p>
            </div>

            <div className="bg-[#14171C] rounded-2xl shadow-card border border-white/5 p-6">
              <div className="flex items-center gap-3 mb-2">
                <Activity className="w-5 h-5 text-[#F5A623]" />
                <h3 className="font-semibold text-sm text-[#6B6F76]">Active Loans</h3>
              </div>
              <p className="text-3xl font-bold mt-2">{activeLoans}</p>
              <p className="text-xs text-[#6B6F76] mt-1">On-chain loans</p>
            </div>

            <div className="bg-[#14171C] rounded-2xl shadow-card border border-white/5 p-6">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-5 h-5 text-[#F5A623]" />
                <h3 className="font-semibold text-sm text-[#6B6F76]">Collateral Ratio</h3>
              </div>
              <p className="text-3xl font-bold mt-2">{collateralRatio}%</p>
              <p className="text-xs text-[#6B6F76] mt-1">Required collateral</p>
            </div>
          </div>

          {/* ZK Proof Generation */}
          <div className="bg-[#14171C] rounded-2xl shadow-card border border-white/5 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-[#F5A623]/10">
                <Lock className="w-5 h-5 text-[#F5A623]" />
              </div>
              <div>
                <h3 className="font-semibold">Zero-Knowledge Proof</h3>
                <p className="text-xs text-[#6B6F76]">Generate proof without revealing wallet history</p>
              </div>
            </div>

            {!proofGenerated ? (
              <button
                onClick={handleGenerateProof}
                disabled={loading}
                className="w-full py-3 bg-[#F5A623] text-[#0B0D10] font-semibold rounded-full hover:shadow-gold-glow transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Zap className="w-4 h-4 animate-pulse" />
                    Generating Proof...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    Generate ZK Proof
                  </>
                )}
              </button>
            ) : (
              <div className="space-y-4">
                <div className="bg-[#0B0D10] rounded-xl p-4 border border-[#F5A623]/20">
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <p className="text-xs text-[#6B6F76]">Proof Score</p>
                      <p className="text-lg font-bold text-[#F5A623]">{proofResult?.score}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#6B6F76]">Tier</p>
                      <p className="text-lg font-bold">{getTierName(proofResult?.tier ?? 0)}</p>
                    </div>
                  </div>
                  {riskExplanation && (
                    <div className="mt-3 pt-3 border-t border-white/5">
                      <p className="text-xs text-[#6B6F76] mb-1">AI Risk Assessment</p>
                      <p className="text-sm">{riskExplanation}</p>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleGenerateProof}
                  disabled={loading}
                  className="w-full py-2 bg-[#14171C] border border-[#F5A623]/20 text-[#F5A623] font-semibold rounded-full hover:bg-[#F5A623]/5 transition-all"
                >
                  Regenerate Proof
                </button>
              </div>
            )}
          </div>

          {/* Credit Tier Card */}
          <CreditTierCard
            score={score}
            tier={tier}
            collateralRatio={collateralRatio}
            isConnected={isConnected}
          />

          {/* Charts Grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            <ScoreEvolutionChart events={scoreHistory} isLoading={historyLoading} />
            <CapitalEfficiencyChart
              userTier={profile?.tier ?? null}
              userCollateralRatio={profile?.collateralRatio ?? null}
              isLoading={profileLoading}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <TrustNetworkGraph />
            <RiskDistributionChart
              totalLoans={profile?.totalLoans ?? 0}
              repaidLoans={profile?.repaidLoans ?? 0}
              activeLoans={activeLoans.length}
              isLoading={profileLoading || loansLoading}
            />
          </div>

          {/* AI Advisor */}
          {riskExplanation && (
            <AIAdvisor
              explanation={riskExplanation}
              score={score}
              tier={tier}
            />
          )}
        </>
      )}
    </div>
  );
}
