import { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string;
  icon?: ReactNode;
  accentColor?: string;
}

export default function StatCard({ label, value, icon, accentColor = '#F5A623' }: StatCardProps) {
  return (
    <div className="bg-[#14171C] rounded-2xl shadow-card p-5">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${accentColor}15` }}>
            {icon}
          </div>
        )}
        <div>
          <p className="text-[#6B6F76] text-sm">{label}</p>
          <p className="text-2xl font-semibold mt-0.5" style={{ color: accentColor }}>{value}</p>
        </div>
      </div>
    </div>
  );
}
