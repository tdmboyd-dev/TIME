import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'TIME — Meta-Intelligence Trading Governor',
  description: 'A self-evolving, recursive learning trading organism',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthenticatedLayout>
          {children}
        </AuthenticatedLayout>
      </body>
    </html>
  );
}
