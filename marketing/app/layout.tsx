import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'TIME - AI-Powered Trading Platform',
  description: '133 intelligent trading bots. Stocks, crypto, forex, options. Start free.',
  openGraph: {
    title: 'TIME - AI-Powered Trading Platform',
    description: '133 intelligent trading bots. Stocks, crypto, forex, options. Start free.',
    url: 'https://timebeyondus.com',
    siteName: 'TIME Trading',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TIME - AI-Powered Trading Platform',
    description: '133 intelligent trading bots. Stocks, crypto, forex, options. Start free.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
