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

// Get quiz review with correct answers
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

    // Get the quiz submission
    const submission = await prisma.quizSubmission.findUnique({
      where: {
        quizId_userId: { quizId: id, userId: user.id },
      },
    });

    if (!submission) {
      return NextResponse.json({ error: 'لم تقم بتقديم هذا الاختبار' }, { status: 404 });
    }

    // Get the quiz with questions
    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!quiz) {
      return NextResponse.json({ error: 'الاختبار غير موجود' }, { status: 404 });
    }

    // Parse user answers
    const userAnswers = JSON.parse(submission.answers) as Record<string, string>;

    // Format questions with correct answers
    const questions = quiz.questions.map(q => ({
      id: q.id,
      question: q.question,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      correctAnswer: q.correctAnswer,
    }));

    return NextResponse.json({
      questions,
      userAnswers,
      score: submission.score,
      totalPoints: submission.totalPoints,
    });
  } catch (error) {
    console.error('Get quiz review error:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}
