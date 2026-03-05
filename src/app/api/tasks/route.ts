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
    
    return {
      ...user,
      role: membership.role,
      teamId: currentTeamId,
    };
  } catch {
    return null;
  }
}

// الحصول على المهام
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    let tasks;
    
    if (type === 'assigned') {
      tasks = await prisma.task.findMany({
        where: { teamId: user.teamId, assigneeId: user.id },
        include: {
          creator: { select: { id: true, name: true, email: true } },
          assignee: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else if (type === 'created') {
      tasks = await prisma.task.findMany({
        where: { teamId: user.teamId, creatorId: user.id },
        include: {
          creator: { select: { id: true, name: true, email: true } },
          assignee: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      if (user.role === 'ADMIN' || user.role === 'LEADER') {
        tasks = await prisma.task.findMany({
          where: { teamId: user.teamId },
          include: {
            creator: { select: { id: true, name: true, email: true } },
            assignee: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
        });
      } else {
        tasks = await prisma.task.findMany({
          where: {
            teamId: user.teamId,
            OR: [{ assigneeId: user.id }, { creatorId: user.id }],
          },
          include: {
            creator: { select: { id: true, name: true, email: true } },
            assignee: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
        });
      }
    }

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Get tasks error:', error);
    return NextResponse.json({ error: 'حدث خطأ في جلب المهام' }, { status: 500 });
  }
}

// إنشاء مهمة جديدة
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    if (user.role !== 'ADMIN' && user.role !== 'LEADER') {
      return NextResponse.json({ error: 'غير مصرح لك بإنشاء مهام' }, { status: 403 });
    }

    const { title, description, assigneeId, priority, dueDate } = await request.json();

    if (!title) {
      return NextResponse.json({ error: 'عنوان المهمة مطلوب' }, { status: 400 });
    }

    // التحقق من أن المسند إليه عضو في نفس الفريق
    if (assigneeId) {
      const assigneeMembership = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId: user.teamId, userId: assigneeId } },
      });
      if (!assigneeMembership) {
        return NextResponse.json({ error: 'المستخدم المحدد ليس عضواً في هذا الفريق' }, { status: 400 });
      }
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        assigneeId: assigneeId || null,
        priority: priority || 1,
        dueDate: dueDate ? new Date(dueDate) : null,
        creatorId: user.id,
        teamId: user.teamId,
      },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ task });
  } catch (error) {
    console.error('Create task error:', error);
    return NextResponse.json({ error: 'حدث خطأ في إنشاء المهمة' }, { status: 500 });
  }
}

// تحديث المهمة
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { id, title, description, status, priority, dueDate, assigneeId } = await request.json();

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task || task.teamId !== user.teamId) {
      return NextResponse.json({ error: 'المهمة غير موجودة' }, { status: 404 });
    }

    const canUpdate = user.role === 'ADMIN' || user.role === 'LEADER' || task.assigneeId === user.id;

    if (!canUpdate) {
      return NextResponse.json({ error: 'غير مصرح لك بتعديل هذه المهمة' }, { status: 403 });
    }

    const updateData: {
      title?: string;
      description?: string;
      status?: TaskStatus;
      priority?: number;
      dueDate?: Date | null;
      assigneeId?: string | null;
    } = {};

    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status) updateData.status = status as TaskStatus;
    if (priority) updateData.priority = priority;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (assigneeId !== undefined) updateData.assigneeId = assigneeId;

    const updatedTask = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        creator: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ task: updatedTask });
  } catch (error) {
    console.error('Update task error:', error);
    return NextResponse.json({ error: 'حدث خطأ في تحديث المهمة' }, { status: 500 });
  }
}

// حذف المهمة
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

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task || task.teamId !== user.teamId) {
      return NextResponse.json({ error: 'المهمة غير موجودة' }, { status: 404 });
    }

    if (user.role !== 'ADMIN' && user.role !== 'LEADER' && task.creatorId !== user.id) {
      return NextResponse.json({ error: 'غير مصرح لك بحذف هذه المهمة' }, { status: 403 });
    }

    await prisma.task.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete task error:', error);
    return NextResponse.json({ error: 'حدث خطأ في حذف المهمة' }, { status: 500 });
  }
}
