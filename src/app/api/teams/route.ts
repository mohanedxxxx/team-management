import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import prisma from '@/lib/prisma';
import { randomUUID } from 'crypto';

const SECRET_KEY = process.env.JWT_SECRET || 'team-management-secret-key-2024';

async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) return null;
  
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(SECRET_KEY));
    const userId = payload.userId as string;
    
    return prisma.user.findUnique({ 
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });
  } catch {
    return null;
  }
}

// الحصول على فرق المستخدم
export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const teamMemberships = await prisma.teamMember.findMany({
      where: { userId: user.id },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            description: true,
            inviteCode: true,
            createdAt: true,
            _count: {
              select: { members: true },
            },
          },
        },
      },
    });

    const teams = teamMemberships.map((tm) => ({
      id: tm.team.id,
      name: tm.team.name,
      description: tm.team.description,
      inviteCode: tm.team.inviteCode,
      createdAt: tm.team.createdAt,
      memberCount: tm.team._count.members,
      role: tm.role,
    }));

    return NextResponse.json({ teams });
  } catch (error) {
    console.error('Get teams error:', error);
    return NextResponse.json({ error: 'حدث خطأ في جلب الفرق' }, { status: 500 });
  }
}

// إنشاء فريق جديد (للأدمن فقط)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    // التحقق من أن المستخدم أدمن في أي فريق
    const adminMembership = await prisma.teamMember.findFirst({
      where: { userId: user.id, role: 'ADMIN' },
    });

    if (!adminMembership) {
      return NextResponse.json({ error: 'فقط مدير النظام يمكنه إنشاء فرق جديدة' }, { status: 403 });
    }

    const { name, description } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'اسم الفريق مطلوب' }, { status: 400 });
    }

    // إنشاء كود دعوة فريد
    const inviteCode = randomUUID().split('-')[0].toUpperCase();

    const team = await prisma.team.create({
      data: {
        name,
        description,
        inviteCode,
        members: {
          create: {
            userId: user.id,
            role: 'ADMIN',
          },
        },
      },
    });

    return NextResponse.json({ team });
  } catch (error) {
    console.error('Create team error:', error);
    return NextResponse.json({ error: 'حدث خطأ في إنشاء الفريق' }, { status: 500 });
  }
}
