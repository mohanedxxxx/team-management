import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';

const SECRET_KEY = process.env.JWT_SECRET || 'team-management-secret-key-2024';

async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) return null;
  
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(SECRET_KEY));
    const userId = payload.userId as string;
    
    const user = await prisma.user.findUnique({ 
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });
    
    if (!user) return null;
    
    // التحقق من أن المستخدم أدمن في أي فريق
    const adminMembership = await prisma.teamMember.findFirst({
      where: { userId, role: 'ADMIN' }
    });
    
    if (!adminMembership) return null;
    
    return { ...user, isAdmin: true };
  } catch {
    return null;
  }
}

// إضافة مستخدم لفريق
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'غير مصرح - للأدمن فقط' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, teamId, role = 'MEMBER' } = body;

    if (!userId || !teamId) {
      return NextResponse.json({ error: 'userId و teamId مطلوبان' }, { status: 400 });
    }

    // التحقق من وجود المستخدم
    const targetUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
    }

    // التحقق من وجود الفريق
    const team = await prisma.team.findUnique({
      where: { id: teamId }
    });

    if (!team) {
      return NextResponse.json({ error: 'الفريق غير موجود' }, { status: 404 });
    }

    // التحقق من عدم وجود العضو مسبقاً
    const existingMembership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } }
    });

    if (existingMembership) {
      return NextResponse.json({ error: 'المستخدم موجود بالفعل في هذا الفريق' }, { status: 400 });
    }

    // إضافة المستخدم للفريق
    const membership = await prisma.teamMember.create({
      data: {
        userId,
        teamId,
        role: role as Role
      },
      include: {
        team: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } }
      }
    });

    return NextResponse.json({ success: true, membership });
  } catch (error) {
    console.error('Add user to team error:', error);
    return NextResponse.json({ error: 'حدث خطأ في إضافة المستخدم للفريق' }, { status: 500 });
  }
}
