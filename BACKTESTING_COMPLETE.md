# TIME — Advanced Backtesting System Documentation

**Version:** 62.0.0
**Last Updated:** 2025-12-25
**Status:** PRODUCTION READY ✅

---

## 🚀 Overview

Enterprise-grade backtesting platform with Monte Carlo simulation, walk-forward optimization, multi-asset portfolio testing, and real market data integration. Built for professional traders and quantitative analysts.

### Key Features

1. **Monte Carlo Simulation** - 1000+ randomized runs with confidence intervals
2. **Walk-Forward Optimization** - Prevent overfitting with in-sample/out-of-sample testing
3. **Multi-Asset Backtesting** - Portfolio-level testing across stocks, crypto, forex, commodities
4. **Portfolio Optimization** - Markowitz mean-variance with efficient frontier
5. **Advanced Metrics** - 20+ risk/return metrics (Sharpe, Sortino, Calmar, etc.)
6. **Market Data Integration** - Finnhub, TwelveData, Coinbase providers
7. **Visualization** - 8+ interactive charts with Recharts
8. **Optimization Algorithms** - Grid search, genetic algorithms, sensitivity analysis

---

## 📁 File Structure

```
src/backend/backtesting/
├── advanced_backtest.ts           # Walk-forward, Monte Carlo (523 lines)
├── optimization_engine.ts         # Grid search, genetic algorithms (654 lines)
├── multi_asset_backtest.ts        # Portfolio backtesting (690 lines) ✨ NEW
└── market_data_integration.ts     # Market data providers (380 lines) ✨ NEW

src/backend/routes/
├── backtest.ts                    # Main backtest routes (593 lines)
└── backtest_multi_asset.ts        # Multi-asset routes (375 lines) ✨ NEW

src/backend/strategies/
└── backtesting_engine.ts          # Core backtesting engine

frontend/src/app/
└── backtest/page.tsx              # Advanced UI with charts (853 lines)
```

**Total:** 3,668+ lines of production-ready code

---

## 🔧 API Endpoints

### Basic Backtesting

#### Run Standard Backtest
```http
POST /api/v1/backtest/run
Content-Type: application/json

{
  "symbol": "AAPL",
  "startDate": "2024-01-01",
  "endDate": "2024-12-01",
  "initialCapital": 10000,
  "positionSizePercent": 10,
  "maxDrawdownPercent": 20,
  "commissionPercent": 0.1,
  "slippagePercent": 0.05,
  "leverage": 1
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "symbol": "AAPL",
      "finalCapital": 12500,
      "totalReturnPercent": 25.0,
      "annualizedReturn": 27.3
    },
    "tradeStats": {
      "totalTrades": 45,
      "winRate": 0.62,
      "profitFactor": 2.1
    },
    "riskMetrics": {
      "sharpeRatio": 1.8,
      "maxDrawdownPercent": 8.5,
      "sortinoRatio": 2.3,
      "calmarRatio": 3.2
    }
  }
}
```

### Advanced Backtesting

#### Monte Carlo Simulation
```http
POST /api/v1/backtest/advanced/monte-carlo
Content-Type: application/json

{
  "symbol": "AAPL",
  "config": {
    "initialCapital": 10000
  },
  "monteCarloConfig": {
    "numRuns": 1000,
    "randomizeEntries": false,
    "randomizeExits": false,
    "confidenceLevel": 0.95,
    "bootstrapMethod": "shuffle"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "runs": [
      { "runId": 1, "returnPercent": 23.5, "sharpeRatio": 1.9 },
      ...
    ],
    "statistics": {
      "meanReturn": 25.2,
      "medianReturn": 24.8,
      "stdDevReturn": 8.3,
      "confidenceInterval": { "lower": 12.1, "upper": 38.4 },
      "probabilityOfProfit": 0.87,
      "probabilityOfRuin": 0.02,
      "valueAtRisk": -15.3,
      "conditionalVaR": -18.7
    }
  }
}
```

