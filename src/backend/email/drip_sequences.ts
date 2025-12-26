/**
 * Drip Campaign Sequences for TIME
 *
 * Complete drip campaign sequences for:
 * - Onboarding (new user journey)
 * - Re-engagement (win back inactive users)
 * - Upsell (upgrade free/basic to premium)
 * - Milestone celebrations
 * - Educational series
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
import { CampaignType, CampaignStatus, Campaign, CampaignEmail } from './drip_campaign_service';

const logger = createComponentLogger('DripSequences');

/**
 * Sequence Types
 */
export enum SequenceType {
  ONBOARDING = 'ONBOARDING',
  RE_ENGAGEMENT = 'RE_ENGAGEMENT',
  UPSELL = 'UPSELL',
  MILESTONE = 'MILESTONE',
  EDUCATIONAL = 'EDUCATIONAL',
  WINBACK = 'WINBACK',
  TRIAL_CONVERSION = 'TRIAL_CONVERSION',
  LOYALTY = 'LOYALTY'
}

/**
 * User Segments for targeting
 */
export enum UserSegment {
  // By Tier
  FREE_TIER = 'FREE_TIER',
  BASIC_TIER = 'BASIC_TIER',
  PRO_TIER = 'PRO_TIER',
  PREMIUM_TIER = 'PREMIUM_TIER',
  ENTERPRISE_TIER = 'ENTERPRISE_TIER',

  // By Activity
  NEW_USER = 'NEW_USER',
  ACTIVE_USER = 'ACTIVE_USER',
  INACTIVE_7_DAYS = 'INACTIVE_7_DAYS',
  INACTIVE_14_DAYS = 'INACTIVE_14_DAYS',
  INACTIVE_30_DAYS = 'INACTIVE_30_DAYS',
  INACTIVE_60_DAYS = 'INACTIVE_60_DAYS',
  CHURNED = 'CHURNED',

  // By Asset Class Preference
  CRYPTO_TRADER = 'CRYPTO_TRADER',
  STOCK_TRADER = 'STOCK_TRADER',
  FOREX_TRADER = 'FOREX_TRADER',
  OPTIONS_TRADER = 'OPTIONS_TRADER',
  MULTI_ASSET = 'MULTI_ASSET',

  // By Behavior
  BOT_CREATOR = 'BOT_CREATOR',
  BOT_USER = 'BOT_USER',
  MANUAL_TRADER = 'MANUAL_TRADER',
  HIGH_VOLUME = 'HIGH_VOLUME',
  LOW_VOLUME = 'LOW_VOLUME',
  PROFITABLE = 'PROFITABLE',
  LOSING = 'LOSING'
}

/**
 * Drip Sequence Definition
 */
export interface DripSequence {
  id: string;
  name: string;
  type: SequenceType;
  description: string;
  targetSegments: UserSegment[];
  emails: SequenceEmail[];
  trigger: SequenceTrigger;
  exitConditions: ExitCondition[];
  status: CampaignStatus;
  abTestEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SequenceEmail {
  id: string;
  sequenceId: string;
  order: number;
  delayDays: number;
  delayHours?: number;
  subject: string;
  subjectVariantB?: string;
  templateId: string;
  templateVariantBId?: string;
  sendWindow?: { start: number; end: number }; // Hours in UTC (e.g., 9-17)
  conditions?: EmailCondition[];
}

export interface SequenceTrigger {
  type: 'event' | 'schedule' | 'segment_entry';
  event?: string;
  schedule?: string; // Cron expression
  segmentId?: string;
  delayMinutes?: number;
}

export interface ExitCondition {
  type: 'event' | 'segment_exit' | 'email_count' | 'goal_reached';
  event?: string;
  segmentId?: string;
  maxEmails?: number;
  goalId?: string;
}

export interface EmailCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: any;
}

/**
 * ===========================================
 * ONBOARDING SEQUENCE
 * 7-email sequence over 21 days
 * ===========================================
 */
