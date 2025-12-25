const fs = require('fs');

let content = fs.readFileSync('./frontend/src/components/layout/Sidebar.tsx', 'utf8');

// Replace the entire navigation array
const oldNav = `const navigation = [
  // Core
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Ultimate Money Machine', href: '/ultimate', icon: Gem, isNew: true, isPremium: true },
  { name: 'LIVE Bot Trading', href: '/live-trading', icon: Play, isNew: true },
  { name: 'Big Moves Alerts', href: '/alerts', icon: Bell, isNew: true },
  { name: 'AI Trade God', href: '/ai-trade-god', icon: Zap, isNew: true },
  { name: 'Bot Dropzone', href: '/dropzone', icon: Download, isNew: true },
  // Trading
  { name: 'Markets', href: '/markets', icon: TrendingUp },
  { name: 'Charts', href: '/charts', icon: BarChart3 },
  { name: 'Trade', href: '/trade', icon: ArrowRightLeft },
  { name: 'Execution Engine', href: '/execution', icon: Cpu },
  { name: 'Trade History', href: '/history', icon: History },
  { name: 'Backtesting', href: '/backtest', icon: FlaskConical, isNew: true },
  // Investments
  { name: 'Portfolio', href: '/portfolio', icon: Wallet },
  { name: 'Strategies', href: '/strategies', icon: Layers },
  { name: 'Bots', href: '/bots', icon: Bot },
  { name: 'Bot Marketplace', href: '/marketplace', icon: Store, isNew: true },
  { name: 'Social Trading', href: '/social', icon: Users },
  { name: 'Robo Advisor', href: '/robo', icon: Bot },
  { name: 'Invest', href: '/invest', icon: PiggyBank },
  { name: 'DeFi', href: '/defi', icon: Coins },
  // Analysis
  { name: 'AI Vision', href: '/vision', icon: Eye },
  { name: 'Risk Profile', href: '/risk', icon: Shield },
  { name: 'Learn', href: '/learn', icon: GraduationCap },
  // Connections
  { name: 'Broker Connect', href: '/brokers', icon: Link2 },
  { name: 'Payments', href: '/payments', icon: CreditCard },
  // Wealth & Planning
  { name: 'Wealth Management', href: '/wealth', icon: Landmark, isNew: true },
  { name: 'Retirement', href: '/retirement', icon: Umbrella, isNew: true },
  { name: 'Account Transfers', href: '/transfers', icon: Building2, isNew: true },
  { name: 'Tax Optimization', href: '/tax', icon: Leaf, isNew: true },
  { name: 'Investment Goals', href: '/goals', icon: Target, isNew: true },
  // Settings & Admin
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Control Panel', href: '/admin', icon: Settings },
  { name: 'System Health', href: '/admin/health', icon: HeartPulse },
  { name: 'Admin Portal', href: '/admin-portal', icon: Crown, isNew: true },
  // Admin-Only Features
  { name: 'TIMEBEUNUS', href: '/timebeunus', icon: Brain, adminOnly: true },
  { name: 'DROPBOT AutoPilot', href: '/autopilot', icon: Rocket, isPremium: true },
  { name: 'Gift Access', href: '/gift-access', icon: Gift, adminOnly: true, isNew: true },
];`;

const newNav = `const navigation = [
  // Core
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  // PREMIUM FEATURES - Top of sidebar
  { name: 'DROPBOT AutoPilot', href: '/autopilot', icon: Rocket, isPremium: true, price: '$59/mo' },
  { name: 'Ultimate Money Machine', href: '/ultimate', icon: Gem, isNew: true, isPremium: true, price: '$79/mo' },
  { name: 'LIVE Bot Trading', href: '/live-trading', icon: Play, isNew: true },
  { name: 'Big Moves Alerts', href: '/alerts', icon: Bell, isNew: true },
  { name: 'Bot Dropzone', href: '/dropzone', icon: Download, isNew: true },
  // Trading
  { name: 'Markets', href: '/markets', icon: TrendingUp },
  { name: 'Charts', href: '/charts', icon: BarChart3 },
  { name: 'Trade', href: '/trade', icon: ArrowRightLeft },
  { name: 'Execution Engine', href: '/execution', icon: Cpu },
  { name: 'Trade History', href: '/history', icon: History },
  { name: 'Backtesting', href: '/backtest', icon: FlaskConical, isNew: true },
  // Investments
  { name: 'Portfolio', href: '/portfolio', icon: Wallet },
  { name: 'Strategies', href: '/strategies', icon: Layers },
  { name: 'Bots', href: '/bots', icon: Bot },
  { name: 'Bot Marketplace', href: '/marketplace', icon: Store, isNew: true },
  { name: 'Social Trading', href: '/social', icon: Users },
  { name: 'Robo Advisor', href: '/robo', icon: Bot },
  { name: 'Invest', href: '/invest', icon: PiggyBank },
  { name: 'DeFi', href: '/defi', icon: Coins },
  // Analysis
  { name: 'AI Vision', href: '/vision', icon: Eye },
  { name: 'Risk Profile', href: '/risk', icon: Shield },
  { name: 'Learn', href: '/learn', icon: GraduationCap },
  // Connections
  { name: 'Broker Connect', href: '/brokers', icon: Link2 },
  { name: 'Payments', href: '/payments', icon: CreditCard },
  // Wealth & Planning
  { name: 'Wealth Management', href: '/wealth', icon: Landmark, isNew: true },
  { name: 'Retirement', href: '/retirement', icon: Umbrella, isNew: true },
  { name: 'Account Transfers', href: '/transfers', icon: Building2, isNew: true },
  { name: 'Tax Optimization', href: '/tax', icon: Leaf, isNew: true },
  { name: 'Investment Goals', href: '/goals', icon: Target, isNew: true },
  // Settings (visible to all)
  { name: 'Settings', href: '/settings', icon: Settings },
  // ADMIN-ONLY FEATURES - Hidden from regular users
  { name: 'AI Trade God', href: '/ai-trade-god', icon: Zap, adminOnly: true, isNew: true },
  { name: 'Control Panel', href: '/admin', icon: Settings, adminOnly: true },
  { name: 'System Health', href: '/admin/health', icon: HeartPulse, adminOnly: true },
  { name: 'Admin Portal', href: '/admin-portal', icon: Crown, adminOnly: true },
  { name: 'TIMEBEUNUS', href: '/timebeunus', icon: Brain, adminOnly: true },
  { name: 'Gift Access', href: '/gift-access', icon: Gift, adminOnly: true },
];`;

if (content.includes(oldNav)) {
  content = content.replace(oldNav, newNav);
  fs.writeFileSync('./frontend/src/components/layout/Sidebar.tsx', content);
  console.log('Sidebar updated successfully');
} else {
  console.log('Pattern not found - trying partial match');
  // Try a simpler approach
  if (content.includes("{ name: 'DROPBOT AutoPilot', href: '/autopilot', icon: Rocket, isPremium: true }")) {
    console.log('Found DROPBOT line');
  }
}
