/**
 * Marketing Email Templates for TIME
 *
 * Production-ready marketing emails:
 * - Newsletter templates
 * - Feature announcements
 * - Special promotions
 * - Abandoned cart recovery
 * - Re-engagement campaigns
 *
 * PRICING (correct as of 2025):
 * - FREE: $0/mo - 1 bot
 * - BASIC: $19/mo - 3 bots
 * - PRO: $49/mo - 7 bots
 * - PREMIUM: $109/mo - 11 Super Bots
 * - ENTERPRISE: $450/mo - Unlimited
 * - DROPBOT: +$39/mo add-on
 * - UMM: +$59/mo add-on
 */

import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('MarketingTemplates');

// Base email styling (matching other templates)
const EMAIL_STYLES = {
  container: 'font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;',
  header: 'background: linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%); padding: 40px; text-align: center;',
  headerTitle: 'color: white; margin: 0; font-size: 28px;',
  headerSubtitle: 'color: rgba(255,255,255,0.9); margin-top: 10px; font-size: 16px;',
  body: 'padding: 40px; background: #1e293b; color: #e2e8f0;',
  bodyTitle: 'color: white; font-size: 24px; margin-bottom: 20px;',
  text: 'color: #e2e8f0; line-height: 1.6; margin-bottom: 20px;',
  button: 'display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0;',
  buttonSecondary: 'display: inline-block; background: transparent; color: #7c3aed; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; border: 2px solid #7c3aed;',
  footer: 'padding: 20px; background: #0f172a; text-align: center; color: #64748b; font-size: 12px;',
  list: 'color: #e2e8f0; line-height: 2;',
  card: 'background: #0f172a; padding: 20px; border-radius: 12px; margin: 15px 0;',
  highlight: 'background: linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%); padding: 25px; border-radius: 12px; text-align: center; margin: 20px 0;',
  divider: 'border: 0; border-top: 1px solid #334155; margin: 30px 0;'
};

export interface MarketingEmailData {
  userName?: string;
  email?: string;
  [key: string]: any;
}

/**
 * ===========================================
 * NEWSLETTER TEMPLATE
 * ===========================================
 */