#### Walk-Forward Analysis
```http
POST /api/v1/backtest/advanced/walk-forward
Content-Type: application/json

{
  "symbol": "AAPL",
  "config": {
    "startDate": "2024-01-01",
    "endDate": "2024-12-01",
    "initialCapital": 10000
  },
  "trainWindowDays": 180,
  "testWindowDays": 30,
  "stepDays": 30
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "returnPercent": 8.5,
        "sharpeRatio": 1.6,
        "maxDrawdown": 5.2
      },
      ...
    ],
    "avgInSampleReturn": 12.3,
    "avgOutOfSampleReturn": 9.8,
    "efficiency": 0.80,
    "robustness": 1.5
  }
}
```

### Multi-Asset Portfolio

#### Portfolio Backtest
```http
POST /api/v1/backtest/multi-asset
Content-Type: application/json

{
  "assets": [
    { "symbol": "AAPL", "assetClass": "stock", "allocation": 30 },
    { "symbol": "MSFT", "assetClass": "stock", "allocation": 30 },
    { "symbol": "BTC/USD", "assetClass": "crypto", "allocation": 20 },
    { "symbol": "GLD", "assetClass": "commodity", "allocation": 20 }
  ],
  "rebalanceFrequency": "monthly",
  "fetchHistoricalData": true,
  "config": {
    "startDate": "2024-01-01",
    "endDate": "2024-12-01",
    "initialCapital": 100000
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "portfolioMetrics": {
      "totalReturnPercent": 18.5,
      "sharpeRatio": 1.9,
      "diversificationRatio": 1.35,
      "rebalanceCount": 11
    },
    "assetResults": [
      {
        "symbol": "AAPL",
        "return": 25.3,
        "contribution": 7.6,
        "sharpeRatio": 1.8
      },
      ...
    ],
    "correlation": {
      "matrix": [[1.0, 0.65, -0.12, 0.08], ...],
      "avgCorrelation": 0.32
    }
  }
}
```

#### Portfolio Optimization
```http
POST /api/v1/backtest/portfolio-optimization
Content-Type: application/json

{
  "assets": [
    { "symbol": "AAPL", "assetClass": "stock" },
    { "symbol": "GOOGL", "assetClass": "stock" },
    { "symbol": "MSFT", "assetClass": "stock" }
  ],
  "config": {
    "startDate": "2024-01-01",
    "endDate": "2024-12-01"
  },
  "targetReturn": 15.0
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "weights": [
      { "symbol": "AAPL", "weight": 0.42 },
      { "symbol": "GOOGL", "weight": 0.31 },
      { "symbol": "MSFT", "weight": 0.27 }
    ],
    "expectedReturn": 15.2,
    "expectedVolatility": 18.5,
    "sharpeRatio": 0.82,
    "efficientFrontier": [...]
  }
}
```

#### Correlation Analysis
```http
POST /api/v1/backtest/correlation-analysis
Content-Type: application/json

{
  "symbols": ["AAPL", "MSFT", "GOOGL", "BTC/USD"],
  "config": {
    "startDate": "2024-01-01",
    "endDate": "2024-12-01",
    "interval": "1h"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "symbols": ["AAPL", "MSFT", "GOOGL", "BTC/USD"],
    "matrix": [
      [1.00, 0.65, 0.72, -0.08],
      [0.65, 1.00, 0.68, -0.12],
      [0.72, 0.68, 1.00, -0.15],
      [-0.08, -0.12, -0.15, 1.00]
    ],
    "avgCorrelation": 0.32,
    "heatmap": [...]
  }
}
```

### Optimization

#### Grid Search
```http
POST /api/v1/backtest/optimize/grid-search
Content-Type: application/json

{
  "symbol": "AAPL",
  "parameterSpace": [
    { "name": "positionSizePercent", "min": 5, "max": 25, "step": 5 },
    { "name": "leverage", "min": 1, "max": 3, "step": 1 }
  ],
  "config": {
    "objective": "multi_objective",
    "constraints": {
      "minTrades": 20,
      "maxDrawdown": 15
    }
  }
}
```

