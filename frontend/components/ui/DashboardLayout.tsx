'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Menu, X, ShieldCheck } from 'lucide-react';
import WalletConnect from '@/components/WalletConnect';
import Sidebar from '@/components/ui/Sidebar';
import { useMocaAuth } from '@/contexts/AuthContext';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { mocaVerified, loading, loginWithMoca } = useMocaAuth();

  return (
    <div className="min-h-screen bg-[#0B0D10]">
      {/* Topbar */}
      <header className="fixed top-0 left-0 right-0 h-[72px] bg-[#0B0D10]/95 backdrop-blur-md border-b border-white/5 z-50">
        <div className="flex items-center justify-between h-full px-6">
          {/* Left: Logo + Mobile Menu */}
          <div className="flex items-center gap-4">
            <button
              className="md:hidden text-[#B0B3B8] hover:text-white transition-colors"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <Link href="/" className="text-[#F5A623] font-bold text-xl tracking-tight">
              CredLink <span className="text-white/60 text-sm font-normal">ZK</span>
            </Link>
          </div>

          {/* Center: Search (cosmetic) */}
          <div className="hidden lg:flex items-center flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B6F76]" />
              <input
                type="text"
                placeholder="Search transactions, addresses..."
                className="w-full bg-[#14171C] text-sm text-white placeholder-[#6B6F76] rounded-full pl-10 pr-4 py-2.5 border border-white/5 focus:outline-none focus:border-[#F5A623]/30 transition-colors"
                readOnly
              />
            </div>
          </div>

          {/* Right: Moca Status + Wallet */}
          <div className="flex items-center gap-3">
            {mocaVerified ? (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full">
                <ShieldCheck size={14} className="text-green-400" />
                <span className="text-green-400 text-xs font-semibold">Moca Verified</span>
              </div>
            ) : (
              <button
                onClick={loginWithMoca}
                disabled={loading}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-[#F5A623]/10 border border-[#F5A623]/20 rounded-full hover:bg-[#F5A623]/20 transition-colors disabled:opacity-50"
              >
                <ShieldCheck size={14} className="text-[#F5A623]" />
                <span className="text-[#F5A623] text-xs font-semibold">
                  {loading ? 'Checking...' : 'Login with Moca'}
                </span>
              </button>
            )}
            <WalletConnect />
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <main className="pt-[72px] md:pl-[240px]">
        <div className="px-4 md:px-8 py-8 max-w-[1200px]">
          {children}
        </div>

        {/* Footer */}
        <footer className="px-4 md:px-8 pb-8 pt-4">
          <div className="border-t border-white/5 pt-6 text-center">
            <p className="text-xs text-[#6B6F76]">
              CredLink ZK &mdash; On-chain credit scoring with zero-knowledge proofs
            </p>
            <p className="text-xs text-[#6B6F76]/50 mt-1">
              BSC Testnet (Chain 97)
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
