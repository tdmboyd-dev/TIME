// Analyze bots and list on marketplace
const https = require('https');

const API_URL = 'https://time-backend-hosting.fly.dev/api/v1';

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function main() {
  // Get all bots
  const botsRes = await fetch(`${API_URL}/bots/public`);
  const bots = botsRes.data;

  console.log('='.repeat(60));
  console.log('BOT ANALYSIS REPORT');
  console.log('='.repeat(60));

  // Sort by rating
  bots.sort((a, b) => (b.rating || 0) - (a.rating || 0));

  console.log('\n=== TOP 20 BOTS BY RATING ===');
  bots.slice(0, 20).forEach((b, i) => {
    const rating = (b.rating || 0).toFixed(2);
    const winRate = ((b.performance?.winRate || 0) * 100).toFixed(1);
    const pf = (b.performance?.profitFactor || 0).toFixed(2);
    console.log(`${i + 1}. ${b.name.padEnd(35)} Rating: ${rating} | WinRate: ${winRate}% | PF: ${pf} | ${b.source}`);
  });

  // TIME bots vs Absorbed
  const timeBots = bots.filter(b => b.source === 'time_generated');
  const absorbedBots = bots.filter(b => b.source === 'github');

  console.log('\n=== TIME BOTS vs ABSORBED BOTS ===');

  const avgTimeRating = timeBots.reduce((s, b) => s + (b.rating || 0), 0) / timeBots.length;
  const avgAbsorbedRating = absorbedBots.reduce((s, b) => s + (b.rating || 0), 0) / absorbedBots.length;
  const avgTimeWinRate = timeBots.reduce((s, b) => s + (b.performance?.winRate || 0), 0) / timeBots.length;
  const avgAbsorbedWinRate = absorbedBots.reduce((s, b) => s + (b.performance?.winRate || 0), 0) / absorbedBots.length;
  const avgTimePF = timeBots.reduce((s, b) => s + (b.performance?.profitFactor || 0), 0) / timeBots.length;
  const avgAbsorbedPF = absorbedBots.reduce((s, b) => s + (b.performance?.profitFactor || 0), 0) / absorbedBots.length;

  console.log(`\nTIME Bots (${timeBots.length}):`);
  console.log(`  Avg Rating: ${avgTimeRating.toFixed(2)}`);
  console.log(`  Avg WinRate: ${(avgTimeWinRate * 100).toFixed(1)}%`);
  console.log(`  Avg Profit Factor: ${avgTimePF.toFixed(2)}`);

  console.log(`\nAbsorbed Bots (${absorbedBots.length}):`);
  console.log(`  Avg Rating: ${avgAbsorbedRating.toFixed(2)}`);
  console.log(`  Avg WinRate: ${(avgAbsorbedWinRate * 100).toFixed(1)}%`);
  console.log(`  Avg Profit Factor: ${avgAbsorbedPF.toFixed(2)}`);

  // Winner
  console.log('\n=== VERDICT ===');
  if (avgTimeRating > avgAbsorbedRating) {
    console.log('TIME BOTS WIN on Rating!');
  } else {
    console.log('ABSORBED BOTS WIN on Rating (due to GitHub stars)');
  }

  if (avgTimeWinRate > avgAbsorbedWinRate) {
    console.log('TIME BOTS WIN on Win Rate!');
  } else {
    console.log('ABSORBED BOTS have equal/better Win Rate');
  }

  // List bots on marketplace
  console.log('\n=== LISTING ALL BOTS ON MARKETPLACE ===');

  let listed = 0;
  for (const bot of bots) {
    try {
      const postData = JSON.stringify({
        botId: bot.id,
        botName: bot.name,
        description: bot.description,
        category: 'multi-asset',
        strategy: bot.source === 'time_generated' ? 'hybrid' : 'hybrid',
        performanceFee: 20,
        isAutoRental: true,
      });

      const result = await new Promise((resolve, reject) => {
        const req = https.request(`${API_URL}/marketplace/list-bot`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': postData.length,
          },
        }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve(JSON.parse(data)));
        });
        req.on('error', reject);
        req.write(postData);
        req.end();
      });

      if (result.success) {
        listed++;
      }
    } catch (e) {
      // Skip errors
    }
  }

  console.log(`Listed ${listed} bots on marketplace!`);

  // Check marketplace listings
  const listings = await fetch(`${API_URL}/marketplace/listings`);
  console.log(`\nMarketplace now has ${listings.data?.length || 0} listings`);
}

main().catch(console.error);
