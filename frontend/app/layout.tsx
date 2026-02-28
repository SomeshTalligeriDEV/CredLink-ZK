import './globals.css';
import type { Metadata } from 'next';
import Providers from '@/components/Providers';
import { MocaAuthProvider } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/ui/DashboardLayout';

export const metadata: Metadata = {
  title: 'CredLink ZK',
  description: 'Privacy-Preserving Behavioral Credit Protocol on BNB Chain',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#0B0D10] text-white min-h-screen">
        <Providers>
          <MocaAuthProvider>
            <DashboardLayout>
              {children}
            </DashboardLayout>
          </MocaAuthProvider>
        </Providers>
      </body>
    </html>
  );
}
