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

// جلب تفاصيل الاختبار مع الأسئلة
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { order: 'asc' },
        },
        submissions: {
          where: { userId: user.id },
        },
      },
    });

    if (!quiz || quiz.teamId !== user.teamId) {
      return NextResponse.json({ error: 'الاختبار غير موجود' }, { status: 404 });
    }

    // إذا كان المستخدم قد قدم الاختبار بالفعل
    const existingSubmission = quiz.submissions[0];
    if (existingSubmission) {
      // إرجاع النتيجة بدون الإجابات الصحيحة
      return NextResponse.json({
        quiz: {
          id: quiz.id,
          title: quiz.title,
          description: quiz.description,
          timeLimit: quiz.timeLimit,
          submitted: true,
          submission: existingSubmission,
        },
      });
    }

    if (!quiz.isActive) {
      return NextResponse.json({ error: 'الاختبار غير متاح حالياً' }, { status: 400 });
    }

    // إرجاع الأسئلة بدون الإجابات الصحيحة
    const questions = quiz.questions.map((q) => ({
      id: q.id,
      question: q.question,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
    }));

    return NextResponse.json({
      quiz: {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        timeLimit: quiz.timeLimit,
        questionCount: questions.length,
        questions,
        submitted: false,
      },
    });
  } catch (error) {
    console.error('Get quiz error:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}

// تقديم الاختبار
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { answers } = await request.json();

    if (!answers || Object.keys(answers).length === 0) {
      return NextResponse.json({ error: 'الإجابات مطلوبة' }, { status: 400 });
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: {
        questions: true,
      },
    });

    if (!quiz || quiz.teamId !== user.teamId) {
      return NextResponse.json({ error: 'الاختبار غير موجود' }, { status: 404 });
    }

    if (!quiz.isActive) {
      return NextResponse.json({ error: 'الاختبار غير متاح' }, { status: 400 });
    }

    // التحقق من عدم تقديم الاختبار مسبقاً
    const existingSubmission = await prisma.quizSubmission.findUnique({
      where: { quizId_userId: { quizId: id, userId: user.id } },
    });

    if (existingSubmission) {
      return NextResponse.json({ error: 'لقد قمت بتقديم هذا الاختبار مسبقاً' }, { status: 400 });
    }

    // حساب النتيجة
    let score = 0;
    const totalPoints = quiz.questions.length;

    quiz.questions.forEach((question) => {
      const userAnswer = answers[question.id];
      if (userAnswer === question.correctAnswer) {
        score++;
      }
    });

    // حفظ التقديم
    const submission = await prisma.quizSubmission.create({
      data: {
        quizId: id,
        userId: user.id,
        score,
        totalPoints,
        answers: JSON.stringify(answers),
      },
    });

    return NextResponse.json({
      submission: {
        id: submission.id,
        score,
        totalPoints,
        percentage: Math.round((score / totalPoints) * 100),
      },
    });
  } catch (error) {
    console.error('Submit quiz error:', error);
    return NextResponse.json({ error: 'حدث خطأ في تقديم الاختبار' }, { status: 500 });
  }
}
