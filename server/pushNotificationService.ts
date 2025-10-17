import webpush from 'web-push';
import { storage } from './storage';

// Configure web-push with VAPID details
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    vapidSubject,
    vapidPublicKey,
    vapidPrivateKey
  );
} else {
  console.warn('VAPID keys not configured. Push notifications will not work.');
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  data?: any;
}

export class PushNotificationService {
  /**
   * Send push notification to a specific user
   */
  async sendToUser(
    userId: string,
    organizationId: string,
    payload: PushNotificationPayload
  ): Promise<boolean> {
    try {
      const subscription = await storage.getPushSubscription(userId, organizationId);
      
      if (!subscription) {
        console.log(`No push subscription found for user ${userId}`);
        return false;
      }

      const pushSubscription = JSON.parse(subscription.subscription);
      
      await webpush.sendNotification(
        pushSubscription,
        JSON.stringify(payload)
      );

      console.log(`Push notification sent to user ${userId}`);
      return true;
    } catch (error) {
      console.error(`Error sending push notification to user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Send push notification to multiple users
   */
  async sendToUsers(
    userIds: string[],
    organizationId: string,
    payload: PushNotificationPayload
  ): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    const promises = userIds.map(async (userId) => {
      const success = await this.sendToUser(userId, organizationId, payload);
      if (success) {
        sent++;
      } else {
        failed++;
      }
    });

    await Promise.all(promises);

    return { sent, failed };
  }

  /**
   * Send push notification to all users in an organization
   */
  async sendToOrganization(
    organizationId: string,
    payload: PushNotificationPayload
  ): Promise<{ sent: number; failed: number }> {
    try {
      const subscriptions = await storage.getAllPushSubscriptions(organizationId);
      
      if (subscriptions.length === 0) {
        console.log(`No push subscriptions found for organization ${organizationId}`);
        return { sent: 0, failed: 0 };
      }

      let sent = 0;
      let failed = 0;

      const promises = subscriptions.map(async (subscription) => {
        try {
          const pushSubscription = JSON.parse(subscription.subscription);
          
          await webpush.sendNotification(
            pushSubscription,
            JSON.stringify(payload)
          );

          sent++;
        } catch (error) {
          console.error(`Error sending notification to subscription ${subscription.id}:`, error);
          failed++;
        }
      });

      await Promise.all(promises);

      console.log(`Push notifications sent: ${sent} successful, ${failed} failed`);
      return { sent, failed };
    } catch (error) {
      console.error('Error sending push notifications to organization:', error);
      return { sent: 0, failed: 0 };
    }
  }

  /**
   * Send daily report reminder to users who haven't submitted their report
   */
  async sendDailyReportReminder(
    userIds: string[],
    organizationId: string
  ): Promise<{ sent: number; failed: number }> {
    const payload: PushNotificationPayload = {
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
    };

    return this.sendToUsers(userIds, organizationId, payload);
  }
}

export const pushNotificationService = new PushNotificationService();
