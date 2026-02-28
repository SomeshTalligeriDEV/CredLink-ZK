'use client';

import './globals.css';
import Providers from '@/components/Providers';
import { MocaAuthProvider } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/ui/DashboardLayout';
import { usePathname } from 'next/navigation';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLandingOrScene = pathname === '/' || pathname?.startsWith('/scene');

  return (
    <html lang="en">
      <body className="bg-[#0B0D10] text-white min-h-screen">
        <Providers>
          <MocaAuthProvider>
            {isLandingOrScene ? (
              children
            ) : (
              <DashboardLayout>
                {children}
              </DashboardLayout>
            )}
          </MocaAuthProvider>
        </Providers>
      </body>
    </html>
  );
}
