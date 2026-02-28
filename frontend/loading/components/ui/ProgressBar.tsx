interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  className?: string;
}

export default function ProgressBar({ value, max = 100, color = '#F5A623', className = '' }: ProgressBarProps) {
  const percent = Math.min((value / max) * 100, 100);
  return (
    <div className={`w-full h-1.5 bg-white/10 rounded-full overflow-hidden ${className}`}>
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${percent}%`, backgroundColor: color }}
      />
    </div>
  );
}
