'use client';

import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { mocaVerified, identityHash, loginWithMoca, loading: mocaLoading } = useMocaAuth();

  // On-chain data hooks
  const { profile, isLoading: profileLoading } = useUserProfile();
  const { totalBorrowed, poolBalance, isLoading: poolLoading } = usePoolMetrics();
  const { activeLoans, loans, isLoading: loansLoading } = useUserLoans();
  const { events: scoreHistory, isLoading: historyLoading } = useScoreHistory();

  // First-visit redirect to intro
  useEffect(() => {
    if (typeof window !== 'undefined' && !sessionStorage.getItem('credlink_intro_seen')) {
      sessionStorage.setItem('credlink_intro_seen', '1');
      router.replace('/intro');
    }
  }, [router]);

  // ZK proof state
  const [analysis, setAnalysis] = useState<WalletAnalysis | null>(null);
  const [proofResult, setProofResult] = useState<ProofResult | null>(null);
  const [riskExplanation, setRiskExplanation] = useState('');
  const [loading, setLoading] = useState(false);
  const [proofGenerated, setProofGenerated] = useState(false);

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
    <div className="space-y-6">
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
                {mocaLoading ? 'Checking...' : 'Verify with Moca'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Row 1: Credit Score + Capital Efficiency */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <CreditTierCard
            score={score}
            tier={tier}
            collateralRatio={collateralRatio}
            isConnected={isConnected}
          />
        </div>
        <div className="lg:col-span-2">
          <CapitalEfficiencyChart
            userTier={isConnected && profile ? profile.tier : null}
            userCollateralRatio={isConnected && profile ? profile.collateralRatio : null}
            isLoading={profileLoading}
          />
        </div>
      </div>

      {/* Row 2: Score Evolution + Risk Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ScoreEvolutionChart events={scoreHistory} isLoading={historyLoading} />
        <RiskDistributionChart
          totalLoans={profile?.totalLoans ?? 0}
          repaidLoans={profile?.repaidLoans ?? 0}
          activeLoans={activeLoans.length}
          isLoading={profileLoading || loansLoading}
        />
      </div>

      {/* Row 3: Trust Network */}
      <TrustNetworkGraph />

      {/* ZK Proof Generation */}
      <div className="bg-[#14171C] rounded-2xl shadow-card border border-white/5 p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#F5A623]" />
              ZK Proof Generation
            </h3>
            <p className="text-[#6B6F76] text-sm mt-1">
              Generate a zero-knowledge proof of your on-chain behavior
            </p>
          </div>
          <button
            onClick={handleGenerateProof}
            disabled={loading || !isConnected}
            className="px-6 py-3 bg-[#F5A623] text-black font-semibold rounded-full hover:shadow-gold-glow transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Generating...
              </>
            ) : proofGenerated ? (
              <>
                <Shield className="w-4 h-4" />
                Proof Verified
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                Generate ZK Proof
              </>
            )}
          </button>
        </div>
        {proofGenerated && proofResult && (
          <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
            <p className="text-green-400 text-sm font-mono">
              Score: {proofResult.score}/1000 | Tier: {getTierName(proofResult.tier)} |
              Wallet Age Valid: {proofResult.walletAgeValid === 1 ? 'Yes' : 'No'} |
              Repayment Valid: {proofResult.repaymentValid === 1 ? 'Yes' : 'No'}
            </p>
          </div>
        )}
        {!isConnected && (
          <p className="mt-3 text-yellow-500/70 text-sm">Connect your wallet to generate a ZK proof</p>
        )}
      </div>

      {/* AI Advisor */}
      {riskExplanation && (
        <AIAdvisor
          explanation={riskExplanation}
          score={proofResult?.score ?? score}
          tier={proofResult?.tier ?? tier}
        />
      )}

      {/* On-chain Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#14171C] rounded-2xl shadow-card border border-white/5 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#F5A623]/10 rounded-lg">
              <Wallet className="w-5 h-5 text-[#F5A623]" />
            </div>
            <div>
              <p className="text-[#6B6F76] text-xs">Total Borrowed (Pool)</p>
              <p className="text-xl font-bold font-mono">
                {poolLoading ? '...' : `${totalBorrowed.toFixed(4)} BNB`}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-[#14171C] rounded-2xl shadow-card border border-white/5 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#F5A623]/10 rounded-lg">
              <Activity className="w-5 h-5 text-[#F5A623]" />
            </div>
            <div>
              <p className="text-[#6B6F76] text-xs">Your Active Loans</p>
              <p className="text-xl font-bold font-mono">
                {loansLoading ? '...' : activeLoans.length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-[#14171C] rounded-2xl shadow-card border border-white/5 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#F5A623]/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-[#F5A623]" />
            </div>
            <div>
              <p className="text-[#6B6F76] text-xs">On-chain Credit Score</p>
              <p className="text-xl font-bold font-mono">
                {profileLoading ? '...' : `${score} / 1000`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
