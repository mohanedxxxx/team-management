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

// جلب جميع الاختبارات
export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const quizzes = await prisma.quiz.findMany({
      where: { teamId: user.teamId },
      include: {
        subject: {
          select: { id: true, name: true, color: true },
        },
        _count: {
          select: { questions: true, submissions: true },
        },
        submissions: {
          where: { userId: user.id },
          select: { id: true, score: true, totalPoints: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedQuizzes = quizzes.map((quiz) => ({
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      timeLimit: quiz.timeLimit,
      isActive: quiz.isActive,
      subjectId: quiz.subjectId,
      subject: quiz.subject,
      questionCount: quiz._count.questions,
      submissionCount: quiz._count.submissions,
      mySubmission: quiz.submissions[0] || null,
      createdAt: quiz.createdAt,
    }));

    return NextResponse.json({ quizzes: formattedQuizzes });
  } catch (error) {
    console.error('Get quizzes error:', error);
    return NextResponse.json({ error: 'حدث خطأ في جلب الاختبارات' }, { status: 500 });
  }
}

// إنشاء اختبار جديد
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    if (user.role !== 'ADMIN' && user.role !== 'LEADER') {
      return NextResponse.json({ error: 'غير مصرح لك بإنشاء اختبارات' }, { status: 403 });
    }

    const { title, description, timeLimit, subjectId, questions } = await request.json();

    if (!title || !questions || questions.length === 0) {
      return NextResponse.json({ error: 'العنوان والأسئلة مطلوبة' }, { status: 400 });
    }

    // Verify subject belongs to team if provided
    if (subjectId) {
      const subject = await prisma.subject.findUnique({
        where: { id: subjectId },
      });
      if (!subject || subject.teamId !== user.teamId) {
        return NextResponse.json({ error: 'المادة غير موجودة' }, { status: 400 });
      }
    }

    const quiz = await prisma.quiz.create({
      data: {
        title,
        description,
        timeLimit,
        subjectId: subjectId || null,
        teamId: user.teamId,
        questions: {
          create: questions.map((q: { question: string; optionA: string; optionB: string; optionC: string; optionD: string; correctAnswer: string; correctText?: string }, index: number) => ({
            question: q.question,
            optionA: q.optionA,
            optionB: q.optionB,
            optionC: q.optionC,
            optionD: q.optionD,
            correctAnswer: q.correctAnswer,
            correctText: q.correctText || '',
            order: index,
          })),
        },
      },
      include: {
        questions: true,
        subject: true,
      },
    });

    return NextResponse.json({ quiz });
  } catch (error) {
    console.error('Create quiz error:', error);
    return NextResponse.json({ error: 'حدث خطأ في إنشاء الاختبار' }, { status: 500 });
  }
}

// تحديث اختبار
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    if (user.role !== 'ADMIN' && user.role !== 'LEADER') {
      return NextResponse.json({ error: 'غير مصرح لك بتعديل الاختبارات' }, { status: 403 });
    }

    const { id, title, description, timeLimit, isActive, questions } = await request.json();

    const quiz = await prisma.quiz.findUnique({
      where: { id },
    });

    if (!quiz || quiz.teamId !== user.teamId) {
      return NextResponse.json({ error: 'الاختبار غير موجود' }, { status: 404 });
    }

    // تحديث الاختبار
    if (title || description !== undefined || timeLimit !== undefined || isActive !== undefined) {
      await prisma.quiz.update({
        where: { id },
        data: {
          ...(title && { title }),
          ...(description !== undefined && { description }),
          ...(timeLimit !== undefined && { timeLimit }),
          ...(isActive !== undefined && { isActive }),
        },
      });
    }

    // تحديث الأسئلة إذا تم توفيرها
    if (questions && questions.length > 0) {
      // حذف الأسئلة القديمة
      await prisma.question.deleteMany({
        where: { quizId: id },
      });

      // إنشاء أسئلة جديدة
      await prisma.question.createMany({
        data: questions.map((q: { question: string; optionA: string; optionB: string; optionC: string; optionD: string; correctAnswer: string; correctText?: string }, index: number) => ({
          quizId: id,
          question: q.question,
          optionA: q.optionA,
          optionB: q.optionB,
          optionC: q.optionC,
          optionD: q.optionD,
          correctAnswer: q.correctAnswer,
          correctText: q.correctText || '',
          order: index,
        })),
      });
    }

    return NextResponse.json({ message: 'تم تحديث الاختبار' });
  } catch (error) {
    console.error('Update quiz error:', error);
    return NextResponse.json({ error: 'حدث خطأ في تحديث الاختبار' }, { status: 500 });
  }
}

// حذف اختبار
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    if (user.role !== 'ADMIN' && user.role !== 'LEADER') {
      return NextResponse.json({ error: 'غير مصرح لك بحذف الاختبارات' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'معرف الاختبار مطلوب' }, { status: 400 });
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id },
    });

    if (!quiz || quiz.teamId !== user.teamId) {
      return NextResponse.json({ error: 'الاختبار غير موجود' }, { status: 404 });
    }

    await prisma.quiz.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'تم حذف الاختبار' });
  } catch (error) {
    console.error('Delete quiz error:', error);
    return NextResponse.json({ error: 'حدث خطأ في حذف الاختبار' }, { status: 500 });
  }
}
