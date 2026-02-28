'use client';

import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { useState } from 'react';
import { parseEther, formatEther } from 'viem';
import { Check, Loader2, ExternalLink, AlertCircle, Wallet, ArrowUpRight, Clock, Shield } from 'lucide-react';
import { CONTRACT_ADDRESSES, LENDINGPOOL_ABI } from '@/lib/contracts';

interface Loan {
  id: bigint;
  borrower: string;
  amount: bigint;
  collateral: bigint;
  collateralRatio: bigint;
  startTime: bigint;
  dueDate: bigint;
  repaid: boolean;
  liquidated: boolean;
}

export default function RepayPage() {
  const { address, isConnected } = useAccount();
  const [repayingLoanId, setRepayingLoanId] = useState<bigint | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  const { data: loansData } = useReadContract({
    address: CONTRACT_ADDRESSES.LendingPool,
    abi: LENDINGPOOL_ABI,
    functionName: 'getLoansByBorrower',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  }) as { data: Loan[] | undefined };

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const loans = loansData || [];
  const activeLoans = loans.filter((l: Loan) => !l.repaid && !l.liquidated);
  const totalOwed = activeLoans.reduce((sum: bigint, l: Loan) => sum + (l.amount * BigInt(102) / BigInt(100)), BigInt(0));
  const totalCollateralLocked = activeLoans.reduce((sum: bigint, l: Loan) => sum + l.collateral, BigInt(0));

  function handleRepay(loan: Loan) {
    setRepayingLoanId(loan.id);
    setSuccessMessage('');
    const repayAmount = loan.amount * BigInt(102) / BigInt(100);
    writeContract({
      address: CONTRACT_ADDRESSES.LendingPool,
      abi: LENDINGPOOL_ABI,
      functionName: 'repayLoan',
      args: [loan.id],
      value: repayAmount,
    });
  }

  if (isSuccess && repayingLoanId !== null && !successMessage) {
    setSuccessMessage(`Loan #${repayingLoanId.toString()} repaid! Score +50 points! Tier may upgrade.`);
    setRepayingLoanId(null);
  }

  if (!isConnected) {
    return (
      <div className="text-center py-20">
        <Shield className="w-16 h-16 text-gold mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
        <p className="text-[#B0B3B8]">Connect your wallet to view and repay your loans</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Repay <span className="text-gold">Loans</span></h1>
        <p className="text-[#B0B3B8]">Repay on time to boost your credit score</p>
      </div>

      {/* Summary Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#14171C] rounded-2xl shadow-card border border-white/5 p-4">
          <p className="text-[#B0B3B8] text-sm">Total Owed</p>
          <p className="text-xl font-bold">{totalOwed > 0 ? formatEther(totalOwed) : '0.00'} BNB</p>
        </div>
        <div className="bg-[#14171C] rounded-2xl shadow-card border border-white/5 p-4">
          <p className="text-[#B0B3B8] text-sm">Collateral Locked</p>
          <p className="text-xl font-bold">{totalCollateralLocked > 0 ? formatEther(totalCollateralLocked) : '0.00'} BNB</p>
        </div>
        <div className="bg-[#14171C] rounded-2xl shadow-card border border-white/5 p-4">
          <p className="text-[#B0B3B8] text-sm">Active Loans</p>
          <p className="text-xl font-bold">{activeLoans.length}</p>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-2">
          <Check className="w-5 h-5 text-green-400" />
          <p className="text-green-400">{successMessage}</p>
          {txHash && (
            <a href={`https://testnet.opbnbscan.com/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="text-gold text-sm flex items-center gap-1 ml-auto hover:underline">
              View <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

      {/* Loan Cards */}
      {activeLoans.length === 0 ? (
        <div className="bg-[#14171C] rounded-2xl shadow-card border border-white/5 p-12 text-center">
          <Wallet className="w-12 h-12 text-[#6B6F76] mx-auto mb-4" />
          <h3 className="text-lg font-medium text-[#B0B3B8] mb-2">No Active Loans</h3>
          <p className="text-[#6B6F76] text-sm">Start borrowing to build your credit score.</p>
          <a href="/borrow" className="inline-flex items-center gap-1 mt-4 text-gold text-sm hover:underline">
            Go to Borrow <ArrowUpRight className="w-3 h-3" />
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {activeLoans.map((loan: Loan) => {
            const amount = formatEther(loan.amount);
            const collateral = formatEther(loan.collateral);
            const repayAmount = formatEther(loan.amount * BigInt(102) / BigInt(100));
            const dueDate = new Date(Number(loan.dueDate) * 1000);
            const isOverdue = dueDate < new Date();
            const isRepaying = repayingLoanId === loan.id && (isPending || isConfirming);

            return (
              <div key={loan.id.toString()} className="bg-[#14171C] rounded-2xl shadow-card border border-white/5 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span className="text-[#B0B3B8] text-sm">Loan #{loan.id.toString()}</span>
                    <p className="text-2xl font-bold">{amount} BNB</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    isOverdue ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                  }`}>
                    {isOverdue ? 'Overdue' : 'Active'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div>
                    <p className="text-[#B0B3B8]">Collateral Locked</p>
                    <p className="font-medium">{collateral} BNB</p>
                  </div>
                  <div>
                    <p className="text-[#B0B3B8]">Due Date</p>
                    <p className="font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {dueDate.toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#B0B3B8]">Interest</p>
                    <p className="font-medium">2%</p>
                  </div>
                  <div>
                    <p className="text-[#B0B3B8]">Repay Amount</p>
                    <p className="font-medium text-gold">{repayAmount} BNB</p>
                  </div>
                </div>

                <button
                  onClick={() => handleRepay(loan)}
                  disabled={isRepaying}
                  className="w-full px-4 py-3 bg-gold text-black font-semibold rounded-full hover:shadow-gold-glow transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isRepaying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {isPending ? 'Confirm in Wallet...' : 'Confirming...'}
                    </>
                  ) : (
                    'Repay Loan'
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