export const ONBOARDING_SEQUENCE: DripSequence = {
  id: 'seq_onboarding_v2',
  name: 'New User Onboarding Journey',
  type: SequenceType.ONBOARDING,
  description: 'Complete onboarding sequence for new users - guides them from signup to first profitable trade',
  targetSegments: [UserSegment.NEW_USER],
  trigger: {
    type: 'event',
    event: 'user.signup',
    delayMinutes: 0
  },
  exitConditions: [
    { type: 'event', event: 'user.upgrade_to_paid' },
    { type: 'email_count', maxEmails: 7 }
  ],
  abTestEnabled: true,
  status: CampaignStatus.ACTIVE,
  emails: [
    {
      id: 'onboard_1',
      sequenceId: 'seq_onboarding_v2',
      order: 1,
      delayDays: 0,
      subject: 'Welcome to TIME - Your AI Trading Journey Begins!',
      subjectVariantB: 'Hey {{firstName}}! Ready to Trade with AI?',
      templateId: 'onboarding_welcome',
      templateVariantBId: 'onboarding_welcome_casual',
      sendWindow: { start: 8, end: 20 }
    },
    {
      id: 'onboard_2',
      sequenceId: 'seq_onboarding_v2',
      order: 2,
      delayDays: 1,
      subject: 'Step 1: Connect Your Broker (2 mins)',
      templateId: 'onboarding_broker',
      conditions: [{ field: 'brokerConnected', operator: 'equals', value: false }]
    },
    {
      id: 'onboard_3',
      sequenceId: 'seq_onboarding_v2',
      order: 3,
      delayDays: 3,
      subject: 'Your First AI Bot Awaits',
      templateId: 'onboarding_first_bot',
      conditions: [{ field: 'activeBots', operator: 'equals', value: 0 }]
    },
    {
      id: 'onboard_4',
      sequenceId: 'seq_onboarding_v2',
      order: 4,
      delayDays: 5,
      subject: 'Paper Trading: Practice Risk-Free',
      templateId: 'onboarding_paper_trading'
    },
    {
      id: 'onboard_5',
      sequenceId: 'seq_onboarding_v2',
      order: 5,
      delayDays: 7,
      subject: '7-Day Progress Check: How Are You Doing?',
      templateId: 'onboarding_progress_check'
    },
    {
      id: 'onboard_6',
      sequenceId: 'seq_onboarding_v2',
      order: 6,
      delayDays: 14,
      subject: 'Unlock Premium Features - 50% Off First Month',
      templateId: 'onboarding_upgrade_offer'
    },
    {
      id: 'onboard_7',
      sequenceId: 'seq_onboarding_v2',
      order: 7,
      delayDays: 21,
      subject: 'Your 3-Week Journey: What\'s Next?',
      templateId: 'onboarding_journey_recap'
    }
  ],
  createdAt: new Date(),
  updatedAt: new Date()
};

/**
 * ===========================================
 * RE-ENGAGEMENT SEQUENCE
 * Win back inactive users
 * ===========================================
 */
export const REENGAGEMENT_SEQUENCE: DripSequence = {
  id: 'seq_reengagement_v1',
  name: 'Inactive User Re-engagement',
  type: SequenceType.RE_ENGAGEMENT,
  description: 'Re-engage users who have been inactive for 7+ days',
  targetSegments: [UserSegment.INACTIVE_7_DAYS, UserSegment.INACTIVE_14_DAYS],
  trigger: {
    type: 'segment_entry',
    segmentId: 'inactive_users'
  },
  exitConditions: [
    { type: 'event', event: 'user.login' },
    { type: 'email_count', maxEmails: 5 }
  ],
  abTestEnabled: true,
  status: CampaignStatus.ACTIVE,
  emails: [
    {
      id: 'reengage_1',
      sequenceId: 'seq_reengagement_v1',
      order: 1,
      delayDays: 0,
      subject: 'We Miss You! Markets Are Moving...',
      subjectVariantB: '{{firstName}}, Your Bots Are Waiting',
      templateId: 'reengagement_miss_you'
    },
    {
      id: 'reengage_2',
      sequenceId: 'seq_reengagement_v1',
      order: 2,
      delayDays: 3,
      subject: 'What You\'ve Missed: +23% BTC Rally',
      templateId: 'reengagement_market_update'
    },
    {
      id: 'reengage_3',
      sequenceId: 'seq_reengagement_v1',
      order: 3,
      delayDays: 7,
      subject: 'New Feature Alert: AutoPilot Mode',
      templateId: 'reengagement_new_features'
    },
    {
      id: 'reengage_4',
      sequenceId: 'seq_reengagement_v1',
      order: 4,
      delayDays: 14,
      subject: 'Exclusive Offer: Come Back & Save 30%',
      templateId: 'reengagement_special_offer'
    },
    {
      id: 'reengage_5',
      sequenceId: 'seq_reengagement_v1',
      order: 5,
      delayDays: 21,
      subject: 'Account Archival Notice - Action Required',
      templateId: 'reengagement_final_warning'
    }
  ],
  createdAt: new Date(),
  updatedAt: new Date()
};

