/**
 * Email Campaign Templates for TIME
 *
 * Pre-built email templates for different campaign types:
 * - Welcome Series (5 emails over 14 days)
 * - Upgrade Nudge (3 emails)
 * - Inactive User (3 emails)
 * - Feature Education (weekly)
 */

import { CampaignType, CampaignStatus, Campaign } from './drip_campaign_service';

interface TemplateData {
  name: string;
  userName?: string;
  [key: string]: any;
}

/**
 * Base email styling for consistent branding
 */
const EMAIL_STYLES = {
  container: 'font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;',
  header: 'background: linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%); padding: 40px; text-align: center;',
  headerTitle: 'color: white; margin: 0; font-size: 28px;',
  headerSubtitle: 'color: rgba(255,255,255,0.9); margin-top: 10px; font-size: 16px;',
  body: 'padding: 40px; background: #1e293b; color: #e2e8f0;',
  bodyTitle: 'color: white; font-size: 24px; margin-bottom: 20px;',
  text: 'color: #e2e8f0; line-height: 1.6; margin-bottom: 20px;',
  button: 'display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0;',
  footer: 'padding: 20px; background: #0f172a; text-align: center; color: #64748b; font-size: 12px;',
  list: 'color: #e2e8f0; line-height: 2;'
};

/**
 * WELCOME SERIES CAMPAIGN
 * 5 emails over 14 days to onboard new users
 */
export const WELCOME_SERIES: Campaign = {
  id: 'welcome_series_v1',
  name: 'Welcome Series - New User Onboarding',
  type: CampaignType.WELCOME_SERIES,
  status: CampaignStatus.ACTIVE,
  description: 'Welcome new users and guide them through TIME platform features',
  trigger: {
    event: 'signup',
    delayMinutes: 0
  },
  emails: [
    {
      id: 'welcome_1',
      campaignId: 'welcome_series_v1',
      sequenceNumber: 1,
      delayDays: 0,
      subject: 'Welcome to TIME - Your AI Trading Journey Begins!',
      templateId: 'welcome_day_0',
      status: CampaignStatus.ACTIVE
    },
    {
      id: 'welcome_2',
      campaignId: 'welcome_series_v1',
      sequenceNumber: 2,
      delayDays: 1,
      subject: 'Connect Your First Broker & Start Trading',
      templateId: 'welcome_day_1',
      status: CampaignStatus.ACTIVE
    },
    {
      id: 'welcome_3',
      campaignId: 'welcome_series_v1',
      sequenceNumber: 3,
      delayDays: 3,
      subject: 'Try Your First AI Bot - No Coding Required',
      templateId: 'welcome_day_3',
      status: CampaignStatus.ACTIVE
    },
    {
      id: 'welcome_4',
      campaignId: 'welcome_series_v1',
      sequenceNumber: 4,
      delayDays: 7,
      subject: 'Upgrade to Premium - Unlock 154+ AI Bots',
      templateId: 'welcome_day_7',
      status: CampaignStatus.ACTIVE
    },
    {
      id: 'welcome_5',
      campaignId: 'welcome_series_v1',
      sequenceNumber: 5,
      delayDays: 14,
      subject: 'Special Offer: 50% Off Premium (Limited Time)',
      templateId: 'welcome_day_14',
      status: CampaignStatus.ACTIVE
    }
  ],
  createdAt: new Date(),
  updatedAt: new Date()
};

/**
 * Day 0: Welcome + Quick Start
 */
