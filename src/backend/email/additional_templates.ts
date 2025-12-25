/**
 * Additional Email Campaign Templates for TIME
 *
 * Extends campaign_templates.ts with:
 * - Upgrade nudge templates
 * - Inactive user re-engagement templates
 * - Feature education templates
 */

import { TemplateData } from './campaign_templates';

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
 * UPGRADE NUDGE TEMPLATES
 */
export const getUpgradeLimitationsTemplate = (data: TemplateData): string => `
  <div style="${EMAIL_STYLES.container}">
    <div style="${EMAIL_STYLES.header}">
      <h1 style="${EMAIL_STYLES.headerTitle}">Unlock Your Full Potential</h1>
      <p style="${EMAIL_STYLES.headerSubtitle}">150+ Premium Bots Waiting for You</p>
    </div>
    <div style="${EMAIL_STYLES.body}">
      <h2 style="${EMAIL_STYLES.bodyTitle}">${data.userName || 'Trader'}, You're Missing Out!</h2>
      <p style="${EMAIL_STYLES.text}">
        You've been using TIME's free tier, which is great for getting started.
        But did you know you're only accessing 3% of our platform's power?
      </p>
      <div style="background: #0f172a; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="color: #ef4444; font-size: 18px; margin: 0 0 15px 0;"><strong>Current Limitations:</strong></p>
        <ul style="${EMAIL_STYLES.list}">
          <li>Only 4 basic bots (you're missing 150+ advanced strategies)</li>
          <li>15-minute delayed data (competitors see opportunities first)</li>
          <li>Limited to $1,000 portfolio value</li>
          <li>No custom bot builder</li>
          <li>Basic analytics only</li>
        </ul>
      </div>
      <p style="${EMAIL_STYLES.text}"><strong>What Premium unlocks:</strong></p>
      <ul style="${EMAIL_STYLES.list}">
        <li>154+ AI bots (every strategy imaginable)</li>
        <li>Real-time data (institutional-grade feeds)</li>
        <li>Unlimited portfolio size</li>
        <li>Custom bot builder with backtesting</li>
        <li>Advanced analytics & reporting</li>
        <li>Priority support & trading coach</li>
      </ul>
      <div style="text-align: center;">
        <a href="https://timebeyondus.com/upgrade" style="${EMAIL_STYLES.button}">Upgrade Now</a>
      </div>
      <p style="${EMAIL_STYLES.text}" style="text-align: center; color: #64748b;">
        From just $59/month
      </p>
    </div>
    <div style="${EMAIL_STYLES.footer}">
      <p>© 2025 TIME Trading. All rights reserved.</p>
      <p><a href="https://timebeyondus.com/unsubscribe" style="color: #7c3aed;">Unsubscribe</a></p>
    </div>
  </div>
`;

export const getUpgradeSuccessStoryTemplate = (data: TemplateData): string => `
  <div style="${EMAIL_STYLES.container}">
    <div style="${EMAIL_STYLES.header}">
      <h1 style="${EMAIL_STYLES.headerTitle}">From $10K to $87K in 6 Months</h1>
      <p style="${EMAIL_STYLES.headerSubtitle}">Real Results from Real Users</p>
    </div>
    <div style="${EMAIL_STYLES.body}">
      <h2 style="${EMAIL_STYLES.bodyTitle}">How Sarah Transformed Her Trading</h2>
      <div style="background: linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%); padding: 30px; border-radius: 12px; margin: 20px 0; text-align: center;">
        <p style="color: white; font-size: 48px; margin: 0; font-weight: bold;">+770%</p>
        <p style="color: rgba(255,255,255,0.9); font-size: 20px; margin: 10px 0;">Portfolio Growth</p>
      </div>
      <div style="background: #0f172a; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="color: #10b981; font-size: 18px; margin: 0 0 10px 0;"><strong>Sarah M., Premium Member:</strong></p>
        <p style="color: #e2e8f0; font-style: italic; line-height: 1.8;">
          "I went from making barely $500/month day trading manually to averaging $12,000/month with
          Premium bots running on autopilot. Best investment I ever made."
        </p>
      </div>
      <p style="${EMAIL_STYLES.text}"><strong>Sarah's winning strategy:</strong></p>
      <ul style="${EMAIL_STYLES.list}">
        <li>3 Premium bots running 24/7</li>
        <li>Focus on high-volatility crypto pairs</li>
        <li>5-minute quick scalps + daily swings</li>
        <li>10% capital per bot, diversified risk</li>
      </ul>
      <div style="text-align: center;">
        <a href="https://timebeyondus.com/upgrade?story=sarah" style="${EMAIL_STYLES.button}">Start Winning Like Sarah</a>
      </div>
    </div>
    <div style="${EMAIL_STYLES.footer}">
      <p>© 2025 TIME Trading. All rights reserved.</p>
      <p><a href="https://timebeyondus.com/unsubscribe" style="color: #7c3aed;">Unsubscribe</a></p>
    </div>
  </div>
`;

