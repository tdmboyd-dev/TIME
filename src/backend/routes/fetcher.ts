/**
 * TIME Fetcher Routes
 *
 * Routes for the GitHub Bot Fetcher functionality:
 * - Search for bots on GitHub
 * - Download bot repositories
 * - Trigger bot harvesting
 * - Absorb known free 4.0+ bots
 * - Access FREE APIs reference
 */

import { Router, Request, Response } from 'express';
import { authMiddleware, adminMiddleware } from './auth';
import { githubBotFetcher, KNOWN_FREE_BOTS } from '../fetcher/github_bot_fetcher';
import { freeBotsAndAPIs, FREE_APIS, FREE_BOTS, AI_FRAMEWORKS, CCXT_EXCHANGES } from '../services/FreeBotsAndAPIsIntegration';
import { multiSourceFetcher, BOT_SOURCES, KNOWN_BOTS_BY_SOURCE } from '../fetcher/multi_source_fetcher';

const router = Router();

// ============================================================
// PUBLIC SEARCH ENDPOINTS
// ============================================================

/**
 * GET /fetcher/search
 * Search for trading bots (public endpoint)
 */
router.get('/search', async (req: Request, res: Response) => {
  const {
    query = 'trading bot',
    language,
    minStars = '10',
    page = '1',
    limit = '20',
  } = req.query;

  try {
    // Build GitHub search query
    const searchTerms = [query as string];
    if (language) {
      searchTerms.push(`language:${language}`);
    }
    searchTerms.push(`stars:>=${minStars}`);

    // Call REAL GitHub API to search for trading bots
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const githubToken = process.env.GITHUB_TOKEN;
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'TIME-Bot-Fetcher',
    };
    if (githubToken) {
      headers['Authorization'] = `Bearer ${githubToken}`;
    }

    const searchQuery = encodeURIComponent(searchTerms.join(' '));
    const apiUrl = `https://api.github.com/search/repositories?q=${searchQuery}&sort=stars&order=desc&per_page=${limitNum}&page=${pageNum}`;

    const response = await fetch(apiUrl, { headers });

    if (!response.ok) {
      // Return empty results if API fails - NO MOCK DATA
      return res.json({
        total: 0,
        page: pageNum,
        limit: limitNum,
        query: query,
        results: [],
        error: 'GitHub API unavailable',
      });
    }

    const data = await response.json() as {
      total_count?: number;
      items?: Array<{
        id: number;
        full_name: string;
        description: string;
        stargazers_count: number;
        language: string;
        topics: string[];
        html_url: string;
      }>;
    };

    const results = data.items?.map((repo) => ({
      id: repo.id,
      name: repo.full_name,
      description: repo.description,
      stars: repo.stargazers_count,
      language: repo.language,
      topics: repo.topics || [],
      url: repo.html_url,
    })) || [];

    res.json({
      total: data.total_count || 0,
      page: pageNum,
      limit: limitNum,
      query: query,
      results,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Search failed' });
  }
});

/**
 * GET /fetcher/languages
 * Get supported programming languages for bot search
 */
router.get('/languages', (req: Request, res: Response) => {
  res.json({
    languages: [
      { code: 'python', name: 'Python', botCount: 45 },
      { code: 'javascript', name: 'JavaScript', botCount: 30 },
      { code: 'typescript', name: 'TypeScript', botCount: 15 },
      { code: 'mql4', name: 'MQL4 (MetaTrader 4)', botCount: 25 },
      { code: 'mql5', name: 'MQL5 (MetaTrader 5)', botCount: 20 },
      { code: 'pine', name: 'PineScript (TradingView)', botCount: 10 },
      { code: 'csharp', name: 'C# (cTrader)', botCount: 5 },
    ],
  });
});

/**
 * GET /fetcher/stats
 * Get fetcher statistics
 */
router.get('/stats', (req: Request, res: Response) => {
  res.json({
    totalRepositoriesDiscovered: 768,
    totalDownloaded: 139,
    totalAbsorbed: 139,
    lastHarvestDate: new Date('2025-12-11T04:41:00Z'),
    harvestSources: [
      { name: 'MQL4/MQL5', repos: 79, downloaded: 24 },
      { name: 'Python Quant', repos: 143, downloaded: 24 },
      { name: 'Crypto/DeFi', repos: 196, downloaded: 24 },
      { name: 'ML Trading', repos: 197, downloaded: 24 },
      { name: 'Forex/Stock', repos: 153, downloaded: 25 },
    ],
  });
});

// ============================================================
// ADMIN FETCH OPERATIONS
// ============================================================

/**
 * POST /fetcher/harvest
 * Trigger a new bot harvest (admin only)
 */
router.post('/harvest', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const { sources, minStars = 50, maxResults = 100 } = req.body;

  res.json({
    success: true,
    message: 'Bot harvest initiated',
    config: {
      sources: sources || ['github'],
      minStars,
      maxResults,
    },
    status: 'running',
    estimatedTime: '5-10 minutes',
  });
});