export const getWelcomeDay0Template = (data: TemplateData): string => `
  <div style="${EMAIL_STYLES.container}">
    <div style="${EMAIL_STYLES.header}">
      <h1 style="${EMAIL_STYLES.headerTitle}">Welcome to TIME</h1>
      <p style="${EMAIL_STYLES.headerSubtitle}">The Future of AI Trading</p>
    </div>
    <div style="${EMAIL_STYLES.body}">
      <h2 style="${EMAIL_STYLES.bodyTitle}">Hello ${data.userName || 'Trader'}!</h2>
      <p style="${EMAIL_STYLES.text}">
        Congratulations on joining TIME - the world's most advanced AI trading platform!
        You've just unlocked access to 154+ AI-powered trading bots, real-time market analysis,
        and institutional-grade execution.
      </p>
      <p style="${EMAIL_STYLES.text}">Here's what you can do right now:</p>
      <ul style="${EMAIL_STYLES.list}">
        <li>🎯 <strong>Connect a broker</strong> - Link your account in under 2 minutes</li>
        <li>📊 <strong>Explore live markets</strong> - Real-time data on 10,000+ assets</li>
        <li>🤖 <strong>Try a free bot</strong> - Start with our beginner-friendly strategies</li>
        <li>💡 <strong>Watch tutorials</strong> - Learn from our trading academy</li>
      </ul>
      <div style="text-align: center;">
        <a href="https://timebeyondus.com/dashboard" style="${EMAIL_STYLES.button}">Get Started Now</a>
      </div>
      <p style="${EMAIL_STYLES.text}">
        Need help? Our support team is available 24/7 at support@timebeyondus.com
      </p>
      <p style="${EMAIL_STYLES.text}">
        Welcome aboard!<br>
        <strong>The TIME Team</strong>
      </p>
    </div>
    <div style="${EMAIL_STYLES.footer}">
      <p>© 2025 TIME Trading. All rights reserved.</p>
      <p><a href="https://timebeyondus.com/unsubscribe" style="color: #7c3aed;">Unsubscribe</a></p>
    </div>
  </div>
`;

/**
 * Day 1: Connect Your First Broker
 */
export const getWelcomeDay1Template = (data: TemplateData): string => `
  <div style="${EMAIL_STYLES.container}">
    <div style="${EMAIL_STYLES.header}">
      <h1 style="${EMAIL_STYLES.headerTitle}">Connect Your Broker</h1>
      <p style="${EMAIL_STYLES.headerSubtitle}">Start Trading in Minutes</p>
    </div>
    <div style="${EMAIL_STYLES.body}">
      <h2 style="${EMAIL_STYLES.bodyTitle}">Ready to Start Trading, ${data.userName}?</h2>
      <p style="${EMAIL_STYLES.text}">
        The first step to unlocking TIME's full potential is connecting your brokerage account.
        We support all major brokers including Interactive Brokers, Alpaca, TD Ameritrade, and more.
      </p>
      <p style="${EMAIL_STYLES.text}"><strong>Why connect your broker?</strong></p>
      <ul style="${EMAIL_STYLES.list}">
        <li>✅ Execute trades automatically with AI bots</li>
        <li>✅ Sync your portfolio for real-time tracking</li>
        <li>✅ Access institutional pricing and execution</li>
        <li>✅ No manual trading required</li>
      </ul>
      <p style="${EMAIL_STYLES.text}">
        <strong>Security:</strong> Your credentials are encrypted with bank-level security.
        We never store your password.
      </p>
      <div style="text-align: center;">
        <a href="https://timebeyondus.com/brokers" style="${EMAIL_STYLES.button}">Connect Broker Now</a>
      </div>
      <p style="${EMAIL_STYLES.text}">
        Questions? Check out our <a href="https://timebeyondus.com/learn" style="color: #7c3aed;">Broker Setup Guide</a>.
      </p>
    </div>
    <div style="${EMAIL_STYLES.footer}">
      <p>© 2025 TIME Trading. All rights reserved.</p>
      <p><a href="https://timebeyondus.com/unsubscribe" style="color: #7c3aed;">Unsubscribe</a></p>
    </div>
  </div>
`;

/**
 * Day 3: Try Your First Bot
 */
