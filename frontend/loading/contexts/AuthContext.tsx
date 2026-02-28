'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAccount } from 'wagmi';
import { getMocaAuthUrl, checkMocaStatus } from '@/lib/moca-auth';

interface MocaAuthState {
  mocaId: string | null;
  identityHash: string | null;
  mocaVerified: boolean;
  loading: boolean;
}

interface MocaAuthContextType extends MocaAuthState {
  loginWithMoca: () => void;
  logout: () => void;
  refreshStatus: () => Promise<void>;
  setVerified: (mocaId: string, identityHash: string) => void;
}

const MocaAuthContext = createContext<MocaAuthContextType | null>(null);

export function useMocaAuth(): MocaAuthContextType {
  const ctx = useContext(MocaAuthContext);
  if (!ctx) {
    throw new Error('useMocaAuth must be used within a MocaAuthProvider');
  }
  return ctx;
}

function getStorageKey(address: string) {
  return `credlink_moca_${address.toLowerCase()}`;
}

export function MocaAuthProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount();
  const [state, setState] = useState<MocaAuthState>({
    mocaId: null,
    identityHash: null,
    mocaVerified: false,
    loading: false,
  });

  const refreshStatus = useCallback(async () => {
    if (!address) return;
    setState(prev => ({ ...prev, loading: true }));
    try {
      const status = await checkMocaStatus(address);
      if (status.mocaVerified) {
        setState({
          mocaId: null, // Backend doesn't return mocaId in status
          identityHash: status.identityHash,
          mocaVerified: true,
          loading: false,
        });
        // Try to restore mocaId from localStorage
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem(getStorageKey(address));
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              setState(prev => ({ ...prev, mocaId: parsed.mocaId || null }));
            } catch {}
          }
        }
      } else {
        setState({
          mocaId: null,
          identityHash: null,
          mocaVerified: false,
          loading: false,
        });
      }
    } catch (err) {
      console.error('Moca status check failed:', err);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [address]);

  // Check Moca verification status when wallet connects
  useEffect(() => {
    if (isConnected && address) {
      refreshStatus();
    } else {
      setState({ mocaId: null, identityHash: null, mocaVerified: false, loading: false });
    }
  }, [isConnected, address, refreshStatus]);

  const loginWithMoca = useCallback(() => {
    if (!address) return;
    const authUrl = getMocaAuthUrl(address);
    window.location.href = authUrl;
  }, [address]);

  const logout = useCallback(() => {
    if (address && typeof window !== 'undefined') {
      localStorage.removeItem(getStorageKey(address));
    }
    setState({ mocaId: null, identityHash: null, mocaVerified: false, loading: false });
  }, [address]);

  const setVerified = useCallback((mocaId: string, identityHash: string) => {
    setState({
      mocaId,
      identityHash,
      mocaVerified: true,
      loading: false,
    });
    if (address && typeof window !== 'undefined') {
      localStorage.setItem(getStorageKey(address), JSON.stringify({ mocaId, identityHash }));
    }
  }, [address]);

  return (
    <MocaAuthContext.Provider
      value={{
        ...state,
        loginWithMoca,
        logout,
        refreshStatus,
        setVerified,
      }}
    >
      {children}
    </MocaAuthContext.Provider>
  );
}
