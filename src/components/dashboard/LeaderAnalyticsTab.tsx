'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Users,
  Loader2,
  BarChart3,
  Trophy,
  Target,
  CheckCircle,
  TrendingUp,
  Award,
  RefreshCw,
  HelpCircle,
} from 'lucide-react';

interface TeamMember {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  role: string;
  joinedAt: string;
  stats: {
    totalQuizzes: number;
    avgScore: number;
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    todoTasks: number;
  };
  quizSubmissions: {
    quizId: string;
    quizTitle: string;
    score: number;
    totalPoints: number;
    percentage: number;
    submittedAt: string;
  }[];
}

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
  _count: {
    submissions: number;
    questions: number;
  };
}

interface TeamStats {
  totalMembers: number;
  totalQuizzes: number;
  totalSubmissions: number;
  avgTeamScore: number;
}

const roleLabels: Record<string, string> = {
  ADMIN: 'مدير النظام',
  LEADER: 'قائد الفريق',
  MODERATOR: 'مشرف',
  MEMBER: 'عضو',
};

const roleColors: Record<string, string> = {
  ADMIN: 'bg-gradient-to-r from-red-500 to-rose-600',
  LEADER: 'bg-gradient-to-r from-purple-500 to-violet-600',
  MODERATOR: 'bg-gradient-to-r from-blue-500 to-indigo-600',
  MEMBER: 'bg-gradient-to-r from-slate-500 to-slate-600',
};

export function LeaderAnalyticsTab() {
  const { user } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [teamStats, setTeamStats] = useState<TeamStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/leader/analytics');
      const data = await res.json();
      if (res.ok) {
        setMembers(data.members);
        setQuizzes(data.quizzes);
        setTeamStats(data.teamStats);
      } else {
        toast.error(data.error || 'حدث خطأ');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('حدث خطأ في جلب البيانات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">تحليلات الفريق</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">عرض أداء ونتائج أعضاء الفريق</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          className="border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
        >
          <RefreshCw className="w-4 h-4 ml-1" />
          تحديث
        </Button>
      </div>

      {/* Team Stats */}
      {teamStats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">{teamStats.totalMembers}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">أعضاء الفريق</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <HelpCircle className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">{teamStats.totalQuizzes}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">اختبارات</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Target className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">{teamStats.totalSubmissions}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">إجمالي المحاولات</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">{teamStats.avgTeamScore}%</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">متوسط الفريق</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="members" className="space-y-4">
        <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <TabsTrigger value="members" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">
            <Users className="w-4 h-4 ml-2" />
            الأعضاء
          </TabsTrigger>
          <TabsTrigger value="quizzes" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">
            <HelpCircle className="w-4 h-4 ml-2" />
            الاختبارات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4">
          <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-white text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-500" />
                أعضاء الفريق
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                أداء ونتائج كل عضو
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-100 dark:border-slate-600/50"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="w-12 h-12">
                          <AvatarFallback className={`${roleColors[member.role]} text-white`}>
                            {getInitials(member.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="text-slate-900 dark:text-white font-medium">{member.name || 'بدون اسم'}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={`${roleColors[member.role]} text-white text-xs`}>
                              {roleLabels[member.role]}
                            </Badge>
                            <span className="text-xs text-slate-400">
                              انضم {new Date(member.joinedAt).toLocaleDateString('ar-EG')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex flex-wrap gap-3">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                          <Trophy className="w-4 h-4 text-blue-500" />
                          <span className="text-sm text-blue-600 dark:text-blue-400">{member.stats.avgScore}%</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/30 rounded-lg">
                          <Target className="w-4 h-4 text-amber-500" />
                          <span className="text-sm text-amber-600 dark:text-amber-400">{member.stats.totalQuizzes} اختبار</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                          <span className="text-sm text-emerald-600 dark:text-emerald-400">{member.stats.completedTasks}/{member.stats.totalTasks} مهام</span>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setSelectedMember(member); setDetailsOpen(true); }}
                        className="border-slate-200 dark:border-slate-700"
                      >
                        <BarChart3 className="w-4 h-4 ml-1" />
                        التفاصيل
                      </Button>
                    </div>
                  </div>
                ))}

                {members.length === 0 && (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-500 dark:text-slate-400">لا يوجد أعضاء</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quizzes" className="space-y-4">
          <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-white text-lg flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-emerald-500" />
                اختبارات الفريق
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                إحصائيات الاختبارات والمشاركات
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {quizzes.map((quiz) => (
                  <div
                    key={quiz.id}
                    className="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-100 dark:border-slate-600/50"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-slate-900 dark:text-white font-medium">{quiz.title}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {new Date(quiz.createdAt).toLocaleDateString('ar-EG')}
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <Badge variant="outline" className="border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300">
                          {quiz._count.questions} سؤال
                        </Badge>
                        <Badge className="bg-emerald-500 text-white">
                          {quiz._count.submissions} مشاركة
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}

                {quizzes.length === 0 && (
                  <div className="text-center py-12">
                    <HelpCircle className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-500 dark:text-slate-400">لا توجد اختبارات</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Member Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-500" />
              تحليلات {selectedMember?.name || 'العضو'}
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">
              تفاصيل الأداء والنتائج
            </DialogDescription>
          </DialogHeader>
          
          {selectedMember && (
            <div className="space-y-4">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-center">
                  <Trophy className="w-6 h-6 text-blue-500 mx-auto mb-1" />
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{selectedMember.stats.avgScore}%</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">متوسط الدرجات</div>
                </div>
                <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-xl text-center">
                  <Target className="w-6 h-6 text-amber-500 mx-auto mb-1" />
                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{selectedMember.stats.totalQuizzes}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">اختبارات</div>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl text-center">
                  <CheckCircle className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{selectedMember.stats.completedTasks}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">مهام مكتملة</div>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-xl text-center">
                  <TrendingUp className="w-6 h-6 text-purple-500 mx-auto mb-1" />
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{selectedMember.stats.inProgressTasks}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">قيد التنفيذ</div>
                </div>
                <div className="p-3 bg-orange-50 dark:bg-orange-900/30 rounded-xl text-center">
                  <Target className="w-6 h-6 text-orange-500 mx-auto mb-1" />
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{selectedMember.stats.todoTasks}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">مهام جديدة</div>
                </div>
              </div>

              {/* Quiz Results */}
              {selectedMember.quizSubmissions.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
                    <Award className="w-4 h-4 text-emerald-500" />
                    نتائج الاختبارات
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedMember.quizSubmissions.map((sub, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <div>
                          <p className="text-sm text-slate-900 dark:text-white">{sub.quizTitle}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {new Date(sub.submittedAt).toLocaleDateString('ar-EG')}
                          </p>
                        </div>
                        <Badge className={`${sub.percentage >= 70 ? 'bg-emerald-500' : sub.percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'} text-white`}>
                          {sub.score}/{sub.totalPoints} ({sub.percentage}%)
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedMember.quizSubmissions.length === 0 && (
                <div className="text-center py-8">
                  <Award className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-500 dark:text-slate-400 text-sm">لم يشترك في أي اختبارات بعد</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
