import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import prisma from '@/lib/prisma';

const SECRET_KEY = process.env.JWT_SECRET || 'team-management-secret-key-2024';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, new TextEncoder().encode(SECRET_KEY));
    const userId = payload.userId as string;

    const { teamId } = await request.json();

    if (!teamId) {
      return NextResponse.json({ error: 'معرف الفريق مطلوب' }, { status: 400 });
    }

    // التحقق من أن المستخدم عضو في هذا الفريق
    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });

    if (!membership) {
      return NextResponse.json({ error: 'لست عضواً في هذا الفريق' }, { status: 403 });
    }

    // حفظ الفريق الحالي في cookie
    cookieStore.set('current-team-id', teamId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 يوم
      path: '/',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Switch team error:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}
