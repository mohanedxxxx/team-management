import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import prisma from '@/lib/prisma';
import { TaskStatus } from '@prisma/client';

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
    
    // Get all user's teams
    const allMemberships = await prisma.teamMember.findMany({
      where: { userId },
      select: { teamId: true, role: true },
    });
    
    return {
      ...user,
      role: membership.role,
      teamId: currentTeamId,
      teams: allMemberships.map(m => ({ teamId: m.teamId, role: m.role })),
    };
  } catch {
    return null;
  }
}

// الحصول على المهام الكلية
export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const tasks = await prisma.globalTask.findMany({
      where: { teamId: user.teamId },
      include: {
        creator: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Get global tasks error:', error);
    return NextResponse.json({ error: 'حدث خطأ في جلب المهام الكلية' }, { status: 500 });
  }
}

// إنشاء مهمة كلية جديدة (يمكن أن تكون لعدة فرق للأدمن)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    if (user.role !== 'ADMIN' && user.role !== 'LEADER') {
      return NextResponse.json({ error: 'غير مصرح لك بإنشاء مهام كلية' }, { status: 403 });
    }

    const { title, description, priority, dueDate, teamIds } = await request.json();

    if (!title) {
      return NextResponse.json({ error: 'عنوان المهمة مطلوب' }, { status: 400 });
    }

    // Determine which teams to create tasks for
    let targetTeamIds: string[] = [];
    
    if (user.role === 'ADMIN' && teamIds && teamIds.length > 0) {
      // Admin can create tasks for multiple teams
      targetTeamIds = teamIds;
    } else {
      // Leader can only create tasks for current team
      targetTeamIds = [user.teamId];
    }

    // Create tasks for each team
    const tasks = await Promise.all(
      targetTeamIds.map(teamId =>
        prisma.globalTask.create({
          data: {
            title,
            description,
            priority: priority || 1,
            dueDate: dueDate ? new Date(dueDate) : null,
            creatorId: user.id,
            teamId,
          },
          include: {
            creator: { select: { id: true, name: true, email: true } },
          },
        })
      )
    );

    return NextResponse.json({ 
      tasks, 
      count: tasks.length,
      message: tasks.length > 1 ? `تم إنشاء المهمة في ${tasks.length} فرق` : 'تم إنشاء المهمة'
    });
  } catch (error) {
    console.error('Create global task error:', error);
    return NextResponse.json({ error: 'حدث خطأ في إنشاء المهمة الكلية' }, { status: 500 });
  }
}

// تحديث المهمة الكلية
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { id, title, description, status, priority, dueDate } = await request.json();

    const task = await prisma.globalTask.findUnique({ where: { id } });
    if (!task || task.teamId !== user.teamId) {
      return NextResponse.json({ error: 'المهمة غير موجودة' }, { status: 404 });
    }

    const canFullyUpdate = user.role === 'ADMIN' || user.role === 'LEADER';

    const updateData: {
      title?: string;
      description?: string;
      status?: TaskStatus;
      priority?: number;
      dueDate?: Date | null;
    } = {};

    if (canFullyUpdate) {
      if (title) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (priority) updateData.priority = priority;
      if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    }

    if (status) updateData.status = status as TaskStatus;

    const updatedTask = await prisma.globalTask.update({
      where: { id },
      data: updateData,
      include: {
        creator: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ task: updatedTask });
  } catch (error) {
    console.error('Update global task error:', error);
    return NextResponse.json({ error: 'حدث خطأ في تحديث المهمة الكلية' }, { status: 500 });
  }
}

// حذف المهمة الكلية
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'معرف المهمة مطلوب' }, { status: 400 });
    }

    const task = await prisma.globalTask.findUnique({ where: { id } });
    if (!task || task.teamId !== user.teamId) {
      return NextResponse.json({ error: 'المهمة غير موجودة' }, { status: 404 });
    }

    if (user.role !== 'ADMIN' && user.role !== 'LEADER') {
      return NextResponse.json({ error: 'غير مصرح لك بحذف المهام الكلية' }, { status: 403 });
    }

    await prisma.globalTask.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete global task error:', error);
    return NextResponse.json({ error: 'حدث خطأ في حذف المهمة الكلية' }, { status: 500 });
  }
}
