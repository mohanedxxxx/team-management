'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Plus,
  Trash2,
  Play,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  HelpCircle,
  FileText,
  User,
  ChevronLeft,
  FolderOpen,
  Folder,
  Eye,
  ArrowRight,
} from 'lucide-react';

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
  subjectId: string | null;
  subject?: { id: string; name: string; color: string } | null;
  questionCount: number;
  submissionCount: number;
  mySubmission: { id: string; score: number; totalPoints: number } | null;
  createdAt: string;
  questions?: Question[];
  submitted?: boolean;
}

interface Subject {
  id: string;
  name: string;
  color: string;
}

export function QuizzesTab() {
  const { user } = useAuth();
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [takeQuizDialogOpen, setTakeQuizDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [currentSubject, setCurrentSubject] = useState<Subject | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<'subjects' | 'subject'>('subjects');

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTimeLimit, setFormTimeLimit] = useState('');
  const [formSubjectId, setFormSubjectId] = useState<string>('');
  const [formQuestions, setFormQuestions] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [result, setResult] = useState<{ score: number; totalPoints: number; answers: Record<string, string> } | null>(null);

  const canCreateQuiz = user?.currentTeam?.role === 'ADMIN' || user?.currentTeam?.role === 'LEADER';

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [quizzesRes, subjectsRes] = await Promise.all([
        fetch('/api/quizzes'),
        fetch('/api/subjects'),
      ]);
      
      const quizzesData = await quizzesRes.json();
      const subjectsData = await subjectsRes.json();
      
      if (quizzesRes.ok) {
        setQuizzes(quizzesData.quizzes || []);
      }
      if (subjectsRes.ok) {
        setSubjects(subjectsData.subjects || []);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  const parseQuestions = (text: string) => {
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
    if (!formTitle.trim()) {
      toast.error('العنوان مطلوب');
      return;
    }

    const parsedQuestions = parseQuestions(formQuestions);
    if (!parsedQuestions) {
      toast.error('صيغة الأسئلة غير صحيحة. كل سؤال في سطر: السؤال | أ | ب | ج | د | الإجابة');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle,
          description: formDescription,
          timeLimit: formTimeLimit ? parseInt(formTimeLimit) : null,
          subjectId: formSubjectId || null,
          questions: parsedQuestions,
        }),
      });

      if (res.ok) {
        toast.success('تم إنشاء الاختبار بنجاح');
        setCreateDialogOpen(false);
        resetForm();
        fetchData();
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
        fetchData();
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
        fetchData();
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

  const handleViewReview = async (quiz: Quiz) => {
    try {
      const res = await fetch(`/api/quizzes/${quiz.id}/review`);
      const data = await res.json();

      if (res.ok) {
        setCurrentQuiz({
          ...quiz,
          questions: data.questions,
        });
        setResult({
          score: data.score,
          totalPoints: data.totalPoints,
          answers: data.userAnswers,
        });
        setReviewDialogOpen(true);
      } else {
        toast.error(data.error || 'لا يوجد مراجعة متاحة');
      }
    } catch {
      toast.error('حدث خطأ');
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
        setResult({
          score: data.submission.score,
          totalPoints: data.submission.totalPoints,
          answers: answers,
        });
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
    setFormTitle('');
    setFormDescription('');
    setFormTimeLimit('');
    setFormSubjectId('');
    setFormQuestions('');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const openSubjectPage = (subject: Subject) => {
    setCurrentSubject(subject);
    setViewMode('subject');
  };

  const goBackToSubjects = () => {
    setCurrentSubject(null);
    setViewMode('subjects');
  };

  // Group quizzes by subject
  const quizzesBySubject = useMemo(() => {
    const grouped: Record<string, Quiz[]> = [];
    const noSubject: Quiz[] = [];
    
    quizzes.forEach(quiz => {
      if (quiz.subjectId && quiz.subject) {
        if (!grouped[quiz.subjectId]) {
          grouped[quiz.subjectId] = [];
        }
        grouped[quiz.subjectId].push(quiz);
      } else {
        noSubject.push(quiz);
      }
    });
    
    return { grouped, noSubject };
  }, [quizzes]);

  // Get quizzes for current subject
  const currentSubjectQuizzes = useMemo(() => {
    if (!currentSubject) return [];
    return quizzesBySubject.grouped[currentSubject.id] || [];
  }, [currentSubject, quizzesBySubject]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const QuizCard = ({ quiz }: { quiz: Quiz }) => (
    <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <FileText className="w-5 h-5 text-emerald-500 shrink-0" />
            <CardTitle className="text-slate-900 dark:text-white text-sm truncate">{quiz.title}</CardTitle>
          </div>
          <Badge className={`${quiz.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'} shrink-0 text-xs`}>
            {quiz.isActive ? 'نشط' : 'متوقف'}
          </Badge>
        </div>
        {quiz.description && (
          <CardDescription className="text-slate-500 dark:text-slate-400 text-xs line-clamp-2">
            {quiz.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
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
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 text-xs">نتيجتك:</span>
              <span className="text-slate-900 dark:text-white font-bold">
                {quiz.mySubmission.score}/{quiz.mySubmission.totalPoints}
              </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2 mt-2">
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
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-9 text-xs"
              onClick={() => handleStartQuiz(quiz)}
            >
              <Play className="w-3 h-3 ml-1" />
              ابدأ
            </Button>
          )}
          {quiz.mySubmission && (
            <Button
              variant="outline"
              className="flex-1 h-9 text-xs border-slate-200 dark:border-slate-600"
              onClick={() => handleViewReview(quiz)}
            >
              <Eye className="w-3 h-3 ml-1" />
              مراجعة
            </Button>
          )}
          {canCreateQuiz && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-xs border-slate-200 dark:border-slate-600"
                onClick={() => handleToggleQuiz(quiz.id, quiz.isActive)}
              >
                {quiz.isActive ? <XCircle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-xs text-red-500 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                onClick={() => handleDeleteQuiz(quiz.id)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {viewMode === 'subject' && currentSubject && (
            <Button
              variant="ghost"
              size="sm"
              onClick={goBackToSubjects}
              className="text-slate-500 dark:text-slate-400"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          )}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              {viewMode === 'subject' && currentSubject ? currentSubject.name : 'الاختبارات'}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {viewMode === 'subject' 
                ? `${currentSubjectQuizzes.length} اختبار`
                : 'اختبارات MCQ منظمة حسب المواد'
              }
            </p>
          </div>
        </div>
        
        {canCreateQuiz && (
          <div className="flex gap-2">
            {/* Desktop Dialog */}
            <Dialog open={createDialogOpen} onOpenChange={(open) => { 
              setCreateDialogOpen(open); 
              if (!open) resetForm(); 
            }}>
              <DialogTrigger asChild>
                <Button className="hidden sm:flex bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="w-4 h-4 ml-2" />
                  إنشاء اختبار
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 max-w-xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-slate-900 dark:text-white">إنشاء اختبار جديد</DialogTitle>
                  <DialogDescription className="text-slate-500 dark:text-slate-400">
                    أدخل بيانات الاختبار والأسئلة
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">عنوان الاختبار</Label>
                    <Input
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="عنوان الاختبار"
                      className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-700 dark:text-slate-300">المادة (اختياري)</Label>
                      <Select value={formSubjectId} onValueChange={setFormSubjectId}>
                        <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                          <SelectValue placeholder="بدون مادة" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                          <SelectItem value="">بدون مادة</SelectItem>
                          {subjects.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                                {s.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-700 dark:text-slate-300">الوقت (دقائق)</Label>
                      <Input
                        type="number"
                        value={formTimeLimit}
                        onChange={(e) => setFormTimeLimit(e.target.value)}
                        placeholder="مثال: 30"
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">الأسئلة</Label>
                    <Textarea
                      value={formQuestions}
                      onChange={(e) => setFormQuestions(e.target.value)}
                      placeholder={`السؤال الأول | الخيار أ | الخيار ب | الخيار ج | الخيار د | A
السؤال الثاني | الخيار أ | الخيار ب | الخيار ج | الخيار د | B`}
                      className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-sm min-h-[180px]"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      كل سؤال في سطر • الصيغة: السؤال | أ | ب | ج | د | الإجابة (A/B/C/D)
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleCreateQuiz}
                    className="bg-emerald-600 hover:bg-emerald-700"
                    disabled={submitting}
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                    إنشاء
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Mobile Drawer */}
            <Drawer open={createDialogOpen} onOpenChange={(open) => { 
              setCreateDialogOpen(open); 
              if (!open) resetForm(); 
            }}>
              <DrawerTrigger asChild>
                <Button className="sm:hidden bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="w-4 h-4 ml-2" />
                  إنشاء
                </Button>
              </DrawerTrigger>
              <DrawerContent className="bg-white dark:bg-slate-900 border-t-slate-200 dark:border-t-slate-700">
                <DrawerHeader>
                  <DrawerTitle className="text-slate-900 dark:text-white">إنشاء اختبار جديد</DrawerTitle>
                  <DrawerDescription className="text-slate-500 dark:text-slate-400">
                    أدخل بيانات الاختبار والأسئلة
                  </DrawerDescription>
                </DrawerHeader>
                <div className="px-4 overflow-y-auto max-h-[60vh]">
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label className="text-slate-700 dark:text-slate-300">عنوان الاختبار</Label>
                      <Input
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        placeholder="عنوان الاختبار"
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-slate-700 dark:text-slate-300">المادة</Label>
                        <Select value={formSubjectId} onValueChange={setFormSubjectId}>
                          <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                            <SelectValue placeholder="بدون مادة" />
                          </SelectTrigger>
                          <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                            <SelectItem value="">بدون مادة</SelectItem>
                            {subjects.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                                  {s.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-700 dark:text-slate-300">الوقت (دقائق)</Label>
                        <Input
                          type="number"
                          value={formTimeLimit}
                          onChange={(e) => setFormTimeLimit(e.target.value)}
                          placeholder="مثال: 30"
                          className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-slate-700 dark:text-slate-300">الأسئلة</Label>
                      <Textarea
                        value={formQuestions}
                        onChange={(e) => setFormQuestions(e.target.value)}
                        placeholder={`السؤال الأول | الخيار أ | الخيار ب | الخيار ج | الخيار د | A`}
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-sm min-h-[120px]"
                      />
                    </div>
                  </div>
                </div>
                <DrawerFooter>
                  <Button
                    onClick={handleCreateQuiz}
                    className="bg-emerald-600 hover:bg-emerald-700"
                    disabled={submitting}
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                    إنشاء
                  </Button>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{quizzes.length}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">اختبار</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{subjects.length}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">مادة</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {quizzes.filter(q => q.mySubmission).length}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">مكتمل</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subject Folders View */}
      {viewMode === 'subjects' && (
        <div className="space-y-3">
          {/* Subjects */}
          {subjects.map((subject) => {
            const subjectQuizzes = quizzesBySubject.grouped[subject.id] || [];
            if (subjectQuizzes.length === 0) return null;
            
            return (
              <button
                key={subject.id}
                onClick={() => openSubjectPage(subject)}
                className="w-full p-4 bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl hover:shadow-md transition-all flex items-center justify-between text-right"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: subject.color + '20' }}
                  >
                    <Folder className="w-6 h-6" style={{ color: subject.color }} />
                  </div>
                  <div>
                    <h4 className="text-slate-900 dark:text-white font-medium">{subject.name}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{subjectQuizzes.length} اختبار</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400" />
              </button>
            );
          })}

          {/* Quizzes without subject */}
          {quizzesBySubject.noSubject.length > 0 && (
            <button
              onClick={() => {
                setCurrentSubject({ id: 'no-subject', name: 'بدون مادة', color: '#64748b' });
                setViewMode('subject');
              }}
              className="w-full p-4 bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl hover:shadow-md transition-all flex items-center justify-between text-right"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                  <FolderOpen className="w-6 h-6 text-slate-500" />
                </div>
                <div>
                  <h4 className="text-slate-900 dark:text-white font-medium">بدون مادة</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{quizzesBySubject.noSubject.length} اختبار</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400" />
            </button>
          )}
        </div>
      )}

      {/* Subject Quizzes View */}
      {viewMode === 'subject' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {currentSubjectQuizzes.map((quiz) => (
            <QuizCard key={quiz.id} quiz={quiz} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {quizzes.length === 0 && (
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">لا توجد اختبارات</p>
          {canCreateQuiz && (
            <Button
              className="mt-4 bg-emerald-600 hover:bg-emerald-700"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="w-4 h-4 ml-2" />
              إنشاء اختبار جديد
            </Button>
          )}
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
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white flex items-center justify-between gap-4">
              <span className="truncate">{currentQuiz?.title}</span>
              {timeLeft !== null && (
                <Badge className={`${timeLeft < 60 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'} font-mono shrink-0`}>
                  {formatTime(timeLeft)}
                </Badge>
              )}
            </DialogTitle>
            {currentQuiz?.subject && (
              <DialogDescription className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: currentQuiz.subject.color }} />
                {currentQuiz.subject.name}
              </DialogDescription>
            )}
          </DialogHeader>

          {result ? (
            <div className="text-center py-8">
              <div className={`w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center ${
                (result.score / result.totalPoints) >= 0.7
                  ? 'bg-green-100 dark:bg-green-900/30'
                  : (result.score / result.totalPoints) >= 0.5
                  ? 'bg-yellow-100 dark:bg-yellow-900/30'
                  : 'bg-red-100 dark:bg-red-900/30'
              }`}>
                <span className={`text-3xl font-bold ${
                  (result.score / result.totalPoints) >= 0.7
                    ? 'text-green-600 dark:text-green-400'
                    : (result.score / result.totalPoints) >= 0.5
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {result.score}
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">نتيجتك</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-4">
                {result.score} من {result.totalPoints} ({Math.round((result.score / result.totalPoints) * 100)}%)
              </p>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => {
                  setTakeQuizDialogOpen(false);
                  fetchData();
                }}
              >
                إغلاق
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-6 py-4">
                {currentQuiz?.questions?.map((q, index) => (
                  <div key={q.id} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                    <p className="text-slate-900 dark:text-white font-medium mb-3">
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
                            className={`p-3 rounded-xl text-right text-sm transition-all ${
                              answers[q.id] === option
                                ? 'bg-emerald-600 text-white'
                                : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600'
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
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                  تقديم الاختبار
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">مراجعة الاختبار</DialogTitle>
            {currentQuiz?.subject && (
              <DialogDescription className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: currentQuiz.subject.color }} />
                {currentQuiz.subject.name}
              </DialogDescription>
            )}
          </DialogHeader>

          {result && currentQuiz?.questions && (
            <div className="space-y-4">
              <div className="text-center py-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <p className="text-slate-500 dark:text-slate-400 text-sm">النتيجة النهائية</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {result.score} / {result.totalPoints}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  ({Math.round((result.score / result.totalPoints) * 100)}%)
                </p>
              </div>

              {currentQuiz.questions.map((q, index) => {
                const userAnswer = result.answers[q.id];
                const isCorrect = userAnswer === q.correctAnswer;
                
                return (
                  <div
                    key={q.id}
                    className={`p-4 rounded-xl border-2 ${
                      isCorrect
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                    }`}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        isCorrect ? 'bg-green-200 dark:bg-green-800' : 'bg-red-200 dark:bg-red-800'
                      }`}>
                        {isCorrect ? (
                          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                        )}
                      </div>
                      <p className="text-slate-900 dark:text-white font-medium">
                        {index + 1}. {q.question}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mr-11">
                      {['A', 'B', 'C', 'D'].map((option) => {
                        const optKey = `option${option}` as keyof Question;
                        const optText = q[optKey] as string;
                        const isSelected = userAnswer === option;
                        const isCorrectOption = q.correctAnswer === option;

                        let bgClass = 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600';
                        if (isCorrectOption) {
                          bgClass = 'bg-green-100 dark:bg-green-800 border-green-300 dark:border-green-600';
                        } else if (isSelected && !isCorrect) {
                          bgClass = 'bg-red-100 dark:bg-red-800 border-red-300 dark:border-red-600';
                        }

                        return (
                          <div
                            key={option}
                            className={`p-3 rounded-lg text-sm border ${bgClass} ${
                              isCorrectOption ? 'text-green-800 dark:text-green-200' : 'text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <span className="font-bold ml-2">{option}.</span>
                            {optText}
                            {isCorrectOption && <span className="mr-2 text-xs">✓</span>}
                            {isSelected && !isCorrect && <span className="mr-2 text-xs">إجابتك</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <DialogFooter>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => setReviewDialogOpen(false)}
            >
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
