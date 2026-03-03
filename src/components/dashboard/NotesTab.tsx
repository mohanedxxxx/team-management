'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
  Settings,
  X,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut,
  BookOpen,
  AlignJustify,
  AlignCenter,
  AlignLeft,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Printer,
  Share2,
  Bookmark,
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

interface Subject {
  id: string;
  name: string;
  color: string;
}

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
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [subjectsDialogOpen, setSubjectsDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [submitting, setSubmitting] = useState(false);

  // Note Viewer State
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewingNote, setViewingNote] = useState<Note | null>(null);
  const [fontSize, setFontSize] = useState(18);
  const [textAlign, setTextAlign] = useState<'right' | 'center' | 'justify'>('right');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [bookmarkedNotes, setBookmarkedNotes] = useState<Set<string>>(new Set());
  const [isMobile, setIsMobile] = useState(false);

  // Form state - using separate state to avoid re-render issues
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formSubject, setFormSubject] = useState('');
  const [formColor, setFormColor] = useState('#ffffff');

  // New subject state
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectColor, setNewSubjectColor] = useState('#6366f1');
  const [addingSubject, setAddingSubject] = useState(false);

  // Fetch notes
  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch('/api/notes');
      const data = await res.json();
      if (res.ok) {
        setNotes(data.notes || []);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch subjects
  const fetchSubjects = useCallback(async () => {
    try {
      const res = await fetch('/api/subjects');
      const data = await res.json();
      if (res.ok) {
        setSubjects(data.subjects || []);
        // Set default subject if available
        if (data.subjects?.length > 0 && !formSubject) {
          setFormSubject(data.subjects[0].name);
        }
      }
    } catch (error) {
      console.error('Fetch subjects error:', error);
    }
  }, [formSubject]);

  useEffect(() => {
    fetchNotes();
    fetchSubjects();
  }, [fetchNotes, fetchSubjects]);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Get unique subjects from notes as fallback
  const notesSubjects = useMemo(() => {
    return [...new Set(notes.map((n) => n.subject))];
  }, [notes]);

  // Combine DB subjects with notes subjects
  const allSubjects = useMemo(() => {
    const dbNames = subjects.map(s => s.name);
    const fromNotes = notesSubjects.filter(s => !dbNames.includes(s));
    return [
      ...subjects,
      ...fromNotes.map(name => ({ id: name, name, color: '#6366f1' }))
    ];
  }, [subjects, notesSubjects]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim()) {
      toast.error('العنوان والمحتوى مطلوبان');
      return;
    }

    setSubmitting(true);
    try {
      const method = editingNote ? 'PUT' : 'POST';
      const body = editingNote
        ? { id: editingNote.id, title: formTitle, content: formContent, subject: formSubject, color: formColor }
        : { title: formTitle, content: formContent, subject: formSubject, color: formColor };

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
    setFormTitle('');
    setFormContent('');
    setFormSubject(subjects.length > 0 ? subjects[0].name : 'عام');
    setFormColor('#ffffff');
    setEditingNote(null);
  };

  const openEditDialog = (note: Note) => {
    setEditingNote(note);
    setFormTitle(note.title);
    setFormContent(note.content);
    setFormSubject(note.subject);
    setFormColor(note.color);
    setDialogOpen(true);
  };

  const openNoteViewer = (note: Note) => {
    setViewingNote(note);
    setViewerOpen(true);
    setFontSize(18);
    setTextAlign('right');
    setIsSpeaking(false);
  };

  const closeNoteViewer = () => {
    setViewerOpen(false);
    setViewingNote(null);
    stopSpeaking();
    setIsFullscreen(false);
  };

  const handleAddSubject = async () => {
    if (!newSubjectName.trim()) {
      toast.error('اسم المادة مطلوب');
      return;
    }

    setAddingSubject(true);
    try {
      const res = await fetch('/api/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSubjectName.trim(), color: newSubjectColor }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('تم إضافة المادة');
        setNewSubjectName('');
        setNewSubjectColor('#6366f1');
        fetchSubjects();
      } else {
        toast.error(data.error || 'حدث خطأ');
      }
    } catch {
      toast.error('حدث خطأ');
    } finally {
      setAddingSubject(false);
    }
  };

  const handleDeleteSubject = async (subjectId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه المادة؟')) return;

    try {
      const res = await fetch(`/api/subjects?id=${subjectId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('تم حذف المادة');
        fetchSubjects();
      } else {
        const data = await res.json();
        toast.error(data.error || 'حدث خطأ');
      }
    } catch {
      toast.error('حدث خطأ');
    }
  };

  // Text-to-Speech
  const speakText = () => {
    if (!viewingNote) return;
    
    if ('speechSynthesis' in window) {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        return;
      }
      
      const utterance = new SpeechSynthesisUtterance(viewingNote.content);
      utterance.lang = 'ar-SA';
      utterance.rate = 0.9;
      utterance.onend = () => setIsSpeaking(false);
      
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    } else {
      toast.error('المتصفح لا يدعم خاصية النطق');
    }
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // Font size controls
  const increaseFontSize = () => {
    if (fontSize < 32) setFontSize(prev => prev + 2);
  };

  const decreaseFontSize = () => {
    if (fontSize > 12) setFontSize(prev => prev - 2);
  };

  // Navigation between notes
  const navigateNote = (direction: 'prev' | 'next') => {
    if (!viewingNote) return;
    
    const currentIndex = sortedNotes.findIndex(n => n.id === viewingNote.id);
    const newIndex = direction === 'prev' ? currentIndex + 1 : currentIndex - 1;
    
    if (newIndex >= 0 && newIndex < sortedNotes.length) {
      stopSpeaking();
      setViewingNote(sortedNotes[newIndex]);
      setFontSize(18);
      setTextAlign('right');
    }
  };

  // Toggle bookmark
  const toggleBookmark = (noteId: string) => {
    setBookmarkedNotes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(noteId)) {
        newSet.delete(noteId);
        toast.success('تم إزالة العلامة المرجعية');
      } else {
        newSet.add(noteId);
        toast.success('تم إضافة العلامة المرجعية');
      }
      return newSet;
    });
  };

  // Print note
  const printNote = () => {
    if (!viewingNote) return;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html dir="rtl">
          <head>
            <title>${viewingNote.title}</title>
            <style>
              body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 40px; line-height: 1.8; }
              h1 { color: #1a1a1a; border-bottom: 2px solid #10b981; padding-bottom: 10px; }
              .meta { color: #666; margin-bottom: 20px; }
              .content { white-space: pre-wrap; font-size: 16px; }
            </style>
          </head>
          <body>
            <h1>${viewingNote.title}</h1>
            <div class="meta">
              <span>المادة: ${viewingNote.subject}</span> | 
              <span>التاريخ: ${new Date(viewingNote.updatedAt).toLocaleDateString('ar-EG')}</span>
            </div>
            <div class="content">${viewingNote.content}</div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  // Share note
  const shareNote = async () => {
    if (!viewingNote) return;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: viewingNote.title,
          text: `${viewingNote.title}\n\n${viewingNote.content}`,
        });
      } catch {
        // User cancelled
      }
    } else {
      navigator.clipboard.writeText(`${viewingNote.title}\n\n${viewingNote.content}`);
      toast.success('تم نسخ الملاحظة');
    }
  };

  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      const matchesSearch =
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSubject = selectedSubject === 'all' || note.subject === selectedSubject;
      return matchesSearch && matchesSubject;
    });
  }, [notes, searchQuery, selectedSubject]);

  // Sort notes: pinned first, then by date
  const sortedNotes = useMemo(() => {
    return [...filteredNotes].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [filteredNotes]);

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
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">النوتس</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">ملاحظاتك الشخصية منظمة حسب المواد</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSubjectsDialogOpen(true)}
            className="border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
          >
            <Settings className="w-4 h-4 ml-1" />
            المواد
          </Button>
          
          {/* Desktop Dialog */}
          {!isMobile && (
            <Dialog open={dialogOpen} onOpenChange={(open) => { 
              setDialogOpen(open); 
              if (!open) resetForm(); 
            }}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="w-4 h-4 ml-2" />
                  إضافة ملاحظة
                </Button>
              </DialogTrigger>
            <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-slate-900 dark:text-white">
                  {editingNote ? 'تعديل الملاحظة' : 'إضافة ملاحظة جديدة'}
                </DialogTitle>
                <DialogDescription className="text-slate-500 dark:text-slate-400">
                  أدخل بيانات الملاحظة
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">العنوان</Label>
                  <Input
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="عنوان الملاحظة"
                    className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">المحتوى</Label>
                  <Textarea
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    placeholder="اكتب ملاحظتك هنا..."
                    className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white min-h-[150px]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">المادة</Label>
                    <Select value={formSubject} onValueChange={setFormSubject}>
                      <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                        <SelectValue placeholder="اختر المادة" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                        {allSubjects.map((s) => (
                          <SelectItem key={s.id} value={s.name}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">اللون</Label>
                    <Select value={formColor} onValueChange={setFormColor}>
                      <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                        {colorOptions.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-4 h-4 rounded border border-slate-300 dark:border-slate-600"
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
          )}

          {/* Mobile Drawer */}
          {isMobile && (
            <Drawer open={dialogOpen} onOpenChange={(open) => { 
              setDialogOpen(open); 
              if (!open) resetForm(); 
            }}>
              <DrawerTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="w-4 h-4 ml-2" />
                  إضافة
                </Button>
              </DrawerTrigger>
            <DrawerContent className="bg-white dark:bg-slate-900 border-t-slate-200 dark:border-t-slate-700">
              <DrawerHeader>
                <DrawerTitle className="text-slate-900 dark:text-white">
                  {editingNote ? 'تعديل الملاحظة' : 'إضافة ملاحظة جديدة'}
                </DrawerTitle>
                <DrawerDescription className="text-slate-500 dark:text-slate-400">
                  أدخل بيانات الملاحظة
                </DrawerDescription>
              </DrawerHeader>
              <div className="px-4 overflow-y-auto max-h-[60vh]">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">العنوان</Label>
                    <Input
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="عنوان الملاحظة"
                      className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">المحتوى</Label>
                    <Textarea
                      value={formContent}
                      onChange={(e) => setFormContent(e.target.value)}
                      placeholder="اكتب ملاحظتك هنا..."
                      className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white min-h-[150px]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-700 dark:text-slate-300">المادة</Label>
                      <Select value={formSubject} onValueChange={setFormSubject}>
                        <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                          <SelectValue placeholder="اختر المادة" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                          {allSubjects.map((s) => (
                            <SelectItem key={s.id} value={s.name}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-700 dark:text-slate-300">اللون</Label>
                      <Select value={formColor} onValueChange={setFormColor}>
                        <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                          {colorOptions.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-4 h-4 rounded border border-slate-300 dark:border-slate-600"
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
          )}
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث في الملاحظات..."
            className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white pr-10"
          />
        </div>
        <Select value={selectedSubject} onValueChange={setSelectedSubject}>
          <SelectTrigger className="w-full sm:w-48 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
            <FolderOpen className="w-4 h-4 ml-2" />
            <SelectValue placeholder="كل المواد" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <SelectItem value="all">كل المواد</SelectItem>
            {allSubjects.map((s) => (
              <SelectItem key={s.id} value={s.name}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Notes Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {sortedNotes.map((note) => (
          <Card
            key={note.id}
            className="border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all relative group cursor-pointer"
            style={{ backgroundColor: note.color }}
            onClick={() => openNoteViewer(note)}
          >
            {note.isPinned && (
              <Pin className="absolute top-2 left-2 w-4 h-4 text-red-500 rotate-45" />
            )}
            {bookmarkedNotes.has(note.id) && (
              <Bookmark className="absolute top-2 right-2 w-4 h-4 text-amber-500 fill-amber-500" />
            )}
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-slate-900 text-sm font-semibold line-clamp-1 flex-1">
                  {note.title}
                </CardTitle>
              </div>
              <Badge variant="secondary" className="w-fit text-xs mt-1 bg-slate-100 dark:bg-slate-700">
                {note.subject}
              </Badge>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-3 whitespace-pre-wrap">
                {note.content}
              </p>
              <p className="text-xs text-slate-500 mt-3">
                {new Date(note.updatedAt).toLocaleDateString('ar-EG')}
              </p>
              
              {/* Action buttons - visible on hover */}
              <div className="absolute bottom-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 dark:bg-slate-800/90 rounded-lg p-1 shadow-sm">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 hover:bg-slate-100 dark:hover:bg-slate-700"
                  onClick={(e) => { e.stopPropagation(); handlePin(note.id, note.isPinned); }}
                >
                  {note.isPinned ? (
                    <PinOff className="w-3 h-3 text-slate-600" />
                  ) : (
                    <Pin className="w-3 h-3 text-slate-600" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 hover:bg-slate-100 dark:hover:bg-slate-700"
                  onClick={(e) => { e.stopPropagation(); openEditDialog(note); }}
                >
                  <Edit className="w-3 h-3 text-slate-600" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 hover:bg-red-50 dark:hover:bg-red-900/20"
                  onClick={(e) => { e.stopPropagation(); handleDelete(note.id); }}
                >
                  <Trash2 className="w-3 h-3 text-red-500" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {sortedNotes.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">لا توجد ملاحظات</p>
        </div>
      )}

      {/* Subjects Management Dialog */}
      <Dialog open={subjectsDialogOpen} onOpenChange={setSubjectsDialogOpen}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">إدارة المواد</DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">
              إضافة وحذف المواد الدراسية
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Add new subject */}
            <div className="flex gap-2">
              <Input
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                placeholder="اسم المادة الجديدة"
                className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white flex-1"
                onKeyDown={(e) => e.key === 'Enter' && handleAddSubject()}
              />
              <div className="flex gap-1">
                {['#6366f1', '#ef4444', '#22c55e', '#3b82f6', '#f59e0b'].map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewSubjectColor(color)}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${
                      newSubjectColor === color ? 'border-slate-900 dark:border-white scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <Button
                onClick={handleAddSubject}
                className="bg-emerald-600 hover:bg-emerald-700 shrink-0"
                disabled={addingSubject}
              >
                {addingSubject ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              </Button>
            </div>

            {/* Subjects list */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {subjects.map((subject) => (
                <div
                  key={subject.id}
                  className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: subject.color }}
                    />
                    <span className="text-slate-900 dark:text-white">{subject.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                    onClick={() => handleDeleteSubject(subject.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              
              {subjects.length === 0 && (
                <p className="text-center text-slate-500 dark:text-slate-400 py-4">
                  لا توجد مواد، أضف مادة جديدة
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Note Viewer Modal */}
      {viewerOpen && viewingNote && (
        <div 
          className={`fixed inset-0 z-50 bg-white dark:bg-slate-900 ${isFullscreen ? '' : 'md:m-4 md:rounded-2xl md:border md:border-slate-200 dark:md:border-slate-700 md:shadow-2xl'}`}
          onClick={(e) => e.target === e.currentTarget && closeNoteViewer()}
        >
          <div className="h-full flex flex-col">
            {/* Viewer Header */}
            <div className="bg-gradient-to-l from-emerald-500 to-teal-600 text-white px-4 py-3 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={closeNoteViewer}
                    className="text-white hover:bg-white/20 rounded-xl"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                  <div>
                    <h2 className="font-bold text-lg truncate max-w-[200px] md:max-w-md">{viewingNote.title}</h2>
                    <div className="flex items-center gap-2 text-emerald-100 text-xs">
                      <Badge className="bg-white/20 text-white text-xs">{viewingNote.subject}</Badge>
                      <span>{new Date(viewingNote.updatedAt).toLocaleDateString('ar-EG')}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  {/* Navigation */}
                  <div className="hidden md:flex items-center gap-1 mx-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigateNote('next')}
                      disabled={sortedNotes.findIndex(n => n.id === viewingNote.id) === 0}
                      className="text-white hover:bg-white/20 rounded-xl disabled:opacity-50"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                    <span className="text-sm text-emerald-100 mx-2">
                      {sortedNotes.findIndex(n => n.id === viewingNote.id) + 1} / {sortedNotes.length}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigateNote('prev')}
                      disabled={sortedNotes.findIndex(n => n.id === viewingNote.id) === sortedNotes.length - 1}
                      className="text-white hover:bg-white/20 rounded-xl disabled:opacity-50"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </Button>
                  </div>
                  
                  <div className="w-px h-6 bg-white/20 mx-2 hidden md:block" />
                  
                  {/* Actions */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleBookmark(viewingNote.id)}
                    className="text-white hover:bg-white/20 rounded-xl"
                  >
                    <Bookmark className={`w-5 h-5 ${bookmarkedNotes.has(viewingNote.id) ? 'fill-amber-400 text-amber-400' : ''}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={shareNote}
                    className="text-white hover:bg-white/20 rounded-xl"
                  >
                    <Share2 className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={printNote}
                    className="text-white hover:bg-white/20 rounded-xl hidden md:flex"
                  >
                    <Printer className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="text-white hover:bg-white/20 rounded-xl hidden md:flex"
                  >
                    {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                  </Button>
                </div>
              </div>
            </div>

            {/* Educational Tools Bar */}
            <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-2 shrink-0">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                {/* Text-to-Speech */}
                <div className="flex items-center gap-2">
                  <Button
                    variant={isSpeaking ? "default" : "outline"}
                    size="sm"
                    onClick={speakText}
                    className={`rounded-xl ${isSpeaking ? 'bg-emerald-600 hover:bg-emerald-700' : 'border-slate-200 dark:border-slate-700'}`}
                  >
                    {isSpeaking ? <VolumeX className="w-4 h-4 ml-1" /> : <Volume2 className="w-4 h-4 ml-1" />}
                    {isSpeaking ? 'إيقاف' : 'استمع'}
                  </Button>
                </div>
                
                {/* Font Size */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400">الحجم:</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={decreaseFontSize}
                    className="h-8 w-8 rounded-lg border-slate-200 dark:border-slate-700"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300 w-8 text-center">{fontSize}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={increaseFontSize}
                    className="h-8 w-8 rounded-lg border-slate-200 dark:border-slate-700"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                </div>
                
                {/* Text Alignment */}
                <div className="flex items-center gap-1">
                  <Button
                    variant={textAlign === 'right' ? "default" : "outline"}
                    size="icon"
                    onClick={() => setTextAlign('right')}
                    className={`h-8 w-8 rounded-lg ${textAlign === 'right' ? 'bg-emerald-600 hover:bg-emerald-700' : 'border-slate-200 dark:border-slate-700'}`}
                  >
                    <AlignLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={textAlign === 'center' ? "default" : "outline"}
                    size="icon"
                    onClick={() => setTextAlign('center')}
                    className={`h-8 w-8 rounded-lg ${textAlign === 'center' ? 'bg-emerald-600 hover:bg-emerald-700' : 'border-slate-200 dark:border-slate-700'}`}
                  >
                    <AlignCenter className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={textAlign === 'justify' ? "default" : "outline"}
                    size="icon"
                    onClick={() => setTextAlign('justify')}
                    className={`h-8 w-8 rounded-lg ${textAlign === 'justify' ? 'bg-emerald-600 hover:bg-emerald-700' : 'border-slate-200 dark:border-slate-700'}`}
                  >
                    <AlignJustify className="w-4 h-4" />
                  </Button>
                </div>
                
                {/* Reading Mode Badge */}
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs text-slate-500 dark:text-slate-400">وضع القراءة</span>
                </div>
              </div>
            </div>

            {/* Note Content */}
            <div 
              className="flex-1 overflow-y-auto p-4 md:p-8"
              style={{ backgroundColor: viewingNote.color }}
            >
              <div 
                className="max-w-3xl mx-auto bg-white/80 dark:bg-slate-800/80 rounded-2xl p-6 md:p-8 shadow-lg"
                style={{
                  fontSize: `${fontSize}px`,
                  textAlign: textAlign,
                  lineHeight: 2,
                }}
              >
                <div className="prose dark:prose-invert max-w-none">
                  <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-words">
                    {viewingNote.content}
                  </p>
                </div>
              </div>
            </div>

            {/* Mobile Navigation */}
            <div className="md:hidden bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-4 py-3 flex justify-between items-center shrink-0">
              <Button
                variant="outline"
                onClick={() => navigateNote('next')}
                disabled={sortedNotes.findIndex(n => n.id === viewingNote.id) === 0}
                className="rounded-xl border-slate-200 dark:border-slate-700"
              >
                <ChevronRight className="w-5 h-5 ml-1" />
                السابق
              </Button>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {sortedNotes.findIndex(n => n.id === viewingNote.id) + 1} / {sortedNotes.length}
              </span>
              <Button
                variant="outline"
                onClick={() => navigateNote('prev')}
                disabled={sortedNotes.findIndex(n => n.id === viewingNote.id) === sortedNotes.length - 1}
                className="rounded-xl border-slate-200 dark:border-slate-700"
              >
                التالي
                <ChevronLeft className="w-5 h-5 mr-1" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
