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
 * ===========================================
 * RE-ENGAGEMENT EMAIL (Inactive Users)
 * ===========================================
 */

export const getReengagementTemplate = (data: MarketingEmailData): string => `
  <div style="${EMAIL_STYLES.container}">
    <div style="${EMAIL_STYLES.header}">
      <h1 style="${EMAIL_STYLES.headerTitle}">We Miss You!</h1>
      <p style="${EMAIL_STYLES.headerSubtitle}">Your Trading Bots Are Waiting</p>
    </div>
    <div style="${EMAIL_STYLES.body}">
      <h2 style="${EMAIL_STYLES.bodyTitle}">Hi ${data.userName || 'Trader'},</h2>
      <p style="${EMAIL_STYLES.text}">
        It's been ${data.daysSinceActive || '30+'} days since you last logged in to TIME.
        Your AI trading bots have been patiently waiting for your return!
      </p>

      <!-- What You've Missed -->
      <div style="${EMAIL_STYLES.card}">
        <h3 style="color: #7c3aed; margin: 0 0 15px 0;">What's New Since You've Been Gone:</h3>
        <ul style="${EMAIL_STYLES.list}; padding-left: 20px;">
          ${data.newFeatures?.map((feature: string) => `<li>${feature}</li>`).join('') || `
            <li>15 new AI trading bots added</li>
            <li>Enhanced portfolio analytics</li>
            <li>Improved execution speed by 40%</li>
            <li>New mobile trading features</li>
          `}
        </ul>
      </div>

      <!-- Market Opportunity -->
      <div style="${EMAIL_STYLES.highlight}">
        <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 0 0 5px 0;">Market Opportunity Alert</p>
        <p style="color: white; font-size: 20px; margin: 0;">
          ${data.marketOpportunity || 'Volatility is up 25% - Perfect conditions for AI trading!'}
        </p>
      </div>

      <!-- Account Status -->
      <div style="${EMAIL_STYLES.card}">
        <h3 style="color: white; margin: 0 0 15px 0;">Your Account Status:</h3>
        <table style="width: 100%; color: #e2e8f0;">
          <tr>
            <td style="padding: 8px 0;">Plan:</td>
            <td style="text-align: right; font-weight: bold;">${data.currentPlan || 'FREE'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;">Active Bots:</td>
            <td style="text-align: right; font-weight: bold;">${data.activeBots || '0'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;">Available Strategies:</td>
            <td style="text-align: right; font-weight: bold;">${data.availableStrategies || '154+'}</td>
          </tr>
        </table>
      </div>

      ${data.specialOffer ? `
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0;">
        <p style="color: white; font-size: 18px; margin: 0 0 5px 0; font-weight: bold;">Welcome Back Offer</p>
        <p style="color: rgba(255,255,255,0.9); margin: 0;">${data.specialOffer}</p>
      </div>
      ` : ''}

      <div style="text-align: center;">
        <a href="${data.loginLink || 'https://timebeyondus.com/login'}" style="${EMAIL_STYLES.button}">
          Log Back In
        </a>
      </div>

      <p style="${EMAIL_STYLES.text}; text-align: center; color: #64748b; font-size: 12px; margin-top: 20px;">
        Need help getting started again? Reply to this email!
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
 * CAMPAIGN UPDATE EMAIL
 * ===========================================
 */

export const getCampaignUpdateTemplate = (data: MarketingEmailData): string => `
  <div style="${EMAIL_STYLES.container}">
    <div style="${EMAIL_STYLES.header}">
      <h1 style="${EMAIL_STYLES.headerTitle}">Campaign Update</h1>
      <p style="${EMAIL_STYLES.headerSubtitle}">${data.campaignName || 'Your Campaign'}</p>
    </div>
    <div style="${EMAIL_STYLES.body}">
      <h2 style="${EMAIL_STYLES.bodyTitle}">Hi ${data.userName || 'there'},</h2>
      <p style="${EMAIL_STYLES.text}">
        Here's the latest performance update for your campaign "${data.campaignName || 'Campaign'}".
      </p>

      <!-- Campaign Status -->
      <div style="background: ${data.status === 'active' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #64748b 0%, #475569 100%)'}; padding: 15px 25px; border-radius: 12px; display: inline-block; margin-bottom: 20px;">
        <span style="color: white; font-weight: bold; text-transform: uppercase;">${data.status || 'Active'}</span>
      </div>

      <!-- Key Metrics -->
      <h3 style="color: white; margin: 25px 0 15px 0;">Performance Metrics</h3>
      <div style="display: flex; gap: 15px; margin: 20px 0;">
        <div style="${EMAIL_STYLES.card}; flex: 1; text-align: center;">
          <p style="color: #7c3aed; font-size: 28px; margin: 0; font-weight: bold;">${data.impressions || '0'}</p>
          <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 12px;">Impressions</p>
        </div>
        <div style="${EMAIL_STYLES.card}; flex: 1; text-align: center;">
          <p style="color: #7c3aed; font-size: 28px; margin: 0; font-weight: bold;">${data.clicks || '0'}</p>
          <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 12px;">Clicks</p>
        </div>
        <div style="${EMAIL_STYLES.card}; flex: 1; text-align: center;">
          <p style="color: #10b981; font-size: 28px; margin: 0; font-weight: bold;">${data.conversions || '0'}</p>
          <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 12px;">Conversions</p>
        </div>
      </div>

      <!-- Detailed Stats -->
      <div style="${EMAIL_STYLES.card}">
        <table style="width: 100%; color: #e2e8f0; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #334155;">
            <td style="padding: 12px 0;">Click-Through Rate (CTR)</td>
            <td style="padding: 12px 0; text-align: right; font-weight: bold;">${data.ctr || '0'}%</td>
          </tr>
          <tr style="border-bottom: 1px solid #334155;">
            <td style="padding: 12px 0;">Conversion Rate</td>
            <td style="padding: 12px 0; text-align: right; font-weight: bold; color: #10b981;">${data.conversionRate || '0'}%</td>
          </tr>
          <tr style="border-bottom: 1px solid #334155;">
            <td style="padding: 12px 0;">Cost Per Click (CPC)</td>
            <td style="padding: 12px 0; text-align: right; font-weight: bold;">$${data.cpc || '0.00'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #334155;">
            <td style="padding: 12px 0;">Cost Per Acquisition (CPA)</td>
            <td style="padding: 12px 0; text-align: right; font-weight: bold;">$${data.cpa || '0.00'}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0;">Return on Ad Spend (ROAS)</td>
            <td style="padding: 12px 0; text-align: right; font-weight: bold; color: ${parseFloat(data.roas || '0') >= 1 ? '#10b981' : '#ef4444'};">${data.roas || '0'}x</td>
          </tr>
        </table>
      </div>

      ${data.recommendations?.length > 0 ? `
      <h3 style="color: white; margin: 25px 0 15px 0;">Recommendations</h3>
      <div style="${EMAIL_STYLES.card}">
        <ul style="${EMAIL_STYLES.list}; padding-left: 20px; margin: 0;">
          ${data.recommendations.map((rec: string) => `<li>${rec}</li>`).join('')}
        </ul>
      </div>
      ` : ''}

      <div style="text-align: center; margin-top: 30px;">
        <a href="${data.dashboardLink || 'https://timebeyondus.com/campaigns'}" style="${EMAIL_STYLES.button}">
          View Full Dashboard
        </a>
      </div>
    </div>
    <div style="${EMAIL_STYLES.footer}">
      <p>© 2025 TIME Trading. All rights reserved.</p>
      <p><a href="https://timebeyondus.com/unsubscribe" style="color: #7c3aed;">Unsubscribe from campaign updates</a></p>
    </div>
  </div>
`;

/**
 * ===========================================
 * A/B TEST RESULTS EMAIL
 * ===========================================
 */

export const getABTestResultsTemplate = (data: MarketingEmailData): string => `
  <div style="${EMAIL_STYLES.container}">
    <div style="${EMAIL_STYLES.header}">
      <h1 style="${EMAIL_STYLES.headerTitle}">A/B Test Results</h1>
      <p style="${EMAIL_STYLES.headerSubtitle}">${data.testName || 'Your Test'} is Complete</p>
    </div>
    <div style="${EMAIL_STYLES.body}">
      <h2 style="${EMAIL_STYLES.bodyTitle}">Hi ${data.userName || 'there'},</h2>
      <p style="${EMAIL_STYLES.text}">
        Great news! Your A/B test "${data.testName || 'Test'}" has reached statistical significance.
        Here are the results:
      </p>

      <!-- Winner Announcement -->
      <div style="${EMAIL_STYLES.highlight}">
        <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 1px;">Winner</p>
        <h2 style="color: white; font-size: 28px; margin: 0;">${data.winnerName || 'Variant B'}</h2>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">
          ${data.improvement || '+23%'} improvement in ${data.metric || 'conversion rate'}
        </p>
      </div>

      <!-- Variants Comparison -->
      <h3 style="color: white; margin: 25px 0 15px 0;">Variant Performance</h3>
      ${data.variants?.map((variant: any, index: number) => `
        <div style="${EMAIL_STYLES.card}; ${variant.isWinner ? 'border: 2px solid #10b981;' : ''} margin-bottom: 15px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
            <div>
              <h4 style="color: ${variant.isWinner ? '#10b981' : 'white'}; margin: 0;">
                ${variant.name}
                ${variant.isWinner ? ' (Winner)' : ''}
              </h4>
              <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 12px;">${variant.description || ''}</p>
            </div>
            <div style="text-align: right;">
              <p style="color: ${variant.isWinner ? '#10b981' : '#7c3aed'}; font-size: 24px; margin: 0; font-weight: bold;">
                ${variant.conversionRate || '0'}%
              </p>
              <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 12px;">Conversion Rate</p>
            </div>
          </div>
          <table style="width: 100%; color: #e2e8f0; font-size: 14px;">
            <tr>
              <td style="padding: 5px 0;">Visitors</td>
              <td style="text-align: right;">${variant.visitors || 0}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0;">Conversions</td>
              <td style="text-align: right;">${variant.conversions || 0}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0;">Revenue</td>
              <td style="text-align: right;">$${variant.revenue || '0'}</td>
            </tr>
          </table>
        </div>
      `).join('') || `
        <div style="${EMAIL_STYLES.card}; margin-bottom: 15px;">
          <p style="color: white; margin: 0;">Variant A: 2.5% conversion</p>
        </div>
        <div style="${EMAIL_STYLES.card}; border: 2px solid #10b981;">
          <p style="color: #10b981; margin: 0;">Variant B (Winner): 3.1% conversion</p>
        </div>
      `}

      <!-- Statistical Significance -->
      <div style="${EMAIL_STYLES.card}">
        <h4 style="color: white; margin: 0 0 15px 0;">Statistical Analysis</h4>
        <table style="width: 100%; color: #e2e8f0;">
          <tr>
            <td style="padding: 8px 0;">Confidence Level</td>
            <td style="text-align: right; font-weight: bold; color: #10b981;">${data.confidence || '95'}%</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;">Sample Size</td>
            <td style="text-align: right; font-weight: bold;">${data.sampleSize || '10,000'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;">Test Duration</td>
            <td style="text-align: right; font-weight: bold;">${data.duration || '14 days'}</td>
          </tr>
        </table>
      </div>

      <!-- Recommendation -->
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 20px; border-radius: 12px; margin: 20px 0;">
        <h4 style="color: white; margin: 0 0 10px 0;">Recommendation</h4>
        <p style="color: rgba(255,255,255,0.9); margin: 0;">
          ${data.recommendation || 'Implement the winning variant across all traffic to maximize conversions.'}
        </p>
      </div>

      <div style="text-align: center;">
        <a href="${data.implementLink || 'https://timebeyondus.com/campaigns/ab-tests'}" style="${EMAIL_STYLES.button}">
          Implement Winner
        </a>
        <a href="${data.detailsLink || 'https://timebeyondus.com/campaigns/ab-tests'}" style="${EMAIL_STYLES.buttonSecondary}; margin-left: 10px;">
          View Details
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
 * LEAD NURTURE - WELCOME SEQUENCE (Email 1)
 * ===========================================
 */

export const getLeadWelcome1Template = (data: MarketingEmailData): string => `
  <div style="${EMAIL_STYLES.container}">
    <div style="${EMAIL_STYLES.header}">
      <h1 style="${EMAIL_STYLES.headerTitle}">Welcome to TIME!</h1>
      <p style="${EMAIL_STYLES.headerSubtitle}">Your AI Trading Journey Begins</p>
    </div>
    <div style="${EMAIL_STYLES.body}">
      <h2 style="${EMAIL_STYLES.bodyTitle}">Hi ${data.userName || 'there'},</h2>
      <p style="${EMAIL_STYLES.text}">
        Thanks for joining the TIME community! You've just taken the first step toward
        smarter, automated trading powered by artificial intelligence.
      </p>

      <!-- What to Expect -->
      <h3 style="color: white; margin: 25px 0 15px 0;">Here's What Comes Next:</h3>
      <div style="${EMAIL_STYLES.card}">
        <div style="display: flex; align-items: flex-start; margin-bottom: 20px;">
          <div style="background: #7c3aed; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 15px; flex-shrink: 0;">1</div>
          <div>
            <h4 style="color: white; margin: 0 0 5px 0;">Explore Our 154+ AI Bots</h4>
            <p style="color: #94a3b8; margin: 0; font-size: 14px;">Each bot is designed for different market conditions and strategies</p>
          </div>
        </div>
        <div style="display: flex; align-items: flex-start; margin-bottom: 20px;">
          <div style="background: #7c3aed; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 15px; flex-shrink: 0;">2</div>
          <div>
            <h4 style="color: white; margin: 0 0 5px 0;">Set Your Risk Tolerance</h4>
            <p style="color: #94a3b8; margin: 0; font-size: 14px;">Configure your trading parameters to match your goals</p>
          </div>
        </div>
        <div style="display: flex; align-items: flex-start;">
          <div style="background: #7c3aed; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 15px; flex-shrink: 0;">3</div>
          <div>
            <h4 style="color: white; margin: 0 0 5px 0;">Start Trading</h4>
            <p style="color: #94a3b8; margin: 0; font-size: 14px;">Launch your bots and watch them work 24/7</p>
          </div>
        </div>
      </div>

      <!-- Quick Start -->
      <div style="${EMAIL_STYLES.highlight}">
        <p style="color: white; font-size: 18px; margin: 0 0 10px 0; font-weight: bold;">
          Quick Start Guide
        </p>
        <p style="color: rgba(255,255,255,0.8); margin: 0 0 15px 0;">
          New to AI trading? Check out our 5-minute getting started guide.
        </p>
        <a href="https://timebeyondus.com/learn/quickstart" style="display: inline-block; background: white; color: #7c3aed; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
          Read Guide
        </a>
      </div>

      <p style="${EMAIL_STYLES.text}">
        Over the next few days, I'll share tips and strategies to help you get the most out of TIME.
        Keep an eye on your inbox!
      </p>

      <div style="text-align: center;">
        <a href="${data.dashboardLink || 'https://timebeyondus.com/dashboard'}" style="${EMAIL_STYLES.button}">
          Go to Dashboard
        </a>
      </div>

      <p style="${EMAIL_STYLES.text}; margin-top: 30px;">
        Questions? Just reply to this email. I'm here to help!<br><br>
        Happy Trading,<br>
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
 * ===========================================
 * LEAD NURTURE - WELCOME SEQUENCE (Email 2: Education)
 * ===========================================
 */

export const getLeadWelcome2Template = (data: MarketingEmailData): string => `
  <div style="${EMAIL_STYLES.container}">
    <div style="${EMAIL_STYLES.header}">
      <h1 style="${EMAIL_STYLES.headerTitle}">How AI Trading Works</h1>
      <p style="${EMAIL_STYLES.headerSubtitle}">Understanding Your Edge</p>
    </div>
    <div style="${EMAIL_STYLES.body}">
      <h2 style="${EMAIL_STYLES.bodyTitle}">Hi ${data.userName || 'there'},</h2>
      <p style="${EMAIL_STYLES.text}">
        Yesterday you joined TIME. Today, let's explore what makes AI trading so powerful
        and why thousands of traders trust our bots.
      </p>

      <!-- The Problem -->
      <h3 style="color: white; margin: 25px 0 15px 0;">The Challenge of Manual Trading</h3>
      <div style="${EMAIL_STYLES.card}">
        <ul style="${EMAIL_STYLES.list}; padding-left: 20px; margin: 0;">
          <li>Markets move 24/7, but you can't</li>
          <li>Emotions lead to poor decisions</li>
          <li>It's impossible to monitor everything</li>
          <li>Missed opportunities while you sleep</li>
        </ul>
      </div>

      <!-- The Solution -->
      <h3 style="color: white; margin: 25px 0 15px 0;">How TIME Solves This</h3>
      <div style="${EMAIL_STYLES.card}">
        <div style="margin-bottom: 20px;">
          <h4 style="color: #7c3aed; margin: 0 0 10px 0;">1. Pattern Recognition</h4>
          <p style="color: #e2e8f0; margin: 0; font-size: 14px;">
            Our AI analyzes millions of data points to identify profitable trading patterns in real-time.
          </p>
        </div>
        <div style="margin-bottom: 20px;">
          <h4 style="color: #7c3aed; margin: 0 0 10px 0;">2. Emotion-Free Execution</h4>
          <p style="color: #e2e8f0; margin: 0; font-size: 14px;">
            Bots execute trades based on data, not fear or greed. Consistent, disciplined trading every time.
          </p>
        </div>
        <div style="margin-bottom: 20px;">
          <h4 style="color: #7c3aed; margin: 0 0 10px 0;">3. 24/7 Operation</h4>
          <p style="color: #e2e8f0; margin: 0; font-size: 14px;">
            Markets don't sleep and neither do your bots. Never miss an opportunity again.
          </p>
        </div>
        <div>
          <h4 style="color: #7c3aed; margin: 0 0 10px 0;">4. Risk Management</h4>
          <p style="color: #e2e8f0; margin: 0; font-size: 14px;">
            Built-in stop losses and position sizing protect your capital automatically.
          </p>
        </div>
      </div>

      <!-- Stats -->
      <div style="${EMAIL_STYLES.highlight}">
        <p style="color: rgba(255,255,255,0.8); margin: 0 0 10px 0;">Our Platform Stats</p>
        <table style="width: 100%; color: white;">
          <tr>
            <td style="text-align: center; padding: 10px;">
              <p style="font-size: 32px; margin: 0; font-weight: bold;">154+</p>
              <p style="font-size: 12px; margin: 5px 0 0 0; opacity: 0.8;">AI Bots</p>
            </td>
            <td style="text-align: center; padding: 10px;">
              <p style="font-size: 32px; margin: 0; font-weight: bold;">68%</p>
              <p style="font-size: 12px; margin: 5px 0 0 0; opacity: 0.8;">Avg Win Rate</p>
            </td>
            <td style="text-align: center; padding: 10px;">
              <p style="font-size: 32px; margin: 0; font-weight: bold;">24/7</p>
              <p style="font-size: 12px; margin: 5px 0 0 0; opacity: 0.8;">Trading</p>
            </td>
          </tr>
        </table>
      </div>

      <p style="${EMAIL_STYLES.text}">
        Tomorrow, I'll share the 3 most popular bot strategies our successful traders use.
      </p>

      <div style="text-align: center;">
        <a href="${data.botsLink || 'https://timebeyondus.com/bots'}" style="${EMAIL_STYLES.button}">
          Explore Bots
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
 * LEAD NURTURE - WELCOME SEQUENCE (Email 3: Conversion)
 * ===========================================
 */

export const getLeadWelcome3Template = (data: MarketingEmailData): string => `
  <div style="${EMAIL_STYLES.container}">
    <div style="${EMAIL_STYLES.header}">
      <h1 style="${EMAIL_STYLES.headerTitle}">Ready to Level Up?</h1>
      <p style="${EMAIL_STYLES.headerSubtitle}">Unlock Your Full Trading Potential</p>
    </div>
    <div style="${EMAIL_STYLES.body}">
      <h2 style="${EMAIL_STYLES.bodyTitle}">Hi ${data.userName || 'there'},</h2>
      <p style="${EMAIL_STYLES.text}">
        You've been exploring TIME for a few days now. If you're ready to take your trading
        to the next level, now's the perfect time.
      </p>

      <!-- Current vs Upgrade -->
      <h3 style="color: white; margin: 25px 0 15px 0;">Free vs Paid: What You're Missing</h3>
      <div style="${EMAIL_STYLES.card}">
        <table style="width: 100%; color: #e2e8f0; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #334155;">
            <td style="padding: 12px 0; font-weight: bold;">Feature</td>
            <td style="padding: 12px 0; text-align: center;">FREE</td>
            <td style="padding: 12px 0; text-align: center; color: #7c3aed;">PRO</td>
          </tr>
          <tr style="border-bottom: 1px solid #334155;">
            <td style="padding: 12px 0;">Active Bots</td>
            <td style="padding: 12px 0; text-align: center;">1</td>
            <td style="padding: 12px 0; text-align: center; color: #10b981; font-weight: bold;">7</td>
          </tr>
          <tr style="border-bottom: 1px solid #334155;">
            <td style="padding: 12px 0;">Strategy Library</td>
            <td style="padding: 12px 0; text-align: center;">Basic</td>
            <td style="padding: 12px 0; text-align: center; color: #10b981; font-weight: bold;">Full Access</td>
          </tr>
          <tr style="border-bottom: 1px solid #334155;">
            <td style="padding: 12px 0;">Backtesting</td>
            <td style="padding: 12px 0; text-align: center;">Limited</td>
            <td style="padding: 12px 0; text-align: center; color: #10b981; font-weight: bold;">Unlimited</td>
          </tr>
          <tr style="border-bottom: 1px solid #334155;">
            <td style="padding: 12px 0;">Priority Execution</td>
            <td style="padding: 12px 0; text-align: center;">-</td>
            <td style="padding: 12px 0; text-align: center; color: #10b981; font-weight: bold;">Yes</td>
          </tr>
          <tr>
            <td style="padding: 12px 0;">Support</td>
            <td style="padding: 12px 0; text-align: center;">Email</td>
            <td style="padding: 12px 0; text-align: center; color: #10b981; font-weight: bold;">Priority</td>
          </tr>
        </table>
      </div>

      <!-- Special Offer -->
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 25px; border-radius: 12px; text-align: center; margin: 30px 0;">
        <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 0 0 5px 0;">New Member Exclusive</p>
        <p style="color: white; font-size: 32px; margin: 0; font-weight: bold;">20% OFF</p>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0;">Your First Month - Any Plan</p>
        <div style="background: rgba(0,0,0,0.2); padding: 10px 20px; border-radius: 8px; display: inline-block; margin-top: 10px;">
          <p style="color: white; margin: 0; font-family: monospace; font-size: 18px;">CODE: NEWTRADER20</p>
        </div>
        <p style="color: rgba(255,255,255,0.7); margin: 15px 0 0 0; font-size: 12px;">Expires in 48 hours</p>
      </div>

      <!-- Pricing -->
      <h3 style="color: white; margin: 25px 0 15px 0;">Choose Your Plan</h3>
      <div style="${EMAIL_STYLES.card}">
        <table style="width: 100%; color: #e2e8f0; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #334155;">
            <td style="padding: 12px 0;"><strong>BASIC</strong> - 3 bots</td>
            <td style="padding: 12px 0; text-align: right;">
              <span style="text-decoration: line-through; color: #64748b;">$19</span>
              <span style="color: #10b981; font-weight: bold; margin-left: 10px;">$15.20/mo</span>
            </td>
          </tr>
          <tr style="border-bottom: 1px solid #334155; background: linear-gradient(90deg, rgba(124,58,237,0.1) 0%, rgba(6,182,212,0.1) 100%);">
            <td style="padding: 12px 0;"><strong style="color: #7c3aed;">PRO (Popular)</strong> - 7 bots</td>
            <td style="padding: 12px 0; text-align: right;">
              <span style="text-decoration: line-through; color: #64748b;">$49</span>
              <span style="color: #10b981; font-weight: bold; margin-left: 10px;">$39.20/mo</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 0;"><strong>PREMIUM</strong> - 11 Super Bots</td>
            <td style="padding: 12px 0; text-align: right;">
              <span style="text-decoration: line-through; color: #64748b;">$109</span>
              <span style="color: #10b981; font-weight: bold; margin-left: 10px;">$87.20/mo</span>
            </td>
          </tr>
        </table>
      </div>

      <div style="text-align: center; margin-top: 30px;">
        <a href="${data.upgradeLink || 'https://timebeyondus.com/upgrade'}?promo=NEWTRADER20" style="${EMAIL_STYLES.button}">
          Claim 20% Off
        </a>
      </div>

      <p style="${EMAIL_STYLES.text}; text-align: center; color: #64748b; font-size: 12px; margin-top: 20px;">
        30-day money-back guarantee on all plans
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
 * LANDING PAGE CONVERSION EMAIL
 * ===========================================
 */

export const getLandingPageConversionTemplate = (data: MarketingEmailData): string => `
  <div style="${EMAIL_STYLES.container}">
    <div style="${EMAIL_STYLES.header}">
      <h1 style="${EMAIL_STYLES.headerTitle}">Thanks for Your Interest!</h1>
      <p style="${EMAIL_STYLES.headerSubtitle}">${data.landingPageTitle || 'Next Steps Inside'}</p>
    </div>
    <div style="${EMAIL_STYLES.body}">
      <h2 style="${EMAIL_STYLES.bodyTitle}">Hi ${data.userName || 'there'},</h2>
      <p style="${EMAIL_STYLES.text}">
        Thank you for visiting our ${data.landingPageTitle || 'landing page'} and sharing your email.
        We're excited to help you ${data.benefitStatement || 'achieve your trading goals'}.
      </p>

      <!-- What They Signed Up For -->
      ${data.offerType === 'guide' ? `
      <div style="${EMAIL_STYLES.highlight}">
        <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 0 0 10px 0;">Your Free Guide</p>
        <h3 style="color: white; margin: 0 0 15px 0;">${data.guideName || 'Trading Strategy Guide'}</h3>
        <a href="${data.downloadLink || '#'}" style="display: inline-block; background: white; color: #7c3aed; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
          Download Now
        </a>
      </div>
      ` : data.offerType === 'webinar' ? `
      <div style="${EMAIL_STYLES.highlight}">
        <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 0 0 10px 0;">You're Registered!</p>
        <h3 style="color: white; margin: 0 0 10px 0;">${data.webinarTitle || 'AI Trading Masterclass'}</h3>
        <p style="color: rgba(255,255,255,0.9); margin: 0;">
          ${data.webinarDate || 'Date TBD'} at ${data.webinarTime || 'Time TBD'}
        </p>
      </div>
      <div style="${EMAIL_STYLES.card}">
        <p style="color: white; margin: 0 0 10px 0; font-weight: bold;">Add to Calendar:</p>
        <a href="${data.calendarLink || '#'}" style="color: #7c3aed; text-decoration: none;">Google Calendar</a> |
        <a href="${data.icsLink || '#'}" style="color: #7c3aed; text-decoration: none;">iCal / Outlook</a>
      </div>
      ` : data.offerType === 'trial' ? `
      <div style="${EMAIL_STYLES.highlight}">
        <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 0 0 10px 0;">Your Trial is Active!</p>
        <h3 style="color: white; margin: 0;">${data.trialDays || '14'}-Day Free Trial</h3>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">
          Full access to ${data.trialPlan || 'PRO'} features
        </p>
      </div>
      ` : `
      <div style="${EMAIL_STYLES.highlight}">
        <p style="color: white; font-size: 18px; margin: 0;">
          ${data.confirmationMessage || 'We\'ll be in touch soon!'}
        </p>
      </div>
      `}

      <!-- Next Steps -->
      <h3 style="color: white; margin: 25px 0 15px 0;">Recommended Next Steps:</h3>
      <div style="${EMAIL_STYLES.card}">
        <ol style="color: #e2e8f0; line-height: 2; padding-left: 20px; margin: 0;">
          ${data.nextSteps?.map((step: string) => `<li>${step}</li>`).join('') || `
            <li>Create your free TIME account</li>
            <li>Explore our bot library</li>
            <li>Start with paper trading to learn</li>
          `}
        </ol>
      </div>

      <!-- Related Content -->
      ${data.relatedContent?.length > 0 ? `
      <h3 style="color: white; margin: 25px 0 15px 0;">You Might Also Like:</h3>
      ${data.relatedContent.map((content: any) => `
        <div style="${EMAIL_STYLES.card}; margin-bottom: 15px;">
          <h4 style="color: #7c3aed; margin: 0 0 5px 0;">${content.title}</h4>
          <p style="color: #94a3b8; margin: 0 0 10px 0; font-size: 14px;">${content.description}</p>
          <a href="${content.link}" style="color: #7c3aed; text-decoration: none; font-weight: bold;">Learn More -></a>
        </div>
      `).join('')}
      ` : ''}

      <div style="text-align: center; margin-top: 30px;">
        <a href="${data.primaryCta || 'https://timebeyondus.com/signup'}" style="${EMAIL_STYLES.button}">
          ${data.ctaText || 'Get Started'}
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
 * FUNNEL DROP-OFF RE-ENGAGEMENT
 * ===========================================
 */

export const getFunnelReengagementTemplate = (data: MarketingEmailData): string => `
  <div style="${EMAIL_STYLES.container}">
    <div style="${EMAIL_STYLES.header}">
      <h1 style="${EMAIL_STYLES.headerTitle}">Let's Pick Up Where You Left Off</h1>
      <p style="${EMAIL_STYLES.headerSubtitle}">You Were So Close!</p>
    </div>
    <div style="${EMAIL_STYLES.body}">
      <h2 style="${EMAIL_STYLES.bodyTitle}">Hi ${data.userName || 'there'},</h2>
      <p style="${EMAIL_STYLES.text}">
        We noticed you started ${data.funnelAction || 'signing up'} but didn't quite finish.
        No worries - we saved your progress so you can pick up right where you left off.
      </p>

      <!-- Progress Indicator -->
      <div style="${EMAIL_STYLES.card}">
        <p style="color: white; margin: 0 0 15px 0; font-weight: bold;">Your Progress:</p>
        <div style="background: #1e293b; border-radius: 8px; padding: 3px;">
          <div style="background: linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%); height: 10px; border-radius: 6px; width: ${data.progressPercent || '60'}%;"></div>
        </div>
        <p style="color: #94a3b8; margin: 10px 0 0 0; font-size: 14px;">
          ${data.progressPercent || '60'}% complete - Just ${data.stepsRemaining || '2'} more step(s)!
        </p>
      </div>

      <!-- Where They Left Off -->
      <div style="${EMAIL_STYLES.highlight}">
        <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 0 0 5px 0;">You Left Off At:</p>
        <h3 style="color: white; margin: 0;">${data.lastStep || 'Account Setup'}</h3>
      </div>

      <!-- Remaining Steps -->
      <h3 style="color: white; margin: 25px 0 15px 0;">What's Left:</h3>
      <div style="${EMAIL_STYLES.card}">
        ${data.remainingSteps?.map((step: any, index: number) => `
          <div style="display: flex; align-items: center; margin-bottom: ${index < data.remainingSteps.length - 1 ? '15px' : '0'};">
            <div style="background: #334155; color: #94a3b8; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; margin-right: 12px;">${index + 1}</div>
            <div>
              <p style="color: white; margin: 0;">${step.name}</p>
              <p style="color: #64748b; margin: 2px 0 0 0; font-size: 12px;">${step.time || '~1 min'}</p>
            </div>
          </div>
        `).join('') || `
          <div style="display: flex; align-items: center; margin-bottom: 15px;">
            <div style="background: #334155; color: #94a3b8; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; margin-right: 12px;">1</div>
            <div>
              <p style="color: white; margin: 0;">Complete profile</p>
              <p style="color: #64748b; margin: 2px 0 0 0; font-size: 12px;">~1 min</p>
            </div>
          </div>
          <div style="display: flex; align-items: center;">
            <div style="background: #334155; color: #94a3b8; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; margin-right: 12px;">2</div>
            <div>
              <p style="color: white; margin: 0;">Choose your first bot</p>
              <p style="color: #64748b; margin: 2px 0 0 0; font-size: 12px;">~2 min</p>
            </div>
          </div>
        `}
      </div>

      <!-- Incentive -->
      ${data.incentive ? `
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0;">
        <p style="color: white; margin: 0; font-weight: bold;">${data.incentive}</p>
      </div>
      ` : ''}

      <div style="text-align: center; margin-top: 30px;">
        <a href="${data.continueLink || 'https://timebeyondus.com/continue'}" style="${EMAIL_STYLES.button}">
          Continue Where You Left Off
        </a>
      </div>

      <p style="${EMAIL_STYLES.text}; text-align: center; color: #64748b; font-size: 12px; margin-top: 20px;">
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
 * REFERRAL INVITE EMAIL
 * ===========================================
 */

export const getReferralInviteTemplate = (data: MarketingEmailData): string => `
  <div style="${EMAIL_STYLES.container}">
    <div style="${EMAIL_STYLES.header}">
      <h1 style="${EMAIL_STYLES.headerTitle}">You've Been Invited!</h1>
      <p style="${EMAIL_STYLES.headerSubtitle}">Join ${data.referrerName || 'Your Friend'} on TIME</p>
    </div>
    <div style="${EMAIL_STYLES.body}">
      <h2 style="${EMAIL_STYLES.bodyTitle}">Hey there!</h2>
      <p style="${EMAIL_STYLES.text}">
        ${data.referrerName || 'Your friend'} thinks you'd love TIME - the AI-powered trading platform
        that's helping thousands of traders automate their strategies.
      </p>

      <!-- Personal Message -->
      ${data.personalMessage ? `
      <div style="background: #0f172a; padding: 20px; border-radius: 12px; border-left: 4px solid #7c3aed; margin: 20px 0;">
        <p style="color: #94a3b8; font-size: 12px; margin: 0 0 10px 0;">Message from ${data.referrerName}:</p>
        <p style="color: #e2e8f0; font-style: italic; margin: 0;">"${data.personalMessage}"</p>
      </div>
      ` : ''}

      <!-- What is TIME -->
      <h3 style="color: white; margin: 25px 0 15px 0;">What is TIME?</h3>
      <div style="${EMAIL_STYLES.card}">
        <ul style="${EMAIL_STYLES.list}; padding-left: 20px; margin: 0;">
          <li>154+ AI trading bots ready to execute</li>
          <li>24/7 automated trading while you sleep</li>
          <li>Real-time market analysis and signals</li>
          <li>Proven strategies from expert traders</li>
        </ul>
      </div>

      <!-- Referral Bonus -->
      <div style="${EMAIL_STYLES.highlight}">
        <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 0 0 5px 0;">Special Referral Bonus</p>
        <p style="color: white; font-size: 28px; margin: 0; font-weight: bold;">
          ${data.referralBonus || 'Get $20 Credit'}
        </p>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">
          When you sign up using ${data.referrerName || 'your friend'}'s link
        </p>
      </div>

      <!-- Social Proof -->
      <div style="${EMAIL_STYLES.card}">
        <table style="width: 100%; color: #e2e8f0; text-align: center;">
          <tr>
            <td style="padding: 10px;">
              <p style="color: #7c3aed; font-size: 24px; margin: 0; font-weight: bold;">50K+</p>
              <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 12px;">Active Traders</p>
            </td>
            <td style="padding: 10px;">
              <p style="color: #7c3aed; font-size: 24px; margin: 0; font-weight: bold;">$2M+</p>
              <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 12px;">Daily Volume</p>
            </td>
            <td style="padding: 10px;">
              <p style="color: #7c3aed; font-size: 24px; margin: 0; font-weight: bold;">4.8</p>
              <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 12px;">Star Rating</p>
            </td>
          </tr>
        </table>
      </div>

      <div style="text-align: center; margin-top: 30px;">
        <a href="${data.referralLink || 'https://timebeyondus.com/signup'}" style="${EMAIL_STYLES.button}">
          Join TIME Free
        </a>
      </div>

      <p style="${EMAIL_STYLES.text}; text-align: center; color: #64748b; font-size: 12px; margin-top: 20px;">
        Free forever. Upgrade anytime.
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
 * AFFILIATE COMMISSION NOTIFICATION
 * ===========================================
 */

export const getAffiliateCommissionTemplate = (data: MarketingEmailData): string => `
  <div style="${EMAIL_STYLES.container}">
    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px; text-align: center;">
      <h1 style="${EMAIL_STYLES.headerTitle}">Commission Earned!</h1>
      <p style="${EMAIL_STYLES.headerSubtitle}">Cha-ching!</p>
    </div>
    <div style="${EMAIL_STYLES.body}">
      <h2 style="${EMAIL_STYLES.bodyTitle}">Great news, ${data.userName || 'Partner'}!</h2>
      <p style="${EMAIL_STYLES.text}">
        You just earned a commission from your affiliate referrals. Here are the details:
      </p>

      <!-- Commission Details -->
      <div style="${EMAIL_STYLES.highlight}">
        <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 0 0 5px 0;">Commission Earned</p>
        <p style="color: white; font-size: 48px; margin: 0; font-weight: bold;">$${data.commissionAmount || '0.00'}</p>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">
          ${data.commissionType === 'recurring' ? 'Recurring Commission' : 'One-time Commission'}
        </p>
      </div>

      <!-- Transaction Details -->
      <div style="${EMAIL_STYLES.card}">
        <h3 style="color: white; margin: 0 0 15px 0;">Transaction Details</h3>
        <table style="width: 100%; color: #e2e8f0;">
          <tr style="border-bottom: 1px solid #334155;">
            <td style="padding: 12px 0;">Referral</td>
            <td style="padding: 12px 0; text-align: right;">${data.referralName || 'New Customer'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #334155;">
            <td style="padding: 12px 0;">Plan Purchased</td>
            <td style="padding: 12px 0; text-align: right;">${data.planPurchased || 'PRO'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #334155;">
            <td style="padding: 12px 0;">Sale Amount</td>
            <td style="padding: 12px 0; text-align: right;">$${data.saleAmount || '0.00'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #334155;">
            <td style="padding: 12px 0;">Commission Rate</td>
            <td style="padding: 12px 0; text-align: right;">${data.commissionRate || '20'}%</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; font-weight: bold;">Your Earnings</td>
            <td style="padding: 12px 0; text-align: right; font-weight: bold; color: #10b981;">$${data.commissionAmount || '0.00'}</td>
          </tr>
        </table>
      </div>

      <!-- Lifetime Stats -->
      <h3 style="color: white; margin: 25px 0 15px 0;">Your Affiliate Stats</h3>
      <div style="${EMAIL_STYLES.card}">
        <table style="width: 100%; color: #e2e8f0; text-align: center;">
          <tr>
            <td style="padding: 15px;">
              <p style="color: #7c3aed; font-size: 28px; margin: 0; font-weight: bold;">${data.totalReferrals || '0'}</p>
              <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 12px;">Total Referrals</p>
            </td>
            <td style="padding: 15px;">
              <p style="color: #10b981; font-size: 28px; margin: 0; font-weight: bold;">$${data.totalEarnings || '0'}</p>
              <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 12px;">Total Earnings</p>
            </td>
            <td style="padding: 15px;">
              <p style="color: #f59e0b; font-size: 28px; margin: 0; font-weight: bold;">$${data.pendingPayout || '0'}</p>
              <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 12px;">Pending Payout</p>
            </td>
          </tr>
        </table>
      </div>

      ${parseFloat(data.pendingPayout || '0') >= 50 ? `
      <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0;">
        <p style="color: white; margin: 0; font-weight: bold;">
          You've reached the payout threshold! Request your payout now.
        </p>
      </div>
      ` : `
      <p style="${EMAIL_STYLES.text}; color: #64748b;">
        Minimum payout threshold: $50.00. You're ${((50 - parseFloat(data.pendingPayout || '0')).toFixed(2))} away!
      </p>
      `}

      <div style="text-align: center; margin-top: 30px;">
        <a href="${data.dashboardLink || 'https://timebeyondus.com/affiliate/dashboard'}" style="${EMAIL_STYLES.button}">
          View Dashboard
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
 * MILESTONE CELEBRATION EMAIL
 * ===========================================
 */

export const getMilestoneCelebrationTemplate = (data: MarketingEmailData): string => `
  <div style="${EMAIL_STYLES.container}">
    <div style="background: linear-gradient(135deg, #7c3aed 0%, #f59e0b 100%); padding: 40px; text-align: center;">
      <h1 style="${EMAIL_STYLES.headerTitle}">Congratulations!</h1>
      <p style="${EMAIL_STYLES.headerSubtitle}">You've Hit a Milestone</p>
    </div>
    <div style="${EMAIL_STYLES.body}">
      <h2 style="${EMAIL_STYLES.bodyTitle}">Amazing, ${data.userName || 'Trader'}!</h2>
      <p style="${EMAIL_STYLES.text}">
        You've just reached an incredible milestone in your trading journey!
      </p>

      <!-- Milestone Achievement -->
      <div style="${EMAIL_STYLES.highlight}">
        <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 0 0 10px 0;">Achievement Unlocked</p>
        <p style="color: white; font-size: 28px; margin: 0; font-weight: bold;">${data.milestoneName || 'First Profitable Month'}</p>
        ${data.milestoneValue ? `
        <p style="color: rgba(255,255,255,0.9); font-size: 20px; margin: 10px 0 0 0;">
          ${data.milestoneValue}
        </p>
        ` : ''}
      </div>

      <!-- Stats -->
      <div style="${EMAIL_STYLES.card}">
        <h3 style="color: white; margin: 0 0 15px 0;">Your Journey So Far:</h3>
        <table style="width: 100%; color: #e2e8f0;">
          <tr style="border-bottom: 1px solid #334155;">
            <td style="padding: 12px 0;">Days Active</td>
            <td style="padding: 12px 0; text-align: right; font-weight: bold;">${data.daysActive || '30'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #334155;">
            <td style="padding: 12px 0;">Total Trades</td>
            <td style="padding: 12px 0; text-align: right; font-weight: bold;">${data.totalTrades || '150'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #334155;">
            <td style="padding: 12px 0;">Win Rate</td>
            <td style="padding: 12px 0; text-align: right; font-weight: bold; color: #10b981;">${data.winRate || '65'}%</td>
          </tr>
          <tr>
            <td style="padding: 12px 0;">Total Returns</td>
            <td style="padding: 12px 0; text-align: right; font-weight: bold; color: #10b981;">+${data.totalReturns || '12.5'}%</td>
          </tr>
        </table>
      </div>

      <!-- Next Milestone -->
      ${data.nextMilestone ? `
      <div style="${EMAIL_STYLES.card}; border-left: 4px solid #7c3aed;">
        <h4 style="color: white; margin: 0 0 10px 0;">Next Milestone:</h4>
        <p style="color: #e2e8f0; margin: 0;">${data.nextMilestone}</p>
        <p style="color: #64748b; margin: 5px 0 0 0; font-size: 14px;">
          ${data.nextMilestoneProgress || 'Keep going - you\'re almost there!'}
        </p>
      </div>
      ` : ''}

      <!-- Share Achievement -->
      <p style="${EMAIL_STYLES.text}">
        Share your success with friends and earn rewards through our referral program!
      </p>

      <div style="text-align: center; margin-top: 30px;">
        <a href="${data.shareLink || 'https://timebeyondus.com/referral'}" style="${EMAIL_STYLES.button}">
          Share & Earn
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
  reengagement: getReengagementTemplate,
  campaign_update: getCampaignUpdateTemplate,
  ab_test_results: getABTestResultsTemplate,
  lead_welcome_1: getLeadWelcome1Template,
  lead_welcome_2: getLeadWelcome2Template,
  lead_welcome_3: getLeadWelcome3Template,
  landing_page_conversion: getLandingPageConversionTemplate,
  funnel_reengagement: getFunnelReengagementTemplate,
  referral_invite: getReferralInviteTemplate,
  affiliate_commission: getAffiliateCommissionTemplate,
  milestone_celebration: getMilestoneCelebrationTemplate,
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
