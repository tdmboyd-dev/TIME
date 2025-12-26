import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';

const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#7c3aed',
};

export const metadata: Metadata = {
  title: 'TIME BEYOND US — Meta-Intelligence Trading Governor',
  description: 'The Ultimate AI-Powered Trading Platform with 182+ bots - We Beat Time, So You Don\'t Have To',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'TIME',
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/apple-touch-icon.svg', sizes: '180x180', type: 'image/svg+xml' },
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
