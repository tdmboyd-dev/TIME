'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ArrowRightLeft,
  Building2,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  ChevronRight,
  Loader2,
  Wifi,
  WifiOff,
  RefreshCw,
} from 'lucide-react';

const API_BASE = 'https://time-backend-hosting.fly.dev/api/v1';

interface Transfer {
  id: string;
  status: string;
  deliveringBroker: {
    brokerName: string;
  };
  totalEstimatedValue: number;
  createdAt: string;
  expectedCompletionDate?: string;
}

interface Broker {
  id: string;
  name: string;
  dtcNumber: string;
}

// Mock data as fallback
const MOCK_BROKERS: Broker[] = [
  { id: 'broker-1', name: 'Robinhood', dtcNumber: '8050' },
  { id: 'broker-2', name: 'Fidelity', dtcNumber: '0226' },
  { id: 'broker-3', name: 'Charles Schwab', dtcNumber: '0164' },
  { id: 'broker-4', name: 'TD Ameritrade', dtcNumber: '0188' },
  { id: 'broker-5', name: 'E*TRADE', dtcNumber: '0385' },
];

const MOCK_TRANSFERS: Transfer[] = [
  {
    id: 'transfer-1',
    status: 'in_progress',
    deliveringBroker: { brokerName: 'Robinhood' },
    totalEstimatedValue: 25000,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    expectedCompletionDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'transfer-2',
    status: 'completed',
    deliveringBroker: { brokerName: 'Fidelity' },
    totalEstimatedValue: 50000,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [showNewTransfer, setShowNewTransfer] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Form state
  const [selectedBroker, setSelectedBroker] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountTitle, setAccountTitle] = useState('');
  const [ssnLast4, setSsnLast4] = useState('');
  const [transferType, setTransferType] = useState<'full' | 'partial'>('full');

  const fetchBrokers = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/transfers/brokers`, {
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success) {
        setBrokers(data.data.brokers);
        setIsConnected(true);
      }
    } catch (error) {
      console.error('Failed to fetch brokers from API, using mock data:', error);
      setBrokers(MOCK_BROKERS);
      setIsConnected(false);
    }
  }, []);

  const fetchTransfers = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/transfers?userId=demo-user`, {
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success) {
        setTransfers(data.data.transfers);
        setIsConnected(true);
      }
    } catch (error) {
      console.error('Failed to fetch transfers from API, using mock data:', error);
      setTransfers(MOCK_TRANSFERS);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([fetchBrokers(), fetchTransfers()]);
  }, [fetchBrokers, fetchTransfers]);

  useEffect(() => {
    fetchBrokers();
    fetchTransfers();
  }, [fetchBrokers, fetchTransfers]);

  const initiateTransfer = async () => {
    try {
      const res = await fetch(`${API_BASE}/transfers/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'demo-user',
          receivingAccountId: 'time-account-001',
          transferType,
          deliveringBrokerId: selectedBroker,
          deliveringAccountNumber: accountNumber,
          deliveringAccountTitle: accountTitle,
          ssnLast4,
          userInfo: {
            fullName: accountTitle,
            dateOfBirth: '1990-01-01',
            address: {
              street: '123 Main St',
              city: 'New York',
              state: 'NY',
              zipCode: '10001',
              country: 'USA',
            },
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert('Transfer initiated! Check status below.');
        setShowNewTransfer(false);
        fetchTransfers();
      }
    } catch (error) {
      console.error('Failed to initiate transfer:', error);
      alert('Failed to initiate transfer. Please try again.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-400 bg-green-400/10';
      case 'in_progress':
      case 'approved':
        return 'text-blue-400 bg-blue-400/10';
      case 'rejected':
      case 'failed':
        return 'text-red-400 bg-red-400/10';
      default:
        return 'text-yellow-400 bg-yellow-400/10';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'rejected':
      case 'failed':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <ArrowRightLeft className="w-8 h-8 text-blue-400" />
                Account Transfers
              </h1>
              {/* Connection Status Badge */}
              <div
                className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                  isConnected
                    ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                    : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
                }`}
              >
                {isConnected ? (
                  <>
                    <Wifi className="w-4 h-4" />
                    <span>Live</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4" />
                    <span>Demo</span>
                  </>
                )}
              </div>
            </div>
            <p className="text-gray-400 mt-2">
              Transfer your investments from other brokerages to TIME
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-4 py-3 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 rounded-lg font-semibold transition-colors flex items-center gap-2"
              title="Refresh data"
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowNewTransfer(!showNewTransfer)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
            >
              Start New Transfer
            </button>
          </div>
        </div>

        {/* New Transfer Form */}
        {showNewTransfer && (
          <div className="bg-gray-900 rounded-xl p-6 mb-8 border border-gray-800">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              New ACATS Transfer
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Transfer Type */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Transfer Type
                </label>
                <div className="flex gap-4">
                  <button
                    onClick={() => setTransferType('full')}
                    className={`flex-1 py-3 px-4 rounded-lg border ${
                      transferType === 'full'
                        ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                        : 'border-gray-700 text-gray-400'
                    }`}
                  >
                    Full Transfer
                  </button>
                  <button
                    onClick={() => setTransferType('partial')}
                    className={`flex-1 py-3 px-4 rounded-lg border ${
                      transferType === 'partial'
                        ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                        : 'border-gray-700 text-gray-400'
                    }`}
                  >
                    Partial Transfer
                  </button>
                </div>
              </div>

              {/* Delivering Broker */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Transfer From (Broker)
                </label>
                <select
                  value={selectedBroker}
                  onChange={(e) => setSelectedBroker(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white"
                >
                  <option value="">Select your broker</option>
                  {brokers.map((broker) => (
                    <option key={broker.id} value={broker.id}>
                      {broker.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Account Number */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Account Number
                </label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Your account number at the other broker"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white"
                />
              </div>

              {/* Account Title */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Account Holder Name
                </label>
                <input
                  type="text"
                  value={accountTitle}
                  onChange={(e) => setAccountTitle(e.target.value)}
                  placeholder="Name exactly as it appears on account"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white"
                />
              </div>

              {/* SSN Last 4 */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  SSN (Last 4 Digits)
                </label>
                <input
                  type="text"
                  value={ssnLast4}
                  onChange={(e) => setSsnLast4(e.target.value.slice(0, 4))}
                  placeholder="1234"
                  maxLength={4}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white"
                />
              </div>
            </div>

            {/* Info Box */}
            <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <h3 className="font-semibold text-blue-400 mb-2">How ACATS Works:</h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>1. We send a transfer request to your current broker</li>
                <li>2. They verify your identity and account information</li>
                <li>3. Your assets are transferred via DTCC (usually 5-7 business days)</li>
                <li>4. Assets appear in your TIME account - you keep all your positions!</li>
              </ul>
            </div>

            {/* Submit Button */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={initiateTransfer}
                disabled={!selectedBroker || !accountNumber || !ssnLast4}
                className="px-8 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
              >
                Initiate Transfer
              </button>
            </div>
          </div>
        )}

        {/* Transfers List */}
        <div className="bg-gray-900 rounded-xl border border-gray-800">
          <div className="p-6 border-b border-gray-800">
            <h2 className="text-xl font-bold">Your Transfers</h2>
          </div>

          {isLoading ? (
            <div className="p-12 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            </div>
          ) : transfers.length === 0 ? (
            <div className="p-12 text-center">
              <Building2 className="w-12 h-12 mx-auto text-gray-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-400">No Transfers Yet</h3>
              <p className="text-gray-500 mt-2">
                Start a new transfer to move your investments to TIME
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {transfers.map((transfer) => (
                <div
                  key={transfer.id}
                  className="p-6 flex items-center justify-between hover:bg-gray-800/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{transfer.deliveringBroker.brokerName}</h3>
                      <p className="text-sm text-gray-400">
                        Started {new Date(transfer.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 ${getStatusColor(
                        transfer.status
                      )}`}
                    >
                      {getStatusIcon(transfer.status)}
                      {transfer.status.replace('_', ' ')}
                    </span>
                    <ChevronRight className="w-5 h-5 text-gray-500" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Help Section */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h3 className="font-semibold mb-2">Free Transfers</h3>
            <p className="text-sm text-gray-400">
              TIME never charges for incoming transfers. Move your money for free!
            </p>
          </div>
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h3 className="font-semibold mb-2">Keep Your Investments</h3>
            <p className="text-sm text-gray-400">
              In-kind transfers mean you keep your exact positions without selling.
            </p>
          </div>
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h3 className="font-semibold mb-2">Fast & Secure</h3>
            <p className="text-sm text-gray-400">
              ACATS is the industry standard used by every major broker.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
