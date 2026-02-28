'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { exchangeMocaCode } from '@/lib/moca-auth';
import { useMocaAuth } from '@/contexts/AuthContext';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

export default function AuthCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { address } = useAccount();
  const { setVerified } = useMocaAuth();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Verifying Moca identity...');

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // wallet address passed as state

    if (!code) {
      setStatus('error');
      setMessage('No authorization code received.');
      return;
    }

    const walletAddress = state || address;
    if (!walletAddress) {
      setStatus('error');
      setMessage('No wallet address found. Please connect your wallet first.');
      return;
    }

    async function processAuth() {
      try {
        setMessage('Exchanging authorization code...');
        const result = await exchangeMocaCode(code!, walletAddress as string);

        if (result.success && result.mocaId && result.identityHash) {
          setVerified(result.mocaId, result.identityHash);
          setStatus('success');
          setMessage(
            result.onChainBound
              ? 'Identity verified and bound on-chain!'
              : 'Identity verified successfully!'
          );
          // Redirect to dashboard after 2 seconds
          setTimeout(() => router.push('/'), 2000);
        } else {
          setStatus('error');
          setMessage(result.error || 'Verification failed. Please try again.');
        }
      } catch (err: any) {
        setStatus('error');
        setMessage(err.message || 'Network error. Is the backend running?');
      }
    }

    processAuth();
  }, [searchParams, address, setVerified, router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="bg-[#14171C] rounded-2xl shadow-card p-8 max-w-md w-full text-center">
        {status === 'processing' && (
          <>
            <Loader2 className="w-12 h-12 text-[#F5A623] animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Processing</h2>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-green-400 mb-2">Verified</h2>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-red-400 mb-2">Error</h2>
          </>
        )}
        <p className="text-[#B0B3B8] text-sm">{message}</p>
        {status === 'success' && (
          <p className="text-[#6B6F76] text-xs mt-3">Redirecting to dashboard...</p>
        )}
        {status === 'error' && (
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-6 py-2 bg-[#F5A623] text-[#0B0D10] font-semibold rounded-full hover:shadow-gold-glow transition-all"
          >
            Back to Dashboard
          </button>
        )}
      </div>
    </div>
  );
}
