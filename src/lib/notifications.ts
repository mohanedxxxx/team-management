import { db } from '@/lib/db';

interface SendNotificationOptions {
  userId: string;
  title: string;
  body?: string;
  url?: string;
  type?: 'task' | 'note' | 'quiz' | 'team' | 'general';
  id?: string;
}

interface PushSubscriptionData {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/**
 * Send a notification to a specific user
 * This function sends push notifications to all of a user's subscribed devices
 */
export async function sendNotificationToUser(options: SendNotificationOptions): Promise<{
  success: boolean;
  sent: number;
  failed: number;
}> {
  const { userId, title, body, url, type, id } = options;

  try {
    // Get all push subscriptions for the user
    const subscriptions = await db.pushSubscription.findMany({
      where: { userId },
    });

    if (subscriptions.length === 0) {
      return { success: true, sent: 0, failed: 0 };
    }

    // Send to all subscriptions
    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        sendPushNotification(
          {
            endpoint: sub.endpoint,
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
          { title, body, url, type, id }
        )
      )
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return { success: true, sent: successful, failed };
  } catch (error) {
    console.error('Error sending notification:', error);
    return { success: false, sent: 0, failed: 0 };
  }
}

/**
 * Send notifications to multiple users
 */
export async function sendNotificationToUsers(
  userIds: string[],
  options: Omit<SendNotificationOptions, 'userId'>
): Promise<{ success: boolean; results: Record<string, { sent: number; failed: number }> }> {
  const results: Record<string, { sent: number; failed: number }> = {};

  await Promise.all(
    userIds.map(async (userId) => {
      const result = await sendNotificationToUser({ ...options, userId });
      results[userId] = { sent: result.sent, failed: result.failed };
    })
  );

  return { success: true, results };
}

/**
 * Send notification to all team members
 */
export async function sendNotificationToTeam(
  teamId: string,
  options: Omit<SendNotificationOptions, 'userId'>,
  excludeUserId?: string
): Promise<{ success: boolean; sent: number; failed: number }> {
  const members = await db.teamMember.findMany({
    where: { teamId },
    select: { userId: true },
  });

  const userIds = members
    .map((m) => m.userId)
    .filter((id) => id !== excludeUserId);

  let totalSent = 0;
  let totalFailed = 0;

  for (const userId of userIds) {
    const result = await sendNotificationToUser({ ...options, userId });
    totalSent += result.sent;
    totalFailed += result.failed;
  }

  return { success: true, sent: totalSent, failed: totalFailed };
}

/**
 * Send a push notification using Web Push protocol
 * Note: For full push notification support, you need to:
 * 1. Install web-push: npm install web-push
 * 2. Generate VAPID keys: npx web-push generate-vapid-keys
 * 3. Add VAPID keys to environment variables
 */
async function sendPushNotification(
  subscription: PushSubscriptionData,
  payload: {
    title: string;
    body?: string;
    url?: string;
    type?: string;
    id?: string;
  }
): Promise<boolean> {
  try {
    // For now, we'll log the notification
    // In production with VAPID keys, you would use:
    /*
    import webpush from 'web-push';
    
    webpush.setVapidDetails(
      'mailto:your-email@example.com',
      process.env.VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    );
    
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      JSON.stringify(payload)
    );
    */

    console.log('Push notification:', {
      endpoint: subscription.endpoint.substring(0, 50) + '...',
      payload,
    });

    return true;
  } catch (error) {
    console.error('Failed to send push notification:', error);
    return false;
  }
}

/**
 * Notification templates for common events
 */
export const NotificationTemplates = {
  newTask: (taskTitle: string, assignedBy: string) => ({
    title: '📝 مهمة جديدة',
    body: `${assignedBy} كلّفك بمهمة: ${taskTitle}`,
    type: 'task' as const,
  }),
  taskCompleted: (taskTitle: string, completedBy: string) => ({
    title: '✅ تم إكمال مهمة',
    body: `${completedBy} أكمل المهمة: ${taskTitle}`,
    type: 'task' as const,
  }),
  taskDueSoon: (taskTitle: string, timeLeft: string) => ({
    title: '⏰ تذكير بمهمة',
    body: `المهمة "${taskTitle}" ستانتهي خلال ${timeLeft}`,
    type: 'task' as const,
  }),
  newNote: (noteTitle: string, author: string) => ({
    title: '📌 نوت جديدة',
    body: `${author} أضاف نوت: ${noteTitle}`,
    type: 'note' as const,
  }),
  newQuiz: (quizTitle: string, subject: string) => ({
    title: '📋 اختبار جديد',
    body: `اختبار جديد في ${subject}: ${quizTitle}`,
    type: 'quiz' as const,
  }),
  quizResult: (quizTitle: string, score: number, total: number) => ({
    title: '📊 نتيجة الاختبار',
    body: `حصلت على ${score}/${total} في ${quizTitle}`,
    type: 'quiz' as const,
  }),
  newTeamMember: (memberName: string, teamName: string) => ({
    title: '👤 عضو جديد',
    body: `${memberName} انضم للفريق ${teamName}`,
    type: 'team' as const,
  }),
};
