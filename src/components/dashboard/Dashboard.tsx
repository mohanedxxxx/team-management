'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
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
  ClipboardList,
  FileText,
  LogOut,
  Settings,
  Menu,
  LayoutDashboard,
  Globe,
  HelpCircle,
  UserPlus,
  Plus,
  Loader2,
  Moon,
  Sun,
  Shield,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { GlobalTasksTab } from './GlobalTasksTab';
import { PersonalTasksTab } from './PersonalTasksTab';
import { NotesTab } from './NotesTab';
import { JoinRequestsTab } from './JoinRequestsTab';
import { UsersTab } from './UsersTab';
import { QuizzesTab } from './QuizzesTab';
import { AdminTab } from './AdminTab';
import { SettingsDialog } from './SettingsDialog';

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

function getInitials(name: string | null) {
  if (!name) return 'U';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function Dashboard() {
  const { user, logout, refreshUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('global-tasks');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Join team state
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  
  // Create team state
  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [creating, setCreating] = useState(false);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleLogout = async () => {
    await logout();
    toast.success('تم تسجيل الخروج');
  };
  
  const handleJoinTeam = async () => {
    if (!joinCode.trim()) {
      toast.error('أدخل كود الدعوة');
      return;
    }
    
    setJoining(true);
    try {
      const res = await fetch('/api/join-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: joinCode.trim() }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast.success(data.message || 'تم إرسال طلب الانضمام');
        setJoinCode('');
        refreshUser();
      } else {
        toast.error(data.error || 'حدث خطأ');
      }
    } catch {
      toast.error('حدث خطأ');
    } finally {
      setJoining(false);
    }
  };
  
  const handleCreateTeam = async () => {
    if (!teamName.trim()) {
      toast.error('أدخل اسم الفريق');
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
        setCreateTeamOpen(false);
        setTeamName('');
        setTeamDescription('');
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

  const isAdmin = user?.currentTeam?.role === 'ADMIN';
  const isLeader = user?.currentTeam?.role === 'LEADER';
  const isModerator = user?.currentTeam?.role === 'MODERATOR';
  
  // Check if user is admin in ANY team (can create teams)
  const canCreateTeam = user?.teams?.some(t => t.role === 'ADMIN');

  const navItems = [
    { id: 'admin', label: 'لوحة التحكم', icon: Shield, visible: isAdmin },
    { id: 'global-tasks', label: 'المهام الكلية', icon: Globe, visible: true },
    { id: 'personal-tasks', label: 'المهام الشخصية', icon: ClipboardList, visible: true },
    { id: 'notes', label: 'النوتس', icon: FileText, visible: true },
    { id: 'quizzes', label: 'الاختبارات', icon: HelpCircle, visible: true },
    { id: 'join-requests', label: 'طلبات الانضمام', icon: UserPlus, visible: isAdmin || isLeader || isModerator },
    { id: 'users', label: 'الأعضاء', icon: Users, visible: true },
  ].filter(item => item.visible);

  const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <div className="flex flex-col flex-1">
      {/* Logo */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-slate-900 dark:text-white truncate">إدارة الفريق</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">منصة متكاملة</p>
          </div>
        </div>
      </div>
      
      {/* Current Team */}
      {user?.currentTeam && (
        <div className="p-3 border-b border-slate-200 dark:border-slate-700">
          <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-3">
            <p className="text-slate-900 dark:text-white font-medium truncate">{user.currentTeam.name}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">كود الدعوة:</span>
              <code className="font-mono text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded">
                {user.currentTeam.inviteCode}
              </code>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <Button
            key={item.id}
            variant="ghost"
            className={`w-full justify-start gap-3 h-11 rounded-xl transition-all ${
              activeTab === item.id
                ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            onClick={() => {
              setActiveTab(item.id);
              onNavigate?.();
            }}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            <span className="truncate">{item.label}</span>
          </Button>
        ))}
      </nav>

      {/* User Profile */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3 p-2">
          <Avatar className="w-10 h-10 shrink-0 ring-2 ring-emerald-500/20">
            <AvatarFallback className={`${roleColors[user?.currentTeam?.role || 'MEMBER']} text-white text-sm`}>
              {getInitials(user?.name || null)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{user?.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {roleLabels[user?.currentTeam?.role || 'MEMBER']}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex-col shadow-sm">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden fixed top-4 right-4 z-50 bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-lg rounded-xl"
          >
            <Menu className="w-5 h-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-72 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>القائمة</SheetTitle>
          </SheetHeader>
          <SidebarContent onNavigate={() => setSidebarOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 md:px-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 pr-12 md:pr-0">
              <div className="min-w-0">
                <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white truncate">
                  {navItems.find((item) => item.id === activeTab)?.label}
                </h2>
                {user?.currentTeam && (
                  <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 truncate">
                    {user.currentTeam.name}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-3">
              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </Button>
              
              <Badge className={`${roleColors[user?.currentTeam?.role || 'MEMBER']} text-white text-xs hidden sm:flex rounded-lg`}>
                {roleLabels[user?.currentTeam?.role || 'MEMBER']}
              </Badge>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
                    <Settings className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl">
                  <DropdownMenuLabel className="text-slate-500 dark:text-slate-400">الإعدادات</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-700" />
                  <DropdownMenuItem 
                    onClick={() => setSettingsOpen(true)} 
                    className="text-slate-900 dark:text-white cursor-pointer rounded-lg mx-1 focus:bg-slate-100 dark:focus:bg-slate-700"
                  >
                    <Settings className="w-4 h-4 ml-2" />
                    إعدادات الحساب
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={handleLogout} 
                    className="text-red-500 cursor-pointer rounded-lg mx-1 focus:bg-red-50 dark:focus:bg-red-900/20"
                  >
                    <LogOut className="w-4 h-4 ml-2" />
                    تسجيل الخروج
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-4 md:p-6 overflow-auto">
          {user?.currentTeam ? (
            <>
              {activeTab === 'admin' && isAdmin && <AdminTab />}
              {activeTab === 'global-tasks' && <GlobalTasksTab />}
              {activeTab === 'personal-tasks' && <PersonalTasksTab />}
              {activeTab === 'notes' && <NotesTab />}
              {activeTab === 'quizzes' && <QuizzesTab />}
              {activeTab === 'join-requests' && <JoinRequestsTab />}
              {activeTab === 'users' && <UsersTab />}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center mb-6 shadow-lg">
                <Users className="w-10 h-10 text-slate-400 dark:text-slate-500" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">لا توجد فرق</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-8">استخدم كود دعوة للانضمام لفريق</p>
              
              {/* Join team form */}
              <div className="w-full space-y-4 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-lg">
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300 font-medium">كود الدعوة</Label>
                  <Input
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="XXXXXXXX"
                    className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono tracking-wider text-center text-lg h-12 rounded-xl"
                  />
                </div>
                <Button
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white h-11 rounded-xl shadow-lg shadow-emerald-500/20"
                  onClick={handleJoinTeam}
                  disabled={joining}
                >
                  {joining ? (
                    <Loader2 className="w-4 h-4 animate-spin ml-2" />
                  ) : null}
                  انضمام للفريق
                </Button>
              </div>
              
              {/* Create team button for admins */}
              {canCreateTeam && (
                <div className="mt-8 w-full">
                  <div className="flex items-center gap-4 my-6">
                    <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                    <span className="text-slate-400 dark:text-slate-500 text-sm">أو</span>
                    <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                  </div>
                  <Button
                    variant="outline"
                    className="w-full border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 h-11 rounded-xl"
                    onClick={() => setCreateTeamOpen(true)}
                  >
                    <Plus className="w-4 h-4 ml-2" />
                    إنشاء فريق جديد
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      
      {/* Settings Dialog */}
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      
      {/* Create Team Dialog - Desktop */}
      {!isMobile && (
        <Dialog open={createTeamOpen} onOpenChange={setCreateTeamOpen}>
          <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-2xl max-w-md">
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
                  placeholder="اسم الفريق"
                  className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300">الوصف (اختياري)</Label>
                <Input
                  value={teamDescription}
                  onChange={(e) => setTeamDescription(e.target.value)}
                  placeholder="وصف الفريق"
                  className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl shadow-lg shadow-emerald-500/20"
                onClick={handleCreateTeam}
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

      {/* Create Team Drawer - Mobile */}
      {isMobile && (
        <Drawer open={createTeamOpen} onOpenChange={setCreateTeamOpen}>
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
                    placeholder="اسم الفريق"
                    className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">الوصف (اختياري)</Label>
                  <Input
                    value={teamDescription}
                    onChange={(e) => setTeamDescription(e.target.value)}
                    placeholder="وصف الفريق"
                    className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl"
                  />
                </div>
              </div>
            </div>
            <DrawerFooter>
              <Button
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl shadow-lg shadow-emerald-500/20"
                onClick={handleCreateTeam}
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
