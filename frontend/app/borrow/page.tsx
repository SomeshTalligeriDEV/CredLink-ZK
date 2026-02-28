'use client';

import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useState } from 'react';
import { parseEther, formatEther } from 'viem';
import { Shield, ArrowRight, Check, Loader2, ExternalLink, AlertCircle } from 'lucide-react';
import { analyzeWallet, generateProof, calculateTierFromScore, getCollateralRatio, getTierName } from '@/lib/zk-proof';
import { CONTRACT_ADDRESSES, LENDINGPOOL_ABI } from '@/lib/contracts';
import type { WalletAnalysis, ProofResult } from '@/lib/zk-proof';

export default function BorrowPage() {
  const { address, isConnected } = useAccount();
  const [step, setStep] = useState(1);
  const [analysis, setAnalysis] = useState<WalletAnalysis | null>(null);
  const [proofResult, setProofResult] = useState<ProofResult | null>(null);
  const [loanAmount, setLoanAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { writeContract, data: txHash, isPending: isTxPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  const tier = proofResult?.tier ?? 0;
  const collateralRatio = getCollateralRatio(tier);
  const collateralRequired = loanAmount ? (parseFloat(loanAmount) * collateralRatio / 100) : 0;
  const traditionalCollateral = loanAmount ? parseFloat(loanAmount) * 1.5 : 0;
  const savings = traditionalCollateral - collateralRequired;

  async function handleGenerateProof() {
    if (!address) return;
    setLoading(true);
    setError('');
    try {
      const walletAnalysis = await analyzeWallet(address);
      setAnalysis(walletAnalysis);
      const proof = await generateProof(address, walletAnalysis);
      setProofResult(proof);
      setStep(2);
    } catch (err) {
      setError('Failed to generate proof. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleSetAmount() {
    if (!loanAmount || parseFloat(loanAmount) <= 0) {
      setError('Please enter a valid loan amount');
      return;
    }
    setError('');
    setStep(3);
  }

  async function handleRequestLoan() {
    if (!loanAmount) return;
    setError('');
    try {
      writeContract({
        address: CONTRACT_ADDRESSES.LendingPool,
        abi: LENDINGPOOL_ABI,
        functionName: 'requestLoan',
        args: [parseEther(loanAmount)],
        value: parseEther(collateralRequired.toFixed(18)),
      });
    } catch (err: any) {
      setError(err.message || 'Transaction failed');
      console.error(err);
    }
  }

  const steps = [
    { num: 1, label: 'Generate Proof' },
    { num: 2, label: 'Set Amount' },
    { num: 3, label: 'Lock Collateral' },
  ];

  if (!isConnected) {
    return (
      <div className="text-center py-20">
        <Shield className="w-16 h-16 text-gold mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
        <p className="text-[#B0B3B8]">Connect your wallet to start borrowing with reduced collateral</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Borrow with <span className="text-gold">ZK Privacy</span></h1>
        <p className="text-[#B0B3B8]">Prove your creditworthiness, unlock better rates</p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-between">
        {steps.map((s, i) => (
          <div key={s.num} className="flex items-center">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              step >= s.num ? 'bg-gold/20 text-gold border border-gold/30' : 'bg-[#14171C] text-gray-500 border border-white/10'
            }`}>
              {step > s.num ? <Check className="w-4 h-4" /> : <span>{s.num}</span>}
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < steps.length - 1 && <ArrowRight className="w-4 h-4 text-[#6B6F76] mx-2" />}
          </div>
        ))}
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Step Content */}
      <div className="bg-[#14171C] rounded-2xl shadow-card border border-white/5 p-6">
        {step === 1 && (
          <div className="text-center space-y-6">
            <div className="p-4 bg-gold/5 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
              <Shield className="w-10 h-10 text-gold" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Generate ZK Proof</h3>
              <p className="text-[#B0B3B8] text-sm">
                Your on-chain behavior will be analyzed locally and a zero-knowledge proof will be generated.
                No private data leaves your device.
              </p>
            </div>
            <button
              onClick={handleGenerateProof}
              disabled={loading}
              className="px-8 py-3 bg-gold text-black font-semibold rounded-full hover:shadow-gold-glow transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating proof locally...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  Generate ZK Proof
                </>
              )}
            </button>
          </div>
        )}

        {step === 2 && proofResult && (
          <div className="space-y-6">
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
              <div className="flex items-center gap-2 text-green-400 mb-2">
                <Check className="w-5 h-5" />
                <span className="font-medium">Proof Verified</span>
              </div>
              <p className="text-sm text-[#B0B3B8]">
                Score: {proofResult.score}/1000 | Tier: {getTierName(proofResult.tier)} | Collateral: {collateralRatio}%
              </p>
            </div>

            <div>
              <label className="block text-sm text-[#B0B3B8] mb-2">Loan Amount (BNB)</label>
              <input
                type="number"
                step="0.01"
                min="0.001"
                value={loanAmount}
                onChange={(e) => setLoanAmount(e.target.value)}
                placeholder="0.1"
                className="w-full bg-[#0B0D10] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold transition-colors"
              />
            </div>

            {loanAmount && parseFloat(loanAmount) > 0 && (
              <div className="space-y-3 p-4 bg-[#0B0D10] rounded-xl">
                <div className="flex justify-between text-sm">
                  <span className="text-[#B0B3B8]">Loan Amount</span>
                  <span>{loanAmount} BNB</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#B0B3B8]">Collateral Required</span>
                  <span className="text-gold">{collateralRequired.toFixed(4)} BNB ({collateralRatio}%)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#B0B3B8]">Traditional DeFi Would Require</span>
                  <span className="text-red-400">{traditionalCollateral.toFixed(4)} BNB (150%)</span>
                </div>
                <div className="border-t border-white/10 pt-3 flex justify-between text-sm font-medium">
                  <span className="text-green-400">You Save</span>
                  <span className="text-green-400">{savings.toFixed(4)} BNB ({((savings / traditionalCollateral) * 100).toFixed(1)}%)</span>
                </div>
              </div>
            )}

            <button
              onClick={handleSetAmount}
              className="w-full px-6 py-3 bg-gold text-black font-semibold rounded-full hover:shadow-gold-glow transition-colors"
            >
              Continue to Collateral Lock
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="space-y-3 p-4 bg-[#0B0D10] rounded-xl">
              <h4 className="font-medium text-gold">Loan Summary</h4>
              <div className="flex justify-between text-sm">
                <span className="text-[#B0B3B8]">Borrow</span>
                <span>{loanAmount} BNB</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#B0B3B8]">Lock as Collateral</span>
                <span>{collateralRequired.toFixed(4)} BNB</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#B0B3B8]">Interest Rate</span>
                <span>2%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#B0B3B8]">Repayment Amount</span>
                <span>{(parseFloat(loanAmount) * 1.02).toFixed(4)} BNB</span>
              </div>
            </div>

            {!isConfirmed ? (
              <button
                onClick={handleRequestLoan}
                disabled={isTxPending || isConfirming}
                className="w-full px-6 py-3 bg-gold text-black font-semibold rounded-full hover:shadow-gold-glow transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isTxPending || isConfirming ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {isTxPending ? 'Confirm in Wallet...' : 'Confirming Transaction...'}
                  </>
                ) : (
                  'Request Loan'
                )}
              </button>
            ) : (
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                <div className="flex items-center gap-2 text-green-400 mb-2">
                  <Check className="w-5 h-5" />
                  <span className="font-medium">Loan Created Successfully!</span>
                </div>
                {txHash && (
                  <a
                    href={`https://testnet.opbnbscan.com/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gold text-sm flex items-center gap-1 hover:underline"
                  >
                    View on Explorer <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
