# TIME Backtesting — Quick Start Guide

**Get started with advanced backtesting in 5 minutes**

---

## 🚀 Quick Examples

### 1. Run Your First Backtest

```bash
curl -X POST http://localhost:3001/api/v1/backtest/run \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "AAPL",
    "startDate": "2024-01-01",
    "endDate": "2024-12-01",
    "initialCapital": 10000
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalReturnPercent": 25.0,
      "finalCapital": 12500
    },
    "riskMetrics": {
      "sharpeRatio": 1.8,
      "maxDrawdownPercent": 8.5
    }
  }
}
```

---

### 2. Monte Carlo Simulation (1000 runs)

```bash
curl -X POST http://localhost:3001/api/v1/backtest/advanced/monte-carlo \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "AAPL",
    "monteCarloConfig": {
      "numRuns": 1000,
      "confidenceLevel": 0.95
    }
  }'
```

**What you get:**
- Probability of profit: 87%
- 95% confidence interval: [12.1%, 38.4%]
- Value at Risk (VaR): -15.3%
- Probability of ruin: 2%

---

### 3. Multi-Asset Portfolio

```bash
curl -X POST http://localhost:3001/api/v1/backtest/multi-asset \
  -H "Content-Type: application/json" \
  -d '{
    "assets": [
      { "symbol": "AAPL", "assetClass": "stock", "allocation": 30 },
      { "symbol": "BTC/USD", "assetClass": "crypto", "allocation": 40 },
      { "symbol": "GLD", "assetClass": "commodity", "allocation": 30 }
    ],
    "rebalanceFrequency": "monthly",
    "fetchHistoricalData": true
  }'
```

**What you get:**
- Portfolio return: 18.5%
- Sharpe ratio: 1.9
- Diversification ratio: 1.35 (35% volatility reduction)
- Correlation matrix
- Asset contributions

---

### 4. Optimize Portfolio Weights

```bash
curl -X POST http://localhost:3001/api/v1/backtest/portfolio-optimization \
  -H "Content-Type: application/json" \
  -d '{
    "assets": [
      { "symbol": "AAPL" },
      { "symbol": "MSFT" },
      { "symbol": "GOOGL" }
    ],
    "targetReturn": 15.0
  }'
```

**What you get:**
```json
{
  "weights": [
    { "symbol": "AAPL", "weight": 0.42 },
    { "symbol": "MSFT", "weight": 0.31 },
    { "symbol": "GOOGL", "weight": 0.27 }
  ],
  "expectedReturn": 15.2,
  "expectedVolatility": 18.5,
  "sharpeRatio": 0.82
}
```

---

## 📊 Frontend Usage

### React Component

```tsx
import { useState } from 'react';

function BacktestDemo() {
  const [result, setResult] = useState(null);

  const runBacktest = async () => {
    const response = await fetch('/api/v1/backtest/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbol: 'AAPL',
        startDate: '2024-01-01',
        endDate: '2024-12-01',
        initialCapital: 10000,
      })
    });
    const data = await response.json();
    setResult(data.data);
  };

  return (
    <div>
      <button onClick={runBacktest}>Run Backtest</button>
      {result && (
        <div>
          <h3>Return: {result.summary.totalReturnPercent}%</h3>
          <p>Sharpe: {result.riskMetrics.sharpeRatio}</p>
          <p>Max DD: {result.riskMetrics.maxDrawdownPercent}%</p>
        </div>
      )}
    </div>
  );
}
```

---

## 🔑 Setup API Keys (Optional)

For real historical data, add to `.env`:

```bash
# Finnhub (stocks, forex) - Free: https://finnhub.io/register
FINNHUB_API_KEY=your_key_here

# TwelveData (stocks, crypto, forex) - Free: https://twelvedata.com/pricing
TWELVEDATA_API_KEY=your_key_here

# Coinbase - No key needed (public data)
```

**Without API keys:** System uses generated test data for demos.

---

## 🎯 Common Use Cases

### Use Case 1: Test a Strategy Before Going Live
```typescript
// Run backtest + Monte Carlo to validate strategy
const backtest = await fetch('/api/v1/backtest/run', {...});
const monteCarlo = await fetch('/api/v1/backtest/advanced/monte-carlo', {...});

if (monteCarlo.data.statistics.probabilityOfProfit > 0.70) {
  console.log('Strategy looks good! 70%+ profit probability');
} else {
  console.log('Strategy needs improvement');
}
```

