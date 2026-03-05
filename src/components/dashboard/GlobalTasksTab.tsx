'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
} from '@/components/ui/drawer';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Plus,
  Trash2,
  Edit,
  Clock,
  AlertCircle,
  Loader2,
  MoreVertical,
  Globe,
  Users,
  Calendar,
  MessageCircle,
  Send,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  X,
  CheckCircle2,
  Circle,
  Timer,
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

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    avatar: string | null;
  };
}

const statusLabels: Record<string, string> = {
  TODO: 'قيد الانتظار',
  IN_PROGRESS: 'قيد التنفيذ',
  DONE: 'مكتمل',
};

const priorityLabels: Record<number, string> = {
  1: 'عادية',
  2: 'متوسطة',
  3: 'عالية',
};

// Parse text and make links clickable - Fixed version
function parseTextWithLinks(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts: React.ReactNode[] = [];
  let key = 0;
  
  // Split text by URLs
  const matches = text.split(urlRegex);
  
  // Get all URLs
  const urls = text.match(urlRegex) || [];
  
  matches.forEach((part, index) => {
    // Add text part
    if (part) {
      parts.push(<span key={key++}>{part}</span>);
    }
    // Add URL after text (if exists)
    if (urls[index]) {
      const url = urls[index];
      parts.push(
        <a
          key={key++}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 break-all bg-emerald-50 dark:bg-emerald-900/20 px-1 rounded mx-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          {url.length > 35 ? url.slice(0, 35) + '...' : url}
          <ExternalLink className="w-3 h-3 shrink-0" />
        </a>
      );
    }
  });

  return parts.length > 0 ? parts : text;
}

