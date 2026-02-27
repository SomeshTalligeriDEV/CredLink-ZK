const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface AnomalyResult {
  suspicious: boolean;
  confidence: number;
  reason: string;
}

export async function detectAnomaly(
  address: string,
  recentTxCount: number,
  walletAge: number,
  avgTxValue: number
): Promise<AnomalyResult> {
  try {
    const res = await fetch(`${API_BASE}/api/ai/anomaly-detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, recentTxCount, walletAge, avgTxValue }),
    });
    if (!res.ok) throw new Error('Failed to detect anomaly');
    return await res.json();
  } catch (error) {
    console.error('Error detecting anomaly:', error);
    return {
      suspicious: false,
      confidence: 0.1,
      reason: 'Anomaly detection unavailable. Default: not suspicious.',
    };
  }
}
