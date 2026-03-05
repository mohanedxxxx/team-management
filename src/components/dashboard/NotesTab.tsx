'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
  AlignJustify,
  AlignCenter,
  AlignLeft,
  AlignRight,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Printer,
  Share2,
  Bookmark,
  ChevronDown,
  ChevronUp,
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
  author?: {
    id: string;
    name: string | null;
  };
}

interface Subject {
  id: string;
  name: string;
  color: string;
}

// Beautiful note colors with good contrast
const colorOptions = [
  { name: 'أبيض', value: '#ffffff', textColor: '#1e293b' },
  { name: 'أحمر فاتح', value: '#fef2f2', textColor: '#991b1b' },
  { name: 'برتقالي فاتح', value: '#fff7ed', textColor: '#9a3412' },
  { name: 'أصفر فاتح', value: '#fefce8', textColor: '#854d0e' },
  { name: 'أخضر فاتح', value: '#f0fdf4', textColor: '#166534' },
  { name: 'سماوي فاتح', value: '#ecfeff', textColor: '#0e7490' },
  { name: 'أزرق فاتح', value: '#eff6ff', textColor: '#1e40af' },
  { name: 'بنفسجي فاتح', value: '#faf5ff', textColor: '#7e22ce' },
  { name: 'وردي فاتح', value: '#fdf2f8', textColor: '#be185d' },
];

// Get text color based on background
function getTextColor(bgColor: string): string {
  const color = colorOptions.find(c => c.value === bgColor);
  if (color) return color.textColor;
  
  // Calculate contrast for custom colors
  const hex = bgColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 155 ? '#1e293b' : '#f8fafc';
}

// Custom scrollbar styles
const scrollbarStyles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
  .dark .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #475569;
  }
  .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #64748b;
  }
