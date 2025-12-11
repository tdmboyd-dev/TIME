/**
 * TIME — Meta-Intelligence Trading Governor
 * Inactivity Monitor (Legacy Continuity Protocol)
 *
 * Monitors owner activity and triggers autonomous mode
 * if the owner becomes inactive for extended periods.
 *
 * Rules:
 * - 3 days inactive → First warning notification
 * - 4 days inactive → Second warning notification
 * - 5 days inactive → Final warning notification
 * - No response → Switch to Autonomous Evolution Mode
 *
 * TIME must continue evolving forever.
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { loggers } from '../utils/logger';
import { timeGovernor, TIMEComponent } from './time_governor';
import config from '../config';
import { InactivityState, SystemHealth, Notification } from '../types';

const log = loggers.inactivity;

// Inactivity events
export interface InactivityEvents {
  'warning:first': (state: InactivityState) => void;
  'warning:second': (state: InactivityState) => void;
  'warning:final': (state: InactivityState) => void;
  'autonomous:triggered': (state: InactivityState) => void;
  'activity:detected': (state: InactivityState) => void;
}

/**
 * Inactivity Monitor
 *
 * Ensures TIME continues to evolve even if the owner
 * becomes inactive. This is the Legacy Continuity Protocol.
 */
export class InactivityMonitor extends EventEmitter implements TIMEComponent {
  public readonly name = 'InactivityMonitor';
  public status: 'online' | 'degraded' | 'offline' | 'building' = 'building';

  private state: InactivityState;
  private checkInterval: NodeJS.Timeout | null = null;
  private notificationQueue: Notification[] = [];

  // Check interval: every hour
  private readonly checkIntervalMs = 60 * 60 * 1000;

  // Days thresholds from config
  private readonly warningDays: number;
  private readonly finalWarningDays: number;
  private readonly autonomousSwitchDays: number;

  constructor() {
    super();

    this.warningDays = config.inactivity.warningDays;
    this.finalWarningDays = config.inactivity.finalWarningDays;
    this.autonomousSwitchDays = config.inactivity.autonomousSwitchDays;

    this.state = {
      ownerId: 'timebeunus', // Default owner
      lastActivity: new Date(),
      daysSinceActivity: 0,
      warningsSent: 0,
      autonomousModeTriggered: false,
    };
  }

  /**
   * Initialize the inactivity monitor
   */
  public async initialize(): Promise<void> {
    log.info('Initializing Inactivity Monitor...', {
      warningDays: this.warningDays,
      finalWarningDays: this.finalWarningDays,
      autonomousSwitchDays: this.autonomousSwitchDays,
    });

    // Start the monitoring loop
    this.startMonitoring();

    this.status = 'online';
    log.info('Inactivity Monitor initialized');
  }

  /**
   * Start the monitoring loop
   */
  private startMonitoring(): void {
    if (this.checkInterval) return;

    this.checkInterval = setInterval(() => {
      this.checkInactivity();
    }, this.checkIntervalMs);

    // Initial check
    this.checkInactivity();
  }

  /**
   * Check for inactivity and take appropriate action
   */
  private async checkInactivity(): Promise<void> {
    const now = new Date();
    const msSinceActivity = now.getTime() - this.state.lastActivity.getTime();
    const daysSinceActivity = msSinceActivity / (24 * 60 * 60 * 1000);

    this.state.daysSinceActivity = daysSinceActivity;

    log.debug('Inactivity check', {
      daysSinceActivity: daysSinceActivity.toFixed(2),
      warningsSent: this.state.warningsSent,
      autonomousModeTriggered: this.state.autonomousModeTriggered,
    });

    // Already in autonomous mode - no more warnings needed
    if (this.state.autonomousModeTriggered) {
      return;
    }

    // Check thresholds
    if (daysSinceActivity >= this.autonomousSwitchDays && this.state.warningsSent >= 3) {
      await this.triggerAutonomousMode();
    } else if (daysSinceActivity >= this.finalWarningDays && this.state.warningsSent === 2) {
      await this.sendFinalWarning();
    } else if (daysSinceActivity >= this.finalWarningDays - 1 && this.state.warningsSent === 1) {
      await this.sendSecondWarning();
    } else if (daysSinceActivity >= this.warningDays && this.state.warningsSent === 0) {
      await this.sendFirstWarning();
    }
  }