/**
 * ===========================================
 * UPSELL SEQUENCE (Free -> Paid)
 * ===========================================
 */
export const UPSELL_FREE_SEQUENCE: DripSequence = {
  id: 'seq_upsell_free_v1',
  name: 'Free to Paid Upsell',
  type: SequenceType.UPSELL,
  description: 'Convert free tier users to paid subscribers',
  targetSegments: [UserSegment.FREE_TIER, UserSegment.ACTIVE_USER],
  trigger: {
    type: 'event',
    event: 'user.free_tier_limit_hit'
  },
  exitConditions: [
    { type: 'event', event: 'user.upgrade_to_paid' },
    { type: 'goal_reached', goalId: 'conversion_paid' }
  ],
  abTestEnabled: true,
  status: CampaignStatus.ACTIVE,
  emails: [
    {
      id: 'upsell_free_1',
      sequenceId: 'seq_upsell_free_v1',
      order: 1,
      delayDays: 0,
      subject: 'You\'re Hitting Your Limits - Unlock More',
      templateId: 'upsell_limit_reached'
    },
    {
      id: 'upsell_free_2',
      sequenceId: 'seq_upsell_free_v1',
      order: 2,
      delayDays: 2,
      subject: 'What 150+ Premium Bots Can Do For You',
      templateId: 'upsell_premium_features'
    },
    {
      id: 'upsell_free_3',
      sequenceId: 'seq_upsell_free_v1',
      order: 3,
      delayDays: 5,
      subject: 'Real Users, Real Results: $87K in 6 Months',
      templateId: 'upsell_success_stories'
    },
    {
      id: 'upsell_free_4',
      sequenceId: 'seq_upsell_free_v1',
      order: 4,
      delayDays: 7,
      subject: 'Compare Plans: Find Your Perfect Fit',
      templateId: 'upsell_plan_comparison'
    },
    {
      id: 'upsell_free_5',
      sequenceId: 'seq_upsell_free_v1',
      order: 5,
      delayDays: 10,
      subject: 'Final Offer: 40% OFF - Expires Tonight',
      templateId: 'upsell_final_offer'
    }
  ],
  createdAt: new Date(),
  updatedAt: new Date()
};

/**
 * ===========================================
 * UPSELL SEQUENCE (Basic -> Pro/Premium)
 * ===========================================
 */
export const UPSELL_BASIC_SEQUENCE: DripSequence = {
  id: 'seq_upsell_basic_v1',
  name: 'Basic to Pro/Premium Upsell',
  type: SequenceType.UPSELL,
  description: 'Upgrade Basic users to Pro or Premium',
  targetSegments: [UserSegment.BASIC_TIER, UserSegment.ACTIVE_USER],
  trigger: {
    type: 'event',
    event: 'user.basic_limit_hit'
  },
  exitConditions: [
    { type: 'event', event: 'user.upgrade_to_pro' },
    { type: 'event', event: 'user.upgrade_to_premium' }
  ],
  abTestEnabled: true,
  status: CampaignStatus.ACTIVE,
  emails: [
    {
      id: 'upsell_basic_1',
      sequenceId: 'seq_upsell_basic_v1',
      order: 1,
      delayDays: 0,
      subject: 'Ready for More Bots? Upgrade to PRO',
      templateId: 'upsell_basic_to_pro'
    },
    {
      id: 'upsell_basic_2',
      sequenceId: 'seq_upsell_basic_v1',
      order: 2,
      delayDays: 3,
      subject: 'PRO vs PREMIUM: Which Is Right For You?',
      templateId: 'upsell_pro_vs_premium'
    },
    {
      id: 'upsell_basic_3',
      sequenceId: 'seq_upsell_basic_v1',
      order: 3,
      delayDays: 7,
      subject: 'Upgrade Bonus: Free DropBot Add-on',
      templateId: 'upsell_bonus_offer'
    }
  ],
  createdAt: new Date(),
  updatedAt: new Date()
};

/**
 * ===========================================
 * MILESTONE CELEBRATION SEQUENCE
 * ===========================================
 */
