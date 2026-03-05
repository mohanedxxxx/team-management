import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

async function verifyToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload as { userId: string };
  } catch {
    return null;
  }
}

// GET - Get comments for a task
export async function GET(request: NextRequest) {
  const user = await verifyToken(request);
  if (!user) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('taskId');

  if (!taskId) {
    return NextResponse.json({ error: 'معرف المهمة مطلوب' }, { status: 400 });
  }

  try {
    const comments = await db.taskComment.findMany({
      where: { taskId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ comments });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}

// POST - Add a new comment
export async function POST(request: NextRequest) {
  const user = await verifyToken(request);
  if (!user) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { taskId, content } = body;

    if (!taskId || !content?.trim()) {
      return NextResponse.json({ error: 'البيانات غير مكتملة' }, { status: 400 });
    }

    // Check if task exists
    const task = await db.globalTask.findUnique({
      where: { id: taskId },
      include: {
        team: {
          include: {
            members: {
              where: { userId: user.userId },
            },
          },
        },
      },
    });

    if (!task || task.team.members.length === 0) {
      return NextResponse.json({ error: 'المهمة غير موجودة أو ليس لديك صلاحية' }, { status: 404 });
    }

    const comment = await db.taskComment.create({
      data: {
        content: content.trim(),
        taskId,
        userId: user.userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    return NextResponse.json({ comment, message: 'تم إضافة التعليق' });
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}

// DELETE - Delete a comment
export async function DELETE(request: NextRequest) {
  const user = await verifyToken(request);
  if (!user) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const commentId = searchParams.get('id');

  if (!commentId) {
    return NextResponse.json({ error: 'معرف التعليق مطلوب' }, { status: 400 });
  }

  try {
    const comment = await db.taskComment.findUnique({
      where: { id: commentId },
      include: {
        task: {
          include: {
            team: {
              include: {
                members: {
                  where: {
                    userId: user.userId,
                    role: { in: ['ADMIN', 'LEADER', 'MODERATOR'] },
                  },
                },
              },
            },
          },
        },
      },
    });

    // Only comment owner or admin/leader/moderator can delete
    const isOwner = comment?.userId === user.userId;
    const hasPrivilege = comment?.task.team.members.length > 0;

    if (!comment || (!isOwner && !hasPrivilege)) {
      return NextResponse.json({ error: 'ليس لديك صلاحية لحذف هذا التعليق' }, { status: 403 });
    }

    await db.taskComment.delete({
      where: { id: commentId },
    });

    return NextResponse.json({ message: 'تم حذف التعليق' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}
