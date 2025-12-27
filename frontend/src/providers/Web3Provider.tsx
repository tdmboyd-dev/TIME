'use client';

/**
 * Web3 Provider
 *
 * Provides wallet connection functionality using RainbowKit and Wagmi.
 * Supports MetaMask, Coinbase Wallet, WalletConnect, and more.
 */

import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@rainbow-me/rainbowkit/styles.css';

// Lazy load Web3 components to prevent SSR issues on mobile
const LazyWeb3Provider = ({ children }: { children: React.ReactNode }) => {
  const [mounted, setMounted] = useState(false);
  const [queryClient] = useState(() => new QueryClient());
  const [Web3Components, setWeb3Components] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    // Dynamically import Web3 components only on client side
    Promise.all([
      import('@rainbow-me/rainbowkit'),
      import('wagmi'),
      import('wagmi/chains'),
    ]).then(([rainbowkit, wagmi, chains]) => {
      const { getDefaultConfig, RainbowKitProvider, darkTheme } = rainbowkit;
      const { WagmiProvider } = wagmi;
      const { mainnet, polygon, arbitrum, optimism, base, avalanche, bsc } = chains;

      const chainList = [mainnet, polygon, arbitrum, optimism, base, avalanche, bsc] as const;
      const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id';

      const config = getDefaultConfig({
        appName: 'TIME DeFi',
        projectId,
        chains: chainList,
        ssr: false, // Disable SSR for Web3 to prevent hydration issues
      });

      setWeb3Components({
        WagmiProvider,
        RainbowKitProvider,
        darkTheme,
        config,
      });
    }).catch((err) => {
      console.warn('[Web3Provider] Failed to load Web3 components:', err);
      // Still render children without Web3 functionality
      setWeb3Components({ failed: true });
    });
  }, []);

  // During SSR and initial mount, render children without Web3 wrapper
  if (!mounted || !Web3Components) {
    return <>{children}</>;
  }

  // If Web3 failed to load, render children without it
  if (Web3Components.failed) {
    return <>{children}</>;
  }

  const { WagmiProvider, RainbowKitProvider, darkTheme, config } = Web3Components;

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#6366f1',
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
};

interface Web3ProviderProps {
  children: React.ReactNode;
}

export function Web3Provider({ children }: Web3ProviderProps) {
  return <LazyWeb3Provider>{children}</LazyWeb3Provider>;
}

export default Web3Provider;