export const getNewsletterTemplate = (data: MarketingEmailData): string => `
  <div style="${EMAIL_STYLES.container}">
    <div style="${EMAIL_STYLES.header}">
      <h1 style="${EMAIL_STYLES.headerTitle}">TIME Weekly Digest</h1>
      <p style="${EMAIL_STYLES.headerSubtitle}">${data.issueDate || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
    </div>
    <div style="${EMAIL_STYLES.body}">
      <h2 style="${EMAIL_STYLES.bodyTitle}">Hi ${data.userName || 'Trader'},</h2>
      <p style="${EMAIL_STYLES.text}">
        Here's your weekly roundup of market insights, platform updates, and trading opportunities.
      </p>

      <!-- Market Summary -->
      <div style="${EMAIL_STYLES.card}">
        <h3 style="color: #7c3aed; margin: 0 0 15px 0;">This Week in Markets</h3>
        <p style="${EMAIL_STYLES.text}; margin-bottom: 10px;">
          ${data.marketSummary || 'Markets showed mixed signals this week with volatility increasing across major indices.'}
        </p>
        ${data.marketStats ? `
        <table style="width: 100%; color: #e2e8f0; font-size: 14px;">
          <tr>
            <td style="padding: 5px 0;">S&P 500</td>
            <td style="text-align: right; color: ${data.marketStats.sp500 >= 0 ? '#10b981' : '#ef4444'};">
              ${data.marketStats.sp500 >= 0 ? '+' : ''}${data.marketStats.sp500}%
            </td>
          </tr>
          <tr>
            <td style="padding: 5px 0;">BTC/USD</td>
            <td style="text-align: right; color: ${data.marketStats.btc >= 0 ? '#10b981' : '#ef4444'};">
              ${data.marketStats.btc >= 0 ? '+' : ''}${data.marketStats.btc}%
            </td>
          </tr>
          <tr>
            <td style="padding: 5px 0;">ETH/USD</td>
            <td style="text-align: right; color: ${data.marketStats.eth >= 0 ? '#10b981' : '#ef4444'};">
              ${data.marketStats.eth >= 0 ? '+' : ''}${data.marketStats.eth}%
            </td>
          </tr>
        </table>
        ` : ''}
      </div>

      <hr style="${EMAIL_STYLES.divider}">

      <!-- Top Performing Bots -->
      <h3 style="color: white; margin-bottom: 15px;">Top Performing Bots This Week</h3>
      ${data.topBots?.map((bot: any, index: number) => `
        <div style="${EMAIL_STYLES.card}; display: flex; align-items: center;">
          <div style="flex: 1;">
            <p style="margin: 0; color: white; font-weight: bold;">${index + 1}. ${bot.name}</p>
            <p style="margin: 5px 0 0 0; color: #94a3b8; font-size: 12px;">${bot.strategy}</p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 0; color: #10b981; font-weight: bold; font-size: 18px;">+${bot.returns}%</p>
            <p style="margin: 5px 0 0 0; color: #94a3b8; font-size: 12px;">Win rate: ${bot.winRate}%</p>
          </div>
        </div>
      `).join('') || `
        <div style="${EMAIL_STYLES.card}">
          <p style="margin: 0; color: white;">1. Momentum Alpha - +15.3%</p>
          <p style="margin: 10px 0; color: white;">2. Mean Reversion Pro - +12.8%</p>
          <p style="margin: 0; color: white;">3. Trend Follower X - +11.2%</p>
        </div>
      `}

      <hr style="${EMAIL_STYLES.divider}">

      <!-- Featured Article -->
      <h3 style="color: white; margin-bottom: 15px;">Featured: Trading Tip of the Week</h3>
      <div style="${EMAIL_STYLES.card}">
        <h4 style="color: #7c3aed; margin: 0 0 10px 0;">${data.articleTitle || 'Mastering Risk Management'}</h4>
        <p style="${EMAIL_STYLES.text}; margin-bottom: 15px;">
          ${data.articleExcerpt || 'Learn how successful traders manage risk to protect their capital while maximizing returns...'}
        </p>
        <a href="${data.articleLink || 'https://timebeyondus.com/learn'}" style="color: #7c3aed; text-decoration: none; font-weight: bold;">
          Read more ->
        </a>
      </div>

      <hr style="${EMAIL_STYLES.divider}">

      <!-- CTA -->
      <div style="${EMAIL_STYLES.highlight}">
        <p style="color: white; font-size: 18px; margin: 0 0 10px 0; font-weight: bold;">
          Ready to upgrade your trading?
        </p>
        <p style="color: rgba(255,255,255,0.8); margin: 0 0 15px 0;">
          Get access to all 154+ AI bots starting at $19/mo
        </p>
        <a href="https://timebeyondus.com/upgrade" style="${EMAIL_STYLES.button}; margin: 0;">
          View Plans
        </a>
      </div>
    </div>
    <div style="${EMAIL_STYLES.footer}">
      <p>You're receiving this because you subscribed to TIME Weekly Digest.</p>
      <p>© 2025 TIME Trading. All rights reserved.</p>
      <p>
        <a href="https://timebeyondus.com/preferences" style="color: #7c3aed;">Preferences</a> |
        <a href="https://timebeyondus.com/unsubscribe" style="color: #7c3aed;">Unsubscribe</a>
      </p>
    </div>
  </div>
`;

/**
 * ===========================================
 * FEATURE ANNOUNCEMENT
 * ===========================================
 */

