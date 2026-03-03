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

// الحصول على النوتس
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const subject = searchParams.get('subject');

    const whereClause: { authorId: string; teamId: string; subject?: string } = { 
      authorId: user.id,
      teamId: user.teamId,
    };
    if (subject) {
      whereClause.subject = subject;
    }

    const notes = await prisma.note.findMany({
      where: whereClause,
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

// إنشاء ملاحظة جديدة
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
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
    });

    return NextResponse.json({ note });
  } catch (error) {
    console.error('Create note error:', error);
    return NextResponse.json({ error: 'حدث خطأ في إنشاء الملاحظة' }, { status: 500 });
  }
}

// تحديث الملاحظة
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

    if (note.authorId !== user.id) {
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
    });

    return NextResponse.json({ note: updatedNote });
  } catch (error) {
    console.error('Update note error:', error);
    return NextResponse.json({ error: 'حدث خطأ في تحديث الملاحظة' }, { status: 500 });
  }
}

// حذف الملاحظة
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

    if (note.authorId !== user.id) {
      return NextResponse.json({ error: 'غير مصرح لك بحذف هذه الملاحظة' }, { status: 403 });
    }

    await prisma.note.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete note error:', error);
    return NextResponse.json({ error: 'حدث خطأ في حذف الملاحظة' }, { status: 500 });
  }
}