`;

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
  const [textAlign, setTextAlign] = useState<'right' | 'center' | 'left' | 'justify'>('right');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [bookmarkedNotes, setBookmarkedNotes] = useState<Set<string>>(new Set());
  
  // Expanded subjects for folder view
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());

  const isMobile = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 640;
  }, []);

  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formSubject, setFormSubject] = useState('');
  const [formColor, setFormColor] = useState('#ffffff');

  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectColor, setNewSubjectColor] = useState('#6366f1');
  const [addingSubject, setAddingSubject] = useState(false);

  const canManageNotes = user?.currentTeam?.role === 'ADMIN' || 
                         user?.currentTeam?.role === 'LEADER' || 
                         user?.currentTeam?.role === 'MODERATOR';

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

  const fetchSubjects = useCallback(async () => {
    try {
      const res = await fetch('/api/subjects');
      const data = await res.json();
      if (res.ok) {
        setSubjects(data.subjects || []);
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

  const notesSubjects = useMemo(() => {
    return [...new Set(notes.map((n) => n.subject))];
  }, [notes]);

  const allSubjects = useMemo(() => {
    const dbNames = subjects.map(s => s.name);
    const fromNotes = notesSubjects.filter(s => !dbNames.includes(s));
    return [
      ...subjects,
      ...fromNotes.map(name => ({ id: name, name, color: '#6366f1' }))
    ];
  }, [subjects, notesSubjects]);

  // Group notes by subject
  const notesBySubject = useMemo(() => {
    const grouped: Record<string, Note[]> = {};
    sortedNotes.forEach(note => {
      if (!grouped[note.subject]) {
        grouped[note.subject] = [];
      }
      grouped[note.subject].push(note);
    });
    return grouped;
  }, [notes, searchQuery]);

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

  const increaseFontSize = () => {
    if (fontSize < 32) setFontSize(prev => prev + 2);
  };

  const decreaseFontSize = () => {
    if (fontSize > 12) setFontSize(prev => prev - 2);
  };

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

  const sortedNotes = useMemo(() => {
    return [...filteredNotes].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [filteredNotes]);

  const toggleSubjectExpand = (subjectName: string) => {
    setExpandedSubjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(subjectName)) {
        newSet.delete(subjectName);
      } else {
        newSet.add(subjectName);
      }
      return newSet;
    });
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
      {/* Custom Scrollbar Styles */}
      <style>{scrollbarStyles}</style>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">النوتس</h3>
          <p className="text-sm text-slate-500">ملاحظات الفريق منظمة حسب المواد</p>
        </div>
        <div className="flex gap-2">
          {canManageNotes && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSubjectsDialogOpen(true)}
              className="border-slate-200 dark:border-slate-700"
            >
              <Settings className="w-4 h-4 ml-1" />
              المواد
            </Button>
          )}
          
          {!isMobile && canManageNotes && (
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
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingNote ? 'تعديل الملاحظة' : 'إضافة ملاحظة جديدة'}</DialogTitle>
                  <DialogDescription>أدخل بيانات الملاحظة</DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>العنوان</Label>
                    <Input
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="عنوان الملاحظة"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>المحتوى</Label>
                    <Textarea
                      value={formContent}
                      onChange={(e) => setFormContent(e.target.value)}
                      placeholder="اكتب ملاحظتك هنا..."
                      className="min-h-[150px]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>المادة</Label>
                      <Select value={formSubject} onValueChange={setFormSubject}>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر المادة" />
                        </SelectTrigger>
                        <SelectContent>
                          {allSubjects.map((s) => (
                            <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>اللون</Label>
                      <div className="flex flex-wrap gap-2 p-2 border rounded-lg">
                        {colorOptions.map((c) => (
                          <button
                            key={c.value}
                            type="button"
                            onClick={() => setFormColor(c.value)}
                            className={`w-6 h-6 rounded-full border-2 transition-all ${
                              formColor === c.value ? 'border-slate-900 scale-110' : 'border-slate-300'
                            }`}
                            style={{ backgroundColor: c.value }}
                            title={c.name}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </form>
                
                <DialogFooter>
                  <Button onClick={handleSubmit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'حفظ'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {isMobile && canManageNotes && (
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
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>{editingNote ? 'تعديل الملاحظة' : 'إضافة ملاحظة جديدة'}</DrawerTitle>
                </DrawerHeader>
                <div className="px-4 overflow-y-auto max-h-[60vh] custom-scrollbar">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label>العنوان</Label>
                      <Input
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        placeholder="عنوان الملاحظة"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>المحتوى</Label>
                      <Textarea
                        value={formContent}
                        onChange={(e) => setFormContent(e.target.value)}
                        placeholder="اكتب ملاحظتك هنا..."
                        className="min-h-[150px]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>المادة</Label>
                        <Select value={formSubject} onValueChange={setFormSubject}>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر المادة" />
                          </SelectTrigger>
                          <SelectContent>
                            {allSubjects.map((s) => (
                              <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>اللون</Label>
                        <div className="flex flex-wrap gap-1 p-2 border rounded-lg">
                          {colorOptions.slice(0, 6).map((c) => (
                            <button
                              key={c.value}
                              type="button"
                              onClick={() => setFormColor(c.value)}
                              className={`w-5 h-5 rounded-full border-2 ${
                                formColor === c.value ? 'border-slate-900 scale-110' : 'border-slate-300'
                              }`}
                              style={{ backgroundColor: c.value }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </form>
                </div>
                <DrawerFooter>
                  <Button onClick={handleSubmit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'حفظ'}
                  </Button>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ابحث في الملاحظات..."
          className="pr-10"
        />
      </div>

      {/* Notes organized by Subject (Folder style) */}
      <div className="space-y-4">
        {Object.entries(notesBySubject).map(([subjectName, subjectNotes]) => {
          const isExpanded = expandedSubjects.has(subjectName) || searchQuery.length > 0;
          const subjectInfo = allSubjects.find(s => s.name === subjectName);
          const pinnedCount = subjectNotes.filter(n => n.isPinned).length;
          
          return (
            <div key={subjectName} className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              {/* Subject Header */}
              <button
                onClick={() => toggleSubjectExpand(subjectName)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: subjectInfo?.color || '#6366f1' }}
                  />
                  <span className="font-medium text-slate-900 dark:text-white">{subjectName}</span>
                  <Badge variant="secondary" className="text-xs">
                    {subjectNotes.length} نوتة
                  </Badge>
                  {pinnedCount > 0 && (
                    <Badge className="bg-amber-100 text-amber-700 text-xs">
                      <Pin className="w-3 h-3 ml-1" />
                      {pinnedCount}
                    </Badge>
                  )}
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </button>
              
              {/* Notes Grid */}
              {isExpanded && (
                <div className="p-4 pt-0 grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {subjectNotes.map((note) => (
                    <Card
                      key={note.id}
                      className="border-2 hover:shadow-lg transition-all relative group cursor-pointer overflow-hidden"
                      style={{ 
                        backgroundColor: note.color,
                        borderColor: note.isPinned ? '#f59e0b' : 'transparent'
                      }}
                      onClick={() => openNoteViewer(note)}
                    >
                      {/* Pin indicator */}
                      {note.isPinned && (
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-amber-500" />
                      )}
                      
                      <div className="p-4">
                        {/* Title with proper color */}
                        <h4 
                          className="font-semibold text-sm line-clamp-1 mb-2"
                          style={{ color: getTextColor(note.color) }}
                        >
                          {note.isPinned && <Pin className="w-3 h-3 inline ml-1 text-amber-500" />}
                          {note.title}
                        </h4>
                        
                        {/* Content preview with proper color */}
                        <p 
                          className="text-xs line-clamp-3 whitespace-pre-wrap mb-3 opacity-80"
                          style={{ color: getTextColor(note.color) }}
                        >
                          {note.content}
                        </p>
                        
                        {/* Date */}
                        <p className="text-xs opacity-60" style={{ color: getTextColor(note.color) }}>
                          {new Date(note.updatedAt).toLocaleDateString('ar-EG')}
                        </p>
                        
                        {/* Action buttons */}
                        {canManageNotes && (
                          <div className={`flex gap-1 mt-2 pt-2 border-t border-black/10 ${isMobile ? '' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => { e.stopPropagation(); handlePin(note.id, note.isPinned); }}
                            >
                              {note.isPinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => { e.stopPropagation(); openEditDialog(note); }}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-500 hover:text-red-600"
                              onClick={(e) => { e.stopPropagation(); handleDelete(note.id); }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {sortedNotes.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">لا توجد ملاحظات</p>
        </div>
      )}

      {/* Subjects Management Dialog */}
      <Dialog open={subjectsDialogOpen} onOpenChange={setSubjectsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>إدارة المواد</DialogTitle>
            <DialogDescription>إضافة وحذف المواد الدراسية</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                placeholder="اسم المادة الجديدة"
                onKeyDown={(e) => e.key === 'Enter' && handleAddSubject()}
              />
              <div className="flex gap-1">
                {['#6366f1', '#ef4444', '#22c55e', '#3b82f6', '#f59e0b'].map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewSubjectColor(color)}
                    className={`w-6 h-6 rounded-full border-2 ${
                      newSubjectColor === color ? 'border-slate-900 scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <Button onClick={handleAddSubject} disabled={addingSubject} className="bg-emerald-600 shrink-0">
                {addingSubject ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              </Button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
              {subjects.map((subject) => (
                <div key={subject.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: subject.color }} />
                    <span>{subject.name}</span>
                  </div>
                  <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDeleteSubject(subject.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              
              {subjects.length === 0 && (
                <p className="text-center text-slate-500 py-4">لا توجد مواد، أضف مادة جديدة</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Note Viewer Modal */}
      {viewerOpen && viewingNote && (
        <div 
          className={`fixed inset-0 z-50 bg-white dark:bg-slate-900 ${isFullscreen ? '' : 'md:m-4 md:rounded-2xl md:border md:shadow-2xl'}`}
          onClick={(e) => e.target === e.currentTarget && closeNoteViewer()}
        >
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-l from-emerald-500 to-teal-600 text-white px-4 py-3 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" onClick={closeNoteViewer} className="text-white hover:bg-white/20">
                    <X className="w-5 h-5" />
                  </Button>
                  <div>
                    <h2 className="font-bold text-lg truncate max-w-[200px] md:max-w-md">{viewingNote.title}</h2>
                    <div className="flex items-center gap-2 text-emerald-100 text-xs">
                      <Badge className="bg-white/20 text-white">{viewingNote.subject}</Badge>
                      <span>{new Date(viewingNote.updatedAt).toLocaleDateString('ar-EG')}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  <div className="hidden md:flex items-center gap-1 mx-2">
                    <Button variant="ghost" size="icon" onClick={() => navigateNote('next')} className="text-white hover:bg-white/20">
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                    <span className="text-sm mx-2">
                      {sortedNotes.findIndex(n => n.id === viewingNote.id) + 1} / {sortedNotes.length}
                    </span>
                    <Button variant="ghost" size="icon" onClick={() => navigateNote('prev')} className="text-white hover:bg-white/20">
                      <ChevronLeft className="w-5 h-5" />
                    </Button>
                  </div>
                  
                  <Button variant="ghost" size="icon" onClick={() => toggleBookmark(viewingNote.id)} className="text-white hover:bg-white/20">
                    <Bookmark className={`w-5 h-5 ${bookmarkedNotes.has(viewingNote.id) ? 'fill-amber-400 text-amber-400' : ''}`} />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={shareNote} className="text-white hover:bg-white/20">
                    <Share2 className="w-5 h-5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={printNote} className="text-white hover:bg-white/20 hidden md:flex">
                    <Printer className="w-5 h-5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setIsFullscreen(!isFullscreen)} className="text-white hover:bg-white/20 hidden md:flex">
                    {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                  </Button>
                </div>
              </div>
            </div>

            {/* Tools Bar */}
            <div className="bg-slate-50 dark:bg-slate-800 border-b px-4 py-2 shrink-0">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                {/* Text-to-Speech */}
                <Button
                  variant={isSpeaking ? "default" : "outline"}
                  size="sm"
                  onClick={speakText}
                  className={isSpeaking ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                >
                  {isSpeaking ? <VolumeX className="w-4 h-4 ml-1" /> : <Volume2 className="w-4 h-4 ml-1" />}
                  {isSpeaking ? 'إيقاف' : 'استمع'}
                </Button>
                
                {/* Font Size */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">الحجم:</span>
                  <Button variant="outline" size="icon" onClick={decreaseFontSize} className="h-8 w-8">
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <span className="text-sm font-medium w-8 text-center">{fontSize}</span>
                  <Button variant="outline" size="icon" onClick={increaseFontSize} className="h-8 w-8">
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                </div>
                
                {/* Text Alignment - with Left option for English */}
                <div className="flex items-center gap-1">
                  <Button
                    variant={textAlign === 'right' ? "default" : "outline"}
                    size="icon"
                    onClick={() => setTextAlign('right')}
                    className={`h-8 w-8 ${textAlign === 'right' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                    title="يمين"
                  >
                    <AlignRight className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={textAlign === 'center' ? "default" : "outline"}
                    size="icon"
                    onClick={() => setTextAlign('center')}
                    className={`h-8 w-8 ${textAlign === 'center' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                    title="وسط"
                  >
                    <AlignCenter className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={textAlign === 'left' ? "default" : "outline"}
                    size="icon"
                    onClick={() => setTextAlign('left')}
                    className={`h-8 w-8 ${textAlign === 'left' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                    title="يسار (للإنجليزي)"
                  >
                    <AlignLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={textAlign === 'justify' ? "default" : "outline"}
                    size="icon"
                    onClick={() => setTextAlign('justify')}
                    className={`h-8 w-8 ${textAlign === 'justify' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                    title="ضبط"
                  >
                    <AlignJustify className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div 
              className="flex-1 overflow-y-auto p-6 custom-scrollbar"
              style={{ backgroundColor: viewingNote.color }}
            >
              <div
                className="max-w-4xl mx-auto leading-relaxed whitespace-pre-wrap"
                style={{ 
                  fontSize: `${fontSize}px`,
                  textAlign: textAlign,
                  direction: textAlign === 'left' ? 'ltr' : 'rtl',
                  color: getTextColor(viewingNote.color)
                }}
              >
                {viewingNote.content}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
