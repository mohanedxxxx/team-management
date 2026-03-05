import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';

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

// تحديث دور المستخدم
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id: targetUserId } = await params;
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'غير مصرح - للأدمن فقط' }, { status: 403 });
    }

    const body = await request.json();
    const { role, teamId } = body;

    if (!role || !['ADMIN', 'LEADER', 'MODERATOR', 'MEMBER'].includes(role)) {
      return NextResponse.json({ error: 'دور غير صالح' }, { status: 400 });
    }

    // تحديث الدور في فريق معين
    const membership = await prisma.teamMember.update({
      where: {
        teamId_userId: {
          teamId: teamId || user.teamId,
          userId: targetUserId
        }
      },
      data: { role: role as Role }
    });

    return NextResponse.json({ success: true, membership });
  } catch (error) {
    console.error('Update user role error:', error);
    return NextResponse.json({ error: 'حدث خطأ في تحديث الدور' }, { status: 500 });
  }
}

// إزالة مستخدم من فريق
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id: targetUserId } = await params;
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'غير مصرح - للأدمن فقط' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId') || user.teamId;

    await prisma.teamMember.delete({
      where: {
        teamId_userId: {
          teamId,
          userId: targetUserId
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Remove user error:', error);
    return NextResponse.json({ error: 'حدث خطأ في إزالة المستخدم' }, { status: 500 });
  }
}