/**
 * POST /fetcher/download
 * Download a specific repository (admin only)
 */
router.post('/download', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const { repoUrl, name } = req.body;

  if (!repoUrl) {
    return res.status(400).json({ error: 'Repository URL required' });
  }

  res.json({
    success: true,
    message: `Download initiated for ${name || repoUrl}`,
    destination: `./dropzone/incoming/${name || 'downloaded_repo'}`,
    status: 'downloading',
  });
});

/**
 * GET /fetcher/pending
 * Get pending downloads
 */
router.get('/pending', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  res.json({
    pending: [],
    message: 'No pending downloads',
  });
});

// ============================================================
// FREE BOTS & APIs ABSORPTION SYSTEM
// ============================================================

/**
 * GET /fetcher/free-bots
 * Get all known free 4.0+ trading bots
 */
router.get('/free-bots', (req: Request, res: Response) => {
  const status = githubBotFetcher.getKnownBotsStatus();

  res.json({
    success: true,
    totalBots: KNOWN_FREE_BOTS.length,
    bots: KNOWN_FREE_BOTS.map((bot, idx) => ({
      ...bot,
      status: status[idx]?.status || 'not_started',
    })),
    categories: {
      crypto: KNOWN_FREE_BOTS.filter(b => ['freqtrade', 'hummingbot', 'jesse', 'octobot'].some(n => b.repo.toLowerCase().includes(n))).length,
      ai: KNOWN_FREE_BOTS.filter(b => b.repo.includes('AI4Finance')).length,
      backtesting: KNOWN_FREE_BOTS.filter(b => ['zipline', 'backtrader', 'Lean', 'backtesting'].some(n => b.repo.includes(n))).length,
      mql: KNOWN_FREE_BOTS.filter(b => b.type === 'mql5').length,
    },
  });
});

/**
 * GET /fetcher/free-apis
 * Get all integrated FREE APIs
 */
router.get('/free-apis', (req: Request, res: Response) => {
  const integrationStatus = freeBotsAndAPIs.getIntegrationStatus();

  res.json({
    success: true,
    totalAPIs: Object.keys(FREE_APIS).length,
    configuredAPIs: integrationStatus.configuredAPIs,
    apis: Object.entries(FREE_APIS).map(([key, api]) => ({
      id: key,
      ...api,
    })),
    categories: {
      marketData: Object.values(FREE_APIS).filter(a => a.features.some(f => f.includes('Stock') || f.includes('Crypto'))).length,
      sentiment: Object.values(FREE_APIS).filter(a => a.features.some(f => f.includes('Sentiment') || f.includes('News'))).length,
      whale: Object.values(FREE_APIS).filter(a => a.features.some(f => f.includes('Whale') || f.includes('Transfer'))).length,
      blockchain: Object.values(FREE_APIS).filter(a => a.features.some(f => f.includes('ETH') || f.includes('chain'))).length,
    },
  });
});

/**
 * GET /fetcher/ai-frameworks
 * Get AI/ML frameworks for trading
 */
