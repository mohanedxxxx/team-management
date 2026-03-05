'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  Users,
  Plus,
  Trash2,
  Copy,
  Loader2,
  Building2,
  UserCheck,
  Clock,
  AlertCircle,
  RefreshCw,
  BarChart3,
  Trophy,
  Target,
  CheckCircle,
  MoreVertical,
  UserPlus,
  ArrowRightLeft,
  UserMinus,
  TrendingUp,
  Award,
  ClipboardList,
} from 'lucide-react';

interface Team {
  id: string;
  name: string;
  description: string | null;
  inviteCode: string;
  createdAt: string;
  _count?: {
    members: number;
  };
}

interface UserWithStats {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  createdAt: string;
  teams: {
    id: string;
    name: string;
    role: string;
    joinedAt: string;
  }[];
  stats: {
    totalQuizzes: number;
    avgScore: number;
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    totalNotes: number;
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

interface GlobalStats {
  totalUsers: number;
  totalTeams: number;
  totalQuizzes: number;
  totalSubmissions: number;
  totalTasks: number;
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

export function AdminTab() {
  const { user, refreshUser } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile - using matchMedia to avoid issues with keyboard opening
  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 639px)');
    setIsMobile(mediaQuery.matches);
    
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);
  
  // Analytics state
  const [usersWithStats, setUsersWithStats] = useState<UserWithStats[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithStats | null>(null);
  const [userDetailsOpen, setUserDetailsOpen] = useState(false);
  
  // Add to team state
  const [addTeamDialogOpen, setAddTeamDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('MEMBER');
  const [adding, setAdding] = useState(false);
  
  // Change role state
  const [changeRoleDialogOpen, setChangeRoleDialogOpen] = useState(false);
  const [changeRoleUserId, setChangeRoleUserId] = useState<string>('');
  const [changeRoleTeamId, setChangeRoleTeamId] = useState<string>('');
  const [newRole, setNewRole] = useState<string>('MEMBER');
  const [changingRole, setChangingRole] = useState(false);
  
  // Form state
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');

  const fetchTeams = async () => {
    try {
      const res = await fetch('/api/teams/all');
      const data = await res.json();
      if (res.ok) {
        setTeams(data.teams);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const res = await fetch('/api/admin/analytics');
      const data = await res.json();
      if (res.ok) {
        setUsersWithStats(data.users);
        setGlobalStats(data.globalStats);
      }
    } catch (error) {
      console.error('Analytics error:', error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
    fetchAnalytics();
  }, []);

  const handleCreateTeam = async () => {
    if (!teamName.trim()) {
      toast.error('اسم الفريق مطلوب');
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: teamName, description: teamDescription }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('تم إنشاء الفريق بنجاح');
        setCreateDialogOpen(false);
        setTeamName('');
        setTeamDescription('');
        fetchTeams();
        refreshUser();
      } else {
        toast.error(data.error || 'حدث خطأ');
      }
    } catch {
      toast.error('حدث خطأ');
    } finally {
      setCreating(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('تم نسخ كود الدعوة');
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الفريق؟')) return;

    try {
      const res = await fetch(`/api/teams/${teamId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('تم حذف الفريق');
        fetchTeams();
        refreshUser();
      } else {
        const data = await res.json();
        toast.error(data.error || 'حدث خطأ');
      }
    } catch {
      toast.error('حدث خطأ');
    }
  };

  const handleAddToTeam = async () => {
    if (!selectedUserId || !selectedTeamId) {
      toast.error('اختر المستخدم والفريق');
      return;
    }

    setAdding(true);
    try {
      const res = await fetch('/api/users/add-to-team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserId,
          teamId: selectedTeamId,
          role: selectedRole
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('تم إضافة المستخدم للفريق');
        setAddTeamDialogOpen(false);
        setSelectedUserId('');
        setSelectedTeamId('');
        setSelectedRole('MEMBER');
        fetchAnalytics();
      } else {
        toast.error(data.error || 'حدث خطأ');
      }
    } catch {
      toast.error('حدث خطأ');
    } finally {
      setAdding(false);
    }
  };

  const handleChangeRole = async () => {
    if (!changeRoleUserId || !changeRoleTeamId || !newRole) {
      toast.error('بيانات غير كاملة');
      return;
    }

    setChangingRole(true);
    try {
      const res = await fetch(`/api/users/${changeRoleUserId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: newRole,
          teamId: changeRoleTeamId
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('تم تغيير الدور بنجاح');
        setChangeRoleDialogOpen(false);
        fetchAnalytics();
      } else {
        toast.error(data.error || 'حدث خطأ');
      }
    } catch {
      toast.error('حدث خطأ');
    } finally {
      setChangingRole(false);
    }
  };

  const handleRemoveFromTeam = async (userId: string, teamId: string, userName: string) => {
    if (!confirm(`هل أنت متأكد من إزالة ${userName} من هذا الفريق؟`)) return;

    try {
      const res = await fetch(`/api/users/${userId}?teamId=${teamId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('تم إزالة المستخدم من الفريق');
        fetchAnalytics();
      } else {
        toast.error(data.error || 'حدث خطأ');
      }
    } catch {
      toast.error('حدث خطأ');
    }
  };

  const openChangeRoleDialog = (u: UserWithStats, teamId: string, currentRole: string) => {
    setChangeRoleUserId(u.id);
    setChangeRoleTeamId(teamId);
    setNewRole(currentRole);
    setChangeRoleDialogOpen(true);
  };

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

  const stats = [
    {
      title: 'إجمالي الفرق',
      value: teams.length,
      icon: Building2,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
    },
    {
      title: 'إجمالي الأعضاء',
      value: globalStats?.totalUsers || 0,
      icon: Users,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'الاختبارات',
      value: globalStats?.totalQuizzes || 0,
      icon: Target,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
    {
      title: 'المهام',
      value: globalStats?.totalTasks || 0,
      icon: ClipboardList,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">لوحة التحكم</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">إدارة الفرق والمستخدمين والتحليلات</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { fetchTeams(); fetchAnalytics(); }}
            className="border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
          >
            <RefreshCw className="w-4 h-4 ml-1" />
            تحديث
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAddTeamDialogOpen(true)}
            className="border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
          >
            <UserPlus className="w-4 h-4 ml-1" />
            إضافة لفريق
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={() => setCreateDialogOpen(true)}
          >
            <Plus className="w-4 h-4 ml-2" />
            <span className="hidden sm:inline">إنشاء فريق</span>
            <span className="sm:hidden">إنشاء</span>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index} className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">{stat.title}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs for Teams and Analytics */}
      <Tabs defaultValue="analytics" className="space-y-4">
        <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <TabsTrigger value="analytics" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">
            <BarChart3 className="w-4 h-4 ml-2" />
            التحليلات
          </TabsTrigger>
          <TabsTrigger value="teams" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">
            <Building2 className="w-4 h-4 ml-2" />
            الفرق
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-4">
          {analyticsLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
          ) : (
            <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-500" />
                  تحليلات المستخدمين
                </CardTitle>
                <CardDescription className="text-slate-500 dark:text-slate-400">
                  عرض تفصيلي لجميع المستخدمين وإحصائياتهم
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {usersWithStats.map((u) => (
                    <div
                      key={u.id}
                      className="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-100 dark:border-slate-600/50"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <Avatar className="w-12 h-12">
                            <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                              {getInitials(u.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="text-slate-900 dark:text-white font-medium">{u.name || 'بدون اسم'}</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{u.email}</p>
                          </div>
                        </div>

                        {/* User Stats */}
                        <div className="flex flex-wrap gap-3">
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                            <Trophy className="w-4 h-4 text-blue-500" />
                            <span className="text-sm text-blue-600 dark:text-blue-400">{u.stats.avgScore}%</span>
                          </div>
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/30 rounded-lg">
                            <Target className="w-4 h-4 text-amber-500" />
                            <span className="text-sm text-amber-600 dark:text-amber-400">{u.stats.totalQuizzes} اختبار</span>
                          </div>
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                            <span className="text-sm text-emerald-600 dark:text-emerald-400">{u.stats.completedTasks}/{u.stats.totalTasks} مهام</span>
                          </div>
                        </div>

                        {/* Teams Badges */}
                        <div className="flex flex-wrap gap-2">
                          {u.teams.map((t) => (
                            <div key={t.id} className="flex items-center gap-2">
                              <Badge className={`${roleColors[t.role]} text-white text-xs`}>
                                {t.name} - {roleLabels[t.role]}
                              </Badge>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6">
                                    <MoreVertical className="w-3 h-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                                  <DropdownMenuItem onClick={() => openChangeRoleDialog(u, t.id, t.role)}>
                                    <ArrowRightLeft className="w-4 h-4 ml-2" />
                                    تغيير الدور
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    className="text-red-500"
                                    onClick={() => handleRemoveFromTeam(u.id, t.id, u.name || 'المستخدم')}
                                  >
                                    <UserMinus className="w-4 h-4 ml-2" />
                                    إزالة من الفريق
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          ))}
                        </div>

                        {/* View Details Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setSelectedUser(u); setUserDetailsOpen(true); }}
                          className="border-slate-200 dark:border-slate-700"
                        >
                          <BarChart3 className="w-4 h-4 ml-1" />
                          التفاصيل
                        </Button>
                      </div>
                    </div>
                  ))}

                  {usersWithStats.length === 0 && (
                    <div className="text-center py-12">
                      <AlertCircle className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                      <p className="text-slate-500 dark:text-slate-400">لا يوجد مستخدمين</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="teams" className="space-y-4">
          <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-white text-lg flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-500" />
                الفرق
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                إدارة جميع الفرق في النظام
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {teams.map((team) => (
                  <div
                    key={team.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-100 dark:border-slate-600/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold">
                        {team.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-slate-900 dark:text-white font-medium">{team.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs font-mono border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300">
                            <Users className="w-3 h-3 ml-1" />
                            {team._count?.members || 0} عضو
                          </Badge>
                          <span className="text-xs text-slate-400">
                            {new Date(team.createdAt).toLocaleDateString('ar-EG')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-600 rounded-lg">
                        <span className="text-xs text-slate-500 dark:text-slate-400">الكود:</span>
                        <span className="font-mono text-sm text-slate-900 dark:text-white">{team.inviteCode}</span>
                        <button
                          onClick={() => handleCopyCode(team.inviteCode)}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-500 rounded transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-300" />
                        </button>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        onClick={() => handleDeleteTeam(team.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {teams.length === 0 && (
                  <div className="text-center py-12">
                    <AlertCircle className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-500 dark:text-slate-400">لا توجد فرق</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* User Details Dialog */}
      <Dialog open={userDetailsOpen} onOpenChange={setUserDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-500" />
              تحليلات {selectedUser?.name || 'المستخدم'}
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">
              تفاصيل الأداء والنتائج
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-4">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-center">
                  <Trophy className="w-6 h-6 text-blue-500 mx-auto mb-1" />
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{selectedUser.stats.avgScore}%</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">متوسط الدرجات</div>
                </div>
                <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-xl text-center">
                  <Target className="w-6 h-6 text-amber-500 mx-auto mb-1" />
                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{selectedUser.stats.totalQuizzes}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">اختبارات</div>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl text-center">
                  <CheckCircle className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{selectedUser.stats.completedTasks}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">مهام مكتملة</div>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-xl text-center">
                  <TrendingUp className="w-6 h-6 text-purple-500 mx-auto mb-1" />
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{selectedUser.stats.inProgressTasks}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">قيد التنفيذ</div>
                </div>
              </div>

              {/* Quiz Results */}
              {selectedUser.quizSubmissions.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
                    <Award className="w-4 h-4 text-emerald-500" />
                    نتائج الاختبارات
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedUser.quizSubmissions.map((sub, i) => (
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
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add to Team Dialog */}
      <Dialog open={addTeamDialogOpen} onOpenChange={setAddTeamDialogOpen}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">إضافة مستخدم لفريق</DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">
              اختر المستخدم والفريق والدور
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300">المستخدم</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <SelectValue placeholder="اختر المستخدم" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  {usersWithStats.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300">الفريق</Label>
              <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <SelectValue placeholder="اختر الفريق" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300">الدور</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <SelectValue placeholder="اختر الدور" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <SelectItem value="MEMBER">عضو</SelectItem>
                  <SelectItem value="MODERATOR">مشرف</SelectItem>
                  <SelectItem value="LEADER">قائد فريق</SelectItem>
                  <SelectItem value="ADMIN">مدير نظام</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleAddToTeam}
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={adding}
            >
              {adding ? (
                <Loader2 className="w-4 h-4 animate-spin ml-2" />
              ) : (
                <UserPlus className="w-4 h-4 ml-2" />
              )}
              إضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Role Dialog */}
      <Dialog open={changeRoleDialogOpen} onOpenChange={setChangeRoleDialogOpen}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">تغيير الدور</DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">
              اختر الدور الجديد للمستخدم
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300">الدور الجديد</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <SelectValue placeholder="اختر الدور" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <SelectItem value="MEMBER">عضو</SelectItem>
                  <SelectItem value="MODERATOR">مشرف</SelectItem>
                  <SelectItem value="LEADER">قائد فريق</SelectItem>
                  <SelectItem value="ADMIN">مدير نظام</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleChangeRole}
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={changingRole}
            >
              {changingRole ? (
                <Loader2 className="w-4 h-4 animate-spin ml-2" />
              ) : (
                <ArrowRightLeft className="w-4 h-4 ml-2" />
              )}
              تغيير
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Team Dialog - Desktop Only */}
      {!isMobile && (
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-slate-900 dark:text-white">إنشاء فريق جديد</DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400">
                أدخل بيانات الفريق الجديد
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300">اسم الفريق</Label>
                <Input
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="اسم الفريق الجديد"
                  className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300">الوصف (اختياري)</Label>
                <Textarea
                  value={teamDescription}
                  onChange={(e) => setTeamDescription(e.target.value)}
                  placeholder="وصف الفريق"
                  className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleCreateTeam}
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={creating}
              >
                {creating ? (
                  <Loader2 className="w-4 h-4 animate-spin ml-2" />
                ) : (
                  <Plus className="w-4 h-4 ml-2" />
                )}
                إنشاء
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Create Team Drawer - Mobile Only */}
      {isMobile && (
        <Drawer open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DrawerContent className="bg-white dark:bg-slate-900 border-t-slate-200 dark:border-t-slate-700">
            <DrawerHeader>
              <DrawerTitle className="text-slate-900 dark:text-white">إنشاء فريق جديد</DrawerTitle>
              <DrawerDescription className="text-slate-500 dark:text-slate-400">
                أدخل بيانات الفريق الجديد
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4 overflow-y-auto max-h-[60vh]">
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">اسم الفريق</Label>
                  <Input
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="اسم الفريق الجديد"
                    className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">الوصف (اختياري)</Label>
                  <Textarea
                    value={teamDescription}
                    onChange={(e) => setTeamDescription(e.target.value)}
                    placeholder="وصف الفريق"
                    className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
            <DrawerFooter>
              <Button
                onClick={handleCreateTeam}
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={creating}
              >
                {creating ? (
                  <Loader2 className="w-4 h-4 animate-spin ml-2" />
                ) : (
                  <Plus className="w-4 h-4 ml-2" />
                )}
                إنشاء
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}