export const getFeatureAnnouncementTemplate = (data: MarketingEmailData): string => `
  <div style="${EMAIL_STYLES.container}">
    <div style="${EMAIL_STYLES.header}">
      <h1 style="${EMAIL_STYLES.headerTitle}">NEW Feature!</h1>
      <p style="${EMAIL_STYLES.headerSubtitle}">${data.featureName || 'Something Amazing'}</p>
    </div>
    <div style="${EMAIL_STYLES.body}">
      <h2 style="${EMAIL_STYLES.bodyTitle}">Hi ${data.userName || 'Trader'},</h2>
      <p style="${EMAIL_STYLES.text}">
        We're excited to announce a powerful new feature that will transform your trading experience.
      </p>

      <!-- Feature Hero -->
      <div style="${EMAIL_STYLES.highlight}">
        <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 1px;">
          Introducing
        </p>
        <h2 style="color: white; font-size: 32px; margin: 0;">${data.featureName || 'AutoPilot Mode'}</h2>
      </div>

      <p style="${EMAIL_STYLES.text}">
        ${data.featureDescription || 'Set your trading goals and let our AI handle the rest. AutoPilot automatically manages your portfolio, adjusts strategies based on market conditions, and optimizes for your risk tolerance.'}
      </p>

      <!-- Benefits -->
      <h3 style="color: white; margin: 25px 0 15px 0;">What You Can Do Now:</h3>
      <ul style="${EMAIL_STYLES.list}">
        ${data.benefits?.map((benefit: string) => `<li>${benefit}</li>`).join('') || `
          <li>Set it and forget it trading</li>
          <li>AI-optimized portfolio management</li>
          <li>Real-time risk adjustment</li>
          <li>Automatic rebalancing</li>
        `}
      </ul>

      <!-- How It Works -->
      <div style="${EMAIL_STYLES.card}">
        <h3 style="color: #7c3aed; margin: 0 0 15px 0;">How It Works</h3>
        <ol style="color: #e2e8f0; line-height: 2; padding-left: 20px; margin: 0;">
          ${data.steps?.map((step: string) => `<li>${step}</li>`).join('') || `
            <li>Set your risk tolerance and profit targets</li>
            <li>Choose your preferred markets and strategies</li>
            <li>Enable AutoPilot and watch your portfolio grow</li>
          `}
        </ol>
      </div>

      <!-- Availability -->
      <p style="${EMAIL_STYLES.text}">
        <strong>Availability:</strong> ${data.availability || 'Available now for all PRO, PREMIUM, and ENTERPRISE users.'}
      </p>

      <div style="text-align: center;">
        <a href="${data.ctaLink || 'https://timebeyondus.com/features'}" style="${EMAIL_STYLES.button}">
          ${data.ctaText || 'Try It Now'}
        </a>
      </div>

      ${data.upgradePrompt ? `
      <div style="${EMAIL_STYLES.card}; margin-top: 30px;">
        <p style="color: #f59e0b; margin: 0 0 10px 0; font-weight: bold;">Upgrade to Access</p>
        <p style="color: #e2e8f0; margin: 0 0 15px 0;">
          This feature is available on PRO ($49/mo) and above.
        </p>
        <a href="https://timebeyondus.com/upgrade" style="color: #7c3aed; text-decoration: none; font-weight: bold;">
          Upgrade Now ->
        </a>
      </div>
      ` : ''}
    </div>
    <div style="${EMAIL_STYLES.footer}">
      <p>© 2025 TIME Trading. All rights reserved.</p>
      <p><a href="https://timebeyondus.com/unsubscribe" style="color: #7c3aed;">Unsubscribe</a></p>
    </div>
  </div>
`;

/**
 * ===========================================
 * SPECIAL PROMOTION
 * ===========================================
 */