#### Genetic Algorithm
```http
POST /api/v1/backtest/optimize/genetic
Content-Type: application/json

{
  "symbol": "AAPL",
  "parameterSpace": [...],
  "geneticConfig": {
    "populationSize": 50,
    "generations": 20,
    "mutationRate": 0.1,
    "crossoverRate": 0.8
  }
}
```

### Market Data

#### Fetch Historical Data
```http
POST /api/v1/backtest/fetch-historical-data
Content-Type: application/json

{
  "symbol": "AAPL",
  "startDate": "2024-01-01",
  "endDate": "2024-12-01",
  "interval": "1h",
  "assetType": "stock"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "symbol": "AAPL",
    "interval": "1h",
    "candles": [
      {
        "timestamp": "2024-01-01T09:30:00Z",
        "open": 185.50,
        "high": 186.20,
        "low": 185.10,
        "close": 185.90,
        "volume": 1250000
      },
      ...
    ],
    "total": 1825
  }
}
```

---

## 📊 Advanced Metrics Reference

### Return Metrics
- **Total Return** - Overall profit/loss in dollars
- **Total Return %** - Percentage gain/loss
- **Annualized Return** - Yearly return rate
- **CAGR** - Compound annual growth rate

### Risk Metrics
- **Sharpe Ratio** - (Return - RiskFree) / Volatility
  - > 1.0 = Good, > 2.0 = Very Good, > 3.0 = Excellent
- **Sortino Ratio** - (Return - RiskFree) / DownsideVolatility
  - Penalizes only downside volatility
- **Calmar Ratio** - AnnualizedReturn / MaxDrawdown
  - Higher is better, measures return vs worst drawdown
- **Max Drawdown** - Largest peak-to-trough decline
- **Recovery Time** - Days to recover from drawdowns
- **Volatility** - Standard deviation of returns (annualized)
- **Value at Risk (VaR)** - Maximum expected loss at confidence level
- **Conditional VaR (CVaR)** - Average loss beyond VaR threshold

### Trading Metrics
- **Win Rate** - Winning trades / total trades
- **Profit Factor** - Gross profit / gross loss
- **Expectancy** - Average profit per trade
- **Average Win** - Average profit on winning trades
- **Average Loss** - Average loss on losing trades
- **Largest Win/Loss** - Biggest single trade
- **Consecutive Wins/Losses** - Longest winning/losing streak

### Portfolio Metrics
- **Diversification Ratio** - Portfolio vol / weighted avg vol
  - > 1.0 means diversification benefit
- **Correlation** - Linear relationship between assets (-1 to 1)
- **Beta** - Sensitivity to market movements
- **Alpha** - Excess return vs benchmark
- **Tracking Error** - Deviation from benchmark
- **Information Ratio** - Alpha / tracking error
- **Concentration Risk** - Herfindahl index (sum of squared weights)
- **Effective Assets** - 1 / Herfindahl index

---

## 🎨 Frontend Integration

### React Component Usage

```tsx
import { useState } from 'react';
import { API_BASE, getAuthHeaders } from '@/lib/api';

function BacktestPage() {
  const [result, setResult] = useState(null);
  const [monteCarloResult, setMonteCarloResult] = useState(null);

  const runBacktest = async () => {
    const res = await fetch(`${API_BASE}/backtest/run`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbol: 'AAPL',
        startDate: '2024-01-01',
        endDate: '2024-12-01',
        initialCapital: 10000,
      })
    });
    const data = await res.json();
    setResult(data.data);
  };

  return (
    <div>
      <button onClick={runBacktest}>Run Backtest</button>
      {result && (
        <div>
          <h3>Results: {result.summary.totalReturnPercent}% return</h3>
          <p>Sharpe Ratio: {result.riskMetrics.sharpeRatio}</p>
        </div>
      )}
    </div>
  );
}
```

