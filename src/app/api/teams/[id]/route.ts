import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import prisma from '@/lib/prisma';

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
    
    return user;
  } catch {
    return null;
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    // Check if user is admin of this team
    const membership = await prisma.teamMember.findFirst({
      where: { teamId: id, userId: user.id, role: 'ADMIN' },
    });

    if (!membership) {
      return NextResponse.json({ error: 'غير مصرح لك بحذف هذا الفريق' }, { status: 403 });
    }

    // Delete team (cascade will delete all related data)
    await prisma.team.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'تم حذف الفريق' });
  } catch (error) {
    console.error('Delete team error:', error);
    return NextResponse.json({ error: 'حدث خطأ في حذف الفريق' }, { status: 500 });
  }
}
