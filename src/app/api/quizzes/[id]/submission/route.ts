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

// Delete quiz submission (allow retake)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    // Verify quiz belongs to user's team
    const quiz = await prisma.quiz.findUnique({
      where: { id },
    });

    if (!quiz || quiz.teamId !== user.teamId) {
      return NextResponse.json({ error: 'الاختبار غير موجود' }, { status: 404 });
    }

    // Delete the submission
    await prisma.quizSubmission.delete({
      where: {
        quizId_userId: { quizId: id, userId: user.id },
      },
    });

    return NextResponse.json({ message: 'تم حذف الإجابة، يمكنك إعادة الاختبار' });
  } catch (error) {
    console.error('Delete submission error:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}
