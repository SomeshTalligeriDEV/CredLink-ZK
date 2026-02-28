'use client';

import { useState } from 'react';
import { getCollateralRatio } from '@/lib/zk-proof';

interface LoanFormProps {
  tier: number;
  onSubmit: (amount: string) => void;
  disabled?: boolean;
}

export default function LoanForm({ tier, onSubmit, disabled }: LoanFormProps) {
  const [amount, setAmount] = useState('');
  const collateralRatio = getCollateralRatio(tier);
  const collateralRequired = amount ? (parseFloat(amount) * collateralRatio / 100) : 0;
  const traditionalCollateral = amount ? parseFloat(amount) * 1.5 : 0;
  const savings = traditionalCollateral - collateralRequired;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-[#B0B3B8] mb-2">Loan Amount (BNB)</label>
        <input
          type="number"
          step="0.01"
          min="0.001"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter amount in BNB"
          className="w-full bg-[#0B0D10] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold transition-colors"
        />
      </div>

      {amount && parseFloat(amount) > 0 && (
        <div className="p-4 bg-[#0B0D10] rounded-lg space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[#B0B3B8]">Loan</span>
            <span>{amount} BNB</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#B0B3B8]">Collateral Required</span>
            <span className="text-gold">{collateralRequired.toFixed(4)} BNB</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#B0B3B8]">Ratio</span>
            <span>{collateralRatio}%</span>
          </div>
          <div className="border-t border-white/5 pt-2 flex justify-between text-green-400">
            <span>Save vs 150% DeFi</span>
            <span>{savings.toFixed(4)} BNB</span>
          </div>
        </div>
      )}

      <button
        onClick={() => onSubmit(amount)}
        disabled={disabled || !amount || parseFloat(amount) <= 0}
        className="w-full px-4 py-3 bg-gold text-black font-semibold rounded-full hover:bg-gold-dark hover:shadow-gold-glow transition-colors disabled:opacity-50"
      >
        Continue
      </button>
    </div>
  );
}
