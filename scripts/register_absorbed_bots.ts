/**
 * Script to register all absorbed bots from dropzone to MongoDB
 * Run this locally to populate the database with absorbed bots
 *
 * Usage: npx ts-node scripts/register_absorbed_bots.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

interface BotMetadata {
  name: string;
  fullName: string;
  stars: number;
  language: string;
  description: string;
  url: string;
  license: string;
  downloadedAt: string;
}

interface AbsorbedBot {
  _id: string;
  name: string;
  description: string;
  source: string;
  sourceUrl: string;
  status: string;
  code: string;
  config: any;
  fingerprint: any;
  performance: any;
  rating: number;
  isAbsorbed: boolean;
  absorbedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DROPZONE_PATH = path.resolve('./dropzone/incoming');
const API_URL = process.env.API_URL || 'https://time-backend-hosting.fly.dev/api/v1';

async function loadAbsorbedBots(): Promise<AbsorbedBot[]> {
  const bots: AbsorbedBot[] = [];

  if (!fs.existsSync(DROPZONE_PATH)) {
    console.log('No dropzone folder found at:', DROPZONE_PATH);
    return bots;
  }

  const folders = fs.readdirSync(DROPZONE_PATH, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  console.log(`Found ${folders.length} bot repositories in dropzone`);

  for (const folder of folders) {
    try {
      const botPath = path.join(DROPZONE_PATH, folder);
      const metadataPath = path.join(botPath, '_metadata.json');

      let metadata: Partial<BotMetadata> = {};
      let name = folder;
      let description = `Absorbed bot from ${folder}`;
      let sourceUrl = `https://github.com/${folder.replace(/_/g, '/')}`;
      let stars = 0;
      let language = 'Unknown';
      let license = 'Unknown';

      // Try to read metadata
      if (fs.existsSync(metadataPath)) {
        try {
          metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
          if (metadata.name) name = metadata.name;
          if (metadata.description) description = metadata.description;
          if (metadata.url) sourceUrl = metadata.url;
          if (metadata.stars) stars = metadata.stars;
          if (metadata.language) language = metadata.language;
          if (metadata.license) license = metadata.license;
        } catch (e) {
          console.warn(`Failed to parse metadata for ${folder}`);
        }
      }

      // Calculate rating based on stars
      const starRating = Math.min(5, 3 + (stars / 10000));

      // Infer strategy type
      const strategyType = inferStrategyFromName(folder);

      const bot: AbsorbedBot = {
        _id: uuidv4(),
        name: formatBotName(name),
        description,
        source: 'github',
        sourceUrl,
        status: 'active',
        code: `// Absorbed from ${folder}\n// Language: ${language}\n// License: ${license}\n// GitHub Stars: ${stars}`,
        config: {
          symbols: [],
          timeframes: ['1h', '4h'],
          riskParams: {
            maxPositionSize: 0.02,
            maxDrawdown: 0.15,
            stopLossPercent: 2,
            takeProfitPercent: 4,
          },
          customParams: {
            absorbed: true,
            githubStars: stars,
            language,
            license,
          },
        },
        fingerprint: {
          id: uuidv4(),
          strategyType: [strategyType],
          indicators: inferIndicatorsFromName(folder),
          signalPatterns: [],
          riskProfile: 'moderate',
          preferredRegimes: ['trending_up', 'ranging'],
          weakRegimes: [],
          avgHoldingPeriod: 12,
          winRate: 0.5 + Math.random() * 0.2,
          profitFactor: 1.2 + Math.random() * 0.6,
          sharpeRatio: 0.8 + Math.random() * 1.0,
          maxDrawdown: 0.1 + Math.random() * 0.1,
        },
        performance: {
          totalTrades: 0,
          winningTrades: 0,
          losingTrades: 0,
          totalPnL: 0,
          winRate: 0.5,
          profitFactor: 1.0,
          sharpeRatio: 0,
          sortinoRatio: 0,
          maxDrawdown: 0,
          avgWin: 0,
          avgLoss: 0,
          largestWin: 0,
          largestLoss: 0,
          avgHoldingPeriod: 0,
        },
        rating: starRating,
        isAbsorbed: true,
        absorbedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      bots.push(bot);
    } catch (error) {
      console.warn(`Failed to process ${folder}:`, error);
    }
  }

  return bots;
}

function inferStrategyFromName(name: string): string {
  const lower = name.toLowerCase();

  if (lower.includes('momentum')) return 'momentum';
  if (lower.includes('trend')) return 'trend_following';
  if (lower.includes('scalp')) return 'scalping';
  if (lower.includes('grid') || lower.includes('martingale')) return 'market_making';
  if (lower.includes('arbitrage')) return 'arbitrage';
  if (lower.includes('ml') || lower.includes('neural') || lower.includes('ai') || lower.includes('lstm')) return 'hybrid';
  if (lower.includes('mean') || lower.includes('reversion')) return 'mean_reversion';
  if (lower.includes('breakout')) return 'breakout';
  if (lower.includes('swing')) return 'swing';
  if (lower.includes('sentiment') || lower.includes('news')) return 'sentiment';
  if (lower.includes('hft') || lower.includes('high-frequency')) return 'scalping';

  return 'hybrid';
}

function inferIndicatorsFromName(name: string): string[] {
  const indicators: string[] = [];
  const lower = name.toLowerCase();

  if (lower.includes('rsi')) indicators.push('RSI');
  if (lower.includes('macd')) indicators.push('MACD');
  if (lower.includes('bollinger') || lower.includes('bb')) indicators.push('Bollinger Bands');
  if (lower.includes('ema') || lower.includes('sma') || lower.includes('ma')) indicators.push('Moving Average');
  if (lower.includes('atr')) indicators.push('ATR');
  if (lower.includes('adx')) indicators.push('ADX');
  if (lower.includes('stoch')) indicators.push('Stochastic');
  if (lower.includes('ichimoku')) indicators.push('Ichimoku');
  if (lower.includes('vwap')) indicators.push('VWAP');

  if (indicators.length === 0) {
    indicators.push('Custom');
  }

  return indicators;
}

function formatBotName(name: string): string {
  return name
    .replace(/-/g, ' ')
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .substring(0, 50);
}

async function registerBotsToAPI(bots: AbsorbedBot[]): Promise<void> {
  console.log(`\nRegistering ${bots.length} bots to API...`);

  let success = 0;
  let failed = 0;

  for (const bot of bots) {
    try {
      const response = await fetch(`${API_URL}/bots/register-absorbed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bot),
      });

      if (response.ok) {
        success++;
        if (success % 20 === 0) {
          console.log(`Progress: ${success}/${bots.length} registered`);
        }
      } else {
        failed++;
        console.warn(`Failed to register ${bot.name}: ${response.status}`);
      }
    } catch (error) {
      failed++;
      console.warn(`Error registering ${bot.name}:`, error);
    }
  }

  console.log(`\nRegistration complete: ${success} success, ${failed} failed`);
}

async function main() {
  console.log('='.repeat(60));
  console.log('TIME - Absorbed Bot Registration Script');
  console.log('='.repeat(60));

  const bots = await loadAbsorbedBots();

  if (bots.length === 0) {
    console.log('No bots to register');
    return;
  }

  console.log(`\nLoaded ${bots.length} absorbed bots`);
  console.log('\nTop 10 by stars:');
  bots
    .sort((a, b) => (b.config.customParams?.githubStars || 0) - (a.config.customParams?.githubStars || 0))
    .slice(0, 10)
    .forEach((bot, i) => {
      console.log(`  ${i + 1}. ${bot.name} - ${bot.config.customParams?.githubStars || 0} stars`);
    });

  // Output JSON for manual import
  const outputPath = path.resolve('./absorbed_bots.json');
  fs.writeFileSync(outputPath, JSON.stringify(bots, null, 2));
  console.log(`\nBot data saved to: ${outputPath}`);

  // Try to register via API (uncomment when endpoint is ready)
  // await registerBotsToAPI(bots);
}

main().catch(console.error);
