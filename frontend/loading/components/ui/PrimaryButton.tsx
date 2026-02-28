'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary';
  className?: string;
}

export default function PrimaryButton({
  children, variant = 'primary', className = '', ...props
}: PrimaryButtonProps) {
  const base = 'font-semibold transition-all duration-200 flex items-center justify-center gap-2';
  const variants = {
    primary: 'bg-[#F5A623] text-[#0B0D10] rounded-full px-6 py-3 hover:bg-[#D4891C] hover:shadow-gold-glow disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none',
    secondary: 'bg-transparent text-[#F5A623] rounded-full px-6 py-3 hover:bg-[#F5A623]/10 border border-[#F5A623]/30 disabled:opacity-50 disabled:cursor-not-allowed',
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
