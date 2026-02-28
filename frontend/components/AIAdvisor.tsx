'use client';

import { Brain, Shield, AlertTriangle } from 'lucide-react';
import { getTierName } from '@/lib/zk-proof';

interface AIAdvisorProps {
  explanation: string;
  score: number;
  tier: number;
}

export default function AIAdvisor({ explanation, score, tier }: AIAdvisorProps) {
  const riskLevel = score >= 750 ? 'Low' : score >= 500 ? 'Medium' : score >= 200 ? 'Elevated' : 'High';
  const riskColor = score >= 750 ? 'text-green-400' : score >= 500 ? 'text-yellow-400' : score >= 200 ? 'text-orange-400' : 'text-red-400';

  return (
    <div className="bg-[#14171C] rounded-2xl shadow-card p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-gold/10 rounded-lg">
          <Brain className="w-5 h-5 text-gold" />
        </div>
        <div>
          <h3 className="font-semibold">AI Risk Advisor</h3>
          <p className="text-xs text-[#6B6F76]">Powered by Groq LLM</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className={`text-sm font-medium ${riskColor}`}>
            {riskLevel} Risk
          </span>
          {score >= 500 ? (
            <Shield className="w-4 h-4 text-green-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-orange-400" />
          )}
        </div>
      </div>

      <div className="bg-[#0B0D10] rounded-xl p-4">
        <p className="text-[#B0B3B8] text-sm leading-relaxed">{explanation}</p>
      </div>

      <div className="flex items-center gap-4 mt-4 text-xs text-[#6B6F76]">
        <span>Score: {score}/1000</span>
        <span>Tier: {getTierName(tier)}</span>
        <span>Model: llama3-8b</span>
      </div>
    </div>
  );
}