export const getSpecialPromotionTemplate = (data: MarketingEmailData): string => `
  <div style="${EMAIL_STYLES.container}">
    <div style="background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); padding: 40px; text-align: center;">
      <h1 style="${EMAIL_STYLES.headerTitle}">${data.promoTitle || 'Limited Time Offer!'}</h1>
      <p style="${EMAIL_STYLES.headerSubtitle}">${data.promoSubtitle || 'Ends Soon'}</p>
    </div>
    <div style="${EMAIL_STYLES.body}">
      <h2 style="${EMAIL_STYLES.bodyTitle}">${data.userName || 'Trader'}, This Is Big!</h2>
      <p style="${EMAIL_STYLES.text}">
        ${data.promoDescription || 'We\'re offering an exclusive discount to help you supercharge your trading.'}
      </p>

      <!-- Offer Box -->
      <div style="background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); padding: 30px; border-radius: 12px; text-align: center; margin: 30px 0;">
        <p style="color: white; font-size: 48px; margin: 0; font-weight: bold;">${data.discountAmount || '50% OFF'}</p>
        <p style="color: rgba(255,255,255,0.9); font-size: 20px; margin: 10px 0;">${data.discountTarget || 'Your First Month'}</p>
        ${data.promoCode ? `
        <div style="background: rgba(0,0,0,0.2); padding: 10px 20px; border-radius: 8px; display: inline-block; margin-top: 10px;">
          <p style="color: white; margin: 0; font-family: monospace; font-size: 18px;">CODE: ${data.promoCode}</p>
        </div>
        ` : ''}
      </div>

      <!-- What You Get -->
      <h3 style="color: white; margin-bottom: 15px;">What You Get:</h3>
      <div style="${EMAIL_STYLES.card}">
        <table style="width: 100%; color: #e2e8f0; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #334155;">
            <td style="padding: 12px 0;"><strong>BASIC</strong> - 3 bots</td>
            <td style="padding: 12px 0; text-align: right;">
              <span style="text-decoration: line-through; color: #64748b;">$19</span>
              <span style="color: #10b981; font-weight: bold; margin-left: 10px;">$${data.basicPrice || '9.50'}</span>
            </td>
          </tr>
          <tr style="border-bottom: 1px solid #334155;">
            <td style="padding: 12px 0;"><strong>PRO</strong> - 7 bots</td>
            <td style="padding: 12px 0; text-align: right;">
              <span style="text-decoration: line-through; color: #64748b;">$49</span>
              <span style="color: #10b981; font-weight: bold; margin-left: 10px;">$${data.proPrice || '24.50'}</span>
            </td>
          </tr>
          <tr style="border-bottom: 1px solid #334155; background: linear-gradient(90deg, rgba(124,58,237,0.1) 0%, rgba(6,182,212,0.1) 100%);">
            <td style="padding: 12px 0;"><strong style="color: #7c3aed;">PREMIUM</strong> - 11 Super Bots</td>
            <td style="padding: 12px 0; text-align: right;">
              <span style="text-decoration: line-through; color: #64748b;">$109</span>
              <span style="color: #10b981; font-weight: bold; margin-left: 10px;">$${data.premiumPrice || '54.50'}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 0;"><strong>ENTERPRISE</strong> - Unlimited</td>
            <td style="padding: 12px 0; text-align: right;">
              <span style="text-decoration: line-through; color: #64748b;">$450</span>
              <span style="color: #10b981; font-weight: bold; margin-left: 10px;">$${data.enterprisePrice || '225'}</span>
            </td>
          </tr>
        </table>
        <p style="color: #64748b; font-size: 11px; margin: 15px 0 0 0;">
          Add-ons also discounted: DropBot (+$19.50/mo) | UMM (+$29.50/mo)
        </p>
      </div>

      <!-- Urgency -->
      <div style="background: #fee2e2; color: #991b1b; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
        <p style="margin: 0; font-weight: bold;">
          Offer expires: ${data.expiresAt || 'Midnight Tonight!'}
        </p>
      </div>

      <div style="text-align: center;">
        <a href="${data.ctaLink || 'https://timebeyondus.com/upgrade'}" style="${EMAIL_STYLES.button}">
          ${data.ctaText || 'Claim Your Discount'}
        </a>
      </div>
    </div>
    <div style="${EMAIL_STYLES.footer}">
      <p>This offer cannot be combined with other promotions.</p>
      <p>© 2025 TIME Trading. All rights reserved.</p>
      <p><a href="https://timebeyondus.com/unsubscribe" style="color: #7c3aed;">Unsubscribe</a></p>
    </div>
  </div>
`;