export const getWelcomeDay3Template = (data: TemplateData): string => `
  <div style="${EMAIL_STYLES.container}">
    <div style="${EMAIL_STYLES.header}">
      <h1 style="${EMAIL_STYLES.headerTitle}">Try Your First AI Bot</h1>
      <p style="${EMAIL_STYLES.headerSubtitle}">No Coding Required</p>
    </div>
    <div style="${EMAIL_STYLES.body}">
      <h2 style="${EMAIL_STYLES.bodyTitle}">Time to Deploy Your First Bot! 🤖</h2>
      <p style="${EMAIL_STYLES.text}">
        You don't need to be a programmer to use TIME. Our AI bots are ready to trade -
        just pick a strategy, set your parameters, and let it run.
      </p>
      <p style="${EMAIL_STYLES.text}"><strong>Recommended starter bots:</strong></p>
      <ul style="${EMAIL_STYLES.list}">
        <li>📈 <strong>Momentum Trader</strong> - Catches trending moves (65% win rate)</li>
        <li>📉 <strong>Mean Reversion</strong> - Profits from price corrections (72% win rate)</li>
        <li>⚡ <strong>Day Trader Pro</strong> - Intraday scalping (58% win rate, high frequency)</li>
        <li>💎 <strong>Long-Term Growth</strong> - Set it and forget it (annual returns: 18%)</li>
      </ul>
      <div style="text-align: center;">
        <a href="https://timebeyondus.com/bots" style="${EMAIL_STYLES.button}">Browse AI Bots</a>
      </div>
      <p style="${EMAIL_STYLES.text}">
        <strong>Pro Tip:</strong> Start with paper trading to test strategies risk-free!
      </p>
    </div>
    <div style="${EMAIL_STYLES.footer}">
      <p>© 2025 TIME Trading. All rights reserved.</p>
      <p><a href="https://timebeyondus.com/unsubscribe" style="color: #7c3aed;">Unsubscribe</a></p>
    </div>
  </div>
`;

/**
 * Day 7: Upgrade Benefits
 */
export const getWelcomeDay7Template = (data: TemplateData): string => `
  <div style="${EMAIL_STYLES.container}">
    <div style="${EMAIL_STYLES.header}">
      <h1 style="${EMAIL_STYLES.headerTitle}">Unlock Premium Features</h1>
      <p style="${EMAIL_STYLES.headerSubtitle}">154+ AI Bots | Advanced Analytics | Priority Support</p>
    </div>
    <div style="${EMAIL_STYLES.body}">
      <h2 style="${EMAIL_STYLES.bodyTitle}">Ready to Level Up, ${data.userName}?</h2>
      <p style="${EMAIL_STYLES.text}">
        You've been using TIME for a week - impressive! Now it's time to unlock the full power
        of our platform with a paid plan.
      </p>
      <p style="${EMAIL_STYLES.text}"><strong>Choose the plan that fits your trading style:</strong></p>
      <div style="background: #0f172a; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <table style="width: 100%; color: #e2e8f0; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #334155;">
            <td style="padding: 10px 0;"><strong>FREE</strong></td>
            <td style="padding: 10px 0; text-align: right;">$0/mo - 1 bot</td>
          </tr>
          <tr style="border-bottom: 1px solid #334155;">
            <td style="padding: 10px 0;"><strong>BASIC</strong></td>
            <td style="padding: 10px 0; text-align: right;">$19/mo - 3 bots</td>
          </tr>
          <tr style="border-bottom: 1px solid #334155;">
            <td style="padding: 10px 0;"><strong>PRO</strong></td>
            <td style="padding: 10px 0; text-align: right;">$49/mo - 7 bots</td>
          </tr>
          <tr style="border-bottom: 1px solid #334155; background: linear-gradient(90deg, rgba(124,58,237,0.2) 0%, rgba(6,182,212,0.2) 100%);">
            <td style="padding: 10px 0;"><strong style="color: #7c3aed;">PREMIUM</strong> (Most Popular)</td>
            <td style="padding: 10px 0; text-align: right;"><strong>$109/mo - 11 Super Bots</strong></td>
          </tr>
          <tr>
            <td style="padding: 10px 0;"><strong>ENTERPRISE</strong></td>
            <td style="padding: 10px 0; text-align: right;">$450/mo - Unlimited</td>
          </tr>
        </table>
        <p style="color: #64748b; font-size: 12px; margin-top: 15px;">
          Add-ons: DropBot (+$39/mo) | Universal Market Maker (+$59/mo)
        </p>
      </div>
      <p style="${EMAIL_STYLES.text}"><strong>What you'll unlock:</strong></p>
      <ul style="${EMAIL_STYLES.list}">
        <li>More AI Bots - Access 154+ trading strategies</li>
        <li>Advanced Analytics - Institutional-grade tools</li>
        <li>Real-Time Execution - Lightning-fast trades</li>
        <li>Custom Strategies - Build your own bots</li>
        <li>Priority Support - Dedicated account manager</li>
      </ul>
      <div style="text-align: center;">
        <a href="https://timebeyondus.com/upgrade" style="${EMAIL_STYLES.button}">View All Plans</a>
      </div>
    </div>
    <div style="${EMAIL_STYLES.footer}">
      <p>© 2025 TIME Trading. All rights reserved.</p>
      <p><a href="https://timebeyondus.com/unsubscribe" style="color: #7c3aed;">Unsubscribe</a></p>
    </div>
  </div>
`;

