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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Plus,
  Trash2,
  Edit,
  Clock,
  AlertCircle,
  Loader2,
  MoreVertical,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface GlobalTask {
  id: string;
  title: string;
  description: string | null;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  priority: number;
  dueDate: string | null;
  createdAt: string;
  creator: {
    id: string;
    name: string | null;
  };
}

const statusLabels: Record<string, string> = {
  TODO: 'قيد الانتظار',
  IN_PROGRESS: 'قيد التنفيذ',
  DONE: 'مكتمل',
};

const statusColors: Record<string, string> = {
  TODO: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  IN_PROGRESS: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  DONE: 'bg-green-500/20 text-green-400 border-green-500/30',
};

const priorityColors: Record<number, string> = {
  1: 'bg-gray-500',
  2: 'bg-orange-500',
  3: 'bg-red-500',
};

export function GlobalTasksTab() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<GlobalTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<GlobalTask | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('1');
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canCreateEdit = user?.currentTeam?.role === 'ADMIN' || user?.currentTeam?.role === 'LEADER';

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/global-tasks');
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

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('العنوان مطلوب');
      return;
    }

    setSubmitting(true);
    try {
      const url = editingTask ? '/api/global-tasks' : '/api/global-tasks';
      const method = editingTask ? 'PUT' : 'POST';
      const body = editingTask
        ? { id: editingTask.id, title, description, priority: parseInt(priority), dueDate: dueDate || null }
        : { title, description, priority: parseInt(priority), dueDate: dueDate || null };

      const res = await fetch(url, {
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
      const res = await fetch('/api/global-tasks', {
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
      const res = await fetch(`/api/global-tasks?id=${taskId}`, {
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
    setPriority('1');
    setDueDate('');
    setEditingTask(null);
  };

  const openEditDialog = (task: GlobalTask) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description || '');
    setPriority(task.priority.toString());
    setDueDate(task.dueDate ? task.dueDate.split('T')[0] : '');
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const FormContent = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label className="text-slate-300">العنوان</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="عنوان المهمة"
          className="bg-slate-700 border-slate-600 text-white"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-slate-300">الوصف</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="وصف المهمة (اختياري)"
          className="bg-slate-700 border-slate-600 text-white"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-slate-300">الأولوية</Label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-slate-600">
              <SelectItem value="1">عادية</SelectItem>
              <SelectItem value="2">متوسطة</SelectItem>
              <SelectItem value="3">عالية</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-slate-300">تاريخ الاستحقاق</Label>
          <Input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="bg-slate-700 border-slate-600 text-white"
          />
        </div>
      </div>
    </form>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">المهام الكلية</h3>
          <p className="text-sm text-slate-400">مهام مشتركة لجميع أعضاء الفريق</p>
        </div>
        {canCreateEdit && (
          <>
            {/* Desktop Dialog */}
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="hidden sm:flex bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="w-4 h-4 ml-2" />
                  إضافة مهمة
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800 border-slate-700">
                <DialogHeader>
                  <DialogTitle className="text-white">
                    {editingTask ? 'تعديل المهمة' : 'إضافة مهمة جديدة'}
                  </DialogTitle>
                  <DialogDescription className="text-slate-400">
                    {editingTask ? 'قم بتعديل بيانات المهمة' : 'أدخل بيانات المهمة الجديدة'}
                  </DialogDescription>
                </DialogHeader>
                <FormContent />
                <DialogFooter>
                  <Button
                    onClick={handleSubmit}
                    className="bg-emerald-600 hover:bg-emerald-700"
                    disabled={submitting}
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'حفظ'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Mobile Drawer */}
            <Drawer open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
              <DrawerTrigger asChild>
                <Button className="sm:hidden bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="w-4 h-4 ml-2" />
                  إضافة
                </Button>
              </DrawerTrigger>
              <DrawerContent className="bg-slate-800 border-t-slate-700">
                <DrawerHeader>
                  <DrawerTitle className="text-white">
                    {editingTask ? 'تعديل المهمة' : 'إضافة مهمة جديدة'}
                  </DrawerTitle>
                  <DrawerDescription className="text-slate-400">
                    {editingTask ? 'قم بتعديل بيانات المهمة' : 'أدخل بيانات المهمة الجديدة'}
                  </DrawerDescription>
                </DrawerHeader>
                <div className="px-4 overflow-y-auto max-h-[60vh]">
                  <FormContent />
                </div>
                <DrawerFooter>
                  <Button
                    onClick={handleSubmit}
                    className="bg-emerald-600 hover:bg-emerald-700"
                    disabled={submitting}
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'حفظ'}
                  </Button>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          </>
        )}
      </div>

      {/* Tasks Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tasks.map((task) => (
          <Card key={task.id} className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${priorityColors[task.priority]}`} />
                  <CardTitle className="text-white text-sm truncate">{task.title}</CardTitle>
                </div>
                <Badge className={`${statusColors[task.status]} shrink-0 text-xs`}>
                  {statusLabels[task.status]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {task.description && (
                <p className="text-sm text-slate-400 line-clamp-2">{task.description}</p>
              )}
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="truncate">بواسطة: {task.creator.name}</span>
                {task.dueDate && (
                  <>
                    <span>•</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <Clock className="w-3 h-3" />
                      {new Date(task.dueDate).toLocaleDateString('ar-EG')}
                    </div>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Select
                  value={task.status}
                  onValueChange={(value) => handleStatusChange(task.id, value)}
                >
                  <SelectTrigger className="h-8 bg-slate-700 border-slate-600 text-white text-xs flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="TODO">قيد الانتظار</SelectItem>
                    <SelectItem value="IN_PROGRESS">قيد التنفيذ</SelectItem>
                    <SelectItem value="DONE">مكتمل</SelectItem>
                  </SelectContent>
                </Select>
                {canCreateEdit && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white shrink-0">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-slate-700 border-slate-600">
                      <DropdownMenuItem onClick={() => openEditDialog(task)} className="text-white cursor-pointer">
                        <Edit className="w-4 h-4 ml-2" />
                        تعديل
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(task.id)} className="text-red-400 cursor-pointer">
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

      {tasks.length === 0 && (
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">لا توجد مهام كلية حتى الآن</p>
        </div>
      )}
    </div>
  );
}
