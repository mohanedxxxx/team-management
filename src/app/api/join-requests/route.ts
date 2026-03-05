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

// الحصول على طلبات الانضمام للفريق
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');

    if (!teamId) {
      // جلب كل طلبات المستخدم
      const requests = await prisma.joinRequest.findMany({
        where: { userId: user.id },
        include: {
          team: { select: { id: true, name: true, description: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json({ requests });
    }

    // التحقق من الصلاحيات
    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: user.id } },
    });

    if (!membership || (membership.role !== 'ADMIN' && membership.role !== 'LEADER')) {
      return NextResponse.json({ error: 'غير مصرح لك بعرض الطلبات' }, { status: 403 });
    }

    // جلب طلبات الفريق
    const requests = await prisma.joinRequest.findMany({
      where: { teamId },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } },
        reviewedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ requests });
  } catch (error) {
    console.error('Get join requests error:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}

// طلب الانضمام لفريق
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { inviteCode, message } = await request.json();

    if (!inviteCode) {
      return NextResponse.json({ error: 'كود الدعوة مطلوب' }, { status: 400 });
    }

    // البحث عن الفريق
    const team = await prisma.team.findUnique({
      where: { inviteCode },
    });

    if (!team) {
      return NextResponse.json({ error: 'كود الدعوة غير صالح' }, { status: 404 });
    }

    // التحقق من عدم العضوية
    const existingMembership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: team.id, userId: user.id } },
    });

    if (existingMembership) {
      return NextResponse.json({ error: 'أنت عضو بالفعل في هذا الفريق' }, { status: 400 });
    }

    // التحقق من عدم وجود طلب سابق
    const existingRequest = await prisma.joinRequest.findUnique({
      where: { teamId_userId: { teamId: team.id, userId: user.id } },
    });

    if (existingRequest && existingRequest.status === 'PENDING') {
      return NextResponse.json({ error: 'لديك طلب انضمام معلق بالفعل' }, { status: 400 });
    }

    // إنشاء طلب الانضمام
    const joinRequest = await prisma.joinRequest.create({
      data: {
        teamId: team.id,
        userId: user.id,
        message,
      },
    });

    return NextResponse.json({ 
      request: joinRequest,
      message: 'تم إرسال طلب الانضمام، في انتظار الموافقة'
    });
  } catch (error) {
    console.error('Create join request error:', error);
    return NextResponse.json({ error: 'حدث خطأ في إرسال الطلب' }, { status: 500 });
  }
}

// الموافقة أو الرفض على طلب
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { requestId, action, role } = await request.json();

    if (!requestId || !action) {
      return NextResponse.json({ error: 'البيانات غير كاملة' }, { status: 400 });
    }

    const joinRequest = await prisma.joinRequest.findUnique({
      where: { id: requestId },
      include: { team: true },
    });

    if (!joinRequest) {
      return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 });
    }

    // التحقق من الصلاحيات
    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: joinRequest.teamId, userId: user.id } },
    });

    if (!membership || (membership.role !== 'ADMIN' && membership.role !== 'LEADER')) {
      return NextResponse.json({ error: 'غير مصرح لك بالموافقة على الطلبات' }, { status: 403 });
    }

    if (action === 'approve') {
      // الموافقة وإضافة العضو
      await prisma.$transaction([
        prisma.joinRequest.update({
          where: { id: requestId },
          data: {
            status: 'APPROVED',
            reviewedById: user.id,
            reviewedAt: new Date(),
          },
        }),
        prisma.teamMember.create({
          data: {
            teamId: joinRequest.teamId,
            userId: joinRequest.userId,
            role: role || 'MEMBER',
          },
        }),
      ]);

      return NextResponse.json({ message: 'تم قبول العضو في الفريق' });
    } else if (action === 'reject') {
      // الرفض
      await prisma.joinRequest.update({
        where: { id: requestId },
        data: {
          status: 'REJECTED',
          reviewedById: user.id,
          reviewedAt: new Date(),
        },
      });

      return NextResponse.json({ message: 'تم رفض الطلب' });
    }

    return NextResponse.json({ error: 'إجراء غير صالح' }, { status: 400 });
  } catch (error) {
    console.error('Update join request error:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}