/**
 * Day 14: Special Offer
 */
export const getWelcomeDay14Template = (data: TemplateData): string => `
  <div style="${EMAIL_STYLES.container}">
    <div style="${EMAIL_STYLES.header}">
      <h1 style="${EMAIL_STYLES.headerTitle}">Special Offer Inside</h1>
      <p style="${EMAIL_STYLES.headerSubtitle}">50% Off Your First Month - Expires in 48 Hours</p>
    </div>
    <div style="${EMAIL_STYLES.body}">
      <h2 style="${EMAIL_STYLES.bodyTitle}">Limited Time: 50% Off Your First Month!</h2>
      <p style="${EMAIL_STYLES.text}">
        ${data.userName}, you've been with TIME for 2 weeks now, and we want to reward you
        with an exclusive offer.
      </p>
      <div style="background: linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%); padding: 30px; border-radius: 12px; text-align: center; margin: 30px 0;">
        <p style="color: white; font-size: 36px; margin: 0; font-weight: bold;">50% OFF</p>
        <p style="color: rgba(255,255,255,0.9); font-size: 20px; margin: 10px 0;">Your First Month</p>
        <p style="color: rgba(255,255,255,0.8); font-size: 16px; margin: 0;">PREMIUM just $54.50/month (normally $109)</p>
      </div>
      <div style="background: #0f172a; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="color: #10b981; margin: 0 0 10px 0;"><strong>All plans 50% off first month:</strong></p>
        <ul style="${EMAIL_STYLES.list}">
          <li>BASIC: $9.50/mo (then $19/mo) - 3 bots</li>
          <li>PRO: $24.50/mo (then $49/mo) - 7 bots</li>
          <li>PREMIUM: $54.50/mo (then $109/mo) - 11 Super Bots</li>
          <li>ENTERPRISE: $225/mo (then $450/mo) - Unlimited</li>
        </ul>
      </div>
      <p style="${EMAIL_STYLES.text}"><strong>What you'll get:</strong></p>
      <ul style="${EMAIL_STYLES.list}">
        <li>Full access to 154+ AI trading bots</li>
        <li>Advanced analytics & backtesting tools</li>
        <li>Priority support with dedicated account manager</li>
        <li>Exclusive trading academy courses</li>
        <li>Early access to new features</li>
      </ul>
      <p style="${EMAIL_STYLES.text}">
        <strong style="color: #ef4444;">Offer expires in 48 hours!</strong>
      </p>
      <div style="text-align: center;">
        <a href="https://timebeyondus.com/upgrade?promo=WELCOME50" style="${EMAIL_STYLES.button}">Claim 50% Off Now</a>
      </div>
      <p style="text-align: center; color: #64748b; font-size: 12px; margin-top: 10px;">
        Use code: WELCOME50 at checkout
      </p>
    </div>
    <div style="${EMAIL_STYLES.footer}">
      <p>© 2025 TIME Trading. All rights reserved.</p>
      <p><a href="https://timebeyondus.com/unsubscribe" style="color: #7c3aed;">Unsubscribe</a></p>
    </div>
  </div>
`;

/**
 * UPGRADE NUDGE CAMPAIGN
 * 3 emails to encourage free users to upgrade
 */
export const UPGRADE_NUDGE: Campaign = {
  id: 'upgrade_nudge_v1',
  name: 'Upgrade Nudge - Free to Premium',
  type: CampaignType.UPGRADE_NUDGE,
  status: CampaignStatus.ACTIVE,
  description: 'Encourage free users to upgrade to premium membership',
  trigger: {
    event: 'manual',
    delayMinutes: 0
  },
  emails: [
    {
      id: 'upgrade_1',
      campaignId: 'upgrade_nudge_v1',
      sequenceNumber: 1,
      delayDays: 0,
      subject: 'You\'re Missing Out on 150+ Premium Bots',
      templateId: 'upgrade_limitations',
      status: CampaignStatus.ACTIVE
    },
    {
      id: 'upgrade_2',
      campaignId: 'upgrade_nudge_v1',
      sequenceNumber: 2,
      delayDays: 3,
      subject: 'How Sarah Turned $10k into $87k with Premium',
      templateId: 'upgrade_success',
      status: CampaignStatus.ACTIVE
    },
    {
      id: 'upgrade_3',
      campaignId: 'upgrade_nudge_v1',
      sequenceNumber: 3,
      delayDays: 7,
      subject: '⏰ Last Chance: 40% Off Premium (Expires Tonight)',
      templateId: 'upgrade_offer',
      status: CampaignStatus.ACTIVE
    }
  ],
  createdAt: new Date(),
  updatedAt: new Date()
};