export const getUpgradeOfferTemplate = (data: TemplateData): string => `
  <div style="${EMAIL_STYLES.container}">
    <div style="${EMAIL_STYLES.header}">
      <h1 style="${EMAIL_STYLES.headerTitle}">Last Chance: 40% OFF</h1>
      <p style="${EMAIL_STYLES.headerSubtitle}">Offer Expires Tonight at Midnight</p>
    </div>
    <div style="${EMAIL_STYLES.body}">
      <h2 style="${EMAIL_STYLES.bodyTitle}">This Is It, ${data.userName || 'Trader'}!</h2>
      <p style="${EMAIL_STYLES.text}">
        We've sent you 2 emails about upgrading to Premium. This is your final chance to
        lock in our exclusive 40% discount before it expires tonight.
      </p>
      <div style="background: linear-gradient(135deg, #ef4444 0%, #f97316 100%); padding: 30px; border-radius: 12px; text-align: center; margin: 30px 0;">
        <p style="color: white; font-size: 42px; margin: 0; font-weight: bold;">40% OFF</p>
        <p style="color: rgba(255,255,255,0.9); font-size: 24px; margin: 10px 0;">Premium Membership</p>
        <p style="color: rgba(255,255,255,0.8); font-size: 18px; margin: 0;">Just $35.40/month (normally $59)</p>
        <p style="color: #ffedd5; font-size: 14px; margin: 10px 0; font-weight: bold;">EXPIRES IN: 12 HOURS</p>
      </div>
      <p style="background: #fee2e2; color: #991b1b; padding: 15px; border-radius: 8px; border-left: 4px solid #ef4444; margin: 20px 0;">
        <strong>IMPORTANT:</strong> After tonight, this price is gone forever. Don't miss out on saving $283.20/year!
      </p>
      <div style="text-align: center;">
        <a href="https://timebeyondus.com/upgrade?promo=FINAL40" style="${EMAIL_STYLES.button}">Claim 40% Off Now</a>
      </div>
      <p style="text-align: center; color: #64748b; font-size: 12px; margin-top: 20px;">
        Use code: FINAL40 at checkout
      </p>
    </div>
    <div style="${EMAIL_STYLES.footer}">
      <p>© 2025 TIME Trading. All rights reserved.</p>
      <p><a href="https://timebeyondus.com/unsubscribe" style="color: #7c3aed;">Unsubscribe</a></p>
    </div>
  </div>
`;

/**
 * INACTIVE USER TEMPLATES
 */
export const getInactiveMissYouTemplate = (data: TemplateData): string => `
  <div style="${EMAIL_STYLES.container}">
    <div style="${EMAIL_STYLES.header}">
      <h1 style="${EMAIL_STYLES.headerTitle}">We Miss You!</h1>
      <p style="${EMAIL_STYLES.headerSubtitle}">Come Back to TIME</p>
    </div>
    <div style="${EMAIL_STYLES.body}">
      <h2 style="${EMAIL_STYLES.bodyTitle}">Hey ${data.userName || 'Trader'}, Where'd You Go?</h2>
      <p style="${EMAIL_STYLES.text}">
        We noticed you haven't logged into TIME in over 30 days. Everything okay?
        The markets have been incredible lately - you're missing out on some serious opportunities!
      </p>
      <div style="background: #0f172a; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="color: #10b981; font-size: 18px; margin: 0 0 15px 0;"><strong>What You've Missed:</strong></p>
        <ul style="${EMAIL_STYLES.list}">
          <li>BTC up 23% (our bots caught the entire rally)</li>
          <li>15 new AI bots added to the platform</li>
          <li>New AutoPilot feature (set it and forget it)</li>
          <li>Average user profits: $8,400 last 30 days</li>
        </ul>
      </div>
      <div style="text-align: center;">
        <a href="https://timebeyondus.com/dashboard" style="${EMAIL_STYLES.button}">Welcome Back</a>
      </div>
    </div>
    <div style="${EMAIL_STYLES.footer}">
      <p>© 2025 TIME Trading. All rights reserved.</p>
      <p><a href="https://timebeyondus.com/unsubscribe" style="color: #7c3aed;">Unsubscribe</a></p>
    </div>
  </div>
`;

