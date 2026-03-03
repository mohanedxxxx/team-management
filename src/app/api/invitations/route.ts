import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';
import { randomUUID } from 'crypto';

const SECRET_KEY = process.env.JWT_SECRET || 'team-management-secret-key-2024';

async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  const currentTeamId = cookieStore.get('current-team-id')?.value;
  if (!token) return null;
  
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(SECRET_KEY));
    const userId = payload.userId as string;
    
    const user = await prisma.user.findUnique({ 
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });
    
    if (!user || !currentTeamId) return null;
    
    // جلب عضوية الفريق الحالي
    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: currentTeamId, userId } },
    });
    
    if (!membership) return null;
    
    return {
      ...user,
      role: membership.role,
      teamId: currentTeamId,
    };
  } catch {
    return null;
  }
}

// الحصول على جميع الدعوات
export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!user || (user.role !== 'ADMIN' && user.role !== 'MODERATOR')) {
      return NextResponse.json(
        { error: 'غير مصرح لك بعرض الدعوات' },
        { status: 403 }
      );
    }

    const invitations = await prisma.invitation.findMany({
      where: { teamId: user.teamId },
      include: {
        invitedBy: { select: { id: true, name: true, email: true } },
        acceptedBy: { select: { id: true, name: true, email: true } },
        team: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ invitations });
  } catch (error) {
    console.error('Get invitations error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في جلب الدعوات' },
      { status: 500 }
    );
  }
}

// إنشاء دعوة جديدة
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || (user.role !== 'ADMIN' && user.role !== 'MODERATOR')) {
      return NextResponse.json(
        { error: 'غير مصرح لك بإنشاء دعوات' },
        { status: 403 }
      );
    }

    const { email, role } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'البريد الإلكتروني مطلوب' },
        { status: 400 }
      );
    }

    // التحقق من عدم وجود المستخدم في الفريق
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const existingMembership = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId: user.teamId, userId: existingUser.id } },
      });
      if (existingMembership) {
        return NextResponse.json(
          { error: 'هذا المستخدم عضو بالفعل في الفريق' },
          { status: 400 }
        );
      }
    }

    // التحقق من وجود دعوة سابقة
    const existingInvitation = await prisma.invitation.findFirst({
      where: { email, teamId: user.teamId, status: 'PENDING' },
    });
    if (existingInvitation) {
      return NextResponse.json(
        { error: 'يوجد دعوة سابقة لهذا البريد في هذا الفريق' },
        { status: 400 }
      );
    }

    // تحديد الدور - المودريتور لا يمكنه إنشاء أدمن
    let assignedRole: Role = role || 'MEMBER';
    if (user.role === 'MODERATOR' && (assignedRole === 'ADMIN' || assignedRole === 'LEADER')) {
      assignedRole = 'MEMBER';
    }

    // إنشاء كود الدعوة
    const code = randomUUID().split('-')[0].toUpperCase();

    // تاريخ الانتهاء (7 أيام)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await prisma.invitation.create({
      data: {
        email,
        code,
        role: assignedRole,
        expiresAt,
        teamId: user.teamId,
        invitedById: user.id,
      },
      include: {
        team: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ invitation });
  } catch (error) {
    console.error('Create invitation error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في إنشاء الدعوة' },
      { status: 500 }
    );
  }
}
