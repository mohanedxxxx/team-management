import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import prisma from '@/lib/prisma';

const SECRET_KEY = process.env.JWT_SECRET || 'team-management-secret-key-2024';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    const currentTeamId = cookieStore.get('current-team-id')?.value;

    if (!token) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, new TextEncoder().encode(SECRET_KEY));
    const userId = payload.userId as string;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 401 });
    }

    // جلب عضويات الفرق
    const teamMemberships = await prisma.teamMember.findMany({
      where: { userId },
      include: {
        team: {
          select: { id: true, name: true, description: true, inviteCode: true },
        },
      },
    });

    const teams = teamMemberships.map((tm) => ({
      id: tm.team.id,
      name: tm.team.name,
      description: tm.team.description,
      inviteCode: tm.team.inviteCode,
      role: tm.role,
    }));

    // تحديد الفريق الحالي
    let currentTeam = null;
    if (currentTeamId) {
      const currentMembership = teamMemberships.find((tm) => tm.teamId === currentTeamId);
      if (currentMembership) {
        currentTeam = {
          id: currentMembership.team.id,
          name: currentMembership.team.name,
          description: currentMembership.team.description,
          inviteCode: currentMembership.team.inviteCode,
          role: currentMembership.role,
        };
      }
    }
    
    // إذا لم يكن هناك فريق حالي، استخدم أول فريق
    if (!currentTeam && teams.length > 0) {
      currentTeam = teams[0];
    }

    return NextResponse.json({
      user: {
        ...user,
        currentTeam,
        teams,
      },
    });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  }
}