export const MILESTONE_SEQUENCE: DripSequence = {
  id: 'seq_milestones_v1',
  name: 'Milestone Celebrations',
  type: SequenceType.MILESTONE,
  description: 'Celebrate user achievements and milestones',
  targetSegments: [UserSegment.ACTIVE_USER],
  trigger: {
    type: 'event',
    event: 'user.milestone_reached'
  },
  exitConditions: [],
  abTestEnabled: false,
  status: CampaignStatus.ACTIVE,
  emails: [
    {
      id: 'milestone_first_trade',
      sequenceId: 'seq_milestones_v1',
      order: 1,
      delayDays: 0,
      subject: 'Congratulations on Your First Trade!',
      templateId: 'milestone_first_trade',
      conditions: [{ field: 'milestone', operator: 'equals', value: 'first_trade' }]
    },
    {
      id: 'milestone_first_profit',
      sequenceId: 'seq_milestones_v1',
      order: 2,
      delayDays: 0,
      subject: 'You Made Your First Profit! Keep Going!',
      templateId: 'milestone_first_profit',
      conditions: [{ field: 'milestone', operator: 'equals', value: 'first_profit' }]
    },
    {
      id: 'milestone_10_trades',
      sequenceId: 'seq_milestones_v1',
      order: 3,
      delayDays: 0,
      subject: '10 Trades Milestone - You\'re on Fire!',
      templateId: 'milestone_10_trades',
      conditions: [{ field: 'milestone', operator: 'equals', value: '10_trades' }]
    },
    {
      id: 'milestone_100_trades',
      sequenceId: 'seq_milestones_v1',
      order: 4,
      delayDays: 0,
      subject: '100 Trades! You\'re a Trading Machine',
      templateId: 'milestone_100_trades',
      conditions: [{ field: 'milestone', operator: 'equals', value: '100_trades' }]
    },
    {
      id: 'milestone_1000_profit',
      sequenceId: 'seq_milestones_v1',
      order: 5,
      delayDays: 0,
      subject: '$1,000 in Profits - Incredible!',
      templateId: 'milestone_1000_profit',
      conditions: [{ field: 'milestone', operator: 'equals', value: '1000_profit' }]
    },
    {
      id: 'milestone_anniversary',
      sequenceId: 'seq_milestones_v1',
      order: 6,
      delayDays: 0,
      subject: 'Happy 1-Year Anniversary with TIME!',
      templateId: 'milestone_anniversary',
      conditions: [{ field: 'milestone', operator: 'equals', value: 'anniversary' }]
    }
  ],
  createdAt: new Date(),
  updatedAt: new Date()
};

/**
 * ===========================================
 * WINBACK SEQUENCE (Churned Users)
 * ===========================================
 */
export const WINBACK_SEQUENCE: DripSequence = {
  id: 'seq_winback_v1',
  name: 'Churned User Winback',
  type: SequenceType.WINBACK,
  description: 'Win back users who have cancelled their subscription',
  targetSegments: [UserSegment.CHURNED],
  trigger: {
    type: 'event',
    event: 'subscription.cancelled'
  },
  exitConditions: [
    { type: 'event', event: 'subscription.reactivated' },
    { type: 'email_count', maxEmails: 4 }
  ],
  abTestEnabled: true,
  status: CampaignStatus.ACTIVE,
  emails: [
    {
      id: 'winback_1',
      sequenceId: 'seq_winback_v1',
      order: 1,
      delayDays: 1,
      subject: 'We\'re Sorry to See You Go',
      templateId: 'winback_sorry'
    },
    {
      id: 'winback_2',
      sequenceId: 'seq_winback_v1',
      order: 2,
      delayDays: 7,
      subject: 'What Would Bring You Back?',
      templateId: 'winback_survey'
    },
    {
      id: 'winback_3',
      sequenceId: 'seq_winback_v1',
      order: 3,
      delayDays: 30,
      subject: 'We\'ve Made Changes - Give Us Another Try',
      templateId: 'winback_improvements'
    },
    {
      id: 'winback_4',
      sequenceId: 'seq_winback_v1',
      order: 4,
      delayDays: 60,
      subject: 'Special Winback Offer: 50% Off for 3 Months',
      templateId: 'winback_special_offer'
    }
  ],
  createdAt: new Date(),
  updatedAt: new Date()
};

/**
 * ===========================================
 * TRIAL CONVERSION SEQUENCE
 * ===========================================
 */
