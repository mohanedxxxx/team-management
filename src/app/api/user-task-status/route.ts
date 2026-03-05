import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import prisma from '@/lib/prisma';
import { TaskStatus } from '@prisma/client';

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

// تحديث حالة المستخدم الشخصية للمهمة
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { taskId, status } = await request.json();

    if (!taskId || !status) {
      return NextResponse.json({ error: 'معرف المهمة والحالة مطلوبان' }, { status: 400 });
    }

    // Verify the task exists and user has access
    const task = await prisma.globalTask.findUnique({
      where: { id: taskId },
      include: { team: { include: { members: { where: { userId: user.id } } } } },
    });

    if (!task || task.team.members.length === 0) {
      return NextResponse.json({ error: 'المهمة غير موجودة أو لا تملك صلاحية الوصول' }, { status: 404 });
    }

    // Upsert user's task status
    const userTaskStatus = await prisma.userTaskStatus.upsert({
      where: {
        taskId_userId: { taskId, userId: user.id },
      },
      update: {
        status: status as TaskStatus,
      },
      create: {
        taskId,
        userId: user.id,
        status: status as TaskStatus,
      },
    });

    return NextResponse.json({ success: true, status: userTaskStatus.status });
  } catch (error) {
    console.error('Update user task status error:', error);
    return NextResponse.json({ error: 'حدث خطأ في تحديث حالة المهمة' }, { status: 500 });
  }
}

// الحصول على حالة المستخدم لجميع المهام
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (taskId) {
      // Get status for a specific task
      const userTaskStatus = await prisma.userTaskStatus.findUnique({
        where: {
          taskId_userId: { taskId, userId: user.id },
        },
      });

      return NextResponse.json({ status: userTaskStatus?.status || null });
    } else {
      // Get all user's task statuses
      const statuses = await prisma.userTaskStatus.findMany({
        where: { userId: user.id },
        select: { taskId: true, status: true },
      });

      return NextResponse.json({ statuses });
    }
  } catch (error) {
    console.error('Get user task status error:', error);
    return NextResponse.json({ error: 'حدث خطأ في جلب حالة المهام' }, { status: 500 });
  }
}
