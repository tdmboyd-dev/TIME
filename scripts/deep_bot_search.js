/**
 * TIME Deep Bot Search - Non-GitHub Sources
 *
 * Searches for trading bots from:
 * - MQL5 Code Base (free Expert Advisors)
 * - cTrader Algo Samples
 * - TradingView Pine Scripts
 * - Forex Forums (ForexFactory, BabyPips)
 * - Free EA Sites
 *
 * Run: node scripts/deep_bot_search.js [source]
 *
 * Sources: mql5, ctrader, tradingview, forums, all
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const DOWNLOAD_PATH = './dropzone/deep_search';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function httpGet(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const reqOptions = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        ...options.headers,
      },
    };

    const req = protocol.get(url, reqOptions, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return httpGet(res.headers.location, options).then(resolve).catch(reject);
      }

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data, headers: res.headers }));
    });

    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    const protocol = url.startsWith('https') ? https : http;

    const request = (downloadUrl) => {
      protocol.get(downloadUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          request(res.headers.location);
        } else if (res.statusCode === 200) {
          res.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve();
          });
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
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

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function extractLinks(html, pattern) {
  const matches = [];
  const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern, 'gi');
  let match;
  while ((match = regex.exec(html)) !== null) {
    matches.push(match[1] || match[0]);
  }
  return matches;
}

// ============================================================================
// MQL5 CODE BASE SCRAPER
// ============================================================================

async function searchMQL5() {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 MQL5 CODE BASE - Free Expert Advisors & Indicators');
  console.log('='.repeat(70));

  const categories = [
    { name: 'Expert Advisors', path: '/en/code/mt5/experts', type: 'ea' },
    { name: 'Expert Advisors MT4', path: '/en/code/mt4/experts', type: 'ea_mt4' },
    { name: 'Indicators MT5', path: '/en/code/mt5/indicators', type: 'indicator' },
    { name: 'Indicators MT4', path: '/en/code/mt4/indicators', type: 'indicator_mt4' },
    { name: 'Scripts', path: '/en/code/mt5/scripts', type: 'script' },
    { name: 'Trading Systems', path: '/en/code/mt5/tradingsystems', type: 'system' },
  ];

  const results = [];
  const baseDir = path.join(DOWNLOAD_PATH, 'mql5');
  ensureDir(baseDir);

  for (const category of categories) {
    console.log(`\n📂 ${category.name}`);

    try {
      // Get the listing page
      const response = await httpGet(`https://www.mql5.com${category.path}?page=1`);

      if (response.status !== 200) {
        console.log(`   ⚠️ Could not access (status ${response.status})`);
        continue;
      }

      // Extract bot listings (simplified parsing)
      // MQL5 uses AJAX, so we look for JSON data or HTML patterns
      const codeLinks = extractLinks(response.data, /href="(\/en\/code\/\d+)"[^>]*>/g);
      const uniqueLinks = [...new Set(codeLinks)].slice(0, 15);

      console.log(`   Found ${uniqueLinks.length} code entries`);

      for (const link of uniqueLinks.slice(0, 10)) {
        try {
          const codeUrl = `https://www.mql5.com${link}`;
          const codeResp = await httpGet(codeUrl);

          // Extract title
          const titleMatch = codeResp.data.match(/<h1[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/h1>/i) ||
                            codeResp.data.match(/<title>([^<]+)<\/title>/i);
          const title = titleMatch ? titleMatch[1].trim().replace(' - MQL5 Code Base', '') : 'Unknown';

          // Extract rating
          const ratingMatch = codeResp.data.match(/rating[^>]*>(\d+(?:\.\d+)?)/i);
          const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;

          // Extract download count
          const downloadsMatch = codeResp.data.match(/downloads?[^>]*>(\d+)/i);
          const downloads = downloadsMatch ? parseInt(downloadsMatch[1]) : 0;

          // Extract description
          const descMatch = codeResp.data.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
          const description = descMatch ? descMatch[1].substring(0, 200) : '';

          // Extract download link for .mq5/.mq4 file
          const fileMatch = codeResp.data.match(/href="([^"]+\.mq[45h])"/i);

          console.log(`   📄 ${title.substring(0, 50)}`);
          console.log(`      Rating: ${rating} | Downloads: ${downloads}`);

          results.push({
            source: 'mql5',
            category: category.name,
            title,
            url: codeUrl,
            rating,
            downloads,
            description,
            fileUrl: fileMatch ? `https://www.mql5.com${fileMatch[1]}` : null,
            type: category.type,
          });

          await sleep(500);
        } catch (e) {
          // Skip individual failures
        }
      }

      await sleep(1000);
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  // Save metadata
  fs.writeFileSync(
    path.join(baseDir, '_mql5_catalog.json'),
    JSON.stringify({
      source: 'MQL5 Code Base',
      url: 'https://www.mql5.com/en/code',
      searchedAt: new Date().toISOString(),
      totalFound: results.length,
      items: results,
      notes: 'Free Expert Advisors, Indicators, and Scripts from MQL5 community',
    }, null, 2)
  );

  console.log(`\n✅ MQL5 search complete: ${results.length} items cataloged`);
  return results;
}

// ============================================================================
// CTRADER ALGO SAMPLES
// ============================================================================

async function searchCTrader() {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 CTRADER - Official Algo Samples & Community');
  console.log('='.repeat(70));

  const baseDir = path.join(DOWNLOAD_PATH, 'ctrader');
  ensureDir(baseDir);

  const results = [];

  // cTrader official samples from GitHub
  const githubRepos = [
    { owner: 'spotware', repo: 'ctrader-algo-samples', desc: 'Official cTrader Algo Samples' },
    { owner: 'afhacker', repo: 'ctrader-algo-samples', desc: 'Community cTrader Samples' },
  ];

  console.log('\n📂 GitHub Repositories (Official + Community)');

  for (const { owner, repo, desc } of githubRepos) {
    try {
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents`;
      const response = await httpGet(apiUrl, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'TIME-Bot-Harvester',
        },
      });

      if (response.status === 200) {
        const contents = JSON.parse(response.data);
        const algoFiles = contents.filter(f =>
          f.type === 'file' && (f.name.endsWith('.cs') || f.name.endsWith('.algo'))
        );

        console.log(`   📦 ${owner}/${repo}: ${contents.length} items`);

        const repoDir = path.join(baseDir, `${owner}_${repo}`);
        ensureDir(repoDir);

        for (const file of algoFiles.slice(0, 20)) {
          if (file.download_url) {
            const filepath = path.join(repoDir, file.name);
            try {
              await downloadFile(file.download_url, filepath);
              console.log(`      ✓ ${file.name}`);

              results.push({
                source: 'ctrader_github',
                repo: `${owner}/${repo}`,
                filename: file.name,
                url: file.html_url,
                downloadUrl: file.download_url,
                localPath: filepath,
              });
            } catch (e) {
              console.log(`      ✗ ${file.name}`);
            }
          }
          await sleep(200);
        }
      }
    } catch (error) {
      console.log(`   ❌ ${owner}/${repo}: ${error.message}`);
    }
  }

  // cTrader.com community (limited scraping due to dynamic content)
  console.log('\n📂 cTrader.com Community Indicators');

  try {
    const communityUrl = 'https://ctrader.com/algos/indicators';
    const response = await httpGet(communityUrl);

    if (response.status === 200) {
      // Extract indicator names and links
      const indicatorLinks = extractLinks(response.data, /href="(\/algos\/indicators\/[^"]+)"/g);
      console.log(`   Found ${indicatorLinks.length} indicator listings`);

      for (const link of [...new Set(indicatorLinks)].slice(0, 20)) {
        const fullUrl = `https://ctrader.com${link}`;
        const nameMatch = link.match(/\/indicators\/(.+)/);
        const name = nameMatch ? nameMatch[1].replace(/-/g, ' ') : 'Unknown';

        results.push({
          source: 'ctrader_community',
          name: name,
          url: fullUrl,
          type: 'indicator',
        });
      }
    }
  } catch (error) {
    console.log(`   ⚠️ cTrader.com: ${error.message}`);
  }

  // cBots section
  console.log('\n📂 cTrader.com cBots');

  try {
    const cbotsUrl = 'https://ctrader.com/algos/cbots';
    const response = await httpGet(cbotsUrl);

    if (response.status === 200) {
      const cbotLinks = extractLinks(response.data, /href="(\/algos\/cbots\/[^"]+)"/g);
      console.log(`   Found ${cbotLinks.length} cBot listings`);

      for (const link of [...new Set(cbotLinks)].slice(0, 20)) {
        const fullUrl = `https://ctrader.com${link}`;
        const nameMatch = link.match(/\/cbots\/(.+)/);
        const name = nameMatch ? nameMatch[1].replace(/-/g, ' ') : 'Unknown';

        results.push({
          source: 'ctrader_community',
          name: name,
          url: fullUrl,
          type: 'cbot',
        });
      }
    }
  } catch (error) {
    console.log(`   ⚠️ cTrader.com cBots: ${error.message}`);
  }

  // Save catalog
  fs.writeFileSync(
    path.join(baseDir, '_ctrader_catalog.json'),
    JSON.stringify({
      source: 'cTrader',
      urls: ['https://ctrader.com/algos', 'https://github.com/spotware/ctrader-algo-samples'],
      searchedAt: new Date().toISOString(),
      totalFound: results.length,
      items: results,
      notes: 'cTrader uses C# for algos. cAlgo API documentation at help.ctrader.com',
    }, null, 2)
  );

  console.log(`\n✅ cTrader search complete: ${results.length} items cataloged`);
  return results;
}

// ============================================================================
// TRADINGVIEW PINE SCRIPTS
// ============================================================================

async function searchTradingView() {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 TRADINGVIEW - Pine Script Community');
  console.log('='.repeat(70));

  const baseDir = path.join(DOWNLOAD_PATH, 'tradingview');
  ensureDir(baseDir);

  const results = [];

  // TradingView categories to search
  const categories = [
    { name: 'Strategies', path: '/scripts/strategies/', type: 'strategy' },
    { name: 'Indicators', path: '/scripts/indicators/', type: 'indicator' },
    { name: 'Oscillators', path: '/scripts/oscillators/', type: 'oscillator' },
    { name: 'Momentum', path: '/scripts/momentum/', type: 'momentum' },
    { name: 'Trend Analysis', path: '/scripts/trend-analysis/', type: 'trend' },
    { name: 'Volatility', path: '/scripts/volatility/', type: 'volatility' },
    { name: 'Moving Averages', path: '/scripts/moving-averages/', type: 'ma' },
  ];

  for (const category of categories) {
    console.log(`\n📂 ${category.name}`);

    try {
      const url = `https://www.tradingview.com${category.path}`;
      const response = await httpGet(url);

      if (response.status !== 200) {
        console.log(`   ⚠️ Could not access (status ${response.status})`);
        continue;
      }

      // Extract script links - TradingView uses dynamic loading but some data is in HTML
      const scriptLinks = extractLinks(response.data, /href="(\/script\/[^"]+)"/g);
      const uniqueLinks = [...new Set(scriptLinks)].slice(0, 15);

      console.log(`   Found ${uniqueLinks.length} scripts`);

      for (const link of uniqueLinks.slice(0, 10)) {
        try {
          const scriptUrl = `https://www.tradingview.com${link}`;

          // Extract script name from URL
          const nameMatch = link.match(/\/script\/([^\/]+)/);
          const name = nameMatch ? nameMatch[1].replace(/-/g, ' ') : 'Unknown Script';

          results.push({
            source: 'tradingview',
            category: category.name,
            name: name,
            url: scriptUrl,
            type: category.type,
            note: 'Pine Script v5/v6 - View source on TradingView',
          });

          console.log(`   📜 ${name.substring(0, 50)}`);
        } catch (e) {
          // Skip individual failures
        }
      }

      await sleep(800);
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  // GitHub Pine Script repositories
  console.log('\n📂 GitHub Pine Script Repositories');

  const pineRepos = [
    'pinecoders/tradingview-pinescript-templates',
    'pinecoders/pine-utils',
    'nickhould/pine-script-templates',
  ];

  for (const repoPath of pineRepos) {
    try {
      const apiUrl = `https://api.github.com/repos/${repoPath}/contents`;
      const response = await httpGet(apiUrl, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'TIME-Bot-Harvester',
        },
      });

      if (response.status === 200) {
        const contents = JSON.parse(response.data);
        const pineFiles = contents.filter(f =>
          f.type === 'file' && (f.name.endsWith('.pine') || f.name.endsWith('.pinescript'))
        );

        console.log(`   📦 ${repoPath}: ${pineFiles.length} Pine files`);

        const repoDir = path.join(baseDir, repoPath.replace('/', '_'));
        ensureDir(repoDir);

        for (const file of pineFiles.slice(0, 15)) {
          if (file.download_url) {
            const filepath = path.join(repoDir, file.name);
            try {
              await downloadFile(file.download_url, filepath);
              console.log(`      ✓ ${file.name}`);

              results.push({
                source: 'tradingview_github',
                repo: repoPath,
                filename: file.name,
                url: file.html_url,
                localPath: filepath,
              });
            } catch (e) {
              console.log(`      ✗ ${file.name}`);
            }
          }
        }
      }
    } catch (error) {
      console.log(`   ❌ ${repoPath}: ${error.message}`);
    }
  }

  // Save catalog
  fs.writeFileSync(
    path.join(baseDir, '_tradingview_catalog.json'),
    JSON.stringify({
      source: 'TradingView',
      url: 'https://www.tradingview.com/scripts/',
      searchedAt: new Date().toISOString(),
      totalFound: results.length,
      items: results,
      notes: 'TradingView scripts use Pine Script (v5/v6). No direct trading execution - signals only. Use with TradingView-to-MT4/MT5 bridges.',
    }, null, 2)
  );

  console.log(`\n✅ TradingView search complete: ${results.length} items cataloged`);
  return results;
}

// ============================================================================
// FOREX FORUMS - ForexFactory, BabyPips
// ============================================================================

async function searchForums() {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 FOREX FORUMS - Community EAs & Strategies');
  console.log('='.repeat(70));

  const baseDir = path.join(DOWNLOAD_PATH, 'forums');
  ensureDir(baseDir);

  const results = [];

  // ForexFactory - Trading Systems section
  console.log('\n📂 ForexFactory - Trading Systems');

  try {
    const ffUrl = 'https://www.forexfactory.com/forum/45-trading-systems';
    const response = await httpGet(ffUrl);

    if (response.status === 200) {
      // Extract thread links
      const threadLinks = extractLinks(response.data, /href="(\/thread\/[^"]+)"/g);
      const uniqueThreads = [...new Set(threadLinks)].slice(0, 30);

      console.log(`   Found ${uniqueThreads.length} strategy threads`);

      for (const link of uniqueThreads.slice(0, 20)) {
        const fullUrl = `https://www.forexfactory.com${link}`;
        const titleMatch = link.match(/\/thread\/[^-]+-(.+)/);
        const title = titleMatch ? titleMatch[1].replace(/-/g, ' ') : 'Unknown Strategy';

        results.push({
          source: 'forexfactory',
          section: 'Trading Systems',
          title: title,
          url: fullUrl,
          type: 'strategy_discussion',
        });
      }
    }
  } catch (error) {
    console.log(`   ⚠️ ForexFactory: ${error.message}`);
  }

  // ForexFactory - EA section
  console.log('\n📂 ForexFactory - Expert Advisors');

  try {
    const eaUrl = 'https://www.forexfactory.com/forum/89-expert-advisors';
    const response = await httpGet(eaUrl);

    if (response.status === 200) {
      const threadLinks = extractLinks(response.data, /href="(\/thread\/[^"]+)"/g);
      const uniqueThreads = [...new Set(threadLinks)].slice(0, 30);

      console.log(`   Found ${uniqueThreads.length} EA threads`);

      for (const link of uniqueThreads.slice(0, 20)) {
        const fullUrl = `https://www.forexfactory.com${link}`;
        const titleMatch = link.match(/\/thread\/[^-]+-(.+)/);
        const title = titleMatch ? titleMatch[1].replace(/-/g, ' ') : 'Unknown EA';

        results.push({
          source: 'forexfactory',
          section: 'Expert Advisors',
          title: title,
          url: fullUrl,
          type: 'ea_discussion',
        });
      }
    }
  } catch (error) {
    console.log(`   ⚠️ ForexFactory EAs: ${error.message}`);
  }

  // BabyPips - Trading Systems
  console.log('\n📂 BabyPips - Trading Systems');

  try {
    const bpUrl = 'https://forums.babypips.com/c/free-forex-trading-systems/30';
    const response = await httpGet(bpUrl);

    if (response.status === 200) {
      const topicLinks = extractLinks(response.data, /href="(\/t\/[^"]+)"/g);
      const uniqueTopics = [...new Set(topicLinks)].slice(0, 30);

      console.log(`   Found ${uniqueTopics.length} strategy topics`);

      for (const link of uniqueTopics.slice(0, 20)) {
        const fullUrl = `https://forums.babypips.com${link}`;
        const titleMatch = link.match(/\/t\/([^\/]+)/);
        const title = titleMatch ? titleMatch[1].replace(/-/g, ' ') : 'Unknown Strategy';

        results.push({
          source: 'babypips',
          section: 'Free Forex Trading Systems',
          title: title,
          url: fullUrl,
          type: 'strategy_discussion',
        });
      }
    }
  } catch (error) {
    console.log(`   ⚠️ BabyPips: ${error.message}`);
  }

  // Save catalog
  fs.writeFileSync(
    path.join(baseDir, '_forums_catalog.json'),
    JSON.stringify({
      sources: ['ForexFactory', 'BabyPips'],
      searchedAt: new Date().toISOString(),
      totalFound: results.length,
      items: results,
      notes: 'Forum discussions often contain strategy logic that can be converted to code. Manual review required.',
    }, null, 2)
  );

  console.log(`\n✅ Forums search complete: ${results.length} items cataloged`);
  return results;
}

// ============================================================================
// FREE EA SITES - Known repositories
// ============================================================================

async function searchFreeEASites() {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 FREE EA SITES - Known Repositories');
  console.log('='.repeat(70));

  const baseDir = path.join(DOWNLOAD_PATH, 'free_eas');
  ensureDir(baseDir);

  const results = [];

  // Known sources with free EAs
  const sources = [
    {
      name: 'ForexRobotNation - Free EAs',
      url: 'https://forexrobotnation.com/your-first-free-forex-robot/',
      type: 'forexrobotnation',
      description: 'FRN Scalping Bot and other free Expert Advisors',
    },
    {
      name: 'ForexRobotNation - Best Robots',
      url: 'https://forexrobotnation.com/best-forex-robot-and-expert-advisors-top-3-tested/',
      type: 'forexrobotnation_best',
      description: 'Top tested forex robots with verified results',
    },
    {
      name: 'EarnForex - Free EAs',
      url: 'https://www.earnforex.com/metatrader-expert-advisors/',
      type: 'earnforex',
      description: 'Free Expert Advisors for MetaTrader',
    },
    {
      name: 'FX Blue - Free Tools',
      url: 'https://www.fxblue.com/appstore',
      type: 'fxblue',
      description: 'Free trading tools and EAs',
    },
    {
      name: 'Quivofx - Free EAs',
      url: 'https://www.quivofx.com/free-forex-ea/',
      type: 'quivofx',
      description: 'Free forex Expert Advisors collection',
    },
    {
      name: 'ForexCracked - Free Premium EAs',
      url: 'https://www.forexcracked.com/forex-ea/',
      type: 'forexcracked',
      description: 'Premium forex EAs shared for free',
    },
    {
      name: 'ForexStore - Free Robots',
      url: 'https://forexstore.com/free-forex-robots-eas',
      type: 'forexstore',
      description: 'Free forex robots and EAs collection',
    },
    {
      name: 'EA Trading Academy - Free Scalping',
      url: 'https://eatradingacademy.com/robots/trading-robots/forex/forex-scalping-robot/',
      type: 'eatradingacademy',
      description: 'Free forex scalping robots for 9 currency pairs',
    },
  ];

  for (const source of sources) {
    console.log(`\n📂 ${source.name}`);

    try {
      const response = await httpGet(source.url);

      if (response.status === 200) {
        // Generic extraction of EA/indicator names
        const eaLinks = extractLinks(response.data, /href="([^"]*(?:expert|advisor|ea|indicator)[^"]*)"/gi);
        const uniqueLinks = [...new Set(eaLinks)].slice(0, 20);

        console.log(`   Found ${uniqueLinks.length} EA/indicator links`);

        for (const link of uniqueLinks) {
          const fullUrl = link.startsWith('http') ? link : `${source.url}${link}`;
          const nameMatch = link.match(/\/([^\/]+)\/?$/);
          const name = nameMatch ? nameMatch[1].replace(/-/g, ' ').replace(/_/g, ' ') : 'Unknown';

          results.push({
            source: source.type,
            name: name,
            url: fullUrl,
            sourceUrl: source.url,
          });
        }
      }
    } catch (error) {
      console.log(`   ⚠️ ${source.name}: ${error.message}`);
    }

    await sleep(1000);
  }

  // GitHub free EA collections
  console.log('\n📂 GitHub Free EA Collections');

  const githubCollections = [
    'EA31337/EA31337-Libre',
    'asuncioncompras/NNFX-Backtester',
    'femtotrader/freqtrade_strategies',
    'sysang/mql4-trading-bots',
  ];

  for (const repoPath of githubCollections) {
    try {
      const apiUrl = `https://api.github.com/repos/${repoPath}`;
      const response = await httpGet(apiUrl, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'TIME-Bot-Harvester',
        },
      });

      if (response.status === 200) {
        const repo = JSON.parse(response.data);
        console.log(`   📦 ${repoPath} (⭐${repo.stargazers_count})`);
        console.log(`      ${(repo.description || '').substring(0, 60)}`);

        results.push({
          source: 'github_collection',
          repo: repoPath,
          stars: repo.stargazers_count,
          description: repo.description,
          url: repo.html_url,
          language: repo.language,
        });
      }
    } catch (error) {
      console.log(`   ❌ ${repoPath}: ${error.message}`);
    }
  }

  // Save catalog
  fs.writeFileSync(
    path.join(baseDir, '_free_eas_catalog.json'),
    JSON.stringify({
      sources: sources.map(s => s.name),
      searchedAt: new Date().toISOString(),
      totalFound: results.length,
      items: results,
      notes: 'Free EAs require thorough testing before use. Check licenses and reviews.',
    }, null, 2)
  );

  console.log(`\n✅ Free EA sites search complete: ${results.length} items cataloged`);
  return results;
}

// ============================================================================
// QUANTCONNECT LEAN ALGORITHMS
// ============================================================================

async function searchQuantConnect() {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 QUANTCONNECT LEAN - Open Source Algorithms');
  console.log('='.repeat(70));

  const baseDir = path.join(DOWNLOAD_PATH, 'quantconnect');
  ensureDir(baseDir);

  const results = [];

  // QuantConnect Lean repository
  const repos = [
    { owner: 'QuantConnect', repo: 'Lean', path: 'Algorithm.Python' },
    { owner: 'QuantConnect', repo: 'Lean', path: 'Algorithm.CSharp' },
    { owner: 'shilewenuw', repo: 'QuantConnect-Lean-Crypto-Trading-Bot' },
    { owner: 'QuantConnect', repo: 'Lean.Brokerages' },
  ];

  for (const { owner, repo, path: subpath } of repos) {
    console.log(`\n📂 ${owner}/${repo}${subpath ? '/' + subpath : ''}`);

    try {
      const apiUrl = subpath
        ? `https://api.github.com/repos/${owner}/${repo}/contents/${subpath}`
        : `https://api.github.com/repos/${owner}/${repo}/contents`;

      const response = await httpGet(apiUrl, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'TIME-Bot-Harvester',
        },
      });

      if (response.status === 200) {
        const contents = JSON.parse(response.data);
        const algoFiles = contents.filter(f =>
          f.type === 'file' && (
            f.name.endsWith('.py') ||
            f.name.endsWith('.cs') ||
            f.name.toLowerCase().includes('algorithm') ||
            f.name.toLowerCase().includes('strategy')
          )
        );

        console.log(`   Found ${algoFiles.length} algorithm files`);

        const repoDir = path.join(baseDir, `${owner}_${repo}${subpath ? '_' + subpath.replace('/', '_') : ''}`);
        ensureDir(repoDir);

        for (const file of algoFiles.slice(0, 15)) {
          if (file.download_url) {
            const filepath = path.join(repoDir, file.name);
            try {
              await downloadFile(file.download_url, filepath);
              console.log(`   ✓ ${file.name}`);

              results.push({
                source: 'quantconnect',
                repo: `${owner}/${repo}`,
                subpath: subpath || '',
                filename: file.name,
                url: file.html_url,
                localPath: filepath,
              });
            } catch (e) {
              console.log(`   ✗ ${file.name}`);
            }
          }
          await sleep(200);
        }
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  // Save catalog
  fs.writeFileSync(
    path.join(baseDir, '_quantconnect_catalog.json'),
    JSON.stringify({
      source: 'QuantConnect Lean',
      url: 'https://github.com/QuantConnect/Lean',
      searchedAt: new Date().toISOString(),
      totalFound: results.length,
      items: results,
      notes: 'QuantConnect Lean is an open-source algorithmic trading engine. Supports Python and C#.',
    }, null, 2)
  );

  console.log(`\n✅ QuantConnect search complete: ${results.length} items cataloged`);
  return results;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function runAll() {
  console.log('\n' + '═'.repeat(70));
  console.log('🚀 TIME DEEP BOT SEARCH - ALL SOURCES');
  console.log('═'.repeat(70));

  ensureDir(DOWNLOAD_PATH);

  const allResults = {
    mql5: [],
    ctrader: [],
    tradingview: [],
    forums: [],
    freeEAs: [],
    quantconnect: [],
  };

  try {
    allResults.mql5 = await searchMQL5();
    await sleep(2000);

    allResults.ctrader = await searchCTrader();
    await sleep(2000);

    allResults.tradingview = await searchTradingView();
    await sleep(2000);

    allResults.forums = await searchForums();
    await sleep(2000);

    allResults.freeEAs = await searchFreeEASites();
    await sleep(2000);

    allResults.quantconnect = await searchQuantConnect();

  } catch (error) {
    console.error(`\n❌ Error during search: ${error.message}`);
  }

  // Create master summary
  const totalItems = Object.values(allResults).reduce((sum, arr) => sum + arr.length, 0);

  const summary = {
    searchCompletedAt: new Date().toISOString(),
    totalItemsFound: totalItems,
    breakdown: {
      mql5: allResults.mql5.length,
      ctrader: allResults.ctrader.length,
      tradingview: allResults.tradingview.length,
      forums: allResults.forums.length,
      freeEAs: allResults.freeEAs.length,
      quantconnect: allResults.quantconnect.length,
    },
    downloadLocation: path.resolve(DOWNLOAD_PATH),
  };

  fs.writeFileSync(
    path.join(DOWNLOAD_PATH, '_DEEP_SEARCH_SUMMARY.json'),
    JSON.stringify(summary, null, 2)
  );

  console.log('\n' + '═'.repeat(70));
  console.log('🎉 DEEP BOT SEARCH COMPLETE!');
  console.log('═'.repeat(70));
  console.log(`\n📊 RESULTS SUMMARY:`);
  console.log(`   MQL5 Code Base:    ${allResults.mql5.length} items`);
  console.log(`   cTrader:           ${allResults.ctrader.length} items`);
  console.log(`   TradingView:       ${allResults.tradingview.length} items`);
  console.log(`   Forex Forums:      ${allResults.forums.length} items`);
  console.log(`   Free EA Sites:     ${allResults.freeEAs.length} items`);
  console.log(`   QuantConnect:      ${allResults.quantconnect.length} items`);
  console.log(`   ─────────────────────────────`);
  console.log(`   TOTAL:             ${totalItems} items\n`);
  console.log(`📁 Results saved to: ${path.resolve(DOWNLOAD_PATH)}`);
  console.log('═'.repeat(70) + '\n');

  return summary;
}

// ============================================================================
// CLI ENTRY POINT
// ============================================================================

async function main() {
  const arg = process.argv[2];

  console.log('\n🤖 TIME Deep Bot Search');
  console.log('━'.repeat(40));
  console.log('Non-GitHub source discovery for trading bots\n');

  if (!arg) {
    console.log('Usage: node scripts/deep_bot_search.js <source>\n');
    console.log('Sources:');
    console.log('  mql5        - MQL5 Code Base (Expert Advisors, Indicators)');
    console.log('  ctrader     - cTrader Algo Samples & Community');
    console.log('  tradingview - TradingView Pine Scripts');
    console.log('  forums      - ForexFactory, BabyPips forums');
    console.log('  free        - Free EA sites & collections');
    console.log('  quant       - QuantConnect Lean algorithms');
    console.log('  all         - Search all sources\n');
    console.log('Example: node scripts/deep_bot_search.js all');
    return;
  }

  ensureDir(DOWNLOAD_PATH);

  switch (arg.toLowerCase()) {
    case 'mql5':
      await searchMQL5();
      break;
    case 'ctrader':
      await searchCTrader();
      break;
    case 'tradingview':
    case 'tv':
      await searchTradingView();
      break;
    case 'forums':
      await searchForums();
      break;
    case 'free':
      await searchFreeEASites();
      break;
    case 'quant':
    case 'quantconnect':
      await searchQuantConnect();
      break;
    case 'all':
      await runAll();
      break;
    default:
      console.log(`Unknown source: ${arg}`);
      console.log('Use: mql5, ctrader, tradingview, forums, free, quant, or all');
  }
}

main().catch(console.error);
