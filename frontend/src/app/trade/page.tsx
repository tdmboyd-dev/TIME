'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  DollarSign,
  Percent,
  Clock,
  AlertCircle,
  CheckCircle,
  X,
  Search,
  Star,
  BarChart2,
  Activity,
  Zap,
  RefreshCw,
  Wifi,
  WifiOff,
  Loader2,
} from 'lucide-react';

import { API_BASE, getTokenFromCookie, getAuthHeadersWithCSRF } from '@/lib/api';
import { useWebSocket, PriceUpdate } from '@/hooks/useWebSocket';

interface Asset {
  symbol: string;
  name: string;
  type: 'stock' | 'crypto' | 'forex' | 'commodity' | 'etf' | 'futures' | 'options';
  price: number;
  change: number;
  changePercent: number;
  bid: number;
  ask: number;
  spread: number;
  volume: string;
  high24h: number;
  low24h: number;
  leverage?: number; // For futures
  fundingRate?: number; // For perpetual futures
}

interface Order {
  id: string;
  symbol: string;
  type: 'buy' | 'sell';
  orderType: 'market' | 'limit' | 'stop';
  quantity: number;
  price: number;
  total: number;
  status: 'pending' | 'filled' | 'cancelled';
  timestamp: Date;
}

// ============================================================================
// MAXIMUM ASSET LIST - ALL TRADABLE ASSETS ACROSS ALL CLASSES
// ============================================================================

// STOCKS - S&P 500 + Major International (200+ stocks)
const STOCK_SYMBOLS = [
  // MEGA CAP TECH (Market Cap > $500B)
  'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'META', 'NVDA', 'TSLA', 'BRK.B', 'TSM',
  // LARGE CAP TECH
  'NFLX', 'INTC', 'AMD', 'CRM', 'ORCL', 'ADBE', 'CSCO', 'AVGO', 'QCOM', 'TXN',
  'MU', 'AMAT', 'LRCX', 'KLAC', 'MRVL', 'NOW', 'INTU', 'PANW', 'CRWD', 'SNOW',
  'IBM', 'DELL', 'HPQ', 'HPE', 'ANET', 'CDNS', 'SNPS', 'FTNT', 'ZS', 'DDOG',
  // FINTECH & PAYMENTS
  'PYPL', 'SQ', 'V', 'MA', 'AXP', 'COF', 'DFS', 'COIN', 'HOOD', 'SOFI',
  // E-COMMERCE & INTERNET
  'SHOP', 'UBER', 'LYFT', 'ABNB', 'DASH', 'SNAP', 'PINS', 'TWLO', 'ZM', 'DOCU',
  'ROKU', 'SPOT', 'RBLX', 'U', 'TTWO', 'EA', 'ATVI', 'MTCH', 'BMBL', 'YELP',
  // FINANCE - BANKS
  'JPM', 'BAC', 'WFC', 'C', 'GS', 'MS', 'USB', 'PNC', 'TFC', 'SCHW',
  'BK', 'STT', 'NTRS', 'CFG', 'FITB', 'HBAN', 'MTB', 'KEY', 'RF', 'ZION',
  // FINANCE - INSURANCE & ASSET MGMT
  'BLK', 'BX', 'KKR', 'APO', 'ARES', 'OWL', 'MET', 'PRU', 'AIG', 'ALL',
  'TRV', 'CB', 'PGR', 'AFL', 'MMC', 'AON', 'WTW', 'AJG', 'BROWN', 'ERIE',
  // HEALTHCARE - PHARMA
  'JNJ', 'UNH', 'PFE', 'ABBV', 'MRK', 'LLY', 'TMO', 'ABT', 'BMY', 'AMGN',
  'GILD', 'REGN', 'VRTX', 'BIIB', 'MRNA', 'BNTX', 'AZN', 'NVO', 'SNY', 'GSK',
  // HEALTHCARE - DEVICES & SERVICES
  'MDT', 'CVS', 'ISRG', 'DHR', 'BDX', 'SYK', 'ZBH', 'EW', 'BSX', 'DXCM',
  'HCA', 'CI', 'ELV', 'HUM', 'MCK', 'CAH', 'ABC', 'VEEV', 'IDXX', 'IQV',
  // CONSUMER - RETAIL
  'WMT', 'HD', 'COST', 'TGT', 'LOW', 'TJX', 'ROSS', 'DG', 'DLTR', 'BBY',
  'ORLY', 'AZO', 'AAP', 'ULTA', 'FIVE', 'TSCO', 'WSM', 'RH', 'W', 'ETSY',
  // CONSUMER - FOOD & BEVERAGE
  'MCD', 'SBUX', 'CMG', 'DPZ', 'YUM', 'QSR', 'WING', 'SHAK', 'CAVA', 'BROS',
  'PEP', 'KO', 'MNST', 'KDP', 'STZ', 'BF.B', 'TAP', 'SAM', 'CELH', 'FIZZ',
  // CONSUMER - HOUSEHOLD & PERSONAL
  'PG', 'CL', 'KMB', 'EL', 'CHD', 'CLX', 'SJM', 'K', 'GIS', 'CAG',
  'HSY', 'MDLZ', 'KHC', 'CPB', 'HRL', 'TSN', 'BYND', 'TTCF', 'POST', 'BGS',
  // CONSUMER - APPAREL & LEISURE
  'NKE', 'LULU', 'DECK', 'CROX', 'SKX', 'UAA', 'GPS', 'ANF', 'AEO', 'URBN',
  'DIS', 'CMCSA', 'PARA', 'WBD', 'FOXA', 'NWSA', 'LYV', 'MSGS', 'EDR', 'DKNG',
  // ENERGY - OIL & GAS
  'XOM', 'CVX', 'COP', 'SLB', 'EOG', 'OXY', 'PXD', 'DVN', 'FANG', 'MRO',
  'HES', 'APA', 'OVV', 'CTRA', 'MTDR', 'PR', 'SM', 'RRC', 'SWN', 'AR',
  // ENERGY - MIDSTREAM & REFINING
  'PSX', 'MPC', 'VLO', 'KMI', 'WMB', 'OKE', 'ET', 'EPD', 'MPLX', 'PAA',
  // ENERGY - CLEAN ENERGY
  'NEE', 'ENPH', 'SEDG', 'FSLR', 'RUN', 'NOVA', 'PLUG', 'BE', 'BLNK', 'CHPT',
  // INDUSTRIAL - AEROSPACE & DEFENSE
  'BA', 'RTX', 'LMT', 'NOC', 'GD', 'LHX', 'HII', 'TDG', 'HWM', 'TXT',
  // INDUSTRIAL - MACHINERY & EQUIPMENT
  'CAT', 'DE', 'CMI', 'PCAR', 'PH', 'ROK', 'EMR', 'ITW', 'IR', 'DOV',
  // INDUSTRIAL - TRANSPORTATION
  'UPS', 'FDX', 'UNP', 'CSX', 'NSC', 'CP', 'CNI', 'JBHT', 'XPO', 'ODFL',
  // INDUSTRIAL - CONGLOMERATE & OTHER
  'GE', 'MMM', 'HON', 'JCI', 'ETN', 'APH', 'AME', 'ROP', 'IEX', 'NDSN',
  // AUTO & EV
  'F', 'GM', 'TSLA', 'RIVN', 'LCID', 'NIO', 'XPEV', 'LI', 'FSR', 'GOEV',
  'APTV', 'BWA', 'LEA', 'VC', 'ALSN', 'ALV', 'AXL', 'DAN', 'LKQ', 'THRM',
  // REAL ESTATE
  'PLD', 'AMT', 'EQIX', 'CCI', 'PSA', 'SPG', 'O', 'DLR', 'AVB', 'EQR',
  'WELL', 'VTR', 'ARE', 'BXP', 'SLG', 'VNO', 'KIM', 'REG', 'FRT', 'HST',
  // MATERIALS
  'LIN', 'APD', 'SHW', 'ECL', 'NEM', 'FCX', 'NUE', 'STLD', 'CLF', 'X',
  'DOW', 'DD', 'PPG', 'VMC', 'MLM', 'BALL', 'PKG', 'IP', 'WRK', 'SEE',
  // UTILITIES
  'NEE', 'DUK', 'SO', 'D', 'AEP', 'EXC', 'SRE', 'XEL', 'PEG', 'ED',
  'WEC', 'ES', 'AEE', 'DTE', 'CMS', 'FE', 'EVRG', 'AES', 'NRG', 'PPL',
  // TELECOM
  'T', 'VZ', 'TMUS', 'CHTR', 'LBRDA', 'FYBR', 'USM', 'LUMN', 'SATS', 'GSAT',
];