### Chart Examples

```tsx
import { LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';

// Equity curve
<LineChart data={result.equityCurve}>
  <XAxis dataKey="date" />
  <YAxis />
  <Tooltip />
  <Line dataKey="equity" stroke="#06B6D4" />
</LineChart>

// Monte Carlo distribution
<BarChart data={monteCarloDistribution}>
  <XAxis dataKey="range" />
  <YAxis />
  <Bar dataKey="count" fill="#06B6D4" />
</BarChart>
```

---

## 🔌 Market Data Providers

### Finnhub
- **Supports:** Stocks, Forex
- **Intervals:** 1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w, 1M
- **API Key:** Required (free tier available)
- **Rate Limit:** 60 calls/minute (free), 300/min (paid)
- **URL:** https://finnhub.io

### TwelveData
- **Supports:** Stocks, Crypto, Forex, Commodities
- **Intervals:** 1m, 5m, 15m, 30m, 1h, 2h, 4h, 1d, 1w, 1M
- **API Key:** Required (free tier: 8 calls/min)
- **Rate Limit:** 8/min (free), 800/min (paid)
- **URL:** https://twelvedata.com

### Coinbase
- **Supports:** Cryptocurrency
- **Intervals:** 1m, 5m, 15m, 1h, 6h, 1d
- **API Key:** Not required (public data)
- **Rate Limit:** 10 requests/second
- **URL:** https://api.exchange.coinbase.com

### Configuration

Add to `.env`:
```bash
FINNHUB_API_KEY=your_finnhub_key_here
TWELVEDATA_API_KEY=your_twelvedata_key_here
```

---

## 🚀 Advanced Usage Examples

### Example 1: Full Multi-Asset Portfolio with Rebalancing

```typescript
const portfolioBacktest = {
  assets: [
    { symbol: 'AAPL', assetClass: 'stock', allocation: 25, rebalanceThreshold: 5 },
    { symbol: 'MSFT', assetClass: 'stock', allocation: 25, rebalanceThreshold: 5 },
    { symbol: 'BTC/USD', assetClass: 'crypto', allocation: 30, rebalanceThreshold: 10 },
    { symbol: 'ETH/USD', assetClass: 'crypto', allocation: 20, rebalanceThreshold: 10 }
  ],
  rebalanceFrequency: 'monthly', // Also drift-based if allocation drifts > threshold
  fetchHistoricalData: true,
  config: {
    startDate: '2023-01-01',
    endDate: '2024-12-01',
    initialCapital: 100000,
    commissionPercent: 0.1,
    slippagePercent: 0.05
  }
};

const response = await fetch('/api/v1/backtest/multi-asset', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(portfolioBacktest)
});

const result = await response.json();

console.log('Portfolio Return:', result.data.portfolioMetrics.totalReturnPercent);
console.log('Sharpe Ratio:', result.data.portfolioMetrics.sharpeRatio);
console.log('Diversification Ratio:', result.data.portfolioMetrics.diversificationRatio);
console.log('Rebalances:', result.data.rebalanceEvents.length);
console.log('Asset Correlations:', result.data.correlation.matrix);
```

### Example 2: Monte Carlo with Full Analysis

```typescript
const monteCarloConfig = {
  symbol: 'AAPL',
  config: {
    initialCapital: 50000,
    startDate: '2024-01-01',
    endDate: '2024-12-01'
  },
  monteCarloConfig: {
    numRuns: 5000, // 5000 simulations
    randomizeEntries: true, // Randomize entry timing
    randomizeExits: true, // Randomize exit timing
    confidenceLevel: 0.99, // 99% confidence interval
    bootstrapMethod: 'sample_with_replacement'
  }
};

const response = await fetch('/api/v1/backtest/advanced/monte-carlo', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(monteCarloConfig)
});

const result = await response.json();

// Analyze results
console.log('Mean Return:', result.data.statistics.meanReturn);
console.log('99% CI:', result.data.statistics.confidenceInterval);
console.log('Probability of Profit:', result.data.statistics.probabilityOfProfit);
console.log('Probability of Ruin:', result.data.statistics.probabilityOfRuin);
console.log('Value at Risk (99%):', result.data.statistics.valueAtRisk);
console.log('Conditional VaR:', result.data.statistics.conditionalVaR);
```