### Use Case 2: Find Optimal Portfolio Allocation
```typescript
// Optimize weights for 3 tech stocks
const optimization = await fetch('/api/v1/backtest/portfolio-optimization', {
  body: JSON.stringify({
    assets: [
      { symbol: 'AAPL' },
      { symbol: 'MSFT' },
      { symbol: 'NVDA' }
    ],
    targetReturn: 20.0 // Target 20% annual return
  })
});

console.log('Optimal weights:', optimization.data.weights);
// Use these weights in your portfolio!
```

### Use Case 3: Check Strategy Robustness
```typescript
// Walk-forward analysis to prevent overfitting
const walkForward = await fetch('/api/v1/backtest/advanced/walk-forward', {
  body: JSON.stringify({
    symbol: 'AAPL',
    trainWindowDays: 180, // 6 months in-sample
    testWindowDays: 60,   // 2 months out-of-sample
    stepDays: 30          // Roll forward 1 month
  })
});

if (walkForward.data.efficiency > 0.7) {
  console.log('Strategy is robust! Out-of-sample performs 70%+ of in-sample');
} else {
  console.log('Warning: Strategy may be overfit');
}
```

### Use Case 4: Diversify Across Asset Classes
```typescript
// Test a balanced portfolio
const portfolio = await fetch('/api/v1/backtest/multi-asset', {
  body: JSON.stringify({
    assets: [
      { symbol: 'SPY', assetClass: 'stock', allocation: 40 },    // US Stocks
      { symbol: 'BTC/USD', assetClass: 'crypto', allocation: 20 }, // Bitcoin
      { symbol: 'GLD', assetClass: 'commodity', allocation: 20 },  // Gold
      { symbol: 'EUR/USD', assetClass: 'forex', allocation: 20 }   // Forex
    ],
    rebalanceFrequency: 'quarterly'
  })
});

console.log('Diversification benefit:', portfolio.data.portfolioMetrics.diversificationRatio);
// 1.35 means 35% volatility reduction from diversification!
```

---

## 📈 Interpreting Results

### Sharpe Ratio
- **< 1.0** = Poor risk-adjusted returns
- **1.0 - 2.0** = Good
- **2.0 - 3.0** = Very good
- **> 3.0** = Excellent

### Max Drawdown
- **< 10%** = Low risk
- **10-20%** = Moderate risk
- **20-30%** = High risk
- **> 30%** = Very high risk

### Win Rate
- **< 40%** = Needs larger wins
- **40-50%** = Average
- **50-60%** = Good
- **> 60%** = Very good

### Profit Factor
- **< 1.0** = Losing strategy
- **1.0 - 1.5** = Marginal
- **1.5 - 2.0** = Good
- **> 2.0** = Very good

---

## ⚡ Performance Tips

1. **Start with daily data** (1d interval) for faster results
2. **Use 100-500 Monte Carlo runs** for testing, 1000+ for production
3. **Fetch data once, cache it** - Don't re-fetch on every backtest
4. **Limit grid search** to < 1000 combinations
5. **Use genetic algorithm** for complex parameter spaces (5+ parameters)

---

## 🆘 Troubleshooting

### "Failed to fetch data from providers"
- Check if API keys are set in `.env`
- Try without `fetchHistoricalData: true` (uses test data)
- Check rate limits (Finnhub: 60/min, TwelveData: 8/min free)

### "Asset allocations must sum to 100%"
```typescript
// ❌ Wrong
{ allocation: 30 }, { allocation: 30 }, { allocation: 30 } // = 90%

// ✅ Correct
{ allocation: 33.33 }, { allocation: 33.33 }, { allocation: 33.34 } // = 100%
```

### "Need at least 50 candles for backtesting"
- Increase date range (e.g., 1 year minimum)
- Use larger interval (1h instead of 1m)

---

## 📚 Next Steps

- **Full Documentation:** [BACKTESTING_COMPLETE.md](./BACKTESTING_COMPLETE.md)
- **All API Endpoints:** 18+ endpoints documented
- **Advanced Examples:** Monte Carlo, Walk-Forward, Portfolio Optimization
- **Frontend Integration:** React components, charts, visualizations

---

## 🎓 Learning Resources

### Recommended Reading
- **Monte Carlo Methods** - Understanding randomization and confidence intervals
- **Walk-Forward Analysis** - Preventing overfitting in backtesting
- **Modern Portfolio Theory** - Markowitz optimization
- **Risk Metrics** - Sharpe, Sortino, Calmar ratios explained

### Video Tutorials (Coming Soon)
- Backtesting 101: Run your first backtest
- Advanced: Monte Carlo simulation deep dive
- Portfolio Optimization: Build an optimal portfolio
- Live Trading: From backtest to production

---

**Happy Backtesting! 🚀**

*Questions? Open an issue on GitHub or join our Discord.*
