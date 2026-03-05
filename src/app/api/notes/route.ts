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

// الحصول على النوتس - كل أعضاء الفريق يشوفوا كل النوتس
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const subject = searchParams.get('subject');

    const whereClause: { teamId: string; subject?: string } = { 
      teamId: user.teamId,
    };
    if (subject) {
      whereClause.subject = subject;
    }

    const notes = await prisma.note.findMany({
      where: whereClause,
      include: {
        author: { select: { id: true, name: true } },
      },
      orderBy: [
        { isPinned: 'desc' },
        { updatedAt: 'desc' },
      ],
    });

    return NextResponse.json({ notes });
  } catch (error) {
    console.error('Get notes error:', error);
    return NextResponse.json({ error: 'حدث خطأ في جلب النوتس' }, { status: 500 });
  }
}

// إنشاء ملاحظة جديدة - فقط الأدمن والليدر والمودريتور
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    // فقط الأدمن والليدر والمودريتور يقدروا يضيفوا نوتس
    if (user.role !== 'ADMIN' && user.role !== 'LEADER' && user.role !== 'MODERATOR') {
      return NextResponse.json({ error: 'غير مصرح لك بإضافة ملاحظات' }, { status: 403 });
    }

    const { title, content, subject, color } = await request.json();

    if (!title || !content) {
      return NextResponse.json({ error: 'العنوان والمحتوى مطلوبان' }, { status: 400 });
    }

    const note = await prisma.note.create({
      data: {
        title,
        content,
        subject: subject || 'عام',
        color: color || '#ffffff',
        authorId: user.id,
        teamId: user.teamId,
      },
      include: {
        author: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ note });
  } catch (error) {
    console.error('Create note error:', error);
    return NextResponse.json({ error: 'حدث خطأ في إنشاء الملاحظة' }, { status: 500 });
  }
}

// تحديث الملاحظة - الأدمن والليدر والمودريتور يقدروا يعدلوا أي ملاحظة
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { id, title, content, subject, color, isPinned } = await request.json();

    const note = await prisma.note.findUnique({ where: { id } });
    if (!note || note.teamId !== user.teamId) {
      return NextResponse.json({ error: 'الملاحظة غير موجودة' }, { status: 404 });
    }

    // الأدمن والليدر والمودريتور يقدروا يعدلوا أي ملاحظة
    const canManage = user.role === 'ADMIN' || user.role === 'LEADER' || user.role === 'MODERATOR';
    if (!canManage) {
      return NextResponse.json({ error: 'غير مصرح لك بتعديل هذه الملاحظة' }, { status: 403 });
    }

    const updateData: {
      title?: string;
      content?: string;
      subject?: string;
      color?: string;
      isPinned?: boolean;
    } = {};

    if (title) updateData.title = title;
    if (content) updateData.content = content;
    if (subject) updateData.subject = subject;
    if (color) updateData.color = color;
    if (isPinned !== undefined) updateData.isPinned = isPinned;

    const updatedNote = await prisma.note.update({
      where: { id },
      data: updateData,
      include: {
        author: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ note: updatedNote });
  } catch (error) {
    console.error('Update note error:', error);
    return NextResponse.json({ error: 'حدث خطأ في تحديث الملاحظة' }, { status: 500 });
  }
}

// حذف الملاحظة - الأدمن والليدر والمودريتور يقدروا يحذفوا أي ملاحظة
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'معرف الملاحظة مطلوب' }, { status: 400 });
    }

    const note = await prisma.note.findUnique({ where: { id } });
    if (!note || note.teamId !== user.teamId) {
      return NextResponse.json({ error: 'الملاحظة غير موجودة' }, { status: 404 });
    }

    // الأدمن والليدر والمودريتور يقدروا يحذفوا أي ملاحظة
    const canManage = user.role === 'ADMIN' || user.role === 'LEADER' || user.role === 'MODERATOR';
    if (!canManage) {
      return NextResponse.json({ error: 'غير مصرح لك بحذف هذه الملاحظة' }, { status: 403 });
    }

    await prisma.note.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete note error:', error);
    return NextResponse.json({ error: 'حدث خطأ في حذف الملاحظة' }, { status: 500 });
  }
}
