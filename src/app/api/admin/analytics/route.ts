import { NextResponse } from 'next/server';
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

// الحصول على تحليلات شاملة لجميع المستخدمين (للأدمن فقط)
export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'غير مصرح - للأدمن فقط' }, { status: 403 });
    }

    // جلب جميع المستخدمين مع بياناتهم
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        createdAt: true,
        teamMemberships: {
          include: {
            team: {
              select: { id: true, name: true, inviteCode: true }
            }
          }
        },
        quizSubmissions: {
          include: {
            quiz: {
              select: { id: true, title: true, teamId: true }
            }
          }
        },
        assignedTasks: {
          select: { id: true, status: true, title: true }
        },
        _count: {
          select: {
            quizSubmissions: true,
            assignedTasks: true,
            notes: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // حساب إحصائيات كل مستخدم
    const usersWithStats = users.map(u => {
      // متوسط الدرجات
      const totalScore = u.quizSubmissions.reduce((acc, sub) => acc + sub.score, 0);
      const totalPoints = u.quizSubmissions.reduce((acc, sub) => acc + sub.totalPoints, 0);
      const avgScore = totalPoints > 0 ? Math.round((totalScore / totalPoints) * 100) : 0;

      // عدد المهام المكتملة
      const completedTasks = u.assignedTasks.filter(t => t.status === 'DONE').length;
      const inProgressTasks = u.assignedTasks.filter(t => t.status === 'IN_PROGRESS').length;

      return {
        id: u.id,
        email: u.email,
        name: u.name,
        avatar: u.avatar,
        createdAt: u.createdAt,
        teams: u.teamMemberships.map(tm => ({
          id: tm.team.id,
          name: tm.team.name,
          role: tm.role,
          joinedAt: tm.joinedAt
        })),
        stats: {
          totalQuizzes: u._count.quizSubmissions,
          avgScore,
          totalTasks: u._count.assignedTasks,
          completedTasks,
          inProgressTasks,
          totalNotes: u._count.notes
        },
        quizSubmissions: u.quizSubmissions.map(sub => ({
          quizId: sub.quizId,
          quizTitle: sub.quiz.title,
          score: sub.score,
          totalPoints: sub.totalPoints,
          percentage: Math.round((sub.score / sub.totalPoints) * 100),
          submittedAt: sub.submittedAt
        }))
      };
    });

    // إحصائيات عامة
    const totalTeams = await prisma.team.count();
    const totalQuizzes = await prisma.quiz.count();
    const totalSubmissions = await prisma.quizSubmission.count();
    const totalTasks = await prisma.task.count();

    const globalStats = {
      totalUsers: users.length,
      totalTeams,
      totalQuizzes,
      totalSubmissions,
      totalTasks
    };

    return NextResponse.json({ users: usersWithStats, globalStats });
  } catch (error) {
    console.error('Admin analytics error:', error);
    return NextResponse.json({ error: 'حدث خطأ في جلب التحليلات' }, { status: 500 });
  }
}
