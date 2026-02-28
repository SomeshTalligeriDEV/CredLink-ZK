'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useState } from 'react';
import { Wallet, LogOut, ChevronDown, Copy, Check } from 'lucide-react';

export default function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [showDropdown, setShowDropdown] = useState(false);
  const [copied, setCopied] = useState(false);

  function copyAddress() {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function truncateAddress(addr: string) {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }

  if (isConnected && address) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2 px-4 py-2 bg-[#14171C] rounded-full hover:bg-white/5 transition-colors"
        >
          <div className="w-2 h-2 bg-green-400 rounded-full" />
          <span className="text-sm font-medium">{truncateAddress(address)}</span>
          <ChevronDown className="w-3 h-3 text-gray-400" />
        </button>
        {showDropdown && (
          <div className="absolute right-0 mt-2 w-48 bg-[#14171C] rounded-2xl shadow-card z-50">
            <button
              onClick={copyAddress}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-300 hover:bg-white/5 transition-colors rounded-t-lg"
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy Address'}
            </button>
            <button
              onClick={() => { disconnect(); setShowDropdown(false); }}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-white/5 transition-colors rounded-b-lg"
            >
              <LogOut className="w-4 h-4" />
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => {
        const connector = connectors[0];
        if (connector) connect({ connector });
      }}
      className="flex items-center gap-2 px-4 py-2 bg-gold text-black font-semibold text-sm rounded-full hover:bg-gold-dark hover:shadow-gold-glow transition-colors"
    >
      <Wallet className="w-4 h-4" />
      Connect Wallet
    </button>
  );
}
