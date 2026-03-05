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

// تحليلات قائد الفريق - بيانات أعضاء فريقه
export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!user || (user.role !== 'LEADER' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'غير مصرح - للقائد أو الأدمن فقط' }, { status: 403 });
    }

    // جلب أعضاء الفريق مع بياناتهم
    const teamMembers = await prisma.teamMember.findMany({
      where: { teamId: user.teamId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
            createdAt: true,
            quizSubmissions: {
              where: {
                quiz: { teamId: user.teamId }
              },
              include: {
                quiz: {
                  select: { id: true, title: true }
                }
              }
            },
            assignedTasks: {
              where: {
                teamId: user.teamId
              },
              select: { id: true, status: true, title: true }
            }
          }
        }
      },
      orderBy: { joinedAt: 'desc' }
    });

    // جلب اختبارات الفريق
    const quizzes = await prisma.quiz.findMany({
      where: { teamId: user.teamId },
      include: {
        _count: {
          select: { submissions: true, questions: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // معالجة بيانات الأعضاء
    const membersWithStats = teamMembers.map(tm => {
      const u = tm.user;
      
      // حساب متوسط الدرجات
      const totalScore = u.quizSubmissions.reduce((acc, sub) => acc + sub.score, 0);
      const totalPoints = u.quizSubmissions.reduce((acc, sub) => acc + sub.totalPoints, 0);
      const avgScore = totalPoints > 0 ? Math.round((totalScore / totalPoints) * 100) : 0;

      // عدد المهام
      const completedTasks = u.assignedTasks.filter(t => t.status === 'DONE').length;
      const inProgressTasks = u.assignedTasks.filter(t => t.status === 'IN_PROGRESS').length;
      const todoTasks = u.assignedTasks.filter(t => t.status === 'TODO').length;

      return {
        id: u.id,
        email: u.email,
        name: u.name,
        avatar: u.avatar,
        role: tm.role,
        joinedAt: tm.joinedAt,
        stats: {
          totalQuizzes: u.quizSubmissions.length,
          avgScore,
          totalTasks: u.assignedTasks.length,
          completedTasks,
          inProgressTasks,
          todoTasks
        },
        quizSubmissions: u.quizSubmissions.map(sub => ({
          quizId: sub.quizId,
          quizTitle: sub.quiz.title,
          score: sub.score,
          totalPoints: sub.totalPoints,
          percentage: sub.totalPoints > 0 ? Math.round((sub.score / sub.totalPoints) * 100) : 0,
          submittedAt: sub.submittedAt
        }))
      };
    });

    // إحصائيات الفريق
    const teamStats = {
      totalMembers: teamMembers.length,
      totalQuizzes: quizzes.length,
      totalSubmissions: teamMembers.reduce((acc, tm) => acc + tm.user.quizSubmissions.length, 0),
      avgTeamScore: membersWithStats.length > 0 
        ? Math.round(membersWithStats.reduce((acc, m) => acc + m.stats.avgScore, 0) / membersWithStats.length)
        : 0
    };

    return NextResponse.json({ 
      members: membersWithStats, 
      quizzes,
      teamStats 
    });
  } catch (error) {
    console.error('Leader analytics error:', error);
    return NextResponse.json({ error: 'حدث خطأ في جلب التحليلات' }, { status: 500 });
  }
}
