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

export async function POST(request: NextRequest) {
  try {
    const userId = await verifyAuth();
    if (!userId) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const body = await request.json();
    const { endpoint, keys } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: 'بيانات الاشتراك غير مكتملة' }, { status: 400 });
    }

    // Upsert the subscription
    const subscription = await db.pushSubscription.upsert({
      where: { endpoint },
      create: {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userId,
      },
      update: {
        p256dh: keys.p256dh,
        auth: keys.auth,
        userId,
      },
    });

    return NextResponse.json({ success: true, subscription });
  } catch (error) {
    console.error('Error saving push subscription:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء حفظ الاشتراك' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await verifyAuth();
    if (!userId) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json({ error: 'endpoint مطلوب' }, { status: 400 });
    }

    await db.pushSubscription.deleteMany({
      where: {
        endpoint,
        userId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting push subscription:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء حذف الاشتراك' }, { status: 500 });
  }
}
