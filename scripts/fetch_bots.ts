/**
 * Bot Fetcher Script
 *
 * Run this script to search GitHub for trading bots and download them
 * for TIME to absorb.
 *
 * Usage: npx ts-node scripts/fetch_bots.ts
 */

import { githubBotFetcher } from '../src/backend/fetcher/github_bot_fetcher';
import { botDropZone } from '../src/backend/dropzone/bot_dropzone';
import * as fs from 'fs';
import * as path from 'path';

// GitHub Token - Set via environment variable
// Get your token at: https://github.com/settings/tokens
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

if (!GITHUB_TOKEN) {
  console.error('ERROR: GITHUB_TOKEN environment variable not set!');
  console.error('Set it with: set GITHUB_TOKEN=your_token_here (Windows)');
  console.error('Or: export GITHUB_TOKEN=your_token_here (Mac/Linux)');
  process.exit(1);
}

async function main() {
  console.log('='.repeat(60));
  console.log('TIME Bot Fetcher - Searching for 4.0+ Rated Bots');
  console.log('='.repeat(60));

  // Ensure directories exist
  const dirs = [
    './dropzone/incoming',
    './dropzone/processed',
    './dropzone/rejected',
    './dropzone/reports',
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  }

  // Configure the fetcher
  githubBotFetcher.configure({
    githubToken: GITHUB_TOKEN,
    downloadPath: './dropzone/incoming',
    minRating: 4.0,
    autoAbsorb: false, // We'll review first
    maxConcurrentDownloads: 3,
    respectRateLimit: true,
  });

  console.log('\n[1/4] Searching GitHub for trading bots...\n');

  try {
    // Search for bots
    const candidates = await githubBotFetcher.searchForBots();

    console.log(`\nFound ${candidates.length} qualified bots (4.0+ rating)\n`);

    if (candidates.length === 0) {
      console.log('No bots found matching criteria. Try adjusting search parameters.');
      return;
    }

    // Display found bots
    console.log('='.repeat(60));
    console.log('QUALIFIED BOTS:');
    console.log('='.repeat(60));

    for (const candidate of candidates) {
      console.log(`
  ${candidate.repo.fullName}
  ├── Stars: ${candidate.repo.stars}
  ├── Rating: ${candidate.rating}/5.0
  ├── Type: ${candidate.botType}
  ├── License: ${candidate.repo.license || 'Unknown'}
  ├── URL: ${candidate.repo.url}
  └── Files: ${candidate.files.length} bot files
`);
    }

    console.log('\n[2/4] Downloading qualified bots...\n');

    // Download all qualified bots
    const downloadResults = await githubBotFetcher.downloadAllQualified();

    console.log(`Downloaded ${downloadResults.size} bots to ./dropzone/incoming`);

    // Show stats
    const stats = githubBotFetcher.getStats();
    console.log(`
='.repeat(60)
FETCHER STATISTICS:
='.repeat(60)
  Total Discovered: ${stats.totalDiscovered}
  Qualified (4.0+): ${stats.qualified}
  Downloaded: ${stats.downloaded}
  Rate Limit Remaining: ${stats.rateLimitRemaining}
`);

    console.log('\n[3/4] Initializing Bot Drop Zone...\n');

    // Initialize drop zone
    await botDropZone.initialize({
      watchFolder: './dropzone/incoming',
      processedFolder: './dropzone/processed',
      rejectedFolder: './dropzone/rejected',
      reportsFolder: './dropzone/reports',
      minRating: 4.0,
      autoAbsorb: true, // Auto-absorb since we already filtered
    });

    // Start watching (this will process the downloaded files)
    botDropZone.startWatching();

    // Wait a bit for processing
    console.log('Processing downloaded bots...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Show results
    const pending = botDropZone.getPendingFiles();
    const processed = botDropZone.getProcessedReports();

    console.log(`
='.repeat(60)
DROP ZONE RESULTS:
='.repeat(60)
  Pending: ${pending.length}
  Processed: ${processed.length}
`);

    if (processed.length > 0) {
      console.log('ABSORBED BOTS:');
      for (const report of processed) {
        console.log(`  ✓ ${report.filename} (Rating: ${report.rating.overall}/5.0)`);
        console.log(`    Strategy: ${report.analysis.strategyType}`);
        console.log(`    Indicators: ${report.analysis.indicators.join(', ') || 'None detected'}`);
        console.log(`    Learnings: ${report.learningsExtracted.join(', ')}`);
        console.log('');
      }
    }

    console.log('\n[4/4] Complete!\n');
    console.log('Bots have been downloaded and analyzed.');
    console.log('Check ./dropzone/reports for detailed absorption reports.');

    // Stop watching
    botDropZone.stopWatching();

  } catch (error: any) {
    console.error('Error:', error.message);

    if (error.message.includes('rate limit')) {
      const status = githubBotFetcher.getRateLimitStatus();
      console.log(`Rate limit resets at: ${status.reset}`);
    }
  }
}

// Run
main().catch(console.error);
