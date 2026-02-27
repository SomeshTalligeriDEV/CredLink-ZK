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
        <label className="block text-sm text-gray-400 mb-2">Loan Amount (BNB)</label>
        <input
          type="number"
          step="0.01"
          min="0.001"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter amount in BNB"
          className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-gold transition-colors"
        />
      </div>

      {amount && parseFloat(amount) > 0 && (
        <div className="p-4 bg-[#0D0D0D] rounded-lg space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Loan</span>
            <span>{amount} BNB</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Collateral Required</span>
            <span className="text-gold">{collateralRequired.toFixed(4)} BNB</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Ratio</span>
            <span>{collateralRatio}%</span>
          </div>
          <div className="border-t border-[#2A2A2A] pt-2 flex justify-between text-green-400">
            <span>Save vs 150% DeFi</span>
            <span>{savings.toFixed(4)} BNB</span>
          </div>
        </div>
      )}

      <button
        onClick={() => onSubmit(amount)}
        disabled={disabled || !amount || parseFloat(amount) <= 0}
        className="w-full px-4 py-3 bg-gold text-black font-semibold rounded-lg hover:bg-gold-dark transition-colors disabled:opacity-50"
      >
        Continue
      </button>
    </div>
  );
}