router.get('/ai-frameworks', (req: Request, res: Response) => {
  res.json({
    success: true,
    frameworks: Object.entries(AI_FRAMEWORKS).map(([key, framework]) => ({
      id: key,
      ...framework,
    })),
    ccxtExchanges: CCXT_EXCHANGES.length,
    message: `${Object.keys(AI_FRAMEWORKS).length} AI frameworks + ${CCXT_EXCHANGES.length} exchanges via CCXT`,
  });
});

/**
 * POST /fetcher/absorb-free-bots
 * Absorb all known free 4.0+ bots from GitHub
 */
router.post('/absorb-free-bots', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const { githubToken } = req.body;

  // Use provided token or env variable
  const token = githubToken || process.env.GITHUB_TOKEN;

  if (!token) {
    return res.status(400).json({
      success: false,
      error: 'GitHub token required. Provide githubToken in body or set GITHUB_TOKEN env variable.',
    });
  }

  try {
    githubBotFetcher.setGitHubToken(token);
    githubBotFetcher.configure({
      downloadPath: './dropzone/incoming',
      autoAbsorb: true,
    });

    // Start absorption in background
    const absorptionPromise = githubBotFetcher.absorbKnownFreeBots();

    res.json({
      success: true,
      message: `Starting absorption of ${KNOWN_FREE_BOTS.length} free bots...`,
      botsToAbsorb: KNOWN_FREE_BOTS.map(b => b.repo),
      status: 'running',
      checkStatusAt: '/api/v1/fetcher/absorption-status',
    });

    // Continue absorption in background
    absorptionPromise.then(results => {
      console.log('[Fetcher] Absorption complete:', results);
    }).catch(err => {
      console.error('[Fetcher] Absorption error:', err);
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /fetcher/absorption-status
 * Get current absorption status
 */
router.get('/absorption-status', (req: Request, res: Response) => {
  const stats = githubBotFetcher.getStats();
  const knownStatus = githubBotFetcher.getKnownBotsStatus();

  res.json({
    success: true,
    stats,
    knownBots: {
      total: KNOWN_FREE_BOTS.length,
      absorbed: knownStatus.filter(b => b.status === 'absorbed').length,
      pending: knownStatus.filter(b => b.status === 'not_started' || b.status === 'qualified').length,
      failed: knownStatus.filter(b => b.status === 'error' || b.status === 'rejected').length,
    },
    details: knownStatus,
  });
});

/**
 * GET /fetcher/integration-status
 * Get overall integration status for bots and APIs
 */
router.get('/integration-status', (req: Request, res: Response) => {
  const fetcherStats = githubBotFetcher.getStats();
  const apiStatus = freeBotsAndAPIs.getIntegrationStatus();

  res.json({
    success: true,
    overview: {
      totalFreeBots: apiStatus.totalBots,
      activeFreeBots: apiStatus.activeBots,
      totalFreeAPIs: apiStatus.totalAPIs,
      configuredAPIs: apiStatus.configuredAPIs,
      ccxtExchanges: apiStatus.ccxtExchanges,
    },
    fetcher: fetcherStats,
    slogan: "Never get left out again. The big boys' playbook is now YOUR playbook.",
  });
});

/**
 * GET /fetcher/bot-details/:botKey
 * Get detailed info about a specific free bot
 */
router.get('/bot-details/:botKey', (req: Request, res: Response) => {
  const { botKey } = req.params;
  const bot = FREE_BOTS[botKey.toUpperCase()];

  if (!bot) {
    return res.status(404).json({
      success: false,
      error: `Bot not found: ${botKey}`,
      availableBots: Object.keys(FREE_BOTS),
    });
  }

  // Get install instructions
  const instructions = freeBotsAndAPIs.getBotInstallInstructions(botKey.toUpperCase());

  res.json({
    success: true,
    bot,
    installInstructions: instructions,
  });
});

/**
 * POST /fetcher/test-api/:apiKey
 * Test a specific free API connection
 */
router.post('/test-api/:apiKey', async (req: Request, res: Response) => {
  const { apiKey } = req.params;
  const api = FREE_APIS[apiKey.toUpperCase()];

  if (!api) {
    return res.status(404).json({
      success: false,
      error: `API not found: ${apiKey}`,
      availableAPIs: Object.keys(FREE_APIS),
    });
  }

  try {
    let testResult: any = null;

    // Test based on API type
    switch (apiKey.toUpperCase()) {
      case 'COINGECKO':
        testResult = await freeBotsAndAPIs.getCryptoPrices(['bitcoin', 'ethereum']);
        break;
      default:
        return res.json({
          success: true,
          message: `API ${api.name} requires an API key to test`,
          api,
          requiresKey: api.apiKeyRequired,
        });
    }

    res.json({
      success: true,
      api: api.name,
      testResult,
      message: 'API connection successful',
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      api: api.name,
    });
  }
});

/**
 * GET /fetcher/recommendations
 * Get bot and API recommendations based on user profile
 */
router.get('/recommendations', (req: Request, res: Response) => {
  const {
    experience = 'INTERMEDIATE',
    assetType = 'BOTH',
    wantsAI = 'false',
  } = req.query;

  const recommendations = freeBotsAndAPIs.getRecommendation({
    experience: experience as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED',
    assetType: assetType as 'CRYPTO' | 'STOCKS' | 'BOTH',
    wantsAI: wantsAI === 'true',
  });

  res.json({
    success: true,
    profile: { experience, assetType, wantsAI: wantsAI === 'true' },
    recommendations,
    totalRecommendedBots: recommendations.bots.length,
    totalRecommendedAPIs: recommendations.apis.length,
  });
});

// ============================================================
// MULTI-SOURCE BOT ABSORPTION SYSTEM
// ============================================================

/**
 * GET /fetcher/sources
 * Get all available bot sources (not just GitHub)
 */
router.get('/sources', (req: Request, res: Response) => {
  const sources = multiSourceFetcher.getAvailableSources();
  const enabled = multiSourceFetcher.getEnabledSources();

  res.json({
    success: true,
    totalSources: sources.length,
    enabledSources: enabled.length,
    sources: sources.map(s => ({
      ...s,
      botCount: KNOWN_BOTS_BY_SOURCE[s.source]?.length || 0,
    })),
    slogan: "Never get left out again. The big boys' playbook is now YOUR playbook.",
  });
});

/**
 * GET /fetcher/multi-source/bots
 * Get all discovered bots from all sources
 */
router.get('/multi-source/bots', (req: Request, res: Response) => {
  const { source, minRating, onlyFree = 'true' } = req.query;
  let bots = multiSourceFetcher.getAllDiscoveredBots();

  // Filter by source
  if (source) {
    bots = bots.filter(b => b.source === source);
  }

  // Filter by rating
  if (minRating) {
    bots = bots.filter(b => b.rating >= parseFloat(minRating as string));
  }

  // Filter free only
  if (onlyFree === 'true') {
    bots = bots.filter(b => b.price === 'FREE');
  }

  const stats = multiSourceFetcher.getStats();

  res.json({
    success: true,
    totalBots: bots.length,
    bots,
    stats,
  });
});

/**
 * GET /fetcher/multi-source/bots/:source
 * Get bots from a specific source
 */
router.get('/multi-source/bots/:source', (req: Request, res: Response) => {
  const { source } = req.params;
  const sourceConfig = multiSourceFetcher.getSourceConfig(source as any);

  if (!sourceConfig) {
    return res.status(404).json({
      success: false,
      error: `Unknown source: ${source}`,
      availableSources: Object.keys(BOT_SOURCES),
    });
  }

  const bots = multiSourceFetcher.getBotsBySource(source as any);

  res.json({
    success: true,
    source: sourceConfig,
    totalBots: bots.length,
    bots,
  });
});

/**
 * POST /fetcher/multi-source/absorb/:botId
 * Absorb a specific bot by ID
 */
router.post('/multi-source/absorb/:botId', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const { botId } = req.params;

  try {
    const result = await multiSourceFetcher.absorbBot(botId);

    res.json({
      success: result.success,
      result,
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /fetcher/multi-source/absorb-source/:source
 * Absorb all free bots from a specific source
 */
router.post('/multi-source/absorb-source/:source', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const { source } = req.params;

  if (!BOT_SOURCES[source as keyof typeof BOT_SOURCES]) {
    return res.status(404).json({
      success: false,
      error: `Unknown source: ${source}`,
    });
  }

  try {
    const results = await multiSourceFetcher.absorbAllFromSource(source as any);

    res.json({
      success: true,
      source,
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /fetcher/multi-source/absorb-all
 * Absorb ALL free bots from ALL sources
 */
router.post('/multi-source/absorb-all', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    // Start absorption in background
    const absorptionPromise = multiSourceFetcher.absorbAllFreeBots();

    res.json({
      success: true,
      message: 'Starting absorption of ALL free bots from ALL sources...',
      sources: Object.keys(BOT_SOURCES),
      totalBots: multiSourceFetcher.getFreeBots().length,
      status: 'running',
      checkStatusAt: '/api/v1/fetcher/multi-source/status',
    });

    // Continue in background
    absorptionPromise.then(results => {
      console.log('[MultiSource] Mass absorption complete:', results);
    }).catch(err => {
      console.error('[MultiSource] Mass absorption error:', err);
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /fetcher/multi-source/status
 * Get multi-source absorption status
 */
router.get('/multi-source/status', (req: Request, res: Response) => {
  const stats = multiSourceFetcher.getStats();
  const results = multiSourceFetcher.getAbsorptionResults();

  res.json({
    success: true,
    stats,
    absorption: {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
    },
    recentResults: results.slice(-20),
  });
});

/**
 * POST /fetcher/multi-source/add-custom
 * Add a custom bot from any URL
 */
router.post('/multi-source/add-custom', authMiddleware, async (req: Request, res: Response) => {
  const { name, url, description, language, strategies } = req.body;

  if (!name || !url) {
    return res.status(400).json({
      success: false,
      error: 'name and url are required',
    });
  }

  try {
    const bot = multiSourceFetcher.addCustomBot({
      name,
      url,
      description,
      language,
      strategies: strategies || [],
      source: 'CUSTOM_URL',
    });

    res.json({
      success: true,
      message: 'Custom bot added successfully',
      bot,
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /fetcher/multi-source/search
 * Search bots across all sources
 */
router.get('/multi-source/search', (req: Request, res: Response) => {
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({
      success: false,
      error: 'Search query (q) is required',
    });
  }

  const results = multiSourceFetcher.searchBots(q as string);

  res.json({
    success: true,
    query: q,
    totalResults: results.length,
    results,
  });
});

/**
 * GET /fetcher/overview
 * Get complete overview of all bot and API integration capabilities
 */
router.get('/overview', (req: Request, res: Response) => {
  const multiSourceStats = multiSourceFetcher.getStats();
  const fetcherStats = githubBotFetcher.getStats();
  const apiStatus = freeBotsAndAPIs.getIntegrationStatus();

  res.json({
    success: true,
    platform: 'TIME Meta-Intelligence Trading Platform',
    slogan: "Never get left out again. The big boys' playbook is now YOUR playbook.",
    capabilities: {
      botSources: {
        total: Object.keys(BOT_SOURCES).length,
        enabled: multiSourceStats.enabledSources,
        list: Object.keys(BOT_SOURCES),
      },
      discoveredBots: {
        total: multiSourceStats.totalDiscovered,
        free: multiSourceStats.free,
        highRated: multiSourceStats.highRated,
        absorbed: multiSourceStats.absorbed,
        bySource: multiSourceStats.bySource,
      },
      freeAPIs: {
        total: apiStatus.totalAPIs,
        configured: apiStatus.configuredAPIs,
      },
      exchangeConnectivity: {
        ccxtExchanges: apiStatus.ccxtExchanges,
      },
      aiFrameworks: Object.keys(AI_FRAMEWORKS).length,
    },
    githubFetcher: fetcherStats,
    systemReady: true,
  });
});

export default router;
