import addresses from './contract-addresses.json';

export const CONTRACT_ADDRESSES = {
  CreditScoreZK: addresses.CreditScoreZK as `0x${string}`,
  CollateralManager: addresses.CollateralManager as `0x${string}`,
  ZKVerifier: addresses.ZKVerifier as `0x${string}`,
  LendingPool: addresses.LendingPool as `0x${string}`,
};

export const CREDITSCORE_ABI = [
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'getUserTier',
    outputs: [
      { name: 'tier', type: 'uint8' },
      { name: 'collateralRatio', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'loanAmount', type: 'uint256' },
    ],
    name: 'getCollateralRequired',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'getUserProfile',
    outputs: [
      { name: 'score', type: 'uint256' },
      { name: 'tier', type: 'uint8' },
      { name: 'collateralRatio', type: 'uint256' },
      { name: 'totalLoans', type: 'uint256' },
      { name: 'repaidLoans', type: 'uint256' },
      { name: 'lastUpdated', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const LENDINGPOOL_ABI = [
  {
    inputs: [{ name: 'amount', type: 'uint256' }],
    name: 'requestLoan',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [{ name: 'loanId', type: 'uint256' }],
    name: 'repayLoan',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'depositToPool',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [{ name: 'borrower', type: 'address' }],
    name: 'getLoansByBorrower',
    outputs: [
      {
        components: [
          { name: 'id', type: 'uint256' },
          { name: 'borrower', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'collateral', type: 'uint256' },
          { name: 'collateralRatio', type: 'uint256' },
          { name: 'startTime', type: 'uint256' },
          { name: 'dueDate', type: 'uint256' },
          { name: 'repaid', type: 'bool' },
          { name: 'liquidated', type: 'bool' },
        ],
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalBorrowed',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'loanId', type: 'uint256' }],
    name: 'liquidateLoan',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

export const ZKVERIFIER_ABI = [
  {
    inputs: [
      { name: 'a', type: 'uint256[2]' },
      { name: 'b', type: 'uint256[2][2]' },
      { name: 'c', type: 'uint256[2]' },
      { name: 'publicSignals', type: 'uint256[3]' },
      { name: 'user', type: 'address' },
    ],
    name: 'verifyAndUpdateScore',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

const COLLATERAL_RATIOS = [1.5, 1.35, 1.25, 1.1];

export function getCollateralForAmount(tier: number, amount: number): number {
  const ratio = COLLATERAL_RATIOS[tier] || COLLATERAL_RATIOS[0];
  return amount * ratio;
}