export const getInactiveNewFeaturesTemplate = (data: TemplateData): string => `
  <div style="${EMAIL_STYLES.container}">
    <div style="${EMAIL_STYLES.header}">
      <h1 style="${EMAIL_STYLES.headerTitle}">You're Missing New Features!</h1>
      <p style="${EMAIL_STYLES.headerSubtitle}">TIME Just Got 10x Better</p>
    </div>
    <div style="${EMAIL_STYLES.body}">
      <h2 style="${EMAIL_STYLES.bodyTitle}">Huge Updates Since You Left</h2>
      <p style="${EMAIL_STYLES.text}">
        ${data.userName || 'Trader'}, we've been working around the clock to make TIME even more powerful.
        Check out what's new:
      </p>
      <div style="background: linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%); padding: 20px; border-radius: 12px; margin: 20px 0;">
        <h3 style="color: white; margin: 0 0 15px 0;">NEW: AutoPilot Mode</h3>
        <p style="color: rgba(255,255,255,0.9);">
          Set your risk tolerance and profit targets, then let our AI manage everything. Users averaging 3.2% daily gains!
        </p>
      </div>
      <div style="background: #0f172a; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #10b981; margin: 0 0 15px 0;">NEW: Live Trading Arena</h3>
        <p style="color: #e2e8f0;">
          Watch top traders battle in real-time. See their strategies, copy their bots, and learn from the best.
        </p>
      </div>
      <div style="text-align: center;">
        <a href="https://timebeyondus.com/features" style="${EMAIL_STYLES.button}">Explore New Features</a>
      </div>
    </div>
    <div style="${EMAIL_STYLES.footer}">
      <p>© 2025 TIME Trading. All rights reserved.</p>
      <p><a href="https://timebeyondus.com/unsubscribe" style="color: #7c3aed;">Unsubscribe</a></p>
    </div>
  </div>
`;

export const getInactiveWarningTemplate = (data: TemplateData): string => `
  <div style="${EMAIL_STYLES.container}">
    <div style="${EMAIL_STYLES.header}">
      <h1 style="${EMAIL_STYLES.headerTitle}">Account Archival Notice</h1>
      <p style="${EMAIL_STYLES.headerSubtitle}">Action Required</p>
    </div>
    <div style="${EMAIL_STYLES.body}">
      <h2 style="${EMAIL_STYLES.bodyTitle}">Your Account Will Be Archived in 7 Days</h2>
      <div style="background: #fee2e2; color: #991b1b; padding: 20px; border-radius: 8px; border-left: 4px solid #ef4444; margin: 20px 0;">
        <p style="margin: 0 0 10px 0;"><strong>IMPORTANT NOTICE</strong></p>
        <p style="margin: 0;">
          Due to inactivity, your TIME account is scheduled for archival. Once archived, you'll need to contact support to reactivate.
        </p>
      </div>
      <p style="${EMAIL_STYLES.text}">
        <strong>Want to keep your account active?</strong> Just log in once and you're good to go!
      </p>
      <div style="text-align: center;">
        <a href="https://timebeyondus.com/login" style="${EMAIL_STYLES.button}">Keep My Account Active</a>
      </div>
    </div>
    <div style="${EMAIL_STYLES.footer}">
      <p>© 2025 TIME Trading. All rights reserved.</p>
      <p><a href="https://timebeyondus.com/unsubscribe" style="color: #7c3aed;">Unsubscribe</a></p>
    </div>
  </div>
`;

/**
 * Export all additional templates
 */
export const ADDITIONAL_TEMPLATES = {
  upgrade_limitations: getUpgradeLimitationsTemplate,
  upgrade_success: getUpgradeSuccessStoryTemplate,
  upgrade_offer: getUpgradeOfferTemplate,
  inactive_miss_you: getInactiveMissYouTemplate,
  inactive_new_features: getInactiveNewFeaturesTemplate,
  inactive_warning: getInactiveWarningTemplate,
};
