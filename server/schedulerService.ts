import * as cron from 'node-cron';
import { storage } from './storage';
import { pushNotificationService } from './pushNotificationService';
import { getTodayISO } from '@shared/dateUtils';
import { db } from './db';
import { pushSubscriptions, users, dailyReports } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

export class SchedulerService {
  private dailyReminderJob: cron.ScheduledTask | null = null;

  /**
   * Start the daily report reminder scheduler
   * Runs every day at 19:00 (7:00 PM)
   */
  start() {
    // Schedule: 0 19 * * * means at 19:00 every day
    // Format: minute hour day month dayOfWeek
    this.dailyReminderJob = cron.schedule('0 19 * * *', async () => {
      console.log('[Scheduler] Running daily report reminder at 19:00');
      await this.checkAndSendDailyReportReminders();
    });

    console.log('[Scheduler] Daily report reminder scheduler started (19:00 every day)');
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.dailyReminderJob) {
      this.dailyReminderJob.stop();
      console.log('[Scheduler] Daily report reminder scheduler stopped');
    }
  }

  /**
   * Check for missing daily reports and send reminders
   */
  async checkAndSendDailyReportReminders() {
    try {
      const today = getTodayISO();
      console.log(`[Scheduler] Checking for missing daily reports on ${today}`);

      // Get all push subscriptions with user information
      const subscriptionsWithUsers = await db
        .select({
          subscription: pushSubscriptions,
          user: users
        })
        .from(pushSubscriptions)
        .innerJoin(users, eq(pushSubscriptions.userId, users.id))
        .where(eq(users.role, 'employee')); // Only employees need reminders

      if (subscriptionsWithUsers.length === 0) {
        console.log('[Scheduler] No push subscriptions found for employees');
        return;
      }

      console.log(`[Scheduler] Found ${subscriptionsWithUsers.length} employee subscriptions to check`);

      let sent = 0;
      let failed = 0;
      let skipped = 0;

      // Check each employee's report status
      for (const { subscription, user } of subscriptionsWithUsers) {
        try {
          // Check if user has submitted report for today
          const todayReport = await db
            .select()
            .from(dailyReports)
            .where(
              and(
                eq(dailyReports.employeeId, user.id),
                eq(dailyReports.date, today)
              )
            )
            .limit(1);

          if (todayReport.length > 0) {
            // User has already submitted report, skip
            skipped++;
            console.log(`[Scheduler] User ${user.fullName} has already submitted report, skipping`);
            continue;
          }

          // User hasn't submitted report, send reminder
          if (!user.organizationId) {
            console.error(`[Scheduler] User ${user.id} has no organizationId`);
            failed++;
            continue;
          }

          const success = await pushNotificationService.sendToUser(
            user.id,
            user.organizationId,
            {
              title: 'Promemoria Rapportino',
              body: 'Ricordati di compilare il rapportino giornaliero prima della fine della giornata!',
              icon: '/icon-192.png',
              badge: '/badge-72.png',
              tag: 'daily-report-reminder',
              requireInteraction: true,
              data: {
                url: '/',
                type: 'daily-report-reminder'
              }
            }
          );

          if (success) {
            sent++;
            console.log(`[Scheduler] Reminder sent to ${user.fullName}`);
          } else {
            failed++;
          }
        } catch (error) {
          console.error(`[Scheduler] Error processing user ${user.id}:`, error);
          failed++;
        }
      }

      console.log(`[Scheduler] Reminder check complete: ${sent} sent, ${skipped} skipped (already submitted), ${failed} failed`);
    } catch (error) {
      console.error('[Scheduler] Error checking and sending daily report reminders:', error);
    }
  }

  /**
   * Manually trigger the reminder check (for testing)
   */
  async triggerManualCheck() {
    console.log('[Scheduler] Manual trigger of daily report reminder check');
    await this.checkAndSendDailyReportReminders();
  }
}

export const schedulerService = new SchedulerService();