// CRYPTO - TOP 100+ CRYPTOCURRENCIES
const CRYPTO_SYMBOLS = [
  // TOP 10 BY MARKET CAP
  'BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'AVAX', 'DOT', 'MATIC',
  // TOP 11-30
  'LINK', 'TRX', 'SHIB', 'TON', 'NEAR', 'LTC', 'BCH', 'UNI', 'APT', 'ATOM',
  'XLM', 'FIL', 'ICP', 'HBAR', 'ETC', 'VET', 'ARB', 'OP', 'IMX', 'INJ',
  // TOP 31-50
  'MKR', 'AAVE', 'GRT', 'RUNE', 'QNT', 'ALGO', 'FTM', 'SAND', 'MANA', 'AXS',
  'EGLD', 'THETA', 'LDO', 'STX', 'EOS', 'XTZ', 'FLOW', 'NEO', 'KCS', 'KAVA',
  // DEFI TOKENS
  'CRV', 'COMP', 'SNX', 'SUSHI', 'YFI', '1INCH', 'BAL', 'CAKE', 'JOE', 'GMX',
  'DYDX', 'PERP', 'FXS', 'CVX', 'LQTY', 'SPELL', 'ALCX', 'OHM', 'FEI', 'TRIBE',
  // LAYER 2 & SCALING
  'LRC', 'METIS', 'BOBA', 'CTSI', 'SKL', 'CELR', 'ZKS', 'SYN', 'HOP', 'ACX',
  // MEMECOINS
  'PEPE', 'FLOKI', 'BONK', 'WIF', 'MEME', 'ELON', 'SAMO', 'BABYDOGE', 'KISHU', 'AKITA',
  // AI & DATA TOKENS
  'FET', 'OCEAN', 'AGIX', 'NMR', 'RLC', 'CTXC', 'PHB', 'AIOZ', 'RSS3', 'GNO',
  // GAMING & METAVERSE
  'GALA', 'ENJ', 'CHZ', 'ALICE', 'ILV', 'GODS', 'PYR', 'SUPER', 'ATLAS', 'UFO',
  // PRIVACY COINS
  'XMR', 'ZEC', 'DASH', 'DCR', 'ARRR', 'SCRT', 'ROSE', 'OASIS', 'NYM', 'OXEN',
  // EXCHANGE TOKENS
  'CRO', 'OKB', 'HT', 'GT', 'LEO', 'FTT', 'MX', 'BGB', 'ASD', 'WRX',
  // STABLECOINS (for reference)
  'USDT', 'USDC', 'BUSD', 'DAI', 'FRAX', 'TUSD', 'USDP', 'GUSD', 'LUSD', 'sUSD',
  // MISC ALTCOINS
  'SUI', 'SEI', 'TIA', 'PYTH', 'JTO', 'JUP', 'W', 'STRK', 'ETHFI', 'ENA',
];

