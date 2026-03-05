import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { db } from '@/lib/db';

const SECRET_KEY = process.env.JWT_SECRET || 'team-management-secret-key-2024';

async function verifyAuth() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return null;
    }

    const { payload } = await jwtVerify(token, new TextEncoder().encode(SECRET_KEY));
    return payload.userId as string;
  } catch {
    return null;
  }
}

// This endpoint is for internal use to send notifications to specific users
export async function POST(request: NextRequest) {
  try {
    const userId = await verifyAuth();
    if (!userId) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const body = await request.json();
    const { userId: targetUserId, title, body: notificationBody, url, type, id } = body;

    if (!targetUserId || !title) {
      return NextResponse.json({ error: 'userId و title مطلوبان' }, { status: 400 });
    }

    // Get all push subscriptions for the user
    const subscriptions = await db.pushSubscription.findMany({
      where: { userId: targetUserId },
    });

    if (subscriptions.length === 0) {
      return NextResponse.json({ message: 'لا يوجد اشتراكات لهذا المستخدم' });
    }

    // Send notification to all subscriptions
    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        sendPushNotification(sub, {
          title,
          body: notificationBody,
          url,
          type,
          id,
        })
      )
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return NextResponse.json({
      success: true,
      sent: successful,
      failed,
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء إرسال الإشعار' }, { status: 500 });
  }
}

interface PushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

interface NotificationPayload {
  title: string;
  body?: string;
  url?: string;
  type?: string;
  id?: string;
}

async function sendPushNotification(
  subscription: PushSubscription,
  payload: NotificationPayload
) {
  // For now, we'll use a simple approach without VAPID
  // In production, you'd use web-push library with VAPID keys
  
  // Since web-push requires VAPID keys and setup, we'll store notifications
  // and the service worker will check for them
  
  // Alternative: Use the service worker's showNotification directly
  // This requires the app to be open or use background sync
  
  // For a complete solution, you would:
  // 1. Generate VAPID keys
  // 2. Use web-push library to send notifications
  // 3. Handle the push event in the service worker
  
  console.log('Would send push notification:', {
    subscription: subscription.endpoint,
    payload,
  });
  
  return { success: true };
}
