const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Mock Moca OAuth configuration
// In production, these would point to real Moca OAuth endpoints
const MOCA_AUTH_URL = '/auth/moca-mock';
const MOCA_REDIRECT_URI = typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : 'http://localhost:3000/auth/callback';
const MOCA_CLIENT_ID = 'credlink-zk';

/**
 * Build the Moca OAuth authorization URL.
 * For the hackathon demo, this redirects to our own mock callback
 * with a generated code. In production, this would redirect to
 * Moca's real OAuth authorization endpoint.
 */
export function getMocaAuthUrl(walletAddress: string): string {
  // For demo: redirect directly to callback with a mock code
  const mockCode = `moca_${Date.now()}_${walletAddress.slice(2, 8)}`;
  const params = new URLSearchParams({
    code: mockCode,
    state: walletAddress,
  });
  return `/auth/callback?${params.toString()}`;
}

/**
 * Exchange the OAuth authorization code for identity verification.
 * Sends the code to our backend which:
 * 1. Verifies the code (mock for demo)
 * 2. Generates an identityHash
 * 3. Calls CreditScoreZK.bindIdentity() on-chain with admin signer
 */
export async function exchangeMocaCode(
  code: string,
  walletAddress: string
): Promise<{
  success: boolean;
  mocaId?: string;
  identityHash?: string;
  walletAddress?: string;
  onChainBound?: boolean;
  error?: string;
}> {
  const res = await fetch(`${BACKEND_URL}/api/auth/moca`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, walletAddress }),
  });
  return res.json();
}

/**
 * Check the current Moca verification status for a wallet address.
 */
export async function checkMocaStatus(
  walletAddress: string
): Promise<{
  walletAddress: string;
  mocaVerified: boolean;
  identityHash: string | null;
  canBorrow: boolean;
  message: string;
}> {
  const res = await fetch(`${BACKEND_URL}/api/identity/status/${walletAddress}`);
  return res.json();
}
