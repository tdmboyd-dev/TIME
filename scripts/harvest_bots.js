/**
 * TIME Bot Harvester - Extended Search
 *
 * Run different harvests to collect more bots:
 *
 * node scripts/harvest_bots.js 1   - MQL4/MQL5 Expert Advisors
 * node scripts/harvest_bots.js 2   - Python Quant/Backtest Frameworks
 * node scripts/harvest_bots.js 3   - Crypto/DeFi Bots
 * node scripts/harvest_bots.js 4   - Machine Learning Trading
 * node scripts/harvest_bots.js 5   - Forex & Stock Specific
 * node scripts/harvest_bots.js all - Run all harvests
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const DOWNLOAD_PATH = './dropzone/incoming';

if (!GITHUB_TOKEN) {
  console.error('\n❌ ERROR: GITHUB_TOKEN not set!');
  console.error('\nWindows:  set GITHUB_TOKEN=your_token_here');
  console.error('Then run: node scripts/harvest_bots.js 1\n');
  process.exit(1);
}

// ============================================================================
// HARVEST CONFIGURATIONS
// ============================================================================

const HARVESTS = {
  1: {
    name: 'MQL4/MQL5 Expert Advisors',
    queries: [
      'mql4 expert advisor stars:>20',
      'mql5 expert advisor stars:>20',
      'metatrader bot stars:>30',
      'metatrader ea stars:>20',
      'mt4 trading stars:>30',
      'mt5 trading bot stars:>30',
      'mql4 indicator stars:>30',
      'mql5 strategy stars:>20',
    ],
    minStars: 20,
  },
  2: {
    name: 'Python Quant/Backtest Frameworks',
    queries: [
      'python backtest trading stars:>50',
      'python quantitative trading stars:>100',
      'zipline trading stars:>50',
      'backtrader strategy stars:>30',
      'python technical analysis stars:>50',
      'ta-lib python stars:>30',
      'python stock analysis stars:>50',
      'pandas trading stars:>30',
    ],
    minStars: 30,
  },
  3: {
    name: 'Crypto/DeFi Bots',
    queries: [
      'crypto trading bot stars:>50',
      'defi bot stars:>30',
      'uniswap bot stars:>30',
      'arbitrage crypto stars:>40',
      'binance bot stars:>50',
      'ethereum trading stars:>30',
      'crypto sniper bot stars:>20',
      'mev bot stars:>30',
      'flash loan bot stars:>20',
    ],
    minStars: 20,
  },
  4: {
    name: 'Machine Learning Trading',
    queries: [
      'machine learning trading stars:>50',
      'deep learning stock stars:>50',
      'lstm stock prediction stars:>30',
      'reinforcement learning trading stars:>40',
      'neural network trading stars:>30',
      'tensorflow trading stars:>30',
      'pytorch stock stars:>30',
      'ai trading bot stars:>40',
    ],
    minStars: 30,
  },
  5: {
    name: 'Forex & Stock Specific',
    queries: [
      'forex trading bot stars:>30',
      'forex strategy stars:>20',
      'stock trading bot stars:>40',
      'day trading bot stars:>30',
      'swing trading stars:>20',
      'options trading bot stars:>30',
      'alpaca trading stars:>30',
      'interactive brokers bot stars:>20',
      'thinkorswim stars:>10',
    ],
    minStars: 20,
  },
};

// ============================================================================
// GitHub API
// ============================================================================

function githubRequest(url) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: url,
      method: 'GET',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'TIME-Bot-Harvester',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else if (res.statusCode === 403) {
          reject(new Error('Rate limit exceeded. Wait and try again.'));
        } else {
          reject(new Error(`GitHub API error: ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);

    const request = (downloadUrl) => {
      https.get(downloadUrl, {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'User-Agent': 'TIME-Bot-Harvester',
        },
      }, (res) => {
        if (res.statusCode === 302 || res.statusCode === 301) {
          request(res.headers.location);
        } else {
          res.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve();
          });
        }
      }).on('error', (err) => {
        fs.unlink(filepath, () => {});
        reject(err);
      });
    };

    request(url);
  });
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ============================================================================
// Harvest Function
// ============================================================================

async function runHarvest(harvestNum) {
  const harvest = HARVESTS[harvestNum];
  if (!harvest) {
    console.error(`Invalid harvest number: ${harvestNum}`);
    return;
  }

  console.log('\n' + '='.repeat(60));
  console.log(`🌾 HARVEST ${harvestNum}: ${harvest.name}`);
  console.log('='.repeat(60));

  const allRepos = new Map();

  for (const query of harvest.queries) {
    console.log(`\n🔍 Searching: ${query}`);

    try {
      const searchUrl = `/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=30`;
      const result = await githubRequest(searchUrl);

      const items = result.items || [];
      let added = 0;

      for (const repo of items) {
        if (!allRepos.has(repo.full_name) && repo.stargazers_count >= harvest.minStars) {
          allRepos.set(repo.full_name, {
            name: repo.name,
            fullName: repo.full_name,
            stars: repo.stargazers_count,
            language: repo.language,
            description: repo.description,
            url: repo.html_url,
            license: repo.license?.spdx_id,
          });
          added++;
        }
      }

      console.log(`   Found ${items.length} repos, added ${added} new`);
      await sleep(1500); // Rate limit protection

    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
    }
  }

  // Sort by stars
  const repos = Array.from(allRepos.values()).sort((a, b) => b.stars - a.stars);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 HARVEST ${harvestNum} RESULTS: ${repos.length} unique repos`);
  console.log('='.repeat(60));

  // Download top repos
  let downloaded = 0;
  const maxDownloads = 25;

  for (const repo of repos.slice(0, maxDownloads)) {
    const rating = Math.min(5, (repo.stars / 100) + 3).toFixed(1);

    console.log(`\n📦 ${repo.fullName} (⭐${repo.stars}, ~${rating}/5.0)`);
    console.log(`   ${repo.language || 'Unknown'} | ${repo.license || 'No license'}`);
    console.log(`   ${(repo.description || '').substring(0, 70)}...`);

    try {
      const contentsUrl = `/repos/${repo.fullName}/contents`;
      const contents = await githubRequest(contentsUrl);

      // Find bot-related files
      const botFiles = contents.filter(f =>
        f.type === 'file' && (
          f.name.endsWith('.mq4') ||
          f.name.endsWith('.mq5') ||
          f.name.endsWith('.mqh') ||
          f.name.endsWith('.py') ||
          f.name.endsWith('.pine') ||
          f.name.endsWith('.js') ||
          f.name.endsWith('.ts') ||
          f.name.toLowerCase().includes('strategy') ||
          f.name.toLowerCase().includes('bot') ||
          f.name.toLowerCase().includes('trade') ||
          f.name.toLowerCase().includes('signal')
        )
      );

      if (botFiles.length > 0 || contents.some(f => f.type === 'dir')) {
        const repoDir = path.join(DOWNLOAD_PATH, `harvest${harvestNum}_${repo.fullName.replace('/', '_')}`);

        if (!fs.existsSync(repoDir)) {
          fs.mkdirSync(repoDir, { recursive: true });
        }

        // Download files
        for (const file of botFiles.slice(0, 10)) {
          if (file.download_url) {
            const filepath = path.join(repoDir, file.name);
            try {
              await downloadFile(file.download_url, filepath);
              console.log(`   ✓ ${file.name}`);
            } catch (e) {
              console.log(`   ✗ ${file.name} (failed)`);
            }
          }
        }

        // Save metadata
        fs.writeFileSync(
          path.join(repoDir, '_metadata.json'),
          JSON.stringify({
            ...repo,
            harvest: harvestNum,
            harvestName: harvest.name,
            downloadedAt: new Date().toISOString(),
          }, null, 2)
        );

        downloaded++;
      }

      await sleep(800);

    } catch (error) {
      console.log(`   ❌ Could not process: ${error.message}`);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ HARVEST ${harvestNum} COMPLETE!`);
  console.log(`   Downloaded: ${downloaded} repositories`);
  console.log(`   Location: ${path.resolve(DOWNLOAD_PATH)}`);
  console.log('='.repeat(60));

  return downloaded;
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const arg = process.argv[2];

  console.log('\n🤖 TIME Bot Harvester');
  console.log('━'.repeat(40));

  if (!arg) {
    console.log('\nUsage: node scripts/harvest_bots.js <harvest_number>');
    console.log('\nAvailable Harvests:');
    for (const [num, harvest] of Object.entries(HARVESTS)) {
      console.log(`  ${num} - ${harvest.name}`);
    }
    console.log('  all - Run all harvests');
    console.log('\nExample: node scripts/harvest_bots.js 1');
    return;
  }

  // Create download directory
  if (!fs.existsSync(DOWNLOAD_PATH)) {
    fs.mkdirSync(DOWNLOAD_PATH, { recursive: true });
  }

  if (arg === 'all') {
    console.log('\n🌾 Running ALL harvests...\n');
    let total = 0;
    for (const num of Object.keys(HARVESTS)) {
      total += await runHarvest(parseInt(num));
      await sleep(5000); // Wait between harvests
    }
    console.log(`\n🎉 ALL HARVESTS COMPLETE! Total: ${total} repositories`);
  } else {
    const num = parseInt(arg);
    if (HARVESTS[num]) {
      await runHarvest(num);
    } else {
      console.error(`Invalid harvest number: ${arg}`);
      console.log('Use 1-5 or "all"');
    }
  }
}

main().catch(console.error);
