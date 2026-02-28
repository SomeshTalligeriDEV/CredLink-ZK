interface PremiumCardProps {
  children: React.ReactNode;
  className?: string;
}

export default function PremiumCard({ children, className = '' }: PremiumCardProps) {
  return (
    <div className={`bg-[#14171C] rounded-2xl shadow-card p-6 ${className}`}>
      {children}
    </div>
  );
}