export const TRIAL_CONVERSION_SEQUENCE: DripSequence = {
  id: 'seq_trial_conversion_v1',
  name: 'Trial to Paid Conversion',
  type: SequenceType.TRIAL_CONVERSION,
  description: 'Convert trial users to paid subscribers before trial ends',
  targetSegments: [UserSegment.NEW_USER],
  trigger: {
    type: 'event',
    event: 'trial.started'
  },
  exitConditions: [
    { type: 'event', event: 'subscription.created' },
    { type: 'goal_reached', goalId: 'trial_conversion' }
  ],
  abTestEnabled: true,
  status: CampaignStatus.ACTIVE,
  emails: [
    {
      id: 'trial_1',
      sequenceId: 'seq_trial_conversion_v1',
      order: 1,
      delayDays: 0,
      subject: 'Your 14-Day Trial Has Begun!',
      templateId: 'trial_welcome'
    },
    {
      id: 'trial_2',
      sequenceId: 'seq_trial_conversion_v1',
      order: 2,
      delayDays: 3,
      subject: 'Day 3: Have You Tried These Features?',
      templateId: 'trial_day_3'
    },
    {
      id: 'trial_3',
      sequenceId: 'seq_trial_conversion_v1',
      order: 3,
      delayDays: 7,
      subject: 'Halfway Through Your Trial - Quick Check-in',
      templateId: 'trial_halfway'
    },
    {
      id: 'trial_4',
      sequenceId: 'seq_trial_conversion_v1',
      order: 4,
      delayDays: 11,
      subject: 'Only 3 Days Left in Your Trial',
      templateId: 'trial_3_days_left'
    },
    {
      id: 'trial_5',
      sequenceId: 'seq_trial_conversion_v1',
      order: 5,
      delayDays: 13,
      subject: 'Tomorrow: Your Trial Ends - Don\'t Lose Access',
      templateId: 'trial_1_day_left'
    },
    {
      id: 'trial_6',
      sequenceId: 'seq_trial_conversion_v1',
      order: 6,
      delayDays: 14,
      subject: 'Trial Ended - Continue Your Journey with 20% Off',
      templateId: 'trial_ended_offer'
    }
  ],
  createdAt: new Date(),
  updatedAt: new Date()
};

/**
 * ===========================================
 * LOYALTY SEQUENCE (Premium Users)
 * ===========================================
 */
export const LOYALTY_SEQUENCE: DripSequence = {
  id: 'seq_loyalty_v1',
  name: 'Premium Loyalty Program',
  type: SequenceType.LOYALTY,
  description: 'Reward and retain premium subscribers',
  targetSegments: [UserSegment.PREMIUM_TIER, UserSegment.ENTERPRISE_TIER],
  trigger: {
    type: 'event',
    event: 'subscription.renewed'
  },
  exitConditions: [],
  abTestEnabled: false,
  status: CampaignStatus.ACTIVE,
  emails: [
    {
      id: 'loyalty_1',
      sequenceId: 'seq_loyalty_v1',
      order: 1,
      delayDays: 0,
      subject: 'Thank You for Being a Premium Member!',
      templateId: 'loyalty_thank_you'
    },
    {
      id: 'loyalty_2',
      sequenceId: 'seq_loyalty_v1',
      order: 2,
      delayDays: 30,
      subject: 'Your Monthly Performance Report',
      templateId: 'loyalty_monthly_report'
    },
    {
      id: 'loyalty_3',
      sequenceId: 'seq_loyalty_v1',
      order: 3,
      delayDays: 90,
      subject: 'VIP Access: New Beta Features',
      templateId: 'loyalty_beta_access'
    }
  ],
  createdAt: new Date(),
  updatedAt: new Date()
};

/**
 * All sequences registry
 */
export const DRIP_SEQUENCES: Record<string, DripSequence> = {
  onboarding: ONBOARDING_SEQUENCE,
  reengagement: REENGAGEMENT_SEQUENCE,
  upsell_free: UPSELL_FREE_SEQUENCE,
  upsell_basic: UPSELL_BASIC_SEQUENCE,
  milestones: MILESTONE_SEQUENCE,
  winback: WINBACK_SEQUENCE,
  trial_conversion: TRIAL_CONVERSION_SEQUENCE,
  loyalty: LOYALTY_SEQUENCE
};

/**
 * Get sequence by ID
 */
export const getSequenceById = (sequenceId: string): DripSequence | null => {
  for (const sequence of Object.values(DRIP_SEQUENCES)) {
    if (sequence.id === sequenceId) {
      return sequence;
    }
  }
  return null;
};

/**
 * Get sequences by type
 */
export const getSequencesByType = (type: SequenceType): DripSequence[] => {
  return Object.values(DRIP_SEQUENCES).filter(seq => seq.type === type);
};

/**
 * Get sequences targeting specific segment
 */
export const getSequencesForSegment = (segment: UserSegment): DripSequence[] => {
  return Object.values(DRIP_SEQUENCES).filter(seq =>
    seq.targetSegments.includes(segment) && seq.status === CampaignStatus.ACTIVE
  );
};

logger.info('Drip sequences loaded', {
  sequenceCount: Object.keys(DRIP_SEQUENCES).length
});
