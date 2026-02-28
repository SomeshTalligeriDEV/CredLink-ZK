const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface WalletAnalysis {
  walletAge: number;
  txCount: number;
  balance: string;
  estimatedScore: number;
  repayments: number;
  defaultRatio: number;
  tier: number;
}

export interface ProofResult {
  proof: {
    a: string[];
    b: string[][];
    c: string[];
  };
  publicSignals: number[];
  score: number;
  tier: number;
  walletAgeValid: number;
  repaymentValid: number;
}

export interface CreditData {
  address: string;
  score: number;
  tier: number;
  totalLoans: number;
  repaidLoans: number;
}

export async function analyzeWallet(address: string): Promise<WalletAnalysis> {
  try {
    const res = await fetch(`${API_BASE}/api/credit/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress: address }),
    });
    if (!res.ok) throw new Error('Failed to analyze wallet');
    return await res.json();
  } catch (error) {
    console.error('Error analyzing wallet:', error);
    // Return mock data for demo
    return {
      walletAge: 365,
      txCount: 42,
      balance: '0.5',
      estimatedScore: 720,
      repayments: 21,
      defaultRatio: 0.05,
      tier: 2,
    };
  }
}

export async function generateProof(
  walletAddress: string,
  analysis: WalletAnalysis
): Promise<ProofResult> {
  try {
    const res = await fetch(`${API_BASE}/api/credit/generate-proof`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress,
        walletAge: analysis.walletAge,
        repayments: analysis.repayments,
        defaultRatio: analysis.defaultRatio,
      }),
    });
    if (!res.ok) throw new Error('Failed to generate proof');
    return await res.json();
  } catch (error) {
    console.error('Error generating proof:', error);
    const score = analysis.estimatedScore;
    return {
      proof: { a: ['0x1', '0x2'], b: [['0x1', '0x2'], ['0x3', '0x4']], c: ['0x1', '0x2'] },
      publicSignals: [1, 1, score],
      score,
      tier: calculateTierFromScore(score),
      walletAgeValid: 1,
      repaymentValid: 1,
    };
  }
}

export async function getRiskExplanation(data: CreditData): Promise<string> {
  try {
    const res = await fetch(`${API_BASE}/api/ai/risk-explanation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to get risk explanation');
    const result = await res.json();
    return result.explanation;
  } catch (error) {
    console.error('Error getting risk explanation:', error);
    return data.score > 500
      ? `Strong creditworthiness detected. Tier ${data.tier} rating with ${data.repaidLoans}/${data.totalLoans} loans repaid suggests reliable borrower profile suitable for reduced collateral.`
      : `Developing credit profile. Tier ${data.tier} rating indicates standard collateral requirements. Continued on-time repayments will improve score and unlock better terms.`;
  }
}

export function calculateTierFromScore(score: number): number {
  if (score >= 750) return 3;
  if (score >= 500) return 2;
  if (score >= 200) return 1;
  return 0;
}

export function getCollateralRatio(tier: number): number {
  const ratios = [150, 135, 125, 110];
  return ratios[tier] || ratios[0];
}

export function getTierName(tier: number): string {
  const names = ['Bronze', 'Silver', 'Gold', 'Platinum'];
  return names[tier] || names[0];
}

export function getTierColor(tier: number): string {
  const colors = ['#CD7F32', '#C0C0C0', '#FFD700', '#E5E4E2'];
  return colors[tier] || colors[0];
}