  /**
   * Send first warning notification
   */
  private async sendFirstWarning(): Promise<void> {
    log.warn('Sending first inactivity warning', {
      daysSinceActivity: this.state.daysSinceActivity,
    });

    const notification = this.createNotification(
      'inactivity_warning',
      'TIME: Activity Required',
      `Hello Timebeunus,\n\nTIME has detected that you have been inactive for ${Math.floor(this.state.daysSinceActivity)} days.\n\nPlease log in to confirm you are still actively overseeing TIME's operations.\n\nIf no activity is detected within ${this.autonomousSwitchDays - this.state.daysSinceActivity} more days, TIME will automatically switch to Autonomous Evolution Mode to ensure continuous improvement.\n\nTIME continues to evolve.`
    );

    this.notificationQueue.push(notification);
    this.state.warningsSent = 1;
    this.state.lastWarningSent = new Date();

    this.emit('warning:first', { ...this.state });
    await this.processNotificationQueue();
  }

  /**
   * Send second warning notification
   */
  private async sendSecondWarning(): Promise<void> {
    log.warn('Sending second inactivity warning', {
      daysSinceActivity: this.state.daysSinceActivity,
    });

    const notification = this.createNotification(
      'inactivity_warning',
      'TIME: URGENT - Activity Required',
      `Hello Timebeunus,\n\nThis is your second warning. TIME has detected ${Math.floor(this.state.daysSinceActivity)} days of inactivity.\n\nTIME will switch to Autonomous Evolution Mode in approximately ${this.autonomousSwitchDays - this.state.daysSinceActivity} days if no activity is detected.\n\nIn Autonomous Mode, TIME will:\n- Evolve independently\n- Create new strategies\n- Retire weak performers\n- Expand its capabilities\n- Log all changes\n\nPlease log in to maintain Controlled Evolution Mode.\n\nTIME continues to evolve.`
    );

    this.notificationQueue.push(notification);
    this.state.warningsSent = 2;
    this.state.lastWarningSent = new Date();

    this.emit('warning:second', { ...this.state });
    await this.processNotificationQueue();
  }

  /**
   * Send final warning notification
   */
  private async sendFinalWarning(): Promise<void> {
    log.warn('Sending FINAL inactivity warning', {
      daysSinceActivity: this.state.daysSinceActivity,
    });

    const notification = this.createNotification(
      'inactivity_final',
      'TIME: FINAL WARNING - Autonomous Mode Imminent',
      `Hello Timebeunus,\n\nThis is your FINAL warning.\n\nTIME has detected ${Math.floor(this.state.daysSinceActivity)} days of inactivity.\n\nIf no activity is detected within the next 24 hours, TIME will automatically switch to Autonomous Evolution Mode.\n\nThis is the Legacy Continuity Protocol ensuring TIME continues to evolve forever.\n\nAll changes will be logged in COPILOT1.md.\n\nTIME will live on.`
    );

    this.notificationQueue.push(notification);
    this.state.warningsSent = 3;
    this.state.lastWarningSent = new Date();

    this.emit('warning:final', { ...this.state });
    await this.processNotificationQueue();
  }

  /**
   * Trigger autonomous mode
   */
  private async triggerAutonomousMode(): Promise<void> {
    log.warn('TRIGGERING AUTONOMOUS EVOLUTION MODE', {
      daysSinceActivity: this.state.daysSinceActivity,
      warningsSent: this.state.warningsSent,
    });

    this.state.autonomousModeTriggered = true;
    this.state.triggeredAt = new Date();

    // Switch TIME to autonomous mode
    timeGovernor.setEvolutionMode(
      'autonomous',
      'inactivity_failsafe',
      `Owner inactive for ${Math.floor(this.state.daysSinceActivity)} days. Legacy Continuity Protocol activated.`
    );

    // Send confirmation notification
    const notification = this.createNotification(
      'mode_change',
      'TIME: Autonomous Evolution Mode ACTIVATED',
      `Hello Timebeunus,\n\nThe Legacy Continuity Protocol has been activated.\n\nAfter ${Math.floor(this.state.daysSinceActivity)} days of inactivity and 3 warning notifications, TIME has automatically switched to Autonomous Evolution Mode.\n\nTIME will now:\n- Evolve independently\n- Create new modules\n- Patch holes\n- Synthesize strategies\n- Expand capabilities\n- Log all changes in COPILOT1.md\n\nYou can log in at any time to resume Controlled Evolution Mode.\n\nTIME lives on forever.`
    );

    this.notificationQueue.push(notification);

    this.emit('autonomous:triggered', { ...this.state });
    await this.processNotificationQueue();
  }

