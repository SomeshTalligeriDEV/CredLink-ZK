interface GoldBadgeProps {
  children: React.ReactNode;
  className?: string;
}

export default function GoldBadge({ children, className = '' }: GoldBadgeProps) {
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full bg-[#F5A623]/10 text-[#F5A623] text-xs font-medium border border-[#F5A623]/20 ${className}`}>
      {children}
    </span>
  );
}
