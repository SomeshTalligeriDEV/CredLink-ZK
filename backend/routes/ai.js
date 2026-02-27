const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// POST /risk-explanation
router.post('/risk-explanation', async (req, res) => {
  try {
    const { address, score, tier, totalLoans, repaidLoans } = req.body;

    const completion = await groq.chat.completions.create({
      model: 'llama3-8b-8192',
      messages: [
        {
          role: 'system',
          content: 'You are a DeFi credit risk advisor.'
        },
        {
          role: 'user',
          content: `Given this on-chain credit data: Score=${score}/1000, Tier=${tier}/3, Loans=${totalLoans}, Repaid=${repaidLoans}. Write a 2-sentence risk assessment for a lender. Be specific and professional. Max 60 words.`
        }
      ],
      max_tokens: 150,
      temperature: 0.7
    });

    return res.json({ explanation: completion.choices[0].message.content });
  } catch (error) {
    console.error('Error in /risk-explanation:', error.message);
    const { score, tier } = req.body;
    const fallback = `Based on on-chain behavioral analysis, this wallet shows ${score > 500 ? 'strong' : 'developing'} creditworthiness with a Tier ${tier} rating. ${score > 500 ? 'Low risk profile suitable for reduced collateral lending.' : 'Standard collateral requirements recommended.'}`;
    return res.json({ explanation: fallback });
  }
});

// POST /anomaly-detect
router.post('/anomaly-detect', async (req, res) => {
  try {
    const { address, recentTxCount, walletAge, avgTxValue } = req.body;

    const completion = await groq.chat.completions.create({
      model: 'llama3-8b-8192',
      messages: [
        {
          role: 'system',
          content: 'You are a blockchain security analyst specializing in Sybil detection and on-chain anomaly analysis. Respond in JSON format only with keys: suspicious (boolean), confidence (number 0-1), reason (string).'
        },
        {
          role: 'user',
          content: `Analyze this wallet for Sybil/farming patterns: Address=${address}, Recent Transactions=${recentTxCount}, Wallet Age (days)=${walletAge}, Avg Transaction Value (BNB)=${avgTxValue}. Detect if this looks like a Sybil attack, airdrop farming, or wash trading. Respond with JSON only.`
        }
      ],
      max_tokens: 200,
      temperature: 0.3
    });

    let analysis;
    try {
      const content = completion.choices[0].message.content;
      // Extract JSON from the response (handle markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
    } catch (parseError) {
      analysis = {
        suspicious: false,
        confidence: 0.1,
        reason: 'Unable to parse AI analysis. Default: not suspicious.'
      };
    }

    // If suspicious, add recommendation for 7-day time-lock on tier upgrades
    if (analysis.suspicious) {
      analysis.recommendation = 'Apply a 7-day time-lock on tier upgrades for this wallet pending further review.';
    }

    return res.json(analysis);
  } catch (error) {
    console.error('Error in /anomaly-detect:', error.message);
    return res.json({
      suspicious: false,
      confidence: 0.1,
      reason: 'Unable to perform AI analysis. Default: not suspicious.'
    });
  }
});

module.exports = router;
