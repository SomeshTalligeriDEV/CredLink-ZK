'use client';

import './globals.css';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { defineChain } from 'viem';
import Link from 'next/link';
import { useState } from 'react';
import WalletConnect from '@/components/WalletConnect';

const opBNBTestnet = defineChain({
  id: 5611,
  name: 'opBNB Testnet',
  nativeCurrency: { name: 'BNB', symbol: 'tBNB', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://opbnb-testnet-rpc.bnbchain.org'] },
  },
  blockExplorers: {
    default: { name: 'opBNBScan', url: 'https://testnet.opbnbscan.com' },
  },
  testnet: true,
});

const config = createConfig({
  chains: [opBNBTestnet],
  transports: {
    [opBNBTestnet.id]: http(),
  },
});

const queryClient = new QueryClient();

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <html lang="en">
      <head>
        <title>CredLink ZK</title>
        <meta name="description" content="Privacy-Preserving Behavioral Credit Protocol on BNB Chain" />
      </head>
      <body className="bg-[#0D0D0D] text-white min-h-screen">
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            <nav className="border-b border-dark-border bg-[#0D0D0D]/95 backdrop-blur-sm sticky top-0 z-50">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                  <div className="flex items-center space-x-8">
                    <Link href="/" className="text-gold font-bold text-xl tracking-tight">
                      CredLink <span className="text-white/60 text-sm font-normal">ZK</span>
                    </Link>
                    <div className="hidden md:flex items-center space-x-6">
                      <Link href="/" className="text-gray-300 hover:text-gold transition-colors text-sm">
                        Dashboard
                      </Link>
                      <Link href="/borrow" className="text-gray-300 hover:text-gold transition-colors text-sm">
                        Borrow
                      </Link>
                      <Link href="/repay" className="text-gray-300 hover:text-gold transition-colors text-sm">
                        Repay
                      </Link>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <WalletConnect />
                    <button
                      className="md:hidden text-gray-300"
                      onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              {mobileMenuOpen && (
                <div className="md:hidden px-4 pb-4 space-y-2">
                  <Link href="/" className="block text-gray-300 hover:text-gold py-2" onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>
                  <Link href="/borrow" className="block text-gray-300 hover:text-gold py-2" onClick={() => setMobileMenuOpen(false)}>Borrow</Link>
                  <Link href="/repay" className="block text-gray-300 hover:text-gold py-2" onClick={() => setMobileMenuOpen(false)}>Repay</Link>
                </div>
              )}
            </nav>
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {children}
            </main>
            <footer className="border-t border-dark-border mt-16 py-8 text-center text-gray-500 text-sm">
              CredLink ZK — Privacy-Preserving Credit on BNB Chain
            </footer>
          </QueryClientProvider>
        </WagmiProvider>
      </body>
    </html>
  );
}
