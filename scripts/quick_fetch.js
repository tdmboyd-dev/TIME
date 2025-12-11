/**
 * Quick Bot Fetcher - Standalone Script
 *
 * This script searches GitHub for trading bots and downloads them.
 * Run with: node scripts/quick_fetch.js
 *
 * NOTE: Replace YOUR_TOKEN_HERE with your GitHub token
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURATION - UPDATE THIS
// ============================================================================
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || 'YOUR_TOKEN_HERE';
const MIN_STARS = 50; // Equivalent to 4.0+ rating
const DOWNLOAD_PATH = './dropzone/incoming';

// ============================================================================
// Search Queries
// ============================================================================
const SEARCH_QUERIES = [
  'mql4 expert advisor trading bot stars:>50',
  'mql5 trading bot stars:>50',
  'python trading bot algorithmic stars:>100',
  'python forex bot stars:>50',
  'javascript trading bot stars:>50',
  'pinescript tradingview strategy stars:>30',
];

// ============================================================================
// GitHub API Helper
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
        'User-Agent': 'TIME-Bot-Fetcher',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`GitHub API error: ${res.statusCode} - ${data}`));
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
    https.get(url, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'User-Agent': 'TIME-Bot-Fetcher',
      },
    }, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        // Follow redirect
        https.get(res.headers.location, (res2) => {
          res2.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve();
          });
        });
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
  });
}

// ============================================================================
// Main
// ============================================================================
async function main() {
  console.log('='.repeat(60));
  console.log('TIME Quick Bot Fetcher');
  console.log('Searching for 4.0+ rated trading bots on GitHub');
  console.log('='.repeat(60));

  if (GITHUB_TOKEN === 'YOUR_TOKEN_HERE') {
    console.error('\nERROR: Please set your GitHub token!');
    console.error('Edit this file and replace YOUR_TOKEN_HERE');
    console.error('Or set GITHUB_TOKEN environment variable');
    return;
  }

  // Create download directory
  if (!fs.existsSync(DOWNLOAD_PATH)) {
    fs.mkdirSync(DOWNLOAD_PATH, { recursive: true });
  }

  const allRepos = new Map();
  let totalFound = 0;

  // Search each query
  for (const query of SEARCH_QUERIES) {
    console.log(`\nSearching: ${query}`);

    try {
      const searchUrl = `/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=30`;
      const result = await githubRequest(searchUrl);

      console.log(`  Found: ${result.items?.length || 0} repos`);

      for (const repo of (result.items || [])) {
        if (!allRepos.has(repo.full_name) && repo.stargazers_count >= MIN_STARS) {
          allRepos.set(repo.full_name, {
            name: repo.name,
            fullName: repo.full_name,
            stars: repo.stargazers_count,
            language: repo.language,
            description: repo.description,
            url: repo.html_url,
            license: repo.license?.spdx_id,
          });
          totalFound++;
        }
      }

      // Respect rate limiting
      await new Promise(r => setTimeout(r, 1000));

    } catch (error) {
      console.error(`  Error: ${error.message}`);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`TOTAL UNIQUE REPOS FOUND: ${totalFound}`);
  console.log('='.repeat(60));

  // Display and download
  const repos = Array.from(allRepos.values()).sort((a, b) => b.stars - a.stars);

  for (const repo of repos.slice(0, 20)) { // Top 20
    const rating = Math.min(5, (repo.stars / 200) + 3).toFixed(1);

    console.log(`
${repo.fullName} (${repo.stars} stars, ~${rating}/5.0)
  Language: ${repo.language || 'Unknown'}
  License: ${repo.license || 'Unknown'}
  URL: ${repo.url}
  ${repo.description || ''}`);

    // Try to download main bot files
    try {
      const contentsUrl = `/repos/${repo.fullName}/contents`;
      const contents = await githubRequest(contentsUrl);

      const botFiles = contents.filter(f =>
        f.name.endsWith('.mq4') ||
        f.name.endsWith('.mq5') ||
        f.name.endsWith('.py') ||
        f.name.endsWith('.pine') ||
        (f.name.endsWith('.js') && !f.name.includes('config')) ||
        f.name.toLowerCase().includes('strategy') ||
        f.name.toLowerCase().includes('bot') ||
        f.name.toLowerCase().includes('expert')
      );

      if (botFiles.length > 0) {
        const repoDir = path.join(DOWNLOAD_PATH, repo.fullName.replace('/', '_'));
        if (!fs.existsSync(repoDir)) {
          fs.mkdirSync(repoDir, { recursive: true });
        }

        for (const file of botFiles.slice(0, 5)) { // Max 5 files per repo
          if (file.download_url) {
            const filepath = path.join(repoDir, file.name);
            console.log(`  Downloading: ${file.name}`);
            await downloadFile(file.download_url, filepath);
          }
        }

        // Save metadata
        fs.writeFileSync(
          path.join(repoDir, '_metadata.json'),
          JSON.stringify({ ...repo, downloadedAt: new Date().toISOString() }, null, 2)
        );

        console.log(`  ✓ Downloaded to ${repoDir}`);
      }

      await new Promise(r => setTimeout(r, 500));

    } catch (error) {
      console.log(`  Could not download: ${error.message}`);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('DOWNLOAD COMPLETE!');
  console.log(`Files saved to: ${path.resolve(DOWNLOAD_PATH)}`);
  console.log('='.repeat(60));
}

main().catch(console.error);
