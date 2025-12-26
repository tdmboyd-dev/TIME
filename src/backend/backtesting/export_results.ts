/**
 * TIME - Backtest Results Export Module
 *
 * Export functionality for:
 * - CSV export
 * - JSON export
 * - HTML report
 * - PDF-ready data structure
 * - Excel-compatible format
 */

import { BacktestResult, Trade } from '../strategies/backtesting_engine';
import { EnhancedBacktestResult } from './backtest_engine';
import { ComparisonResult } from './benchmark_comparison';
import { OutOfSampleResult } from './out_of_sample';

// ==========================================
// TYPES
// ==========================================

export type ExportFormat = 'csv' | 'json' | 'html' | 'excel';

export interface ExportOptions {
  format: ExportFormat;
  includeTrades?: boolean;
  includeEquityCurve?: boolean;
  includeMonthlyReturns?: boolean;
  includeBenchmarkComparison?: boolean;
  includeOOSAnalysis?: boolean;
  filename?: string;
}

export interface ExportResult {
  format: ExportFormat;
  filename: string;
  content: string;
  mimeType: string;
  size: number;
}

// ==========================================
// RESULT EXPORTER
// ==========================================

export class ResultExporter {
  /**
   * Export backtest results
   */
  public static export(
    result: BacktestResult | EnhancedBacktestResult,
    options: ExportOptions
  ): ExportResult {
    const filename = options.filename || `backtest_${Date.now()}`;

    switch (options.format) {
      case 'csv':
        return this.exportToCSV(result, filename, options);
      case 'json':
        return this.exportToJSON(result, filename, options);
      case 'html':
        return this.exportToHTML(result, filename, options);
      case 'excel':
        return this.exportToExcel(result, filename, options);
      default:
        return this.exportToJSON(result, filename, options);
    }
  }

  /**
   * Export to CSV
   */
  private static exportToCSV(
    result: BacktestResult,
    filename: string,
    options: ExportOptions
  ): ExportResult {
    const sections: string[] = [];

    // Summary section
    sections.push('BACKTEST SUMMARY');
    sections.push('');
    sections.push('Metric,Value');
    sections.push(`Symbol,${result.symbol}`);
    sections.push(`Period Start,${result.period.start.toISOString()}`);
    sections.push(`Period End,${result.period.end.toISOString()}`);
    sections.push(`Initial Capital,$${result.initialCapital.toFixed(2)}`);
    sections.push(`Final Capital,$${result.finalCapital.toFixed(2)}`);
    sections.push(`Total Return,$${result.totalReturn.toFixed(2)}`);
    sections.push(`Total Return %,${result.totalReturnPercent.toFixed(2)}%`);
    sections.push(`Annualized Return,${result.annualizedReturn.toFixed(2)}%`);
    sections.push('');

    // Trade statistics
    sections.push('TRADE STATISTICS');
    sections.push('');
    sections.push('Metric,Value');
    sections.push(`Total Trades,${result.totalTrades}`);
    sections.push(`Winning Trades,${result.winningTrades}`);
    sections.push(`Losing Trades,${result.losingTrades}`);
    sections.push(`Win Rate,${(result.winRate * 100).toFixed(2)}%`);
    sections.push(`Average Win,$${result.avgWin.toFixed(2)}`);
    sections.push(`Average Loss,$${result.avgLoss.toFixed(2)}`);
    sections.push(`Largest Win,$${result.largestWin.toFixed(2)}`);
    sections.push(`Largest Loss,$${result.largestLoss.toFixed(2)}`);
    sections.push(`Avg Holding Period,${result.avgHoldingPeriod.toFixed(2)} hours`);
    sections.push('');

    // Risk metrics
    sections.push('RISK METRICS');
    sections.push('');
    sections.push('Metric,Value');
    sections.push(`Max Drawdown,$${result.maxDrawdown.toFixed(2)}`);
    sections.push(`Max Drawdown %,${result.maxDrawdownPercent.toFixed(2)}%`);
    sections.push(`Sharpe Ratio,${result.sharpeRatio.toFixed(3)}`);
    sections.push(`Sortino Ratio,${result.sortinoRatio.toFixed(3)}`);
    sections.push(`Calmar Ratio,${result.calmarRatio.toFixed(3)}`);
    sections.push(`Profit Factor,${result.profitFactor.toFixed(3)}`);
    sections.push(`Expectancy,$${result.expectancy.toFixed(2)}`);
    sections.push('');

    // Trades section
    if (options.includeTrades && result.trades.length > 0) {
      sections.push('TRADES');
      sections.push('');
      sections.push('ID,Entry Date,Exit Date,Direction,Entry Price,Exit Price,Quantity,PnL,PnL %,Commission,Slippage,Holding Period,Exit Reason');

      for (const trade of result.trades) {
        sections.push([
          trade.id,
          trade.entryDate.toISOString(),
          trade.exitDate.toISOString(),
          trade.direction,
          trade.entryPrice.toFixed(4),
          trade.exitPrice.toFixed(4),
          trade.quantity.toFixed(4),
          trade.pnl.toFixed(2),
          trade.pnlPercent.toFixed(2),
          trade.commission.toFixed(2),
          trade.slippage.toFixed(2),
          trade.holdingPeriodHours.toFixed(2),
          trade.exitReason,
        ].join(','));
      }
      sections.push('');
    }

    // Equity curve
    if (options.includeEquityCurve && result.equityCurve.length > 0) {
      sections.push('EQUITY CURVE');
      sections.push('');
      sections.push('Date,Equity');

      for (const point of result.equityCurve) {
        sections.push(`${point.date.toISOString()},${point.equity.toFixed(2)}`);
      }
      sections.push('');
    }

    const content = sections.join('\n');

    return {
      format: 'csv',
      filename: `${filename}.csv`,
      content,
      mimeType: 'text/csv',
      size: content.length,
    };
  }

