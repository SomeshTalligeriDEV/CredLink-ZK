'use client';

import { useAccount, useReadContract, useBalance, usePublicClient } from 'wagmi';
import { useEffect, useState } from 'react';
import { parseAbiItem } from 'viem';
import { CONTRACT_ADDRESSES, CREDITSCORE_ABI, LENDINGPOOL_ABI } from '@/lib/contracts';

// ---- User Profile from CreditScoreZK.getUserProfile() ----
export interface OnChainProfile {
  score: number;
  tier: number;
  collateralRatio: number;
  totalLoans: number;
  repaidLoans: number;
  lastUpdated: number;
}

export function useUserProfile() {
  const { address } = useAccount();

  const { data, isLoading, error, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.CreditScoreZK,
    abi: CREDITSCORE_ABI,
    functionName: 'getUserProfile',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const d = data as unknown as any[] | undefined;
  const profile: OnChainProfile | null = d
    ? {
        score: Number(d[0]),
        tier: Number(d[1]),
        collateralRatio: Number(d[2]),
        totalLoans: Number(d[3]),
        repaidLoans: Number(d[4]),
        lastUpdated: Number(d[5]),
      }
    : null;

  return { profile, isLoading, error, refetch };
}

// ---- Identity Verification from CreditScoreZK.isIdentityVerified() ----
export function useIdentityVerified() {
  const { address } = useAccount();

  const { data, isLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.CreditScoreZK,
    abi: CREDITSCORE_ABI,
    functionName: 'isIdentityVerified',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  return { isVerified: !!data, isLoading };
}

// ---- Pool Metrics from LendingPool + contract balance ----
export function usePoolMetrics() {
  const { data: totalBorrowed, isLoading: borrowedLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.LendingPool,
    abi: LENDINGPOOL_ABI,
    functionName: 'totalBorrowed',
  });

  const { data: balanceData, isLoading: balanceLoading } = useBalance({
    address: CONTRACT_ADDRESSES.LendingPool,
  });

  const borrowed = totalBorrowed ? Number(totalBorrowed) / 1e18 : 0;
  const poolBalance = balanceData ? Number(balanceData.value) / 1e18 : 0;
  const totalLiquidity = poolBalance + borrowed;
  const utilization = totalLiquidity > 0 ? (borrowed / totalLiquidity) * 100 : 0;

  const currentAPY =
    utilization > 70 ? 8 : utilization > 40 ? 6 : 4;

  return {
    totalBorrowed: borrowed,
    poolBalance,
    totalLiquidity,
    utilization,
    currentAPY,
    isLoading: borrowedLoading || balanceLoading,
  };
}

// ---- User Loans from LendingPool.getLoansByBorrower() ----
export function useUserLoans() {
  const { address } = useAccount();

  const { data, isLoading, error, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.LendingPool,
    abi: LENDINGPOOL_ABI,
    functionName: 'getLoansByBorrower',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const loans = (data as any[] | undefined) || [];
  const activeLoans = loans.filter((l: any) => !l.repaid && !l.liquidated);
  const repaidLoans = loans.filter((l: any) => l.repaid);

  return { loans, activeLoans, repaidLoans, isLoading, error, refetch };
}

// ---- Score History from ScoreUpdated events ----
export interface ScoreEvent {
  score: number;
  tier: number;
  blockNumber: bigint;
}

export function useScoreHistory() {
  const { address } = useAccount();
  const client = usePublicClient();
  const [events, setEvents] = useState<ScoreEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!address || !client) {
      setEvents([]);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    const fetchEvents = async () => {
      try {
        const currentBlock = await client.getBlockNumber();
        const fromBlock = currentBlock > BigInt(500000)
          ? currentBlock - BigInt(500000)
          : BigInt(0);

        const logs = await client.getLogs({
          address: CONTRACT_ADDRESSES.CreditScoreZK,
          event: parseAbiItem(
            'event ScoreUpdated(address indexed user, uint256 newScore, uint8 newTier)'
          ),
          args: { user: address },
          fromBlock,
          toBlock: 'latest',
        });

        if (cancelled) return;

        const parsed: ScoreEvent[] = logs.map((log: any) => ({
          score: Number(log.args.newScore),
          tier: Number(log.args.newTier),
          blockNumber: log.blockNumber,
        }));

        setEvents(parsed);
      } catch (err) {
        console.error('Failed to fetch score history:', err);
        if (!cancelled) setEvents([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchEvents();
    return () => { cancelled = true; };
  }, [address, client]);

  return { events, isLoading };
}
