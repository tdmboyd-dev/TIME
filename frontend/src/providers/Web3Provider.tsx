'use client';

/**
 * Web3 Provider
 *
 * Provides wallet connection functionality using RainbowKit and Wagmi.
 * Supports MetaMask, Coinbase Wallet, WalletConnect, and more.
 */

import { getDefaultConfig, RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { mainnet, polygon, arbitrum, optimism, base, avalanche, bsc } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@rainbow-me/rainbowkit/styles.css';

// Supported chains for DeFi operations
const chains = [mainnet, polygon, arbitrum, optimism, base, avalanche, bsc] as const;

// Configure wagmi with RainbowKit
const config = getDefaultConfig({
  appName: 'TIME DeFi',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'time-defi-app',
  chains,
  ssr: true,
});

// Create React Query client
const queryClient = new QueryClient();

interface Web3ProviderProps {
  children: React.ReactNode;
}

export function Web3Provider({ children }: Web3ProviderProps) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#6366f1', // TIME primary color
            accentColorForeground: 'white',
            borderRadius: 'medium',
            fontStack: 'system',
          })}
          modalSize="compact"
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default Web3Provider;