  /**
   * Export to JSON
   */
  private static exportToJSON(
    result: BacktestResult,
    filename: string,
    options: ExportOptions
  ): ExportResult {
    const exportData: any = {
      metadata: {
        exportDate: new Date().toISOString(),
        version: '1.0.0',
      },
      summary: {
        symbol: result.symbol,
        period: {
          start: result.period.start.toISOString(),
          end: result.period.end.toISOString(),
        },
        initialCapital: result.initialCapital,
        finalCapital: result.finalCapital,
        totalReturn: result.totalReturn,
        totalReturnPercent: result.totalReturnPercent,
        annualizedReturn: result.annualizedReturn,
      },
      tradeStatistics: {
        totalTrades: result.totalTrades,
        winningTrades: result.winningTrades,
        losingTrades: result.losingTrades,
        winRate: result.winRate,
        avgWin: result.avgWin,
        avgLoss: result.avgLoss,
        largestWin: result.largestWin,
        largestLoss: result.largestLoss,
        avgHoldingPeriod: result.avgHoldingPeriod,
        consecutiveWins: result.consecutiveWins,
        consecutiveLosses: result.consecutiveLosses,
      },
      riskMetrics: {
        maxDrawdown: result.maxDrawdown,
        maxDrawdownPercent: result.maxDrawdownPercent,
        sharpeRatio: result.sharpeRatio,
        sortinoRatio: result.sortinoRatio,
        calmarRatio: result.calmarRatio,
        profitFactor: result.profitFactor,
        expectancy: result.expectancy,
        avgTradeReturn: result.avgTradeReturn,
      },
    };

    if (options.includeTrades) {
      exportData.trades = result.trades.map(t => ({
        id: t.id,
        entryDate: t.entryDate.toISOString(),
        exitDate: t.exitDate.toISOString(),
        direction: t.direction,
        entryPrice: t.entryPrice,
        exitPrice: t.exitPrice,
        quantity: t.quantity,
        pnl: t.pnl,
        pnlPercent: t.pnlPercent,
        commission: t.commission,
        slippage: t.slippage,
        holdingPeriodHours: t.holdingPeriodHours,
        exitReason: t.exitReason,
      }));
    }

    if (options.includeEquityCurve) {
      exportData.equityCurve = result.equityCurve.map(p => ({
        date: p.date.toISOString(),
        equity: p.equity,
      }));
      exportData.drawdownCurve = result.drawdownCurve.map(p => ({
        date: p.date.toISOString(),
        drawdown: p.drawdown,
      }));
    }

    // Enhanced metrics if available
    if ('monthlyReturns' in result) {
      const enhanced = result as EnhancedBacktestResult;

      exportData.enhancedMetrics = {
        ulcerIndex: enhanced.ulcerIndex,
        painRatio: enhanced.painRatio,
        recoveryFactor: enhanced.recoveryFactor,
        payoffRatio: enhanced.payoffRatio,
        tailRatio: enhanced.tailRatio,
        commonSenseRatio: enhanced.commonSenseRatio,
        bestTradingDay: enhanced.bestTradingDay,
        worstTradingDay: enhanced.worstTradingDay,
        bestTradingHour: enhanced.bestTradingHour,
        worstTradingHour: enhanced.worstTradingHour,
      };

      if (options.includeMonthlyReturns) {
        exportData.monthlyReturns = enhanced.monthlyReturns;
        exportData.tradeDistribution = enhanced.tradeDistribution;
      }
    }

    const content = JSON.stringify(exportData, null, 2);

    return {
      format: 'json',
      filename: `${filename}.json`,
      content,
      mimeType: 'application/json',
      size: content.length,
    };
  }