/**
 * ===========================================
 * ABANDONED CART - EMAIL 1 (1 hour after)
 * ===========================================
 */

export const getAbandonedCart1Template = (data: MarketingEmailData): string => `
  <div style="${EMAIL_STYLES.container}">
    <div style="${EMAIL_STYLES.header}">
      <h1 style="${EMAIL_STYLES.headerTitle}">You Left Something Behind</h1>
      <p style="${EMAIL_STYLES.headerSubtitle}">Complete Your Upgrade</p>
    </div>
    <div style="${EMAIL_STYLES.body}">
      <h2 style="${EMAIL_STYLES.bodyTitle}">Hey ${data.userName || 'there'}!</h2>
      <p style="${EMAIL_STYLES.text}">
        We noticed you were checking out the <strong>${data.planName || 'PREMIUM'}</strong> plan
        but didn't complete your upgrade. No worries - your cart is still waiting for you!
      </p>

      <!-- Cart Summary -->
      <div style="${EMAIL_STYLES.card}">
        <h3 style="color: #7c3aed; margin: 0 0 15px 0;">Your Selection:</h3>
        <table style="width: 100%; color: #e2e8f0;">
          <tr>
            <td style="padding: 10px 0;">
              <strong>${data.planName || 'PREMIUM'} Plan</strong>
              <p style="margin: 5px 0 0 0; color: #94a3b8; font-size: 12px;">
                ${data.planDescription || '11 Super Bots, Advanced Analytics, Priority Support'}
              </p>
            </td>
            <td style="padding: 10px 0; text-align: right; vertical-align: top;">
              <strong>$${data.planPrice || '109'}/mo</strong>
            </td>
          </tr>
          ${data.addons?.map((addon: any) => `
          <tr>
            <td style="padding: 10px 0; border-top: 1px solid #334155;">
              ${addon.name}
            </td>
            <td style="padding: 10px 0; text-align: right; border-top: 1px solid #334155;">
              +$${addon.price}/mo
            </td>
          </tr>
          `).join('') || ''}
        </table>
      </div>

      <p style="${EMAIL_STYLES.text}">
        <strong>Why TIME?</strong>
      </p>
      <ul style="${EMAIL_STYLES.list}">
        <li>154+ AI trading bots ready to execute</li>
        <li>Real-time market data and analytics</li>
        <li>24/7 automated trading</li>
        <li>30-day money-back guarantee</li>
      </ul>

      <div style="text-align: center;">
        <a href="${data.checkoutLink || 'https://timebeyondus.com/checkout'}" style="${EMAIL_STYLES.button}">
          Complete Your Upgrade
        </a>
      </div>

      <p style="${EMAIL_STYLES.text}; text-align: center; color: #64748b; font-size: 12px;">
        Having trouble? Reply to this email and we'll help!
      </p>
    </div>
    <div style="${EMAIL_STYLES.footer}">
      <p>© 2025 TIME Trading. All rights reserved.</p>
      <p><a href="https://timebeyondus.com/unsubscribe" style="color: #7c3aed;">Unsubscribe</a></p>
    </div>
  </div>
`;

/**
 * ===========================================
 * ABANDONED CART - EMAIL 2 (24 hours after)
 * ===========================================
 */

