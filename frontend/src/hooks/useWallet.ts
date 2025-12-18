'use client';

/**
 * useWallet Hook
 *
 * Custom hook for wallet connection management.
 * Wraps wagmi hooks for a cleaner interface.
 */

import { useAccount, useBalance, useDisconnect, useChainId, useSwitchChain } from 'wagmi';
import { useConnectModal, useAccountModal, useChainModal } from '@rainbow-me/rainbowkit';
import { formatEther, formatUnits } from 'viem';

export interface WalletState {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  address: string | undefined;
  shortAddress: string;

  // Chain info
  chainId: number | undefined;
  chainName: string;
  isWrongNetwork: boolean;

  // Balance
  balance: string;
  balanceFormatted: string;
  balanceSymbol: string;

  // Actions
  connect: () => void;
  disconnect: () => void;
  openAccountModal: () => void;
  openChainModal: () => void;
  switchChain: (chainId: number) => void;
}

// Chain names mapping
const chainNames: Record<number, string> = {
  1: 'Ethereum',
  137: 'Polygon',
  42161: 'Arbitrum',
  10: 'Optimism',
  8453: 'Base',
  43114: 'Avalanche',
  56: 'BSC',
};

export function useWallet(): WalletState {
  // Wagmi hooks
  const { address, isConnected, isConnecting } = useAccount();
  const chainId = useChainId();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const { switchChain: wagmiSwitchChain } = useSwitchChain();

  // RainbowKit hooks
  const { openConnectModal } = useConnectModal();
  const { openAccountModal } = useAccountModal();
  const { openChainModal } = useChainModal();

  // Get native balance
  const { data: balanceData } = useBalance({
    address: address,
  });

  // Format address
  const shortAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : '';

  // Chain name
  const chainName = chainId ? chainNames[chainId] || `Chain ${chainId}` : 'Unknown';

  // Check if on supported network (Ethereum mainnet or L2s)
  const supportedChainIds = [1, 137, 42161, 10, 8453, 43114, 56];
  const isWrongNetwork = chainId ? !supportedChainIds.includes(chainId) : false;

  // Format balance
  const balance = balanceData ? formatEther(balanceData.value) : '0';
  const balanceFormatted = balanceData
    ? parseFloat(formatUnits(balanceData.value, balanceData.decimals)).toFixed(4)
    : '0.0000';
  const balanceSymbol = balanceData?.symbol || 'ETH';

  return {
    // Connection state
    isConnected,
    isConnecting,
    address,
    shortAddress,

    // Chain info
    chainId,
    chainName,
    isWrongNetwork,

    // Balance
    balance,
    balanceFormatted,
    balanceSymbol,

    // Actions
    connect: () => openConnectModal?.(),
    disconnect: () => wagmiDisconnect(),
    openAccountModal: () => openAccountModal?.(),
    openChainModal: () => openChainModal?.(),
    switchChain: (newChainId: number) => wagmiSwitchChain?.({ chainId: newChainId }),
  };
}

export default useWallet;
