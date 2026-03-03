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
  Edit,
  Pin,
  PinOff,
  FileText,
  Loader2,
  Search,
  FolderOpen,
} from 'lucide-react';

interface Note {
  id: string;
  title: string;
  content: string;
  subject: string;
  color: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

const predefinedSubjects = [
  'عام',
  'رياضيات',
  'فيزياء',
  'كيمياء',
  'أحياء',
  'برمجة',
  'تصميم',
  'إدارة',
  'تسويق',
  'أخرى',
];

const colorOptions = [
  { name: 'أبيض', value: '#ffffff' },
  { name: 'أحمر', value: '#fee2e2' },
  { name: 'أخضر', value: '#dcfce7' },
  { name: 'أزرق', value: '#dbeafe' },
  { name: 'أصفر', value: '#fef9c3' },
  { name: 'بنفسجي', value: '#f3e8ff' },
  { name: 'وردي', value: '#fce7f3' },
];

export function NotesTab() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [subject, setSubject] = useState('عام');
  const [color, setColor] = useState('#ffffff');
  const [submitting, setSubmitting] = useState(false);

  const fetchNotes = async () => {
    try {
      const res = await fetch('/api/notes');
      const data = await res.json();
      if (res.ok) {
        setNotes(data.notes);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error('العنوان والمحتوى مطلوبان');
      return;
    }

    setSubmitting(true);
    try {
      const method = editingNote ? 'PUT' : 'POST';
      const body = editingNote
        ? { id: editingNote.id, title, content, subject, color }
        : { title, content, subject, color };

      const res = await fetch('/api/notes', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(editingNote ? 'تم تحديث الملاحظة' : 'تم إنشاء الملاحظة');
        setDialogOpen(false);
        resetForm();
        fetchNotes();
      } else {
        toast.error(data.error || 'حدث خطأ');
      }
    } catch {
      toast.error('حدث خطأ في الاتصال');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePin = async (noteId: string, isPinned: boolean) => {
    try {
      const res = await fetch('/api/notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: noteId, isPinned: !isPinned }),
      });

      if (res.ok) {
        toast.success(isPinned ? 'تم إلغاء التثبيت' : 'تم تثبيت الملاحظة');
        fetchNotes();
      }
    } catch {
      toast.error('حدث خطأ');
    }
  };

  const handleDelete = async (noteId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الملاحظة؟')) return;

    try {
      const res = await fetch(`/api/notes?id=${noteId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('تم حذف الملاحظة');
        fetchNotes();
      }
    } catch {
      toast.error('حدث خطأ');
    }
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setSubject('عام');
    setColor('#ffffff');
    setEditingNote(null);
  };

  const openEditDialog = (note: Note) => {
    setEditingNote(note);
    setTitle(note.title);
    setContent(note.content);
    setSubject(note.subject);
    setColor(note.color);
    setDialogOpen(true);
  };

  const filteredNotes = notes.filter((note) => {
    const matchesSearch =
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = selectedSubject === 'all' || note.subject === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  const subjects = [...new Set(notes.map((n) => n.subject))];

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
          placeholder="عنوان الملاحظة"
          className="bg-slate-700 border-slate-600 text-white"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-slate-300">المحتوى</Label>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="اكتب ملاحظتك هنا..."
          className="bg-slate-700 border-slate-600 text-white min-h-[150px]"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-slate-300">المادة</Label>
          <Select value={subject} onValueChange={setSubject}>
            <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-slate-600">
              {predefinedSubjects.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-slate-300">اللون</Label>
          <Select value={color} onValueChange={setColor}>
            <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-slate-600">
              {colorOptions.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded border border-slate-500"
                      style={{ backgroundColor: c.value }}
                    />
                    {c.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </form>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">النوتس</h3>
          <p className="text-sm text-slate-400">ملاحظاتك الشخصية منظمة حسب المواد</p>
        </div>
        <>
          {/* Desktop Dialog */}
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="hidden sm:flex bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4 ml-2" />
                إضافة ملاحظة
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-slate-700 max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-white">
                  {editingNote ? 'تعديل الملاحظة' : 'إضافة ملاحظة جديدة'}
                </DialogTitle>
                <DialogDescription className="text-slate-400">
                  أدخل بيانات الملاحظة
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
                  {editingNote ? 'تعديل الملاحظة' : 'إضافة ملاحظة جديدة'}
                </DrawerTitle>
                <DrawerDescription className="text-slate-400">
                  أدخل بيانات الملاحظة
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
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث في الملاحظات..."
            className="bg-slate-800 border-slate-700 text-white pr-10"
          />
        </div>
        <Select value={selectedSubject} onValueChange={setSelectedSubject}>
          <SelectTrigger className="w-full sm:w-48 bg-slate-800 border-slate-700 text-white">
            <FolderOpen className="w-4 h-4 ml-2" />
            <SelectValue placeholder="كل المواد" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            <SelectItem value="all">كل المواد</SelectItem>
            {subjects.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Notes Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredNotes.map((note) => (
          <Card
            key={note.id}
            className="border-slate-700 hover:border-slate-600 transition-all relative group"
            style={{ backgroundColor: note.color }}
          >
            {note.isPinned && (
              <Pin className="absolute top-2 left-2 w-4 h-4 text-red-500 rotate-45" />
            )}
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-slate-900 text-sm font-semibold line-clamp-1 flex-1">
                  {note.title}
                </CardTitle>
                <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handlePin(note.id, note.isPinned)}
                  >
                    {note.isPinned ? (
                      <PinOff className="w-3 h-3" />
                    ) : (
                      <Pin className="w-3 h-3" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => openEditDialog(note)}
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-red-500"
                    onClick={() => handleDelete(note.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <Badge variant="secondary" className="w-fit text-xs mt-1">
                {note.subject}
              </Badge>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-700 line-clamp-4 whitespace-pre-wrap">
                {note.content}
              </p>
              <p className="text-xs text-slate-500 mt-3">
                {new Date(note.updatedAt).toLocaleDateString('ar-EG')}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredNotes.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">لا توجد ملاحظات</p>
        </div>
      )}
    </div>
  );
}