export const getAbandonedCart2Template = (data: MarketingEmailData): string => `
  <div style="${EMAIL_STYLES.container}">
    <div style="${EMAIL_STYLES.header}">
      <h1 style="${EMAIL_STYLES.headerTitle}">Still Thinking About It?</h1>
      <p style="${EMAIL_STYLES.headerSubtitle}">Here's What You're Missing</p>
    </div>
    <div style="${EMAIL_STYLES.body}">
      <h2 style="${EMAIL_STYLES.bodyTitle}">Hi ${data.userName || 'there'},</h2>
      <p style="${EMAIL_STYLES.text}">
        Yesterday you were one click away from unlocking ${data.planName || 'PREMIUM'}. Let us show you what other traders
        are achieving with TIME:
      </p>

      <!-- Success Stories -->
      <div style="${EMAIL_STYLES.card}">
        <div style="text-align: center; margin-bottom: 20px;">
          <p style="color: #10b981; font-size: 36px; margin: 0; font-weight: bold;">$847,000+</p>
          <p style="color: #94a3b8; margin: 5px 0 0 0;">Combined profits from our top 100 traders this month</p>
        </div>
      </div>

      <div style="display: flex; gap: 15px; margin: 20px 0;">
        <div style="${EMAIL_STYLES.card}; flex: 1; text-align: center;">
          <p style="color: #7c3aed; font-size: 24px; margin: 0; font-weight: bold;">68%</p>
          <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 12px;">Avg Win Rate</p>
        </div>
        <div style="${EMAIL_STYLES.card}; flex: 1; text-align: center;">
          <p style="color: #7c3aed; font-size: 24px; margin: 0; font-weight: bold;">24/7</p>
          <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 12px;">Automated Trading</p>
        </div>
        <div style="${EMAIL_STYLES.card}; flex: 1; text-align: center;">
          <p style="color: #7c3aed; font-size: 24px; margin: 0; font-weight: bold;">154+</p>
          <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 12px;">AI Bots</p>
        </div>
      </div>

      <!-- Testimonial -->
      <div style="background: #0f172a; padding: 20px; border-radius: 12px; border-left: 4px solid #7c3aed; margin: 20px 0;">
        <p style="color: #e2e8f0; font-style: italic; margin: 0 0 10px 0;">
          "I was skeptical at first, but TIME's bots have consistently outperformed my manual trading.
          The PREMIUM plan paid for itself in the first week."
        </p>
        <p style="color: #7c3aed; margin: 0; font-weight: bold;">- Michael R., PREMIUM member since 2024</p>
      </div>

      <p style="${EMAIL_STYLES.text}">
        Your ${data.planName || 'PREMIUM'} upgrade is still waiting at <strong>$${data.planPrice || '109'}/mo</strong>.
      </p>

      <div style="text-align: center;">
        <a href="${data.checkoutLink || 'https://timebeyondus.com/checkout'}" style="${EMAIL_STYLES.button}">
          Complete Your Upgrade
        </a>
      </div>
    </div>
    <div style="${EMAIL_STYLES.footer}">
      <p>© 2025 TIME Trading. All rights reserved.</p>
      <p><a href="https://timebeyondus.com/unsubscribe" style="color: #7c3aed;">Unsubscribe</a></p>
    </div>
  </div>
`;

/**
 * ===========================================
 * ABANDONED CART - EMAIL 3 (72 hours - with discount)
 * ===========================================
 */

