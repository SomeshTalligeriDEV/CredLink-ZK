'use client';

import { usePathname } from 'next/navigation';
import DashboardLayout from '@/components/ui/DashboardLayout';

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isIntroRoute = pathname === '/intro' || pathname?.startsWith('/scene');

  if (isIntroRoute) {
    return <>{children}</>;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
