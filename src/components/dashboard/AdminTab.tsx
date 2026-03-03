'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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

export function AdminTab() {
  const { user, refreshUser } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  
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

  useEffect(() => {
    fetchTeams();
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

  const CreateFormContent = () => (
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
  );

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
      value: teams.reduce((acc, t) => acc + (t._count?.members || 0), 0),
      icon: Users,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'طلبات الانضمام',
      value: 0,
      icon: Clock,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">لوحة التحكم</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">إدارة الفرق والمستخدمين</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTeams}
            className="border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
          >
            <RefreshCw className="w-4 h-4 ml-1" />
            تحديث
          </Button>
          <>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <Button
                className="hidden sm:flex bg-emerald-600 hover:bg-emerald-700"
                onClick={() => setCreateDialogOpen(true)}
              >
                <Plus className="w-4 h-4 ml-2" />
                إنشاء فريق
              </Button>
              <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                <DialogHeader>
                  <DialogTitle className="text-slate-900 dark:text-white">إنشاء فريق جديد</DialogTitle>
                  <DialogDescription className="text-slate-500 dark:text-slate-400">
                    أدخل بيانات الفريق الجديد
                  </DialogDescription>
                </DialogHeader>
                <CreateFormContent />
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

            <Drawer open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <Button
                className="sm:hidden bg-emerald-600 hover:bg-emerald-700"
                onClick={() => setCreateDialogOpen(true)}
              >
                <Plus className="w-4 h-4 ml-1" />
                إنشاء
              </Button>
              <DrawerContent className="bg-white dark:bg-slate-900 border-t-slate-200 dark:border-t-slate-700">
                <DrawerHeader>
                  <DrawerTitle className="text-slate-900 dark:text-white">إنشاء فريق جديد</DrawerTitle>
                  <DrawerDescription className="text-slate-500 dark:text-slate-400">
                    أدخل بيانات الفريق الجديد
                  </DrawerDescription>
                </DrawerHeader>
                <div className="px-4 overflow-y-auto max-h-[60vh]">
                  <CreateFormContent />
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
          </>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
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

      {/* Teams List */}
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
    </div>
  );
}