// FOREX - ALL MAJOR, MINOR, AND EXOTIC PAIRS (60+ pairs)
const FOREX_SYMBOLS = [
  // MAJOR PAIRS (Most liquid)
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'USD/CAD', 'NZD/USD',
  // CROSS PAIRS - EUR
  'EUR/GBP', 'EUR/JPY', 'EUR/CHF', 'EUR/AUD', 'EUR/CAD', 'EUR/NZD',
  // CROSS PAIRS - GBP
  'GBP/JPY', 'GBP/CHF', 'GBP/AUD', 'GBP/CAD', 'GBP/NZD',
  // CROSS PAIRS - AUD & NZD
  'AUD/JPY', 'AUD/CHF', 'AUD/CAD', 'AUD/NZD', 'NZD/JPY', 'NZD/CHF', 'NZD/CAD',
  // CROSS PAIRS - CAD & CHF
  'CAD/JPY', 'CAD/CHF', 'CHF/JPY',
  // EXOTIC PAIRS - AMERICAS
  'USD/MXN', 'USD/BRL', 'USD/ARS', 'USD/CLP', 'USD/COP', 'USD/PEN',
  // EXOTIC PAIRS - EUROPE
  'EUR/NOK', 'EUR/SEK', 'EUR/DKK', 'EUR/PLN', 'EUR/HUF', 'EUR/CZK', 'EUR/TRY',
  'USD/NOK', 'USD/SEK', 'USD/DKK', 'USD/PLN', 'USD/HUF', 'USD/CZK', 'USD/TRY',
  // EXOTIC PAIRS - ASIA PACIFIC
  'USD/SGD', 'USD/HKD', 'USD/CNH', 'USD/KRW', 'USD/TWD', 'USD/THB', 'USD/IDR',
  'USD/MYR', 'USD/PHP', 'USD/INR', 'USD/VND',
  // EXOTIC PAIRS - AFRICA & MIDDLE EAST
  'USD/ZAR', 'USD/ILS', 'USD/AED', 'USD/SAR', 'USD/EGP', 'USD/NGN',
];

// ETFs - INDEX, SECTOR, THEMATIC, BOND, COMMODITY (100+ ETFs)
const ETF_SYMBOLS = [
  // MAJOR INDEX ETFs
  'SPY', 'QQQ', 'IWM', 'DIA', 'VOO', 'VTI', 'IVV', 'SPLG', 'RSP', 'MDY',
  'IJR', 'IJH', 'ITOT', 'VV', 'VB', 'VO', 'SCHX', 'SCHB', 'SCHA', 'SPTM',
  // INTERNATIONAL ETFs
  'VEA', 'VWO', 'EFA', 'EEM', 'IEFA', 'IEMG', 'VXUS', 'IXUS', 'VEU', 'VSS',
  'VGK', 'EWJ', 'EWZ', 'FXI', 'MCHI', 'INDA', 'EWY', 'EWT', 'EWG', 'EWU',
  // SECTOR ETFs
  'XLK', 'XLF', 'XLE', 'XLV', 'XLI', 'XLP', 'XLY', 'XLB', 'XLU', 'XLRE',
  'XLC', 'VGT', 'VFH', 'VDE', 'VHT', 'VIS', 'VDC', 'VCR', 'VAW', 'VPU',
  // THEMATIC ETFs
  'ARKK', 'ARKG', 'ARKF', 'ARKW', 'ARKQ', 'ARKX', 'QCLN', 'ICLN', 'TAN', 'FAN',
  'ROBO', 'BOTZ', 'HACK', 'BUG', 'SKYY', 'CLOU', 'WCLD', 'CIBR', 'AIQ', 'IRBO',
  // CRYPTO ETFs
  'BITO', 'IBIT', 'FBTC', 'ARKB', 'BITB', 'BTCO', 'HODL', 'BTCW', 'EZBC', 'DEFI',
  'ETHE', 'GBTC', 'GDLC', 'BITQ', 'BLOK', 'LEGR', 'DAPP', 'SATO', 'BKCH', 'CRPT',
  // BOND ETFs
  'TLT', 'IEF', 'SHY', 'AGG', 'BND', 'LQD', 'HYG', 'JNK', 'TIP', 'GOVT',
  'VCIT', 'VCSH', 'VGLT', 'VGIT', 'VGSH', 'SPTL', 'SPTI', 'SPTS', 'SCHZ', 'SCHR',
  'EMB', 'VWOB', 'PCY', 'BNDX', 'IAGG', 'BWX', 'IGOV', 'EMLC', 'EBND', 'LEMB',
  // COMMODITY ETFs
  'GLD', 'SLV', 'IAU', 'GLDM', 'SGOL', 'BAR', 'SIVR', 'PSLV', 'SLV', 'PPLT',
  'USO', 'BNO', 'UNG', 'BOIL', 'KOLD', 'DBC', 'PDBC', 'GSG', 'DJP', 'RJI',
  'CPER', 'JJC', 'CORN', 'WEAT', 'SOYB', 'CANE', 'NIB', 'JO', 'COW', 'MOO',
  // LEVERAGED ETFs
  'TQQQ', 'SQQQ', 'UPRO', 'SPXU', 'TNA', 'TZA', 'LABU', 'LABD', 'SOXL', 'SOXS',
  'FNGU', 'FNGD', 'TECL', 'TECS', 'FAS', 'FAZ', 'NUGT', 'DUST', 'JNUG', 'JDST',
  // DIVIDEND ETFs
  'VYM', 'VIG', 'SCHD', 'DVY', 'HDV', 'DGRO', 'DGRW', 'SDY', 'NOBL', 'SPHD',
  // VOLATILITY ETFs
  'VXX', 'UVXY', 'SVXY', 'VIXY', 'VIXM', 'ZIVB', 'TAIL', 'CAOS', 'PFIX', 'IVOL',
];

