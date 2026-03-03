'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Plus,
  Trash2,
  Edit,
  Play,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  HelpCircle,
  FileText,
  User,
  MoreVertical,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Question {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
}

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  timeLimit: number | null;
  isActive: boolean;
  questionCount: number;
  submissionCount: number;
  mySubmission: { id: string; score: number; totalPoints: number } | null;
  createdAt: string;
  questions?: Question[];
  submitted?: boolean;
}

export function QuizzesTab() {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [takeQuizDialogOpen, setTakeQuizDialogOpen] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timeLimit, setTimeLimit] = useState('');
  const [questionsText, setQuestionsText] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [result, setResult] = useState<{ score: number; totalPoints: number } | null>(null);

  const canCreateQuiz = user?.currentTeam?.role === 'ADMIN' || user?.currentTeam?.role === 'LEADER';

  const fetchQuizzes = async () => {
    try {
      const res = await fetch('/api/quizzes');
      const data = await res.json();
      if (res.ok) {
        setQuizzes(data.quizzes);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, []);

  // Timer effect
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev && prev <= 1) {
          handleSubmitQuiz();
          return 0;
        }
        return prev ? prev - 1 : 0;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const parseQuestions = (text: string): { question: string; optionA: string; optionB: string; optionC: string; optionD: string; correctAnswer: string }[] | null => {
    const lines = text.trim().split('\n').filter(line => line.trim());
    const questions: { question: string; optionA: string; optionB: string; optionC: string; optionD: string; correctAnswer: string }[] = [];

    for (const line of lines) {
      const parts = line.split('|').map(p => p.trim());
      if (parts.length !== 6) {
        return null;
      }

      const [question, optionA, optionB, optionC, optionD, correctAnswer] = parts;
      const answer = correctAnswer.toUpperCase();
      
      if (!['A', 'B', 'C', 'D'].includes(answer)) {
        return null;
      }

      questions.push({
        question,
        optionA,
        optionB,
        optionC,
        optionD,
        correctAnswer: answer,
      });
    }

    return questions.length > 0 ? questions : null;
  };

  const handleCreateQuiz = async () => {
    if (!title.trim()) {
      toast.error('العنوان مطلوب');
      return;
    }

    const parsedQuestions = parseQuestions(questionsText);
    if (!parsedQuestions) {
      toast.error('صيغة الأسئلة غير صحيحة. يجب أن يكون كل سؤال في سطر بالشكل: السؤال | أ | ب | ج | د | الإجابة');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          timeLimit: timeLimit ? parseInt(timeLimit) : null,
          questions: parsedQuestions,
        }),
      });

      if (res.ok) {
        toast.success('تم إنشاء الاختبار بنجاح');
        setCreateDialogOpen(false);
        resetForm();
        fetchQuizzes();
      } else {
        const data = await res.json();
        toast.error(data.error || 'حدث خطأ');
      }
    } catch {
      toast.error('حدث خطأ');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الاختبار؟')) return;

    try {
      const res = await fetch(`/api/quizzes?id=${quizId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('تم حذف الاختبار');
        fetchQuizzes();
      }
    } catch {
      toast.error('حدث خطأ');
    }
  };

  const handleToggleQuiz = async (quizId: string, isActive: boolean) => {
    try {
      const res = await fetch('/api/quizzes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: quizId, isActive: !isActive }),
      });

      if (res.ok) {
        toast.success(isActive ? 'تم إيقاف الاختبار' : 'تم تفعيل الاختبار');
        fetchQuizzes();
      }
    } catch {
      toast.error('حدث خطأ');
    }
  };

  const handleStartQuiz = async (quiz: Quiz) => {
    try {
      const res = await fetch(`/api/quizzes/${quiz.id}`);
      const data = await res.json();

      if (data.quiz.submitted) {
        toast.error('لقد قمت بتقديم هذا الاختبار مسبقاً');
        return;
      }

      setCurrentQuiz({
        ...quiz,
        questions: data.quiz.questions,
      });
      setAnswers({});
      setResult(null);

      if (quiz.timeLimit) {
        setTimeLeft(quiz.timeLimit * 60);
      }

      setTakeQuizDialogOpen(true);
    } catch {
      toast.error('حدث خطأ في تحميل الاختبار');
    }
  };

  const handleSubmitQuiz = async () => {
    if (!currentQuiz?.questions) return;

    const allAnswered = currentQuiz.questions.every((q) => answers[q.id]);
    if (!allAnswered && timeLeft !== 0) {
      if (!confirm('لم تُجب على جميع الأسئلة. هل تريد التقديم؟')) {
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/quizzes/${currentQuiz.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });

      const data = await res.json();

      if (res.ok) {
        setResult(data.submission);
        setTimeLeft(null);
      } else {
        toast.error(data.error || 'حدث خطأ');
      }
    } catch {
      toast.error('حدث خطأ');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setTimeLimit('');
    setQuestionsText('');
    setEditingQuiz(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const CreateFormContent = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-slate-300">عنوان الاختبار</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="عنوان الاختبار"
          className="bg-slate-700 border-slate-600 text-white"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-slate-300">الوصف (اختياري)</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="وصف الاختبار"
          className="bg-slate-700 border-slate-600 text-white"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-slate-300">الوقت المحدد (بالدقائق - اختياري)</Label>
        <Input
          type="number"
          value={timeLimit}
          onChange={(e) => setTimeLimit(e.target.value)}
          placeholder="مثال: 30"
          className="bg-slate-700 border-slate-600 text-white"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-slate-300">الأسئلة</Label>
        <Textarea
          value={questionsText}
          onChange={(e) => setQuestionsText(e.target.value)}
          placeholder={`السؤال | أ | ب | ج | د | الإجابة
ما عاصمة مصر؟ | القاهرة | الإسكندرية | الجيزة | أسوان | A
كم عدد أركان الإسلام؟ | 4 | 5 | 6 | 7 | B`}
          className="bg-slate-700 border-slate-600 text-white font-mono text-sm min-h-[200px]"
        />
        <p className="text-xs text-slate-500">
          كل سؤال في سطر منفصل. الصيغة: السؤال | الخيار أ | الخيار ب | الخيار ج | الخيار د | الإجابة (A/B/C/D)
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">الاختبارات</h3>
          <p className="text-sm text-slate-400">اختبارات MCQ للفريق</p>
        </div>
        {canCreateQuiz && (
          <>
            <Dialog open={createDialogOpen} onOpenChange={(open) => { setCreateDialogOpen(open); if (!open) resetForm(); }}>
              <Button className="hidden sm:flex bg-emerald-600 hover:bg-emerald-700" onClick={() => setCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 ml-2" />
                إنشاء اختبار
              </Button>
              <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-white">إنشاء اختبار جديد</DialogTitle>
                  <DialogDescription className="text-slate-400">
                    أدخل بيانات الاختبار والأسئلة
                  </DialogDescription>
                </DialogHeader>
                <CreateFormContent />
                <DialogFooter>
                  <Button
                    onClick={handleCreateQuiz}
                    className="bg-emerald-600 hover:bg-emerald-700"
                    disabled={submitting}
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'إنشاء'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Drawer open={createDialogOpen} onOpenChange={(open) => { setCreateDialogOpen(open); if (!open) resetForm(); }}>
              <Button className="sm:hidden bg-emerald-600 hover:bg-emerald-700" onClick={() => setCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 ml-2" />
                إنشاء
              </Button>
              <DrawerContent className="bg-slate-800 border-t-slate-700">
                <DrawerHeader>
                  <DrawerTitle className="text-white">إنشاء اختبار جديد</DrawerTitle>
                  <DrawerDescription className="text-slate-400">
                    أدخل بيانات الاختبار والأسئلة
                  </DrawerDescription>
                </DrawerHeader>
                <div className="px-4 overflow-y-auto max-h-[60vh]">
                  <CreateFormContent />
                </div>
                <DrawerFooter>
                  <Button
                    onClick={handleCreateQuiz}
                    className="bg-emerald-600 hover:bg-emerald-700"
                    disabled={submitting}
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'إنشاء'}
                  </Button>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          </>
        )}
      </div>

      {/* Quizzes Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {quizzes.map((quiz) => (
          <Card key={quiz.id} className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-5 h-5 text-emerald-500 shrink-0" />
                  <CardTitle className="text-white text-sm truncate">{quiz.title}</CardTitle>
                </div>
                <Badge className={`${quiz.isActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'} shrink-0`}>
                  {quiz.isActive ? 'نشط' : 'متوقف'}
                </Badge>
              </div>
              {quiz.description && (
                <CardDescription className="text-slate-400 text-xs line-clamp-2">
                  {quiz.description}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                <div className="flex items-center gap-1">
                  <HelpCircle className="w-3 h-3" />
                  {quiz.questionCount} سؤال
                </div>
                {quiz.timeLimit && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {quiz.timeLimit} دقيقة
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {quiz.submissionCount} مشارك
                </div>
              </div>

              {quiz.mySubmission && (
                <div className="bg-slate-700/50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-xs">نتيجتك:</span>
                    <span className="text-white font-bold">
                      {quiz.mySubmission.score}/{quiz.mySubmission.totalPoints}
                    </span>
                  </div>
                  <div className="w-full bg-slate-600 rounded-full h-2 mt-2">
                    <div
                      className={`h-2 rounded-full ${
                        (quiz.mySubmission.score / quiz.mySubmission.totalPoints) >= 0.7
                          ? 'bg-green-500'
                          : (quiz.mySubmission.score / quiz.mySubmission.totalPoints) >= 0.5
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${(quiz.mySubmission.score / quiz.mySubmission.totalPoints) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                {!quiz.mySubmission && quiz.isActive && (
                  <Button
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-8 text-xs"
                    onClick={() => handleStartQuiz(quiz)}
                  >
                    <Play className="w-3 h-3 ml-1" />
                    ابدأ الاختبار
                  </Button>
                )}
                {canCreateQuiz && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white shrink-0">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-slate-700 border-slate-600">
                      <DropdownMenuItem
                        onClick={() => handleToggleQuiz(quiz.id, quiz.isActive)}
                        className="text-white cursor-pointer"
                      >
                        {quiz.isActive ? (
                          <>
                            <XCircle className="w-4 h-4 ml-2" />
                            إيقاف
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 ml-2" />
                            تفعيل
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteQuiz(quiz.id)}
                        className="text-red-400 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4 ml-2" />
                        حذف
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {quizzes.length === 0 && (
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">لا توجد اختبارات</p>
        </div>
      )}

      {/* Take Quiz Dialog */}
      <Dialog open={takeQuizDialogOpen} onOpenChange={(open) => { 
        setTakeQuizDialogOpen(open); 
        if (!open) { 
          setTimeLeft(null); 
          setResult(null);
        } 
      }}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center justify-between">
              <span>{currentQuiz?.title}</span>
              {timeLeft !== null && (
                <Badge className={`${timeLeft < 60 ? 'bg-red-500' : 'bg-blue-500'} text-white font-mono`}>
                  {formatTime(timeLeft)}
                </Badge>
              )}
            </DialogTitle>
            {currentQuiz?.description && (
              <DialogDescription className="text-slate-400">
                {currentQuiz.description}
              </DialogDescription>
            )}
          </DialogHeader>

          {result ? (
            <div className="text-center py-8">
              <div className={`w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center ${
                (result.score / result.totalPoints) >= 0.7
                  ? 'bg-green-500/20'
                  : (result.score / result.totalPoints) >= 0.5
                  ? 'bg-yellow-500/20'
                  : 'bg-red-500/20'
              }`}>
                <span className={`text-3xl font-bold ${
                  (result.score / result.totalPoints) >= 0.7
                    ? 'text-green-400'
                    : (result.score / result.totalPoints) >= 0.5
                    ? 'text-yellow-400'
                    : 'text-red-400'
                }`}>
                  {result.score}
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">نتيجتك</h3>
              <p className="text-slate-400">
                {result.score} من {result.totalPoints} ({Math.round((result.score / result.totalPoints) * 100)}%)
              </p>
              <Button
                className="mt-6 bg-emerald-600 hover:bg-emerald-700"
                onClick={() => {
                  setTakeQuizDialogOpen(false);
                  fetchQuizzes();
                }}
              >
                إغلاق
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-6 py-4">
                {currentQuiz?.questions?.map((q, index) => (
                  <div key={q.id} className="bg-slate-700/50 rounded-lg p-4">
                    <p className="text-white font-medium mb-3">
                      {index + 1}. {q.question}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {['A', 'B', 'C', 'D'].map((option) => {
                        const optionKey = `option${option}` as keyof Question;
                        const optionText = q[optionKey] as string;
                        return (
                          <button
                            key={option}
                            onClick={() => setAnswers({ ...answers, [q.id]: option })}
                            className={`p-3 rounded-lg text-right text-sm transition-all ${
                              answers[q.id] === option
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                            }`}
                          >
                            <span className="font-bold ml-2">{option}.</span>
                            {optionText}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button
                  onClick={handleSubmitQuiz}
                  className="bg-emerald-600 hover:bg-emerald-700 w-full"
                  disabled={submitting}
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'تقديم الاختبار'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