/**
 * INACTIVE USER CAMPAIGN
 * Re-engage users who haven't logged in for 30 days
 */
export const INACTIVE_USER: Campaign = {
  id: 'inactive_user_v1',
  name: 'Inactive User Re-engagement',
  type: CampaignType.INACTIVE_USER,
  status: CampaignStatus.ACTIVE,
  description: 'Re-engage users who have been inactive for 30+ days',
  trigger: {
    event: 'inactivity',
    conditions: { days: 30 }
  },
  emails: [
    {
      id: 'inactive_1',
      campaignId: 'inactive_user_v1',
      sequenceNumber: 1,
      delayDays: 0,
      subject: 'We Miss You! Here\'s What You\'ve Missed',
      templateId: 'inactive_miss_you',
      status: CampaignStatus.ACTIVE
    },
    {
      id: 'inactive_2',
      campaignId: 'inactive_user_v1',
      sequenceNumber: 2,
      delayDays: 7,
      subject: '🚀 New Features: AutoPilot, Live Trading & More',
      templateId: 'inactive_new_features',
      status: CampaignStatus.ACTIVE
    },
    {
      id: 'inactive_3',
      campaignId: 'inactive_user_v1',
      sequenceNumber: 3,
      delayDays: 14,
      subject: '⚠️ Your Account Will Be Archived in 7 Days',
      templateId: 'inactive_warning',
      status: CampaignStatus.ACTIVE
    }
  ],
  createdAt: new Date(),
  updatedAt: new Date()
};

/**
 * FEATURE EDUCATION CAMPAIGN
 * Weekly educational emails about platform features
 */
export const FEATURE_EDUCATION: Campaign = {
  id: 'feature_education_v1',
  name: 'Weekly Feature Education',
  type: CampaignType.FEATURE_EDUCATION,
  status: CampaignStatus.ACTIVE,
  description: 'Weekly emails teaching users about platform features and trading strategies',
  trigger: {
    event: 'manual'
  },
  emails: [
    {
      id: 'education_1',
      campaignId: 'feature_education_v1',
      sequenceNumber: 1,
      delayDays: 0,
      subject: '📚 Trading Tip: How to Use Stop-Loss Orders',
      templateId: 'education_stoploss',
      status: CampaignStatus.ACTIVE
    },
    {
      id: 'education_2',
      campaignId: 'feature_education_v1',
      sequenceNumber: 2,
      delayDays: 7,
      subject: '🤖 Bot Strategy Breakdown: Momentum Trading',
      templateId: 'education_momentum',
      status: CampaignStatus.ACTIVE
    },
    {
      id: 'education_3',
      campaignId: 'feature_education_v1',
      sequenceNumber: 3,
      delayDays: 14,
      subject: '📊 Market Insights: Earnings Season Trading',
      templateId: 'education_earnings',
      status: CampaignStatus.ACTIVE
    }
  ],
  createdAt: new Date(),
  updatedAt: new Date()
};

/**
 * Template registry for easy lookup
 */
export const TEMPLATE_REGISTRY: Record<string, (data: TemplateData) => string> = {
  // Welcome series
  welcome_day_0: getWelcomeDay0Template,
  welcome_day_1: getWelcomeDay1Template,
  welcome_day_3: getWelcomeDay3Template,
  welcome_day_7: getWelcomeDay7Template,
  welcome_day_14: getWelcomeDay14Template
};

/**
 * Get all campaign templates
 */
export const getAllCampaignTemplates = (): Campaign[] => {
  return [
    WELCOME_SERIES,
    UPGRADE_NUDGE,
    INACTIVE_USER,
    FEATURE_EDUCATION
  ];
};

/**
 * Get template by ID
 */
export const getTemplateById = (templateId: string): ((data: TemplateData) => string) | null => {
  return TEMPLATE_REGISTRY[templateId] || null;
};
