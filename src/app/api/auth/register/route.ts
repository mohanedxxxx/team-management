import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByEmail } from '@/lib/auth';
import { cookies } from 'next/headers';
import { SignJWT } from 'jose';
import prisma from '@/lib/prisma';
import { randomUUID } from 'crypto';

const SECRET_KEY = process.env.JWT_SECRET || 'team-management-secret-key-2024';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, inviteCode } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'جميع الحقول مطلوبة' },
        { status: 400 }
      );
    }

    // التحقق من عدم وجود المستخدم
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'البريد الإلكتروني مستخدم بالفعل' },
        { status: 400 }
      );
    }

    // إنشاء المستخدم
    const user = await createUser({
      email,
      password,
      name,
    });

    let team = null;

    // إذا كان هناك كود دعوة، ابحث عن الفريق
    if (inviteCode) {
      team = await prisma.team.findUnique({
        where: { inviteCode: inviteCode.toUpperCase() },
      });

      if (!team) {
        // لا توجد مشكلة - المستخدم يمكنه الانضمام لاحقاً
      } else {
        // إنشاء طلب انضمام
        await prisma.joinRequest.create({
          data: {
            teamId: team.id,
            userId: user.id,
          },
        });
      }
    }

    // إنشاء JWT token
    const token = await new SignJWT({ 
      userId: user.id,
      email: user.email,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .setIssuedAt()
      .sign(new TextEncoder().encode(SECRET_KEY));

    // حفظ الـ token في cookies
    const cookieStore = await cookies();
    cookieStore.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    // إذا كان هناك فريق، حفظه كفريق حالي
    if (team) {
      cookieStore.set('current-team-id', team.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
      });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
      },
      message: team 
        ? 'تم إنشاء الحساب وتم إرسال طلب الانضمام للفريق في انتظار الموافقة'
        : 'تم إنشاء الحساب بنجاح',
    });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في التسجيل' },
      { status: 500 }
    );
  }
}
