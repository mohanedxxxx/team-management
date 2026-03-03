import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import prisma from '@/lib/prisma';

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

// Get all subjects for the current team
export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const subjects = await prisma.subject.findMany({
      where: { teamId: user.teamId },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ subjects });
  } catch (error) {
    console.error('Get subjects error:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}

// Create a new subject
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { name, color } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'اسم المادة مطلوب' }, { status: 400 });
    }

    // Check if subject already exists
    const existing = await prisma.subject.findFirst({
      where: { teamId: user.teamId, name: name.trim() },
    });

    if (existing) {
      return NextResponse.json({ error: 'المادة موجودة بالفعل' }, { status: 400 });
    }

    const subject = await prisma.subject.create({
      data: {
        name: name.trim(),
        color: color || '#6366f1',
        teamId: user.teamId,
      },
    });

    return NextResponse.json({ subject });
  } catch (error) {
    console.error('Create subject error:', error);
    return NextResponse.json({ error: 'حدث خطأ في إنشاء المادة' }, { status: 500 });
  }
}

// Delete a subject
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'معرف المادة مطلوب' }, { status: 400 });
    }

    // Check if subject belongs to the team
    const subject = await prisma.subject.findUnique({
      where: { id },
    });

    if (!subject || subject.teamId !== user.teamId) {
      return NextResponse.json({ error: 'المادة غير موجودة' }, { status: 404 });
    }

    await prisma.subject.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'تم حذف المادة' });
  } catch (error) {
    console.error('Delete subject error:', error);
    return NextResponse.json({ error: 'حدث خطأ في حذف المادة' }, { status: 500 });
  }
}
