/**
 * TIME BEYOND US - Lazy Loading Components
 *
 * Dynamic imports for heavy components to reduce initial bundle size.
 * These components are loaded on-demand when first rendered.
 */

import dynamic from 'next/dynamic';

// Loading fallbacks
const ChartLoadingFallback = () => (
  <div className="w-full h-64 bg-gray-800/50 rounded-lg animate-pulse flex items-center justify-center">
    <span className="text-gray-400">Loading chart...</span>
  </div>
);

const ComponentLoadingFallback = () => (
  <div className="w-full h-32 bg-gray-800/50 rounded-lg animate-pulse" />
);

const WidgetLoadingFallback = () => (
  <div className="w-full h-48 bg-gray-800/50 rounded-lg animate-pulse flex items-center justify-center">
    <span className="text-gray-400">Loading...</span>
  </div>
);

// ============================================================================
// Lazy Loaded Chart Components
// ============================================================================

/**
 * Live trading chart - heavy component with canvas rendering
 */
export const LazyLiveChart = dynamic(
  () => import('@/components/charts/LiveChart').then((mod) => mod.LiveChart),
  {
    loading: () => <ChartLoadingFallback />,
    ssr: false, // Client-side only
  }
);

// ============================================================================
// Lazy Loaded Social Components
// ============================================================================

/**
 * Leaderboard with rankings - fetches data on load
 */
export const LazyLeaderboard = dynamic(
  () => import('@/components/social/Leaderboard').then((mod) => mod.default || mod.Leaderboard),
  {
    loading: () => <ComponentLoadingFallback />,
    ssr: false,
  }
);

/**
 * Community chat widget - WebSocket heavy
 */
export const LazyCommunityChat = dynamic(
  () => import('@/components/social/CommunityChat').then((mod) => mod.default || mod.CommunityChat),
  {
    loading: () => <WidgetLoadingFallback />,
    ssr: false,
  }
);

/**
 * Achievements display
 */
export const LazyAchievements = dynamic(
  () => import('@/components/social/Achievements').then((mod) => mod.default || mod.Achievements),
  {
    loading: () => <ComponentLoadingFallback />,
    ssr: false,
  }
);

// ============================================================================
// Lazy Loaded Trading Components
// ============================================================================

/**
 * AI Investment Bots selector
 */
export const LazyAIInvestmentBots = dynamic(
  () => import('@/components/invest/AIInvestmentBots').then((mod) => mod.default || mod.AIInvestmentBots),
  {
    loading: () => <WidgetLoadingFallback />,
    ssr: false,
  }
);

/**
 * Social Intelligence Bots
 */
export const LazySocialIntelligenceBots = dynamic(
  () => import('@/components/social/SocialIntelligenceBots').then((mod) => mod.default || mod.SocialIntelligenceBots),
  {
    loading: () => <WidgetLoadingFallback />,
    ssr: false,
  }
);

// ============================================================================
// Lazy Loaded Support Components
// ============================================================================

/**
 * AI Chat Widget - heavy with AI integration
 */
export const LazyAIChatWidget = dynamic(
  () => import('@/components/support/AIChatWidget').then((mod) => mod.default || mod.AIChatWidget),
  {
    loading: () => <WidgetLoadingFallback />,
    ssr: false,
  }
);

// ============================================================================
// Lazy Loaded Admin Components
// ============================================================================

/**
 * Email Builder - heavy rich text editor
 */
export const LazyEmailBuilder = dynamic(
  () => import('@/components/email/EmailBuilder').then((mod) => mod.default || mod.EmailBuilder),
  {
    loading: () => <WidgetLoadingFallback />,
    ssr: false,
  }
);

// ============================================================================
// Lazy Loaded Dashboard Widgets
// ============================================================================

/**
 * Active Bots widget
 */
export const LazyActiveBots = dynamic(
  () => import('@/components/dashboard/ActiveBots').then((mod) => mod.default || mod.ActiveBots),
  {
    loading: () => <ComponentLoadingFallback />,
    ssr: false,
  }
);

/**
 * Recent Insights widget
 */
export const LazyRecentInsights = dynamic(
  () => import('@/components/dashboard/RecentInsights').then((mod) => mod.default || mod.RecentInsights),
  {
    loading: () => <ComponentLoadingFallback />,
    ssr: false,
  }
);

/**
 * Big Moves Alerts
 */
export const LazyBigMovesAlerts = dynamic(
  () => import('@/components/alerts/BigMovesAlerts').then((mod) => mod.default || mod.BigMovesAlerts),
  {
    loading: () => <ComponentLoadingFallback />,
    ssr: false,
  }
);

// ============================================================================
// Export all lazy components
// ============================================================================

export const LazyComponents = {
  // Charts
  LiveChart: LazyLiveChart,

  // Social
  Leaderboard: LazyLeaderboard,
  CommunityChat: LazyCommunityChat,
  Achievements: LazyAchievements,

  // Trading
  AIInvestmentBots: LazyAIInvestmentBots,
  SocialIntelligenceBots: LazySocialIntelligenceBots,

  // Support
  AIChatWidget: LazyAIChatWidget,

  // Admin
  EmailBuilder: LazyEmailBuilder,

  // Dashboard
  ActiveBots: LazyActiveBots,
  RecentInsights: LazyRecentInsights,
  BigMovesAlerts: LazyBigMovesAlerts,
};

export default LazyComponents;