export const getAbandonedCart3Template = (data: MarketingEmailData): string => `
  <div style="${EMAIL_STYLES.container}">
    <div style="background: linear-gradient(135deg, #ef4444 0%, #f97316 100%); padding: 40px; text-align: center;">
      <h1 style="${EMAIL_STYLES.headerTitle}">Final Chance: 20% OFF</h1>
      <p style="${EMAIL_STYLES.headerSubtitle}">Expires in 24 Hours</p>
    </div>
    <div style="${EMAIL_STYLES.body}">
      <h2 style="${EMAIL_STYLES.bodyTitle}">${data.userName || 'Hey'}, We Want You Back!</h2>
      <p style="${EMAIL_STYLES.text}">
        You've been thinking about upgrading for a few days now. To help you decide,
        we're offering you an <strong>exclusive 20% discount</strong> on your first month.
      </p>

      <!-- Discount Offer -->
      <div style="background: linear-gradient(135deg, #ef4444 0%, #f97316 100%); padding: 25px; border-radius: 12px; text-align: center; margin: 30px 0;">
        <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 0;">Your Exclusive Discount</p>
        <p style="color: white; font-size: 42px; margin: 10px 0; font-weight: bold;">20% OFF</p>
        <div style="background: rgba(0,0,0,0.2); padding: 10px 20px; border-radius: 8px; display: inline-block;">
          <p style="color: white; margin: 0; font-family: monospace; font-size: 18px;">CODE: COMEBACK20</p>
        </div>
      </div>

      <!-- Updated Prices -->
      <div style="${EMAIL_STYLES.card}">
        <table style="width: 100%; color: #e2e8f0; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #334155;">
            <td style="padding: 12px 0;"><strong>BASIC</strong> - 3 bots</td>
            <td style="padding: 12px 0; text-align: right;">
              <span style="text-decoration: line-through; color: #64748b;">$19</span>
              <span style="color: #10b981; font-weight: bold; margin-left: 10px;">$15.20</span>
            </td>
          </tr>
          <tr style="border-bottom: 1px solid #334155;">
            <td style="padding: 12px 0;"><strong>PRO</strong> - 7 bots</td>
            <td style="padding: 12px 0; text-align: right;">
              <span style="text-decoration: line-through; color: #64748b;">$49</span>
              <span style="color: #10b981; font-weight: bold; margin-left: 10px;">$39.20</span>
            </td>
          </tr>
          <tr style="border-bottom: 1px solid #334155; background: linear-gradient(90deg, rgba(124,58,237,0.1) 0%, rgba(6,182,212,0.1) 100%);">
            <td style="padding: 12px 0;"><strong style="color: #7c3aed;">PREMIUM</strong> - 11 Super Bots</td>
            <td style="padding: 12px 0; text-align: right;">
              <span style="text-decoration: line-through; color: #64748b;">$109</span>
              <span style="color: #10b981; font-weight: bold; margin-left: 10px;">$87.20</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 0;"><strong>ENTERPRISE</strong> - Unlimited</td>
            <td style="padding: 12px 0; text-align: right;">
              <span style="text-decoration: line-through; color: #64748b;">$450</span>
              <span style="color: #10b981; font-weight: bold; margin-left: 10px;">$360</span>
            </td>
          </tr>
        </table>
      </div>

      <!-- Urgency -->
      <div style="background: #fee2e2; color: #991b1b; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
        <p style="margin: 0; font-weight: bold;">
          This offer expires in 24 hours and won't be available again.
        </p>
      </div>

      <div style="text-align: center;">
        <a href="${data.checkoutLink || 'https://timebeyondus.com/checkout'}?promo=COMEBACK20" style="${EMAIL_STYLES.button}">
          Claim 20% Off Now
        </a>
      </div>

      <p style="${EMAIL_STYLES.text}; text-align: center; color: #64748b; font-size: 12px; margin-top: 20px;">
        Risk-free: 30-day money-back guarantee on all plans
      </p>
    </div>
    <div style="${EMAIL_STYLES.footer}">
      <p>This exclusive offer is just for you and expires in 24 hours.</p>
      <p>© 2025 TIME Trading. All rights reserved.</p>
      <p><a href="https://timebeyondus.com/unsubscribe" style="color: #7c3aed;">Unsubscribe</a></p>
    </div>
  </div>
`;

/**
 * ===========================================
 * SEASONAL PROMOTION
 * ===========================================
 */