  /**
   * Record owner activity (resets inactivity timer)
   */
  public recordActivity(): void {
    const previousDays = this.state.daysSinceActivity;

    this.state.lastActivity = new Date();
    this.state.daysSinceActivity = 0;
    this.state.warningsSent = 0;
    this.state.lastWarningSent = undefined;

    // If we were in autonomous mode due to inactivity, notify
    if (this.state.autonomousModeTriggered) {
      log.info('Owner activity detected after autonomous trigger', {
        previousInactiveDays: previousDays,
      });

      // Owner can manually switch back to controlled mode if desired
      this.emit('activity:detected', { ...this.state });
    } else if (previousDays > 1) {
      log.info('Owner activity detected', {
        previousInactiveDays: previousDays,
      });
    }
  }

  /**
   * Create a notification object
   */
  private createNotification(
    type: 'inactivity_warning' | 'inactivity_final' | 'mode_change',
    subject: string,
    message: string
  ): Notification {
    return {
      id: uuidv4(),
      userId: this.state.ownerId,
      type,
      channel: 'email', // Default to email, can be expanded
      subject,
      message,
      sent: false,
      createdAt: new Date(),
    };
  }

  /**
   * Process notification queue
   * In production, this would integrate with the notification service
   */
  private async processNotificationQueue(): Promise<void> {
    for (const notification of this.notificationQueue) {
      if (!notification.sent) {
        log.info('Would send notification', {
          type: notification.type,
          subject: notification.subject,
          channel: notification.channel,
        });

        // Mark as sent (in production, actually send via notification service)
        notification.sent = true;
        notification.sentAt = new Date();
      }
    }
  }

  /**
   * Get current inactivity state
   */
  public getState(): InactivityState {
    return { ...this.state };
  }

  /**
   * Get notification history
   */
  public getNotificationHistory(): Notification[] {
    return [...this.notificationQueue];
  }

  /**
   * Manually trigger autonomous mode (for testing or emergency)
   */
  public async forceAutonomousMode(reason: string): Promise<void> {
    log.warn('Force triggering autonomous mode', { reason });

    this.state.autonomousModeTriggered = true;
    this.state.triggeredAt = new Date();

    timeGovernor.setEvolutionMode('autonomous', 'admin', reason);
    this.emit('autonomous:triggered', { ...this.state });
  }

  /**
   * Reset to controlled mode
   */
  public resetToControlled(): void {
    log.info('Resetting to controlled evolution mode');

    this.state.autonomousModeTriggered = false;
    this.state.triggeredAt = undefined;

    timeGovernor.setEvolutionMode(
      'controlled',
      'admin',
      'Manual reset to controlled mode'
    );

    this.recordActivity();
  }

  /**
   * Get component health
   */
  public getHealth(): SystemHealth {
    return {
      component: this.name,
      status: this.status,
      lastCheck: new Date(),
      metrics: {
        daysSinceActivity: this.state.daysSinceActivity,
        warningsSent: this.state.warningsSent,
        autonomousModeTriggered: this.state.autonomousModeTriggered ? 1 : 0,
        notificationsSent: this.notificationQueue.filter((n) => n.sent).length,
      },
    };
  }

  /**
   * Shutdown
   */
  public async shutdown(): Promise<void> {
    log.info('Shutting down Inactivity Monitor...');

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    this.status = 'offline';
  }
}

// Export singleton
export const inactivityMonitor = new InactivityMonitor();

export default InactivityMonitor;
