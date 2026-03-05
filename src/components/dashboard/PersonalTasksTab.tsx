'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  Plus,
  Trash2,
  Edit,
  Clock,
  AlertCircle,
  Loader2,
  User,
  Send,
  MoreVertical,
  ExternalLink,
} from 'lucide-react';
import { TaskDescription } from '@/components/ui/task-description';

interface TeamUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  priority: number;
  dueDate: string | null;
  createdAt: string;
  creatorId: string;
  assigneeId: string | null;
  creator: {
    id: string;
    name: string | null;
  };
  assignee: {
    id: string;
    name: string | null;
  } | null;
}

const statusLabels: Record<string, string> = {
  TODO: 'قيد الانتظار',
  IN_PROGRESS: 'قيد التنفيذ',
  DONE: 'مكتمل',
};

const statusColors: Record<string, string> = {
  TODO: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/30',
  IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-500/30',
  DONE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-500/30',
};

const priorityColors: Record<number, string> = {
  1: 'bg-gray-500',
  2: 'bg-orange-500',
  3: 'bg-red-500',
};

export function PersonalTasksTab() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [isMobile, setIsMobile] = useState(false);

  // Form state - separate to prevent re-render issues
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [priority, setPriority] = useState('1');
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canCreateTask = user?.currentTeam?.role === 'ADMIN' || user?.currentTeam?.role === 'LEADER';

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      if (res.ok) {
        setTasks(data.tasks);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Fetch users error:', error);
    }
  };

  useEffect(() => {
    fetchTasks();
    if (canCreateTask) {
      fetchUsers();
    }
  }, []);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('العنوان مطلوب');
      return;
    }

    setSubmitting(true);
    try {
      const method = editingTask ? 'PUT' : 'POST';
      const body = editingTask
        ? { id: editingTask.id, title, description, assigneeId: assigneeId || null, priority: parseInt(priority), dueDate: dueDate || null }
        : { title, description, assigneeId: assigneeId || null, priority: parseInt(priority), dueDate: dueDate || null };

      const res = await fetch('/api/tasks', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(editingTask ? 'تم تحديث المهمة' : 'تم إنشاء المهمة');
        setDialogOpen(false);
        resetForm();
        fetchTasks();
      } else {
        toast.error(data.error || 'حدث خطأ');
      }
    } catch {
      toast.error('حدث خطأ في الاتصال');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, status: newStatus }),
      });

      if (res.ok) {
        toast.success('تم تحديث حالة المهمة');
        fetchTasks();
      }
    } catch {
      toast.error('حدث خطأ');
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه المهمة؟')) return;

    try {
      const res = await fetch(`/api/tasks?id=${taskId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('تم حذف المهمة');
        fetchTasks();
      }
    } catch {
      toast.error('حدث خطأ');
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setAssigneeId('');
    setPriority('1');
    setDueDate('');
    setEditingTask(null);
  };

  const openEditDialog = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description || '');
    setAssigneeId(task.assignee?.id || '');
    setPriority(task.priority.toString());
    setDueDate(task.dueDate ? task.dueDate.split('T')[0] : '');
    setDialogOpen(true);
  };

  const filteredTasks = tasks.filter((task) => {
    if (activeTab === 'assigned') {
      return task.assigneeId === user?.id;
    } else if (activeTab === 'created') {
      return task.creatorId === user?.id;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">المهام الشخصية</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">مهام مخصصة لأعضاء معينين</p>
        </div>
        {canCreateTask && (
          <>
            {/* Desktop Button */}
            <Button 
              className="hidden sm:flex bg-emerald-600 hover:bg-emerald-700"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="w-4 h-4 ml-2" />
              إضافة مهمة
            </Button>
            
            {/* Mobile Button */}
            <Button 
              className="sm:hidden bg-emerald-600 hover:bg-emerald-700"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="w-4 h-4 ml-2" />
              إضافة
            </Button>

            {/* Desktop Dialog - Only render on desktop */}
            {!isMobile && (
              <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
                <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-2xl max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-slate-900 dark:text-white">
                      {editingTask ? 'تعديل المهمة' : 'إضافة مهمة جديدة'}
                    </DialogTitle>
                    <DialogDescription className="text-slate-500 dark:text-slate-400">
                      {editingTask ? 'قم بتعديل بيانات المهمة' : 'أدخل بيانات المهمة الجديدة'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label className="text-slate-700 dark:text-slate-300">العنوان</Label>
                      <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="عنوان المهمة"
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-700 dark:text-slate-300">الوصف</Label>
                      <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="وصف المهمة (اختياري)"
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-700 dark:text-slate-300">المسؤول عن المهمة</Label>
                      <Select value={assigneeId || undefined} onValueChange={setAssigneeId}>
                        <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl">
                          <SelectValue placeholder="اختر عضو" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl">
                          {users.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.name} ({u.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-slate-700 dark:text-slate-300">الأولوية</Label>
                        <Select value={priority} onValueChange={setPriority}>
                          <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl">
                            <SelectItem value="1">عادية</SelectItem>
                            <SelectItem value="2">متوسطة</SelectItem>
                            <SelectItem value="3">عالية</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-700 dark:text-slate-300">تاريخ الاستحقاق</Label>
                        <Input
                          type="date"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                          className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl"
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={handleSubmit}
                      className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
                      disabled={submitting}
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                      حفظ
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {/* Mobile Drawer - Only render on mobile */}
            {isMobile && (
              <Drawer open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
                <DrawerContent className="bg-white dark:bg-slate-900 border-t-slate-200 dark:border-t-slate-700">
                  <DrawerHeader>
                    <DrawerTitle className="text-slate-900 dark:text-white">
                      {editingTask ? 'تعديل المهمة' : 'إضافة مهمة جديدة'}
                    </DrawerTitle>
                    <DrawerDescription className="text-slate-500 dark:text-slate-400">
                      {editingTask ? 'قم بتعديل بيانات المهمة' : 'أدخل بيانات المهمة الجديدة'}
                    </DrawerDescription>
                  </DrawerHeader>
                  <div className="px-4 overflow-y-auto max-h-[60vh]">
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label className="text-slate-700 dark:text-slate-300">العنوان</Label>
                        <Input
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="عنوان المهمة"
                          className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-700 dark:text-slate-300">الوصف</Label>
                        <Textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="وصف المهمة (اختياري)"
                          className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-700 dark:text-slate-300">المسؤول عن المهمة</Label>
                        <Select value={assigneeId || undefined} onValueChange={setAssigneeId}>
                          <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl">
                            <SelectValue placeholder="اختر عضو" />
                          </SelectTrigger>
                          <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl">
                            {users.map((u) => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.name} ({u.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-slate-700 dark:text-slate-300">الأولوية</Label>
                          <Select value={priority} onValueChange={setPriority}>
                            <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl">
                              <SelectItem value="1">عادية</SelectItem>
                              <SelectItem value="2">متوسطة</SelectItem>
                              <SelectItem value="3">عالية</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-700 dark:text-slate-300">تاريخ الاستحقاق</Label>
                          <Input
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <DrawerFooter>
                    <Button
                      onClick={handleSubmit}
                      className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
                      disabled={submitting}
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                      حفظ
                    </Button>
                  </DrawerFooter>
                </DrawerContent>
              </Drawer>
            )}
          </>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 w-full justify-start overflow-x-auto rounded-xl">
          <TabsTrigger value="all" className="data-[state=active]:bg-emerald-50 dark:data-[state=active]:bg-emerald-900/30 data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 text-xs sm:text-sm">
            الكل ({tasks.length})
          </TabsTrigger>
          <TabsTrigger value="assigned" className="data-[state=active]:bg-emerald-50 dark:data-[state=active]:bg-emerald-900/30 data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 text-xs sm:text-sm">
            <User className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
            مهامي ({tasks.filter(t => t.assigneeId === user?.id).length})
          </TabsTrigger>
          {canCreateTask && (
            <TabsTrigger value="created" className="data-[state=active]:bg-emerald-50 dark:data-[state=active]:bg-emerald-900/30 data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 text-xs sm:text-sm">
              <Send className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
              التي أنشأتها
            </TabsTrigger>
          )}
        </TabsList>
      </Tabs>

      {/* Tasks Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredTasks.map((task) => (
          <Card key={task.id} className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${priorityColors[task.priority]}`} />
                  <CardTitle className="text-slate-900 dark:text-white text-sm truncate">{task.title}</CardTitle>
                </div>
                <Badge className={`${statusColors[task.status]} shrink-0 text-xs`}>
                  {statusLabels[task.status]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <TaskDescription description={task.description} />
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="truncate">من: {task.creator.name}</span>
                {task.assignee && (
                  <>
                    <span>→</span>
                    <span className="truncate">إلى: {task.assignee.name}</span>
                  </>
                )}
              </div>
              {task.dueDate && (
                <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                  <Clock className="w-3 h-3" />
                  {new Date(task.dueDate).toLocaleDateString('ar-EG')}
                </div>
              )}
              <div className="flex items-center gap-2 pt-2">
                <Select
                  value={task.status}
                  onValueChange={(value) => handleStatusChange(task.id, value)}
                >
                  <SelectTrigger className="h-9 bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white text-xs flex-1 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 rounded-xl">
                    <SelectItem value="TODO">قيد الانتظار</SelectItem>
                    <SelectItem value="IN_PROGRESS">قيد التنفيذ</SelectItem>
                    <SelectItem value="DONE">مكتمل</SelectItem>
                  </SelectContent>
                </Select>
                {canCreateTask && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-slate-900 dark:hover:text-white shrink-0 rounded-xl">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 rounded-xl">
                      <DropdownMenuItem onClick={() => openEditDialog(task)} className="text-slate-900 dark:text-white cursor-pointer rounded-lg">
                        <Edit className="w-4 h-4 ml-2" />
                        تعديل
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(task.id)} className="text-red-500 cursor-pointer rounded-lg">
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

      {filteredTasks.length === 0 && (
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">لا توجد مهام</p>
        </div>
      )}
    </div>
  );
}