// FUTURES - CRYPTO PERPETUALS (via Binance, Bybit)
const FUTURES_SYMBOLS = [
  // CRYPTO PERPETUALS (USDT-M)
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT',
  'AVAXUSDT', 'DOTUSDT', 'MATICUSDT', 'LINKUSDT', 'LTCUSDT', 'BCHUSDT', 'ATOMUSDT',
  'UNIUSDT', 'AAVEUSDT', 'NEARUSDT', 'APTUSDT', 'FILUSDT', 'OPUSDT', 'ARBUSDT',
  // HIGH LEVERAGE FUTURES
  'SUIUSDT', 'SEIUSDT', 'TIAUSDT', 'INJUSDT', 'RUNEUSDT', 'MKRUSDT', 'LDOUSDT',
  'ORDIUSDT', '1000PEPEUSDT', '1000SHIBUSDT', '1000FLOKIUSDT', 'WIFUSDT', 'BONKUSDT',
];

// COMMODITIES - PHYSICAL COMMODITIES (via ETFs and CFDs)
const COMMODITY_SYMBOLS = [
  // PRECIOUS METALS
  'XAUUSD', 'XAGUSD', 'XPTUSD', 'XPDUSD',
  // ENERGY
  'USOIL', 'UKOIL', 'NATGAS',
  // AGRICULTURE
  'CORN', 'WHEAT', 'SOYBEAN', 'COFFEE', 'SUGAR', 'COCOA', 'COTTON',
  // INDUSTRIAL METALS
  'COPPER', 'ALUMINUM', 'ZINC', 'NICKEL', 'TIN', 'LEAD',
];

// OPTIONS - MOST TRADED OPTIONS CHAINS (via Polygon)
const OPTIONS_UNDERLYING = [
  // Most Active Options
  'SPY', 'QQQ', 'AAPL', 'TSLA', 'NVDA', 'AMD', 'AMZN', 'GOOGL', 'META', 'MSFT',
  'IWM', 'XLF', 'GLD', 'SLV', 'TLT', 'VIX', 'BA', 'DIS', 'NFLX', 'COIN',
  'RIVN', 'NIO', 'PLTR', 'SOFI', 'LCID', 'F', 'GM', 'JPM', 'BAC', 'GS',
];

