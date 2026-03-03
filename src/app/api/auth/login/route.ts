import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, verifyPassword } from '@/lib/auth';
import { cookies } from 'next/headers';
import { SignJWT } from 'jose';
import prisma from '@/lib/prisma';

const SECRET_KEY = process.env.JWT_SECRET || 'team-management-secret-key-2024';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'البريد الإلكتروني وكلمة المرور مطلوبان' },
        { status: 400 }
      );
    }

    const user = await getUserByEmail(email);

    if (!user) {
      return NextResponse.json(
        { error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' },
        { status: 401 }
      );
    }

    const isValidPassword = await verifyPassword(password, user.password);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' },
        { status: 401 }
      );
    }

    // جلب عضويات الفرق
    const teamMemberships = await prisma.teamMember.findMany({
      where: { userId: user.id },
      include: {
        team: {
          select: { id: true, name: true, description: true, inviteCode: true },
        },
      },
    });

    const teams = teamMemberships.map((tm) => ({
      id: tm.team.id,
      name: tm.team.name,
      description: tm.team.description,
      inviteCode: tm.team.inviteCode,
      role: tm.role,
    }));

    // تحديد الفريق الحالي
    let currentTeam = null;
    if (teamMemberships.length > 0) {
      currentTeam = {
        id: teamMemberships[0].team.id,
        name: teamMemberships[0].team.name,
        description: teamMemberships[0].team.description,
        inviteCode: teamMemberships[0].team.inviteCode,
        role: teamMemberships[0].role,
      };
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

    // حفظ الـ token في cookie
    const cookieStore = await cookies();
    cookieStore.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    // حفظ الفريق الحالي إذا كان موجوداً
    if (currentTeam) {
      cookieStore.set('current-team-id', currentTeam.id, {
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
        currentTeam,
        teams,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في تسجيل الدخول' },
      { status: 500 }
    );
  }
}
