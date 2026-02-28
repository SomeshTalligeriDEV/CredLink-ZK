'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Coins, RotateCcw, Plane, Landmark } from 'lucide-react';

const navItems = [
  { href: '/',       label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/borrow', label: 'Borrow',      icon: Coins },
  { href: '/repay',  label: 'Repay',       icon: RotateCcw },
  { href: '/travel', label: 'Travel Mode', icon: Plane },
  { href: '/lender', label: 'Lend',        icon: Landmark },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  const navContent = (
    <div className="flex flex-col gap-1 px-3 py-6">
      {navItems.map((item) => {
        const active = isActive(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 ${
              active
                ? 'bg-[#F5A623]/10 text-[#F5A623] border-l-2 border-[#F5A623]'
                : 'text-[#B0B3B8] hover:text-white hover:bg-white/5 border-l-2 border-transparent'
            }`}
          >
            <Icon size={20} strokeWidth={active ? 2 : 1.5} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:block fixed left-0 top-[72px] w-[240px] h-[calc(100vh-72px)] bg-[#0E1014] border-r border-white/5 overflow-y-auto z-40">
        {navContent}
      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={onClose} />
          <aside className="absolute left-0 top-0 w-[240px] h-full bg-[#0E1014] sidebar-enter z-50">
            <div className="h-[72px] flex items-center px-6 border-b border-white/5">
              <span className="text-[#F5A623] font-bold text-lg">CredLink <span className="text-white/60 text-sm font-normal">ZK</span></span>
            </div>
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
}