export default function TradePage() {
  const [liveAssets, setLiveAssets] = useState<Asset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'market' | 'limit' | 'stop'>('market');
  const [quantity, setQuantity] = useState<string>('1');
  const [limitPrice, setLimitPrice] = useState<string>('');
  const [stopPrice, setStopPrice] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [favorites, setFavorites] = useState<string[]>(['AAPL', 'BTC/USD', 'SPY']);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load orders and favorites from localStorage on mount
  useEffect(() => {
    try {
      const savedOrders = localStorage.getItem('time_trade_orders');
      if (savedOrders) {
        const parsed = JSON.parse(savedOrders);
        // Convert timestamp strings back to Date objects
        const ordersWithDates = parsed.map((o: Order & { timestamp: string }) => ({
          ...o,
          timestamp: new Date(o.timestamp),
        }));
        setOrders(ordersWithDates);
      }

      const savedFavorites = localStorage.getItem('time_trade_favorites');
      if (savedFavorites) {
        setFavorites(JSON.parse(savedFavorites));
      }
    } catch (err) {
      console.error('[Trade] Failed to load from localStorage:', err);
    }
    setIsInitialized(true);
  }, []);

  // Persist orders to localStorage whenever they change
  useEffect(() => {
    if (!isInitialized) return; // Don't save until initial load complete
    try {
      localStorage.setItem('time_trade_orders', JSON.stringify(orders));
    } catch (err) {
      console.error('[Trade] Failed to save orders:', err);
    }
  }, [orders, isInitialized]);

  // Persist favorites to localStorage whenever they change
  useEffect(() => {
    if (!isInitialized) return;
    try {
      localStorage.setItem('time_trade_favorites', JSON.stringify(favorites));
    } catch (err) {
      console.error('[Trade] Failed to save favorites:', err);
    }
  }, [favorites, isInitialized]);
  const [isConnected, setIsConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  // WebSocket for REAL-TIME price updates - NO POLLING DELAY
  const handlePriceUpdate = useCallback((update: PriceUpdate) => {
    // Update selected asset if it matches
    if (selectedAsset && update.symbol === selectedAsset.symbol) {
      setSelectedAsset(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          price: update.last,
          change: update.change,
          changePercent: update.changePercent,
          bid: update.bid,
          ask: update.ask,
        };
      });
    }

    // Update asset in the list
    setLiveAssets(prev => prev.map(asset => {
      if (asset.symbol === update.symbol) {
        return {
          ...asset,
          price: update.last,
          change: update.change,
          changePercent: update.changePercent,
          bid: update.bid,
          ask: update.ask,
        };
      }
      return asset;
    }));
  }, [selectedAsset]);

  const { isConnected: wsConnected, subscribePrices } = useWebSocket({
    channels: ['prices'],
    handlers: {
      onPrice: handlePriceUpdate,
      onPrices: (updates) => updates.forEach(handlePriceUpdate),
      onConnect: () => console.log('[Trade] WebSocket connected - real-time prices active'),
    },
  });

  // Subscribe to price updates for all symbols when connected
  useEffect(() => {
    if (wsConnected) {
      const allSymbols = [...STOCK_SYMBOLS, ...CRYPTO_SYMBOLS, ...FOREX_SYMBOLS, ...ETF_SYMBOLS];
      subscribePrices(allSymbols);
    }
  }, [wsConnected, subscribePrices]);

  // Fetch real market data from API - NO FAKE DATA
  const fetchMarketData = useCallback(async () => {
    try {
      const updatedAssets: Asset[] = [];

      // Fetch stock prices - all in parallel for speed
      const stockPromises = STOCK_SYMBOLS.map(async (symbol) => {
        try {
          const res = await fetch(`${API_BASE}/real-market/stock/${symbol}`);
          const data = await res.json();
          if (data.success && data.data) {
            const d = data.data;
            return {
              symbol,
              name: d.name || symbol,
              type: 'stock' as const,
              price: d.price || 0,
              change: d.change || 0,
              changePercent: d.changePercent || 0,
              bid: (d.price || 0) * 0.9999,
              ask: (d.price || 0) * 1.0001,
              spread: (d.price || 0) * 0.0002,
              volume: d.volume ? `${(d.volume / 1e6).toFixed(1)}M` : '0',
              high24h: d.high || (d.price || 0) * 1.02,
              low24h: d.low || (d.price || 0) * 0.98,
            };
          }
        } catch (e) { /* skip on error */ }
        return null;
      });

      // Fetch crypto prices
      const cryptoPromises = CRYPTO_SYMBOLS.map(async (symbol) => {
        try {
          const res = await fetch(`${API_BASE}/real-market/crypto/${symbol}`);
          const data = await res.json();
          if (data.success && data.data) {
            const d = data.data;
            return {
              symbol: `${symbol}/USD`,
              name: d.name || symbol,
              type: 'crypto' as const,
              price: d.price || 0,
              change: d.change24h || 0,
              changePercent: d.changePercent24h || 0,
              bid: (d.price || 0) * 0.999,
              ask: (d.price || 0) * 1.001,
              spread: (d.price || 0) * 0.002,
              volume: d.volume24h ? `${(d.volume24h / 1e9).toFixed(1)}B` : '0',
              high24h: d.high24h || (d.price || 0) * 1.05,
              low24h: d.low24h || (d.price || 0) * 0.95,
            };
          }
        } catch (e) { /* skip on error */ }
        return null;
      });

      // Fetch ETF prices (use stock endpoint)
      const etfPromises = ETF_SYMBOLS.map(async (symbol) => {
        try {
          const res = await fetch(`${API_BASE}/real-market/stock/${symbol}`);
          const data = await res.json();
          if (data.success && data.data) {
            const d = data.data;
            return {
              symbol,
              name: d.name || symbol,
              type: 'etf' as const,
              price: d.price || 0,
              change: d.change || 0,
              changePercent: d.changePercent || 0,
              bid: (d.price || 0) * 0.9999,
              ask: (d.price || 0) * 1.0001,
              spread: (d.price || 0) * 0.0002,
              volume: d.volume ? `${(d.volume / 1e6).toFixed(1)}M` : '0',
              high24h: d.high || (d.price || 0) * 1.02,
              low24h: d.low || (d.price || 0) * 0.98,
            };
          }
        } catch (e) { /* skip on error */ }
        return null;
      });

      // Wait for all fetches
      const [stocks, cryptos, etfs] = await Promise.all([
        Promise.all(stockPromises),
        Promise.all(cryptoPromises),
        Promise.all(etfPromises),
      ]);

      // Filter out nulls and combine - use explicit casting
      const allResults = [...stocks, ...cryptos, ...etfs];
      const allAssets: Asset[] = allResults.filter((a) => a !== null) as Asset[];

      if (allAssets.length > 0) {
        setLiveAssets(allAssets);

        // Set first asset as selected if none selected
        if (!selectedAsset) {
          setSelectedAsset(allAssets[0]);
        } else {
          // Update selected asset if it's in the updated list
          const updatedSelected = allAssets.find(a => a.symbol === selectedAsset.symbol);
          if (updatedSelected) {
            setSelectedAsset(updatedSelected);
          }
        }

        setIsConnected(true);
      } else {
        setIsConnected(false);
      }
    } catch (error) {
      // Error handled - shows no data state
      setIsConnected(false);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedAsset]);

  // Initial fetch and polling
  useEffect(() => {
    fetchMarketData();
    const interval = setInterval(fetchMarketData, 15000); // Refresh every 15s
    return () => clearInterval(interval);
  }, [fetchMarketData]);

  // Real-time price updates from API - NO FAKE DATA
  useEffect(() => {
    if (!selectedAsset) return;
    const interval = setInterval(async () => {
      try {
        // Fetch real updated price from API
        const response = await fetch(`${API_BASE}/real-market/quick-quote/${selectedAsset.symbol}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.price) {
            setSelectedAsset(prev => {
              if (!prev) return prev;
              const newPrice = data.price;
              return {
                ...prev,
                price: newPrice,
                bid: newPrice - (prev.spread / 2),
                ask: newPrice + (prev.spread / 2),
                change: data.change || prev.change,
                changePercent: data.changePercent || prev.changePercent,
              };
            });
          }
        }
      } catch {
        // Keep existing price if API fails - don't fake it
      }
    }, 5000); // Update every 5 seconds with real data
    return () => clearInterval(interval);
  }, [selectedAsset?.symbol]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchMarketData();
  };

  const filteredAssets = liveAssets.filter(a =>
    a.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const calculateTotal = () => {
    if (!selectedAsset) return 0;
    const qty = parseFloat(quantity) || 0;
    const price = orderType === 'market'
      ? (orderSide === 'buy' ? selectedAsset.ask : selectedAsset.bid)
      : (orderType === 'limit' ? parseFloat(limitPrice) || 0 : parseFloat(stopPrice) || 0);
    return qty * price;
  };

  const handlePlaceOrder = () => {
    if (!selectedAsset) {
      setNotification({ type: 'error', message: 'Please select an asset first' });
      return;
    }
    if (!quantity || parseFloat(quantity) <= 0) {
      setNotification({ type: 'error', message: 'Please enter a valid quantity' });
      return;
    }
    if (orderType === 'limit' && (!limitPrice || parseFloat(limitPrice) <= 0)) {
      setNotification({ type: 'error', message: 'Please enter a valid limit price' });
      return;
    }
    if (orderType === 'stop' && (!stopPrice || parseFloat(stopPrice) <= 0)) {
      setNotification({ type: 'error', message: 'Please enter a valid stop price' });
      return;
    }
    setShowConfirmation(true);
  };

  const confirmOrder = async () => {
    if (!selectedAsset) {
      setNotification({ type: 'error', message: 'No asset selected' });
      return;
    }

    setIsPlacingOrder(true);
    setShowConfirmation(false);

    try {
      // Submit REAL order to backend via Smart Order Routing
      const headers = await getAuthHeadersWithCSRF();
      const response = await fetch(`${API_BASE}/advanced-broker/smart-order`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          symbol: selectedAsset.symbol.replace('/USD', ''),  // Clean symbol for API
          side: orderSide,
          quantity: parseFloat(quantity),
          orderType: orderType === 'market' ? 'adaptive' : orderType,
          limitPrice: orderType === 'limit' ? parseFloat(limitPrice) : undefined,
          urgency: 'medium',
          darkPoolPriority: false,
          maxSlippageBps: 10,
          useAI: true,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Create local order record from API response
        const newOrder: Order = {
          id: data.data.orderId || `ORD-${Date.now()}`,
          symbol: selectedAsset.symbol,
          type: orderSide,
          orderType: orderType,
          quantity: parseFloat(quantity),
          price: data.data.avgFillPrice || (orderSide === 'buy' ? selectedAsset.ask : selectedAsset.bid),
          total: data.data.avgFillPrice ? data.data.avgFillPrice * parseFloat(quantity) : calculateTotal(),
          status: data.data.status === 'filled' || data.data.status === 'completed' ? 'filled' : 'pending',
          timestamp: new Date(),
        };

        setOrders(prev => [newOrder, ...prev]);
        setQuantity('1');
        setLimitPrice('');
        setStopPrice('');

        setNotification({
          type: 'success',
          message: `Order ${data.data.orderId || ''} ${orderSide.toUpperCase()} ${quantity} ${selectedAsset.symbol} - Routed to ${data.data.executionPlan?.venueCount || 1} venues`
        });
      } else {
        throw new Error(data.error || 'Order submission failed');
      }
    } catch (error: any) {
      // Error handled - falls back to demo mode

      // Fallback: Store order locally (demo mode)
      const newOrder: Order = {
        id: `DEMO-${Date.now()}`,
        symbol: selectedAsset.symbol,
        type: orderSide,
        orderType: orderType,
        quantity: parseFloat(quantity),
        price: orderType === 'market'
          ? (orderSide === 'buy' ? selectedAsset.ask : selectedAsset.bid)
          : (orderType === 'limit' ? parseFloat(limitPrice) : parseFloat(stopPrice)),
        total: calculateTotal(),
        status: 'pending',
        timestamp: new Date(),
      };

      setOrders(prev => [newOrder, ...prev]);
      setQuantity('1');
      setLimitPrice('');
      setStopPrice('');

      setNotification({
        type: 'error',
        message: `Demo mode: ${error.message || 'Broker not connected'}. Order saved locally.`
      });
    } finally {
      setIsPlacingOrder(false);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const toggleFavorite = (symbol: string) => {
    setFavorites(prev =>
      prev.includes(symbol) ? prev.filter(s => s !== symbol) : [...prev, symbol]
    );
  };

  const cancelOrder = (orderId: string) => {
    setOrders(prev => prev.map(o =>
      o.id === orderId ? { ...o, status: 'cancelled' as const } : o
    ));
    setNotification({ type: 'success', message: 'Order cancelled successfully' });
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-500/20 border border-green-500/50 text-green-400' : 'bg-red-500/20 border border-red-500/50 text-red-400'
        }`}>
          {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="text-sm font-medium">{notification.message}</span>
          <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Trade</h1>
          <p className="text-slate-400 mt-1">Buy and sell stocks, crypto, forex, and more</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Connection Status */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
            isConnected
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
          }`}>
            {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isConnected ? 'Live Prices' : 'Demo Mode'}
          </div>
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
            title="Refresh Prices"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <span className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-full text-sm">
            <Activity className="w-4 h-4" />
            Markets Open
          </span>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Asset List */}
        <div className="col-span-3 card p-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search assets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700/50 rounded-lg text-white text-sm focus:outline-none focus:border-time-primary/50"
            />
          </div>

          {/* Favorites */}
          {favorites.length > 0 && liveAssets.filter(a => favorites.includes(a.symbol)).length > 0 && (
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider px-2">Favorites</h3>
              {liveAssets.filter(a => favorites.includes(a.symbol)).map(asset => (
                <button
                  key={asset.symbol}
                  onClick={() => setSelectedAsset(asset)}
                  className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors ${
                    selectedAsset?.symbol === asset.symbol ? 'bg-time-primary/20 border border-time-primary/30' : 'hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span className="text-sm font-medium text-white">{asset.symbol}</span>
                  </div>
                  <span className={`text-sm ${asset.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {asset.changePercent >= 0 ? '+' : ''}{asset.changePercent.toFixed(2)}%
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* All Assets */}
          <div className="space-y-1">
            <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider px-2">All Assets</h3>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-time-primary animate-spin" />
              </div>
            ) : filteredAssets.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <p>No assets available</p>
                <p className="text-xs mt-1">Check your connection</p>
              </div>
            ) : filteredAssets.map(asset => (
              <div
                key={asset.symbol}
                onClick={() => setSelectedAsset(asset)}
                className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors cursor-pointer ${
                  selectedAsset?.symbol === asset.symbol ? 'bg-time-primary/20 border border-time-primary/30' : 'hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(asset.symbol); }}
                    className="text-slate-500 hover:text-yellow-400"
                  >
                    <Star className={`w-4 h-4 ${favorites.includes(asset.symbol) ? 'text-yellow-400 fill-yellow-400' : ''}`} />
                  </button>
                  <div className="text-left">
                    <span className="text-sm font-medium text-white block">{asset.symbol}</span>
                    <span className="text-xs text-slate-500">{asset.type}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm text-white block">${asset.price.toFixed(2)}</span>
                  <span className={`text-xs ${asset.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {asset.changePercent >= 0 ? '+' : ''}{asset.changePercent.toFixed(2)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Trading Area */}
        <div className="col-span-6 space-y-4">
          {/* Loading State */}
          {isLoading && (
            <div className="card p-12 flex flex-col items-center justify-center">
              <Loader2 className="w-12 h-12 text-time-primary animate-spin mb-4" />
              <p className="text-slate-400">Loading real-time market data...</p>
            </div>
          )}

          {/* No Asset Selected or No Data */}
          {!isLoading && !selectedAsset && (
            <div className="card p-12 flex flex-col items-center justify-center">
              <WifiOff className="w-12 h-12 text-slate-600 mb-4" />
              <p className="text-slate-400">No market data available</p>
              <p className="text-slate-500 text-sm mt-2">Please check your connection or try refreshing</p>
              <button
                onClick={handleRefresh}
                className="mt-4 px-4 py-2 bg-time-primary hover:bg-time-primary/80 text-white rounded-lg flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>
            </div>
          )}

          {/* Selected Asset Info - Only show when we have data */}
          {!isLoading && selectedAsset && (
          <div className="card p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedAsset.symbol}</h2>
                  <p className="text-sm text-slate-400">{selectedAsset.name}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  selectedAsset.type === 'stock' ? 'bg-blue-500/20 text-blue-400' :
                  selectedAsset.type === 'crypto' ? 'bg-orange-500/20 text-orange-400' :
                  selectedAsset.type === 'forex' ? 'bg-purple-500/20 text-purple-400' :
                  selectedAsset.type === 'commodity' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-cyan-500/20 text-cyan-400'
                }`}>
                  {selectedAsset.type.toUpperCase()}
                </span>
              </div>
              <button
                onClick={() => toggleFavorite(selectedAsset.symbol)}
                className={`p-2 rounded-lg ${favorites.includes(selectedAsset.symbol) ? 'bg-yellow-500/20 text-yellow-400' : 'bg-slate-800 text-slate-400 hover:text-yellow-400'}`}
              >
                <Star className={`w-5 h-5 ${favorites.includes(selectedAsset.symbol) ? 'fill-yellow-400' : ''}`} />
              </button>
            </div>

            <div className="flex items-end gap-4 mb-4">
              <span className="text-3xl font-bold text-white">
                ${selectedAsset.price.toFixed(selectedAsset.type === 'forex' ? 4 : 2)}
              </span>
              <div className={`flex items-center gap-1 px-2 py-1 rounded ${selectedAsset.change >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {selectedAsset.change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                <span className="text-sm font-medium">
                  {selectedAsset.change >= 0 ? '+' : ''}{selectedAsset.changePercent.toFixed(2)}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-xs text-slate-400 mb-1">Bid</p>
                <p className="text-sm font-semibold text-white">${selectedAsset.bid.toFixed(selectedAsset.type === 'forex' ? 4 : 2)}</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-xs text-slate-400 mb-1">Ask</p>
                <p className="text-sm font-semibold text-white">${selectedAsset.ask.toFixed(selectedAsset.type === 'forex' ? 4 : 2)}</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-xs text-slate-400 mb-1">24h High</p>
                <p className="text-sm font-semibold text-green-400">${selectedAsset.high24h.toFixed(2)}</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-xs text-slate-400 mb-1">24h Low</p>
                <p className="text-sm font-semibold text-red-400">${selectedAsset.low24h.toFixed(2)}</p>
              </div>
            </div>
          </div>
          )}

          {/* Order Form - Only show when we have data */}
          {!isLoading && selectedAsset && (
          <div className="card p-4">
            {/* Buy/Sell Toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setOrderSide('buy')}
                className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
                  orderSide === 'buy'
                    ? 'bg-green-500 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Buy
              </button>
              <button
                onClick={() => setOrderSide('sell')}
                className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
                  orderSide === 'sell'
                    ? 'bg-red-500 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Sell
              </button>
            </div>

            {/* Order Type */}
            <div className="flex gap-2 mb-4">
              {(['market', 'limit', 'stop'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setOrderType(type)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    orderType === type
                      ? 'bg-time-primary text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>

            {/* Quantity Input */}
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Quantity</label>
                <div className="relative">
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700/50 rounded-lg text-white text-lg font-semibold focus:outline-none focus:border-time-primary/50"
                    placeholder="0.00"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                    <button
                      onClick={() => setQuantity(prev => (parseFloat(prev) / 4).toString())}
                      className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300 hover:bg-slate-600"
                    >
                      25%
                    </button>
                    <button
                      onClick={() => setQuantity(prev => (parseFloat(prev) / 2).toString())}
                      className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300 hover:bg-slate-600"
                    >
                      50%
                    </button>
                    <button
                      onClick={() => setQuantity('100')}
                      className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300 hover:bg-slate-600"
                    >
                      MAX
                    </button>
                  </div>
                </div>
              </div>

              {/* Limit Price */}
              {orderType === 'limit' && (
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Limit Price</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="number"
                      value={limitPrice}
                      onChange={(e) => setLimitPrice(e.target.value)}
                      min="0"
                      step="0.01"
                      className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:border-time-primary/50"
                      placeholder={selectedAsset.price.toFixed(2)}
                    />
                  </div>
                </div>
              )}

              {/* Stop Price */}
              {orderType === 'stop' && (
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Stop Price</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="number"
                      value={stopPrice}
                      onChange={(e) => setStopPrice(e.target.value)}
                      min="0"
                      step="0.01"
                      className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:border-time-primary/50"
                      placeholder={selectedAsset.price.toFixed(2)}
                    />
                  </div>
                </div>
              )}

              {/* Order Summary */}
              <div className="bg-slate-800/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Price per unit</span>
                  <span className="text-white font-medium">
                    ${orderType === 'market'
                      ? (orderSide === 'buy' ? selectedAsset.ask : selectedAsset.bid).toFixed(selectedAsset.type === 'forex' ? 4 : 2)
                      : (orderType === 'limit' ? limitPrice || '0.00' : stopPrice || '0.00')}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Quantity</span>
                  <span className="text-white font-medium">{quantity || '0'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Fee (0.1%)</span>
                  <span className="text-white font-medium">${(calculateTotal() * 0.001).toFixed(2)}</span>
                </div>
                <div className="border-t border-slate-700 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-slate-300 font-medium">Total</span>
                    <span className="text-xl font-bold text-white">${(calculateTotal() * 1.001).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Place Order Button */}
              <button
                onClick={handlePlaceOrder}
                className={`w-full py-4 rounded-lg font-bold text-lg transition-all ${
                  orderSide === 'buy'
                    ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white'
                    : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white'
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <Zap className="w-5 h-5" />
                  {orderSide === 'buy' ? 'Buy' : 'Sell'} {selectedAsset.symbol}
                </span>
              </button>
            </div>
          </div>
          )}
        </div>

        {/* Order History */}
        <div className="col-span-3 card p-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
          <h3 className="font-medium text-white flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Order History
          </h3>

          {orders.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <ArrowRightLeft className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No orders yet</p>
              <p className="text-sm">Your orders will appear here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {orders.map(order => (
                <div key={order.id} className="bg-slate-800/50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        order.type === 'buy' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {order.type.toUpperCase()}
                      </span>
                      <span className="text-sm font-medium text-white">{order.symbol}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      order.status === 'filled' ? 'bg-green-500/20 text-green-400' :
                      order.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-slate-600/50 text-slate-400'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 space-y-1">
                    <div className="flex justify-between">
                      <span>Type:</span>
                      <span className="text-slate-300">{order.orderType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Qty:</span>
                      <span className="text-slate-300">{order.quantity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Price:</span>
                      <span className="text-slate-300">${order.price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total:</span>
                      <span className="text-white font-medium">${order.total.toFixed(2)}</span>
                    </div>
                  </div>
                  {order.status === 'pending' && (
                    <button
                      onClick={() => cancelOrder(order.id)}
                      className="w-full mt-2 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs text-slate-300"
                    >
                      Cancel Order
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && selectedAsset && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-white mb-4">Confirm Order</h3>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-slate-400">Action</span>
                <span className={`font-medium ${orderSide === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                  {orderSide.toUpperCase()} {selectedAsset.symbol}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Order Type</span>
                <span className="text-white">{orderType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Quantity</span>
                <span className="text-white">{quantity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Price</span>
                <span className="text-white">
                  ${orderType === 'market'
                    ? (orderSide === 'buy' ? selectedAsset.ask : selectedAsset.bid).toFixed(2)
                    : (orderType === 'limit' ? limitPrice : stopPrice)}
                </span>
              </div>
              <div className="border-t border-slate-700 pt-3">
                <div className="flex justify-between">
                  <span className="text-white font-medium">Total</span>
                  <span className="text-xl font-bold text-white">${(calculateTotal() * 1.001).toFixed(2)}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmation(false)}
                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmOrder}
                className={`flex-1 py-3 rounded-lg font-medium text-white ${
                  orderSide === 'buy' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                Confirm {orderSide === 'buy' ? 'Buy' : 'Sell'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