  /**
   * Export to HTML report
   */
  private static exportToHTML(
    result: BacktestResult,
    filename: string,
    options: ExportOptions
  ): ExportResult {
    const enhanced = 'monthlyReturns' in result ? result as EnhancedBacktestResult : null;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Backtest Report - ${result.symbol}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      padding: 20px;
      line-height: 1.6;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { color: #f1f5f9; margin-bottom: 10px; font-size: 28px; }
    h2 { color: #94a3b8; margin: 30px 0 15px; font-size: 20px; border-bottom: 1px solid #334155; padding-bottom: 10px; }
    .header { text-align: center; margin-bottom: 40px; }
    .subtitle { color: #64748b; font-size: 14px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
    .card {
      background: #1e293b;
      border-radius: 12px;
      padding: 20px;
      border: 1px solid #334155;
    }
    .card-title { color: #94a3b8; font-size: 12px; text-transform: uppercase; margin-bottom: 8px; }
    .card-value { font-size: 24px; font-weight: 600; }
    .positive { color: #10b981; }
    .negative { color: #ef4444; }
    .neutral { color: #f1f5f9; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
      font-size: 14px;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #334155;
    }
    th { color: #94a3b8; font-weight: 500; }
    tr:hover { background: #334155; }
    .stats-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #334155; }
    .stats-label { color: #94a3b8; }
    .stats-value { font-weight: 500; }
    .chart-placeholder {
      background: #1e293b;
      border-radius: 12px;
      height: 300px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #64748b;
      border: 1px solid #334155;
    }
    .footer { text-align: center; margin-top: 40px; color: #64748b; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Backtest Report: ${result.symbol}</h1>
      <p class="subtitle">
        ${result.period.start.toLocaleDateString()} - ${result.period.end.toLocaleDateString()}
      </p>
    </div>

    <h2>Performance Summary</h2>
    <div class="grid">
      <div class="card">
        <div class="card-title">Total Return</div>
        <div class="card-value ${result.totalReturnPercent >= 0 ? 'positive' : 'negative'}">
          ${result.totalReturnPercent >= 0 ? '+' : ''}${result.totalReturnPercent.toFixed(2)}%
        </div>
      </div>
      <div class="card">
        <div class="card-title">Final Capital</div>
        <div class="card-value neutral">$${result.finalCapital.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
      </div>
      <div class="card">
        <div class="card-title">Sharpe Ratio</div>
        <div class="card-value ${result.sharpeRatio >= 1 ? 'positive' : result.sharpeRatio >= 0 ? 'neutral' : 'negative'}">
          ${result.sharpeRatio.toFixed(3)}
        </div>
      </div>
      <div class="card">
        <div class="card-title">Max Drawdown</div>
        <div class="card-value negative">${result.maxDrawdownPercent.toFixed(2)}%</div>
      </div>
    </div>

    <h2>Trade Statistics</h2>
    <div class="card">
      <div class="stats-row">
        <span class="stats-label">Total Trades</span>
        <span class="stats-value">${result.totalTrades}</span>
      </div>
      <div class="stats-row">
        <span class="stats-label">Win Rate</span>
        <span class="stats-value ${result.winRate >= 0.5 ? 'positive' : 'negative'}">${(result.winRate * 100).toFixed(1)}%</span>
      </div>
      <div class="stats-row">
        <span class="stats-label">Winning Trades</span>
        <span class="stats-value positive">${result.winningTrades}</span>
      </div>
      <div class="stats-row">
        <span class="stats-label">Losing Trades</span>
        <span class="stats-value negative">${result.losingTrades}</span>
      </div>
      <div class="stats-row">
        <span class="stats-label">Average Win</span>
        <span class="stats-value positive">$${result.avgWin.toFixed(2)}</span>
      </div>
      <div class="stats-row">
        <span class="stats-label">Average Loss</span>
        <span class="stats-value negative">$${result.avgLoss.toFixed(2)}</span>
      </div>
      <div class="stats-row">
        <span class="stats-label">Profit Factor</span>
        <span class="stats-value ${result.profitFactor >= 1.5 ? 'positive' : 'neutral'}">${result.profitFactor.toFixed(2)}</span>
      </div>
      <div class="stats-row">
        <span class="stats-label">Expectancy</span>
        <span class="stats-value ${result.expectancy >= 0 ? 'positive' : 'negative'}">$${result.expectancy.toFixed(2)}</span>
      </div>
      <div class="stats-row">
        <span class="stats-label">Avg Holding Period</span>
        <span class="stats-value">${result.avgHoldingPeriod.toFixed(1)} hours</span>
      </div>
    </div>

    <h2>Risk Metrics</h2>
    <div class="grid">
      <div class="card">
        <div class="stats-row">
          <span class="stats-label">Sharpe Ratio</span>
          <span class="stats-value">${result.sharpeRatio.toFixed(3)}</span>
        </div>
        <div class="stats-row">
          <span class="stats-label">Sortino Ratio</span>
          <span class="stats-value">${result.sortinoRatio.toFixed(3)}</span>
        </div>
        <div class="stats-row">
          <span class="stats-label">Calmar Ratio</span>
          <span class="stats-value">${result.calmarRatio.toFixed(3)}</span>
        </div>
      </div>
      <div class="card">
        <div class="stats-row">
          <span class="stats-label">Max Drawdown</span>
          <span class="stats-value negative">$${result.maxDrawdown.toFixed(2)}</span>
        </div>
        <div class="stats-row">
          <span class="stats-label">Max Drawdown %</span>
          <span class="stats-value negative">${result.maxDrawdownPercent.toFixed(2)}%</span>
        </div>
        <div class="stats-row">
          <span class="stats-label">Annualized Return</span>
          <span class="stats-value ${result.annualizedReturn >= 0 ? 'positive' : 'negative'}">${result.annualizedReturn.toFixed(2)}%</span>
        </div>
      </div>
    </div>

    ${enhanced ? `
    <h2>Enhanced Metrics</h2>
    <div class="grid">
      <div class="card">
        <div class="stats-row">
          <span class="stats-label">Ulcer Index</span>
          <span class="stats-value">${enhanced.ulcerIndex.toFixed(3)}</span>
        </div>
        <div class="stats-row">
          <span class="stats-label">Pain Ratio</span>
          <span class="stats-value">${enhanced.painRatio.toFixed(3)}</span>
        </div>
        <div class="stats-row">
          <span class="stats-label">Recovery Factor</span>
          <span class="stats-value">${enhanced.recoveryFactor.toFixed(3)}</span>
        </div>
      </div>
      <div class="card">
        <div class="stats-row">
          <span class="stats-label">Tail Ratio</span>
          <span class="stats-value">${enhanced.tailRatio.toFixed(3)}</span>
        </div>
        <div class="stats-row">
          <span class="stats-label">Common Sense Ratio</span>
          <span class="stats-value">${enhanced.commonSenseRatio.toFixed(3)}</span>
        </div>
        <div class="stats-row">
          <span class="stats-label">Best Trading Day</span>
          <span class="stats-value">${enhanced.bestTradingDay}</span>
        </div>
      </div>
    </div>
    ` : ''}

    ${options.includeTrades ? `
    <h2>Trade Log (Last 20 Trades)</h2>
    <div class="card" style="overflow-x: auto;">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Direction</th>
            <th>Entry</th>
            <th>Exit</th>
            <th>P&L</th>
            <th>P&L %</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          ${result.trades.slice(-20).map(t => `
          <tr>
            <td>${t.entryDate.toLocaleDateString()}</td>
            <td>${t.direction.toUpperCase()}</td>
            <td>$${t.entryPrice.toFixed(2)}</td>
            <td>$${t.exitPrice.toFixed(2)}</td>
            <td class="${t.pnl >= 0 ? 'positive' : 'negative'}">$${t.pnl.toFixed(2)}</td>
            <td class="${t.pnlPercent >= 0 ? 'positive' : 'negative'}">${t.pnlPercent.toFixed(2)}%</td>
            <td>${t.holdingPeriodHours.toFixed(1)}h</td>
          </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    <div class="footer">
      <p>Generated by TIME Trading System - ${new Date().toLocaleString()}</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    return {
      format: 'html',
      filename: `${filename}.html`,
      content: html,
      mimeType: 'text/html',
      size: html.length,
    };
  }

  /**
   * Export to Excel-compatible CSV
   */
  private static exportToExcel(
    result: BacktestResult,
    filename: string,
    options: ExportOptions
  ): ExportResult {
    // Excel uses tab-separated format with BOM for UTF-8
    const BOM = '\uFEFF';
    const sections: string[] = [BOM];

    // Summary sheet
    sections.push('Summary');
    sections.push('Metric\tValue');
    sections.push(`Symbol\t${result.symbol}`);
    sections.push(`Period\t${result.period.start.toISOString()} - ${result.period.end.toISOString()}`);
    sections.push(`Initial Capital\t${result.initialCapital}`);
    sections.push(`Final Capital\t${result.finalCapital}`);
    sections.push(`Total Return\t${result.totalReturn}`);
    sections.push(`Total Return %\t${result.totalReturnPercent}`);
    sections.push(`Annualized Return\t${result.annualizedReturn}`);
    sections.push('');
    sections.push(`Total Trades\t${result.totalTrades}`);
    sections.push(`Win Rate\t${result.winRate}`);
    sections.push(`Profit Factor\t${result.profitFactor}`);
    sections.push(`Sharpe Ratio\t${result.sharpeRatio}`);
    sections.push(`Sortino Ratio\t${result.sortinoRatio}`);
    sections.push(`Calmar Ratio\t${result.calmarRatio}`);
    sections.push(`Max Drawdown\t${result.maxDrawdown}`);
    sections.push(`Max Drawdown %\t${result.maxDrawdownPercent}`);
    sections.push('');

    // Trades sheet
    if (options.includeTrades) {
      sections.push('Trades');
      sections.push('ID\tEntry Date\tExit Date\tDirection\tEntry Price\tExit Price\tQuantity\tP&L\tP&L %\tCommission\tSlippage\tHolding Period\tExit Reason');

      for (const trade of result.trades) {
        sections.push([
          trade.id,
          trade.entryDate.toISOString(),
          trade.exitDate.toISOString(),
          trade.direction,
          trade.entryPrice,
          trade.exitPrice,
          trade.quantity,
          trade.pnl,
          trade.pnlPercent,
          trade.commission,
          trade.slippage,
          trade.holdingPeriodHours,
          trade.exitReason,
        ].join('\t'));
      }
      sections.push('');
    }

    // Equity curve sheet
    if (options.includeEquityCurve) {
      sections.push('Equity Curve');
      sections.push('Date\tEquity\tDrawdown %');

      for (let i = 0; i < result.equityCurve.length; i++) {
        const ec = result.equityCurve[i];
        const dd = result.drawdownCurve[i];
        sections.push(`${ec.date.toISOString()}\t${ec.equity}\t${dd?.drawdown || 0}`);
      }
    }

    const content = sections.join('\n');

    return {
      format: 'excel',
      filename: `${filename}.xls`,
      content,
      mimeType: 'application/vnd.ms-excel',
      size: content.length,
    };
  }
}

// ==========================================
// COMPARISON EXPORTER
// ==========================================

export class ComparisonExporter {
  /**
   * Export benchmark comparison
   */
  public static export(
    comparison: ComparisonResult,
    format: ExportFormat
  ): ExportResult {
    const filename = `benchmark_comparison_${Date.now()}`;

    switch (format) {
      case 'csv':
        return this.toCSV(comparison, filename);
      case 'json':
        return this.toJSON(comparison, filename);
      default:
        return this.toJSON(comparison, filename);
    }
  }

  private static toCSV(comparison: ComparisonResult, filename: string): ExportResult {
    const lines: string[] = [];

    lines.push('BENCHMARK COMPARISON');
    lines.push('');
    lines.push('Strategy Performance');
    lines.push(`Symbol,${comparison.strategy.symbol}`);
    lines.push(`Return,${comparison.strategy.totalReturnPercent.toFixed(2)}%`);
    lines.push(`Sharpe,${comparison.strategy.sharpeRatio.toFixed(3)}`);
    lines.push(`Max DD,${comparison.strategy.maxDrawdownPercent.toFixed(2)}%`);
    lines.push('');

    lines.push('Benchmark Comparison');
    lines.push('Benchmark,Excess Return,Tracking Error,Info Ratio,Beta,Alpha,Correlation,Up Capture,Down Capture');

    for (const comp of comparison.comparison) {
      lines.push([
        comp.benchmark,
        `${comp.excessReturn.toFixed(2)}%`,
        comp.trackingError.toFixed(2),
        comp.informationRatio.toFixed(3),
        comp.beta.toFixed(3),
        comp.alpha.toFixed(2),
        comp.correlation.toFixed(3),
        `${comp.upCapture.toFixed(1)}%`,
        `${comp.downCapture.toFixed(1)}%`,
      ].join(','));
    }

    const content = lines.join('\n');

    return {
      format: 'csv',
      filename: `${filename}.csv`,
      content,
      mimeType: 'text/csv',
      size: content.length,
    };
  }

  private static toJSON(comparison: ComparisonResult, filename: string): ExportResult {
    const content = JSON.stringify(comparison, null, 2);

    return {
      format: 'json',
      filename: `${filename}.json`,
      content,
      mimeType: 'application/json',
      size: content.length,
    };
  }
}

// ==========================================
// OOS ANALYSIS EXPORTER
// ==========================================

export class OOSExporter {
  /**
   * Export out-of-sample analysis
   */
  public static export(
    oosResult: OutOfSampleResult,
    format: ExportFormat
  ): ExportResult {
    const filename = `oos_analysis_${Date.now()}`;

    switch (format) {
      case 'csv':
        return this.toCSV(oosResult, filename);
      case 'json':
        return this.toJSON(oosResult, filename);
      case 'html':
        return this.toHTML(oosResult, filename);
      default:
        return this.toJSON(oosResult, filename);
    }
  }

  private static toCSV(result: OutOfSampleResult, filename: string): ExportResult {
    const lines: string[] = [];

    lines.push('OUT-OF-SAMPLE ANALYSIS');
    lines.push('');
    lines.push(`Method,${result.method}`);
    lines.push(`Folds,${result.foldResults.length}`);
    lines.push('');

    lines.push('Aggregated Metrics');
    lines.push(`Avg Train Return,${result.aggregatedMetrics.avgTrainReturn.toFixed(2)}%`);
    lines.push(`Avg Test Return,${result.aggregatedMetrics.avgTestReturn.toFixed(2)}%`);
    lines.push(`Avg Efficiency,${result.aggregatedMetrics.avgEfficiency.toFixed(3)}`);
    lines.push(`Overfit Probability,${(result.aggregatedMetrics.overfitProbability * 100).toFixed(1)}%`);
    lines.push(`Robustness Score,${result.aggregatedMetrics.robustnessScore.toFixed(3)}`);
    lines.push('');

    lines.push('Statistical Tests');
    lines.push(`T-Statistic,${result.statisticalTests.tStatistic.toFixed(3)}`);
    lines.push(`P-Value,${result.statisticalTests.pValue.toFixed(4)}`);
    lines.push(`Significant,${result.statisticalTests.significantOutperformance ? 'Yes' : 'No'}`);
    lines.push('');

    lines.push('Fold Results');
    lines.push('Fold,Train Start,Train End,Test Start,Test End,Train Return,Test Return,Efficiency');

    for (const fold of result.foldResults) {
      lines.push([
        fold.foldId,
        fold.trainPeriod.start.toISOString().split('T')[0],
        fold.trainPeriod.end.toISOString().split('T')[0],
        fold.testPeriod.start.toISOString().split('T')[0],
        fold.testPeriod.end.toISOString().split('T')[0],
        `${fold.trainResult.totalReturnPercent.toFixed(2)}%`,
        `${fold.testResult.totalReturnPercent.toFixed(2)}%`,
        fold.efficiency.toFixed(3),
      ].join(','));
    }

    const content = lines.join('\n');

    return {
      format: 'csv',
      filename: `${filename}.csv`,
      content,
      mimeType: 'text/csv',
      size: content.length,
    };
  }

  private static toJSON(result: OutOfSampleResult, filename: string): ExportResult {
    const content = JSON.stringify({
      method: result.method,
      aggregatedMetrics: result.aggregatedMetrics,
      statisticalTests: result.statisticalTests,
      foldResults: result.foldResults.map(f => ({
        foldId: f.foldId,
        trainPeriod: {
          start: f.trainPeriod.start.toISOString(),
          end: f.trainPeriod.end.toISOString(),
        },
        testPeriod: {
          start: f.testPeriod.start.toISOString(),
          end: f.testPeriod.end.toISOString(),
        },
        trainReturn: f.trainResult.totalReturnPercent,
        testReturn: f.testResult.totalReturnPercent,
        efficiency: f.efficiency,
        degradation: f.degradation,
      })),
      regimeAnalysis: result.regimeAnalysis,
    }, null, 2);

    return {
      format: 'json',
      filename: `${filename}.json`,
      content,
      mimeType: 'application/json',
      size: content.length,
    };
  }

  private static toHTML(result: OutOfSampleResult, filename: string): ExportResult {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Out-of-Sample Analysis Report</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; background: #1a1a2e; color: #eee; }
    h1 { color: #00d4ff; }
    h2 { color: #888; border-bottom: 1px solid #333; padding-bottom: 10px; }
    .metric { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #333; }
    .positive { color: #10b981; }
    .negative { color: #ef4444; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #333; }
    th { color: #888; }
    .card { background: #252540; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
  </style>
</head>
<body>
  <h1>Out-of-Sample Analysis</h1>

  <div class="card">
    <h2>Summary</h2>
    <div class="metric">
      <span>Method</span>
      <span>${result.method}</span>
    </div>
    <div class="metric">
      <span>Number of Folds</span>
      <span>${result.foldResults.length}</span>
    </div>
    <div class="metric">
      <span>Avg Train Return</span>
      <span class="${result.aggregatedMetrics.avgTrainReturn >= 0 ? 'positive' : 'negative'}">
        ${result.aggregatedMetrics.avgTrainReturn.toFixed(2)}%
      </span>
    </div>
    <div class="metric">
      <span>Avg Test Return</span>
      <span class="${result.aggregatedMetrics.avgTestReturn >= 0 ? 'positive' : 'negative'}">
        ${result.aggregatedMetrics.avgTestReturn.toFixed(2)}%
      </span>
    </div>
    <div class="metric">
      <span>Overfit Probability</span>
      <span class="${result.aggregatedMetrics.overfitProbability < 0.3 ? 'positive' : 'negative'}">
        ${(result.aggregatedMetrics.overfitProbability * 100).toFixed(1)}%
      </span>
    </div>
    <div class="metric">
      <span>Robustness Score</span>
      <span>${result.aggregatedMetrics.robustnessScore.toFixed(3)}</span>
    </div>
  </div>

  <div class="card">
    <h2>Statistical Tests</h2>
    <div class="metric">
      <span>T-Statistic</span>
      <span>${result.statisticalTests.tStatistic.toFixed(3)}</span>
    </div>
    <div class="metric">
      <span>P-Value</span>
      <span>${result.statisticalTests.pValue.toFixed(4)}</span>
    </div>
    <div class="metric">
      <span>Significant Outperformance</span>
      <span class="${result.statisticalTests.significantOutperformance ? 'positive' : 'negative'}">
        ${result.statisticalTests.significantOutperformance ? 'Yes' : 'No'}
      </span>
    </div>
    <div class="metric">
      <span>95% Confidence Interval</span>
      <span>[${result.statisticalTests.confidenceInterval.lower.toFixed(2)}%, ${result.statisticalTests.confidenceInterval.upper.toFixed(2)}%]</span>
    </div>
  </div>

  <div class="card">
    <h2>Fold Results</h2>
    <table>
      <tr>
        <th>Fold</th>
        <th>Train Return</th>
        <th>Test Return</th>
        <th>Efficiency</th>
        <th>Degradation</th>
      </tr>
      ${result.foldResults.map(f => `
        <tr>
          <td>${f.foldId}</td>
          <td class="${f.trainResult.totalReturnPercent >= 0 ? 'positive' : 'negative'}">
            ${f.trainResult.totalReturnPercent.toFixed(2)}%
          </td>
          <td class="${f.testResult.totalReturnPercent >= 0 ? 'positive' : 'negative'}">
            ${f.testResult.totalReturnPercent.toFixed(2)}%
          </td>
          <td>${f.efficiency.toFixed(3)}</td>
          <td class="${f.degradation < 30 ? 'positive' : 'negative'}">
            ${f.degradation.toFixed(1)}%
          </td>
        </tr>
      `).join('')}
    </table>
  </div>
</body>
</html>
    `.trim();

    return {
      format: 'html',
      filename: `${filename}.html`,
      content: html,
      mimeType: 'text/html',
      size: html.length,
    };
  }
}