export const getSeasonalPromotionTemplate = (data: MarketingEmailData): string => `
  <div style="${EMAIL_STYLES.container}">
    <div style="background: ${data.seasonalGradient || 'linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)'}; padding: 40px; text-align: center;">
      <h1 style="${EMAIL_STYLES.headerTitle}">${data.seasonalTitle || 'Holiday Special!'}</h1>
      <p style="${EMAIL_STYLES.headerSubtitle}">${data.seasonalSubtitle || 'Limited Time Offer'}</p>
    </div>
    <div style="${EMAIL_STYLES.body}">
      <h2 style="${EMAIL_STYLES.bodyTitle}">Happy ${data.holiday || 'Holidays'}, ${data.userName || 'Trader'}!</h2>
      <p style="${EMAIL_STYLES.text}">
        ${data.seasonalMessage || 'Celebrate with us and save big on your TIME subscription!'}
      </p>

      <!-- Seasonal Offer -->
      <div style="${EMAIL_STYLES.highlight}">
        <p style="color: white; font-size: 36px; margin: 0; font-weight: bold;">
          ${data.discountAmount || 'UP TO 50% OFF'}
        </p>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0;">
          ${data.discountDescription || 'All Annual Plans'}
        </p>
      </div>

      <p style="${EMAIL_STYLES.text}">
        <strong>Why go annual?</strong>
      </p>
      <ul style="${EMAIL_STYLES.list}">
        <li>Save up to 50% compared to monthly</li>
        <li>Lock in today's pricing for 12 months</li>
        <li>Get 2 months FREE with annual billing</li>
        <li>Priority access to new features</li>
      </ul>

      <!-- Pricing Table -->
      <div style="${EMAIL_STYLES.card}">
        <table style="width: 100%; color: #e2e8f0; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #334155;">
            <td style="padding: 12px 0;"><strong>BASIC Annual</strong></td>
            <td style="padding: 12px 0; text-align: right;">
              <span style="text-decoration: line-through; color: #64748b;">$228/yr</span>
              <span style="color: #10b981; font-weight: bold; margin-left: 10px;">$${data.basicAnnual || '114'}/yr</span>
            </td>
          </tr>
          <tr style="border-bottom: 1px solid #334155;">
            <td style="padding: 12px 0;"><strong>PRO Annual</strong></td>
            <td style="padding: 12px 0; text-align: right;">
              <span style="text-decoration: line-through; color: #64748b;">$588/yr</span>
              <span style="color: #10b981; font-weight: bold; margin-left: 10px;">$${data.proAnnual || '294'}/yr</span>
            </td>
          </tr>
          <tr style="border-bottom: 1px solid #334155; background: linear-gradient(90deg, rgba(124,58,237,0.1) 0%, rgba(6,182,212,0.1) 100%);">
            <td style="padding: 12px 0;"><strong style="color: #7c3aed;">PREMIUM Annual</strong></td>
            <td style="padding: 12px 0; text-align: right;">
              <span style="text-decoration: line-through; color: #64748b;">$1,308/yr</span>
              <span style="color: #10b981; font-weight: bold; margin-left: 10px;">$${data.premiumAnnual || '654'}/yr</span>
            </td>
          </tr>
        </table>
      </div>

      <div style="text-align: center;">
        <a href="${data.ctaLink || 'https://timebeyondus.com/upgrade?billing=annual'}" style="${EMAIL_STYLES.button}">
          ${data.ctaText || 'Get Your Holiday Deal'}
        </a>
      </div>

      <p style="${EMAIL_STYLES.text}; text-align: center; color: #64748b; font-size: 12px;">
        Offer valid until ${data.expiresAt || 'January 1st'}
      </p>
    </div>
    <div style="${EMAIL_STYLES.footer}">
      <p>© 2025 TIME Trading. All rights reserved.</p>
      <p><a href="https://timebeyondus.com/unsubscribe" style="color: #7c3aed;">Unsubscribe</a></p>
    </div>
  </div>
`;

/**
 * Template registry for marketing emails
 */
export const MARKETING_TEMPLATES = {
  newsletter: getNewsletterTemplate,
  feature_announcement: getFeatureAnnouncementTemplate,
  special_promotion: getSpecialPromotionTemplate,
  abandoned_cart_1: getAbandonedCart1Template,
  abandoned_cart_2: getAbandonedCart2Template,
  abandoned_cart_3: getAbandonedCart3Template,
  seasonal_promotion: getSeasonalPromotionTemplate,
};

export type MarketingTemplateType = keyof typeof MARKETING_TEMPLATES;

/**
 * Get marketing template by type
 */
export const getMarketingTemplate = (
  templateType: MarketingTemplateType
): ((data: MarketingEmailData) => string) | null => {
  return MARKETING_TEMPLATES[templateType] || null;
};

logger.info('Marketing email templates loaded', {
  templateCount: Object.keys(MARKETING_TEMPLATES).length,
});
