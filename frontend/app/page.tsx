'use client';

import { useAccount } from 'wagmi';
import { useState, useEffect } from 'react';
import { Shield, TrendingUp, Wallet, Activity, Brain, ChevronRight, Zap, Lock } from 'lucide-react';
import { analyzeWallet, generateProof, getRiskExplanation, calculateTierFromScore, getCollateralRatio, getTierName, getTierColor } from '@/lib/zk-proof';
import type { WalletAnalysis, ProofResult } from '@/lib/zk-proof';
import CreditTierCard from '@/components/CreditTierCard';
import CapitalEfficiency from '@/components/CapitalEfficiency';
import AIAdvisor from '@/components/AIAdvisor';

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const [analysis, setAnalysis] = useState<WalletAnalysis | null>(null);
  const [proofResult, setProofResult] = useState<ProofResult | null>(null);
  const [riskExplanation, setRiskExplanation] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [proofGenerated, setProofGenerated] = useState(false);

  // Mock data for when wallet is not connected
  const mockScore = 720;
  const mockTier = 2;

  const score = proofResult?.score ?? (analysis?.estimatedScore ?? mockScore);
  const tier = proofResult?.tier ?? (analysis?.tier ?? mockTier);
  const collateralRatio = getCollateralRatio(tier);

  useEffect(() => {
    if (isConnected && address) {
      handleAnalyze();
    }
  }, [isConnected, address]);

  async function handleAnalyze() {
    if (!address) return;
    setLoading(true);
    try {
      const result = await analyzeWallet(address);
      setAnalysis(result);
    } catch (err) {
      console.error('Analysis error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateProof() {
    if (!address || !analysis) return;
    setLoading(true);
    try {
      const proof = await generateProof(address, analysis);
      setProofResult(proof);
      setProofGenerated(true);

      const explanation = await getRiskExplanation({
        address,
        score: proof.score,
        tier: proof.tier,
        totalLoans: analysis.txCount,
        repaidLoans: analysis.repayments,
      });
      setRiskExplanation(explanation);
    } catch (err) {
      console.error('Proof generation error:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center py-12">
        <div className="inline-flex items-center px-3 py-1 rounded-full bg-gold/10 border border-gold/20 text-gold text-xs mb-4">
          <Shield className="w-3 h-3 mr-1" /> Zero-Knowledge Verified
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Your <span className="text-gold">Privacy-First</span> Credit Score
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          Prove creditworthiness without revealing your financial fingerprint.
          ZK proofs on BNB Chain enable reduced collateral with full privacy.
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Credit Score Card */}
        <div className="lg:col-span-1">
          <CreditTierCard score={score} tier={tier} collateralRatio={collateralRatio} isConnected={isConnected} />
        </div>

        {/* Capital Efficiency */}
        <div className="lg:col-span-2">
          <CapitalEfficiency tier={tier} collateralRatio={collateralRatio} />
        </div>
      </div>

      {/* Generate Proof Section */}
      <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Zap className="w-5 h-5 text-gold" />
              ZK Proof Generation
            </h3>
            <p className="text-gray-400 text-sm mt-1">
              Generate a zero-knowledge proof of your on-chain behavior
            </p>
          </div>
          <button
            onClick={handleGenerateProof}
            disabled={loading || !isConnected}
            className="px-6 py-3 bg-gold text-black font-semibold rounded-lg hover:bg-gold-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
          <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <p className="text-green-400 text-sm">
              Proof generated successfully! Score: {proofResult.score}/1000 |
              Tier: {getTierName(proofResult.tier)} |
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
      {(riskExplanation || !isConnected) && (
        <AIAdvisor
          explanation={riskExplanation || 'Connect your wallet and generate a ZK proof to receive AI-powered risk assessment.'}
          score={score}
          tier={tier}
        />
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gold/10 rounded-lg">
              <Wallet className="w-5 h-5 text-gold" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Total Borrowed</p>
              <p className="text-xl font-bold">{isConnected ? '0.00' : '—'} BNB</p>
            </div>
          </div>
        </div>
        <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gold/10 rounded-lg">
              <Activity className="w-5 h-5 text-gold" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Active Loans</p>
              <p className="text-xl font-bold">{isConnected ? '0' : '—'}</p>
            </div>
          </div>
        </div>
        <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gold/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-gold" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Reputation Points</p>
              <p className="text-xl font-bold">{score}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
