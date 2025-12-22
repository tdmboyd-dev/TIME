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

// WalletConnect Project ID - Required for WalletConnect integration
// Get one at https://cloud.walletconnect.com (free tier available)
// Without a valid project ID, WalletConnect modal will show 403 errors but injected wallets (MetaMask) still work
const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

// Log warning if no project ID is configured (only in development)
if (!WALLETCONNECT_PROJECT_ID && typeof window !== 'undefined') {
  console.warn('[Web3Provider] NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID not set. WalletConnect features limited. Get a free project ID at https://cloud.walletconnect.com');
}

// Configure wagmi with RainbowKit
// Note: Without valid projectId, WalletConnect won't work but MetaMask/injected wallets still function
const config = getDefaultConfig({
  appName: 'TIME DeFi',
  projectId: WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID', // Fallback to prevent crash
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