### Example 3: Walk-Forward with Grid Search

```typescript
// Step 1: Run walk-forward to check robustness
const walkForward = await fetch('/api/v1/backtest/advanced/walk-forward', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    symbol: 'AAPL',
    config: { initialCapital: 10000 },
    trainWindowDays: 180,
    testWindowDays: 60,
    stepDays: 30
  })
});

const wfResult = await walkForward.json();
console.log('Walk-Forward Efficiency:', wfResult.data.efficiency);

// Step 2: If efficiency > 0.7, run grid search optimization
if (wfResult.data.efficiency > 0.7) {
  const gridSearch = await fetch('/api/v1/backtest/optimize/grid-search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      symbol: 'AAPL',
      parameterSpace: [
        { name: 'positionSizePercent', min: 5, max: 25, step: 5 },
        { name: 'maxDrawdownPercent', min: 10, max: 30, step: 5 },
        { name: 'leverage', min: 1, max: 3, step: 1 }
      ],
      config: {
        objective: 'multi_objective',
        constraints: {
          minTrades: 30,
          maxDrawdown: 20,
          minWinRate: 0.5
        },
        multiObjectiveWeights: {
          return: 0.4,
          sharpe: 0.3,
          drawdown: 0.2,
          winRate: 0.1
        }
      }
    })
  });

  const gsResult = await gridSearch.json();
  console.log('Best Parameters:', gsResult.data.bestResult.parameters);
  console.log('Expected Return:', gsResult.data.bestResult.metrics.returnPercent);
}
```

---

## ⚡ Performance Optimization Tips

1. **Use Smaller Intervals for Backtests** - 1h or 4h instead of 1m for faster results
2. **Batch Data Fetching** - Fetch multiple symbols in parallel
3. **Limit Monte Carlo Runs** - Start with 100-500 runs, increase to 1000+ for production
4. **Cache Historical Data** - Store fetched candles locally
5. **Use Grid Search Wisely** - Limit parameter combinations (< 1000)
6. **Genetic Algorithm for Complex Spaces** - Better than grid search for 5+ parameters

---

## 🔒 Security & Best Practices

1. **API Key Management**
   - Store in `.env` file
   - Never commit to git
   - Use different keys for dev/prod

2. **Rate Limiting**
   - Respect provider rate limits
   - Implement exponential backoff
   - Use batch processing

3. **Data Validation**
   - Validate all inputs
   - Check allocation sums to 100%
   - Verify date ranges

4. **Error Handling**
   - Try-catch on all API calls
   - Graceful degradation
   - User-friendly error messages

---

## 📈 Next Steps & Future Enhancements

### Planned Features
- [ ] PDF/CSV export of backtest results
- [ ] Database storage for backtest history
- [ ] Live trading integration
- [ ] Custom strategy builder UI
- [ ] Machine learning strategy optimization
- [ ] Options backtesting
- [ ] Futures backtesting
- [ ] Slippage modeling improvements
- [ ] Transaction cost analysis
- [ ] Tax-loss harvesting simulation

### Community Contributions
- [ ] Additional data providers
- [ ] Custom indicators
- [ ] Strategy templates
- [ ] Benchmark comparisons

---

## 📞 Support

For questions or issues:
- GitHub Issues: [time-trading/issues](https://github.com/time-trading/issues)
- Discord: [Join Community](https://discord.gg/time-trading)
- Email: support@time-trading.com

---

**Built with ❤️ by the TIME Team**

*Last updated: 2025-12-25*