// Task Card Component - Modern Design
function TaskCard({
  task,
  onOpenDetails,
  onStatusChange,
  onEdit,
  onDelete,
  canEdit,
}: {
  task: GlobalTask;
  onOpenDetails: () => void;
  onStatusChange: (status: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  canEdit: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const isLongDesc = task.description && task.description.length > 100;

  const getStatusIcon = () => {
    switch (task.status) {
      case 'DONE':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'IN_PROGRESS':
        return <Timer className="w-5 h-5 text-sky-500" />;
      default:
        return <Circle className="w-5 h-5 text-amber-500" />;
    }
  };

  const getStatusBg = () => {
    switch (task.status) {
      case 'DONE':
        return 'bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-900/30 border-emerald-200 dark:border-emerald-800';
      case 'IN_PROGRESS':
        return 'bg-gradient-to-br from-sky-50 to-sky-100 dark:from-sky-900/20 dark:to-sky-900/30 border-sky-200 dark:border-sky-800';
      default:
        return 'bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-900/30 border-amber-200 dark:border-amber-800';
    }
  };

  return (
    <Card 
      className={`${getStatusBg()} border-2 hover:shadow-xl transition-all duration-300 cursor-pointer group overflow-hidden`}
      onClick={onOpenDetails}
    >
      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="mt-0.5 shrink-0">
            {getStatusIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-slate-900 dark:text-white text-base leading-tight line-clamp-2">
              {task.title}
            </h4>
          </div>
          {/* Show edit/delete always on mobile, on hover for desktop */}
          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                  <MoreVertical className="w-4 h-4 text-slate-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={onEdit} className="cursor-pointer">
                  <Edit className="w-4 h-4 ml-2" />
                  تعديل
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete} className="text-red-500 cursor-pointer">
                  <Trash2 className="w-4 h-4 ml-2" />
                  حذف
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Description */}
        {task.description && task.description.trim() && (
          <div className="bg-white/50 dark:bg-black/10 rounded-lg p-3">
            <div className={`text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words ${!expanded ? 'line-clamp-2' : ''}`}>
              {parseTextWithLinks(task.description)}
            </div>
            {isLongDesc && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(!expanded);
                }}
                className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1 hover:underline"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="w-3 h-3" />
                    عرض أقل
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3" />
                    عرض المزيد
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Meta Info */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5 bg-white/50 dark:bg-black/10 px-2 py-1 rounded-full">
            <Users className="w-3 h-3" />
            <span>{task.creator.name || 'مستخدم'}</span>
          </div>
          {task.dueDate && (
            <div className="flex items-center gap-1.5 bg-white/50 dark:bg-black/10 px-2 py-1 rounded-full">
              <Calendar className="w-3 h-3" />
              <span>{new Date(task.dueDate).toLocaleDateString('ar-EG')}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 bg-white/50 dark:bg-black/10 px-2 py-1 rounded-full">
            <span>أولوية: {priorityLabels[task.priority]}</span>
          </div>
        </div>

        {/* Status Change */}
        <div className="flex items-center gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
          <Select value={task.status} onValueChange={onStatusChange}>
            <SelectTrigger className="h-9 text-xs bg-white/80 dark:bg-black/20 border-0 shadow-sm flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODO">
                <div className="flex items-center gap-2">
                  <Circle className="w-3 h-3 text-amber-500" />
                  قيد الانتظار
                </div>
              </SelectItem>
              <SelectItem value="IN_PROGRESS">
                <div className="flex items-center gap-2">
                  <Timer className="w-3 h-3 text-sky-500" />
                  قيد التنفيذ
                </div>
              </SelectItem>
              <SelectItem value="DONE">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  مكتمل
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </Card>
  );
}

// Task Details Dialog
function TaskDetailsDialog({
  task,
  open,
  onOpenChange,
  onStatusChange,
  onDelete,
  canEdit,
  token,
}: {
  task: GlobalTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (status: string) => void;
  onDelete: () => void;
  canEdit: boolean;
  token: string | null;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = useCallback(async () => {
    if (!task || !token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/task-comments?taskId=${task.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setComments(data.comments);
    } catch {
      console.error('Error fetching comments');
    } finally {
      setLoading(false);
    }
  }, [task, token]);

  useEffect(() => {
    if (open) fetchComments();
  }, [open, fetchComments]);

  const handleAddComment = async () => {
    if (!task || !token || !newComment.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/task-comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ taskId: task.id, content: newComment }),
      });
      const data = await res.json();
      if (res.ok) {
        setComments([data.comment, ...comments]);
        setNewComment('');
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error('حدث خطأ');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/task-comments?id=${commentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setComments(comments.filter((c) => c.id !== commentId));
      }
    } catch {
      toast.error('حدث خطأ');
    }
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <DialogTitle className="text-xl text-slate-900 dark:text-white leading-tight">
              {task.title}
            </DialogTitle>
            <div className="flex items-center gap-1.5 bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1 rounded-full">
              {task.status === 'DONE' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
              {task.status === 'IN_PROGRESS' && <Timer className="w-4 h-4 text-sky-500" />}
              {task.status === 'TODO' && <Circle className="w-4 h-4 text-amber-500" />}
              <span className="text-sm font-medium">{statusLabels[task.status]}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${task.priority === 3 ? 'bg-red-500' : task.priority === 2 ? 'bg-orange-500' : 'bg-slate-400'}`} />
              <span>أولوية: {priorityLabels[task.priority]}</span>
            </div>
            {task.dueDate && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{new Date(task.dueDate).toLocaleDateString('ar-EG')}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>{task.creator.name || 'مستخدم'}</span>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 -mx-6 px-6 py-4">
          {/* Description */}
          {task.description && task.description.trim() && (
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
              <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">الوصف</h4>
              <div className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap break-words leading-relaxed">
                {parseTextWithLinks(task.description)}
              </div>
            </div>
          )}

          {/* Status Change */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600 dark:text-slate-400">تغيير الحالة:</span>
            <Select value={task.status} onValueChange={onStatusChange}>
              <SelectTrigger className="w-40 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODO">قيد الانتظار</SelectItem>
                <SelectItem value="IN_PROGRESS">قيد التنفيذ</SelectItem>
                <SelectItem value="DONE">مكتمل</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Comments */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-slate-500" />
              <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">التعليقات</h4>
            </div>

            {/* Add Comment */}
            <div className="flex gap-2">
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="أضف تعليقاً..."
                className="flex-1 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAddComment();
                  }
                }}
              />
              <Button
                onClick={handleAddComment}
                disabled={!newComment.trim() || submitting}
                size="icon"
                className="bg-emerald-600 hover:bg-emerald-700 shrink-0"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>

            {/* Comments List */}
            <ScrollArea className="h-[200px]">
              {loading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-center text-sm text-slate-400 py-4">لا توجد تعليقات بعد</p>
              ) : (
                <div className="space-y-3 pr-2">
                  {comments.map((comment) => (
                    <div key={comment.id} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 group">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={comment.user.avatar || undefined} />
                            <AvatarFallback className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                              {comment.user.name?.[0] || comment.user.email[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {comment.user.name || comment.user.email}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400">
                            {new Date(comment.createdAt).toLocaleDateString('ar-EG')}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleDeleteComment(comment.id)}
                          >
                            <X className="w-3 h-3 text-slate-400" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 whitespace-pre-wrap">
                        {comment.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        {canEdit && (
          <DialogFooter className="border-t border-slate-100 dark:border-slate-800 pt-4">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onDelete();
              }}
            >
              <Trash2 className="w-4 h-4 ml-1" />
              حذف المهمة
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Separate Task Form Component to prevent re-renders
function TaskForm({
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  priority,
  onPriorityChange,
  dueDate,
  onDueDateChange,
  editingTask,
  isAdmin,
  adminTeams,
  selectedTeamIds,
  onToggleTeam,
  onSelectAll,
  onDeselectAll,
}: {
  title: string;
  onTitleChange: (v: string) => void;
  description: string;
  onDescriptionChange: (v: string) => void;
  priority: string;
  onPriorityChange: (v: string) => void;
  dueDate: string;
  onDueDateChange: (v: string) => void;
  editingTask: GlobalTask | null;
  isAdmin: boolean;
  adminTeams: Team[];
  selectedTeamIds: string[];
  onToggleTeam: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-slate-700 dark:text-slate-300">العنوان</Label>
        <Input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="عنوان المهمة"
          className="bg-white dark:bg-slate-800"
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <Label className="text-slate-700 dark:text-slate-300">الوصف</Label>
        <Textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="وصف المهمة (اختياري)"
          className="bg-white dark:bg-slate-800 min-h-[120px] resize-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-slate-700 dark:text-slate-300">الأولوية</Label>
          <Select value={priority} onValueChange={onPriorityChange}>
            <SelectTrigger className="bg-white dark:bg-slate-800">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
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
            onChange={(e) => onDueDateChange(e.target.value)}
            className="bg-white dark:bg-slate-800"
          />
        </div>
      </div>
      {!editingTask && isAdmin && adminTeams.length > 1 && (
        <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              توزيع على الفرق
            </Label>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={onSelectAll} className="h-7 text-xs">
                الكل
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={onDeselectAll} className="h-7 text-xs">
                إلغاء
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
            {adminTeams.map((team) => (
              <label
                key={team.id}
                className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-sm transition-all ${
                  selectedTeamIds.includes(team.id)
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300'
                    : 'bg-white dark:bg-slate-700'
                } border`}
              >
                <Checkbox
                  checked={selectedTeamIds.includes(team.id)}
                  onCheckedChange={() => onToggleTeam(team.id)}
                />
                <span className="truncate">{team.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface Team {
  id: string;
  name: string;
  role: string;
}

export function GlobalTasksTab() {
  const { user, token } = useAuth();
  const [tasks, setTasks] = useState<GlobalTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<GlobalTask | null>(null);
  const [selectedTask, setSelectedTask] = useState<GlobalTask | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'TODO' | 'IN_PROGRESS' | 'DONE'>('all');
  const [submitting, setSubmitting] = useState(false);

  // Form state - stable references
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('1');
  const [dueDate, setDueDate] = useState('');
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);

  // Memoized values
  const isMobile = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 640;
  }, []);

  const isAdmin = useMemo(() => user?.currentTeam?.role === 'ADMIN', [user?.currentTeam?.role]);
  const isLeader = useMemo(() => user?.currentTeam?.role === 'LEADER', [user?.currentTeam?.role]);
  const canEdit = isAdmin || isLeader;
  const adminTeams = useMemo(() => user?.teams?.filter((t) => t.role === 'ADMIN') || [], [user?.teams]);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/global-tasks');
      const data = await res.json();
      if (res.ok) setTasks(data.tasks);
    } catch {
      console.error('Fetch error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Stable callbacks
  const handleTitleChange = useCallback((v: string) => setTitle(v), []);
  const handleDescriptionChange = useCallback((v: string) => setDescription(v), []);
  const handlePriorityChange = useCallback((v: string) => setPriority(v), []);
  const handleDueDateChange = useCallback((v: string) => setDueDate(v), []);

  const toggleTeamSelection = useCallback((teamId: string) => {
    setSelectedTeamIds((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]
    );
  }, []);

  const selectAllTeams = useCallback(() => {
    setSelectedTeamIds(adminTeams.map((t) => t.id));
  }, [adminTeams]);

  const deselectAllTeams = useCallback(() => {
    setSelectedTeamIds([]);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) {
      toast.error('العنوان مطلوب');
      return;
    }
    setSubmitting(true);
    try {
      const method = editingTask ? 'PUT' : 'POST';
      const body = editingTask
        ? { id: editingTask.id, title, description, priority: parseInt(priority), dueDate: dueDate || null }
        : {
            title,
            description,
            priority: parseInt(priority),
            dueDate: dueDate || null,
            teamIds: isAdmin && selectedTeamIds.length > 0 ? selectedTeamIds : undefined,
          };

      const res = await fetch('/api/global-tasks', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'تم الحفظ');
        setDialogOpen(false);
        resetForm();
        fetchTasks();
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error('حدث خطأ');
    } finally {
      setSubmitting(false);
    }
  }, [title, description, priority, dueDate, editingTask, isAdmin, selectedTeamIds, fetchTasks]);

  const handleStatusChange = useCallback(async (taskId: string, status: string) => {
    try {
      const res = await fetch('/api/global-tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, status }),
      });
      if (res.ok) {
        toast.success('تم تحديث الحالة');
        fetchTasks();
        if (selectedTask?.id === taskId) {
          setSelectedTask({ ...selectedTask, status: status as GlobalTask['status'] });
        }
      }
    } catch {
      toast.error('حدث خطأ');
    }
  }, [fetchTasks, selectedTask]);

  const handleDelete = useCallback(async (taskId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه المهمة؟')) return;
    try {
      const res = await fetch(`/api/global-tasks?id=${taskId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('تم الحذف');
        fetchTasks();
      }
    } catch {
      toast.error('حدث خطأ');
    }
  }, [fetchTasks]);

  const resetForm = useCallback(() => {
    setTitle('');
    setDescription('');
    setPriority('1');
    setDueDate('');
    setEditingTask(null);
    setSelectedTeamIds([]);
  }, []);

  const openEditDialog = useCallback((task: GlobalTask) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description || '');
    setPriority(task.priority.toString());
    setDueDate(task.dueDate ? task.dueDate.split('T')[0] : '');
    setDialogOpen(true);
  }, []);

  const openNewDialog = useCallback(() => {
    resetForm();
    if (isAdmin && adminTeams.length > 1) {
      setSelectedTeamIds([user?.currentTeam?.id || '']);
    }
    setDialogOpen(true);
  }, [resetForm, isAdmin, adminTeams.length, user?.currentTeam?.id]);

  const filteredTasks = useMemo(() => 
    tasks.filter((t) => activeFilter === 'all' || t.status === activeFilter),
    [tasks, activeFilter]
  );

  const counts = useMemo(() => ({
    all: tasks.length,
    TODO: tasks.filter((t) => t.status === 'TODO').length,
    IN_PROGRESS: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
    DONE: tasks.filter((t) => t.status === 'DONE').length,
  }), [tasks]);

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
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">المهام الكلية</h3>
          <p className="text-sm text-slate-500">مهام مشتركة لجميع أعضاء الفريق</p>
        </div>
        {canEdit && (
          <Button
            className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 shadow-lg shadow-emerald-500/25"
            onClick={openNewDialog}
          >
            <Plus className="w-4 h-4 ml-2" />
            <span className="hidden sm:inline">إضافة مهمة</span>
            <span className="sm:hidden">إضافة</span>
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { value: 'all', label: 'الكل', count: counts.all, color: 'slate' },
          { value: 'TODO', label: 'قيد الانتظار', count: counts.TODO, color: 'amber' },
          { value: 'IN_PROGRESS', label: 'قيد التنفيذ', count: counts.IN_PROGRESS, color: 'sky' },
          { value: 'DONE', label: 'مكتمل', count: counts.DONE, color: 'emerald' },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveFilter(tab.value as typeof activeFilter)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              activeFilter === tab.value
                ? tab.color === 'emerald'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : tab.color === 'amber'
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  : tab.color === 'sky'
                  ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400'
                  : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Tasks Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredTasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onOpenDetails={() => {
              setSelectedTask(task);
              setDetailsOpen(true);
            }}
            onStatusChange={(status) => handleStatusChange(task.id, status)}
            onEdit={() => openEditDialog(task)}
            onDelete={() => handleDelete(task.id)}
            canEdit={canEdit}
          />
        ))}
      </div>

      {filteredTasks.length === 0 && (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-10 h-10 text-slate-300 dark:text-slate-600" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-lg">لا توجد مهام</p>
          <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">
            {activeFilter !== 'all' ? `لا توجد مهام ${statusLabels[activeFilter]}` : 'ابدأ بإضافة مهمة جديدة'}
          </p>
        </div>
      )}

      {/* Add/Edit Dialog - Desktop */}
      {!isMobile && (
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl">{editingTask ? 'تعديل المهمة' : 'إضافة مهمة جديدة'}</DialogTitle>
              <DialogDescription>
                {editingTask ? 'قم بتعديل بيانات المهمة' : 'أدخل بيانات المهمة الجديدة'}
              </DialogDescription>
            </DialogHeader>
            <TaskForm
              title={title}
              onTitleChange={handleTitleChange}
              description={description}
              onDescriptionChange={handleDescriptionChange}
              priority={priority}
              onPriorityChange={handlePriorityChange}
              dueDate={dueDate}
              onDueDateChange={handleDueDateChange}
              editingTask={editingTask}
              isAdmin={isAdmin}
              adminTeams={adminTeams}
              selectedTeamIds={selectedTeamIds}
              onToggleTeam={toggleTeamSelection}
              onSelectAll={selectAllTeams}
              onDeselectAll={deselectAllTeams}
            />
            <DialogFooter>
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                حفظ
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Add/Edit Drawer - Mobile */}
      {isMobile && (
        <Drawer open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>{editingTask ? 'تعديل المهمة' : 'إضافة مهمة جديدة'}</DrawerTitle>
              <DrawerDescription>
                {editingTask ? 'قم بتعديل بيانات المهمة' : 'أدخل بيانات المهمة الجديدة'}
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4 py-4 overflow-y-auto max-h-[60vh]">
              <TaskForm
                title={title}
                onTitleChange={handleTitleChange}
                description={description}
                onDescriptionChange={handleDescriptionChange}
                priority={priority}
                onPriorityChange={handlePriorityChange}
                dueDate={dueDate}
                onDueDateChange={handleDueDateChange}
                editingTask={editingTask}
                isAdmin={isAdmin}
                adminTeams={adminTeams}
                selectedTeamIds={selectedTeamIds}
                onToggleTeam={toggleTeamSelection}
                onSelectAll={selectAllTeams}
                onDeselectAll={deselectAllTeams}
              />
            </div>
            <DrawerFooter>
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-gradient-to-r from-emerald-600 to-emerald-500"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                حفظ
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      )}

      {/* Task Details Dialog */}
      <TaskDetailsDialog
        task={selectedTask}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onStatusChange={(status) => selectedTask && handleStatusChange(selectedTask.id, status)}
        onDelete={() => selectedTask && handleDelete(selectedTask.id)}
        canEdit={canEdit}
        token={token}
      />
    </div>
  );
}
