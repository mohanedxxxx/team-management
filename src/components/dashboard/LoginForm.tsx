'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, LogIn, UserPlus, Users, Moon, Sun, Sparkles } from 'lucide-react';

interface LoginFormProps {
  onLoginSuccess: () => void;
}

export function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [loginLoading, setLoginLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);

    const result = await login(loginEmail, loginPassword);

    if (result.success) {
      toast.success('تم تسجيل الدخول بنجاح');
      onLoginSuccess();
    } else {
      toast.error(result.error || 'حدث خطأ في تسجيل الدخول');
    }

    setLoginLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: registerEmail,
          password: registerPassword,
          name: registerName,
          inviteCode: inviteCode || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(data.message || 'تم التسجيل بنجاح');
        onLoginSuccess();
      } else {
        toast.error(data.error || 'حدث خطأ في التسجيل');
      }
    } catch {
      toast.error('حدث خطأ في الاتصال');
    }

    setRegisterLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-white dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-teal-500/10 dark:bg-teal-500/5 rounded-full blur-3xl" />
      </div>
      
      {/* Theme toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        className="absolute top-4 left-4 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/50 rounded-xl"
      >
        {theme === 'dark' ? (
          <Sun className="w-5 h-5" />
        ) : (
          <Moon className="w-5 h-5" />
        )}
      </Button>
      
      <Card className="w-full max-w-md border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-2xl shadow-slate-200/50 dark:shadow-slate-900/50 rounded-2xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/20">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">منصة إدارة الفريق</CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            سجل دخولك للوصول إلى لوحة التحكم
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-slate-100 dark:bg-slate-800/50 rounded-xl p-1">
              <TabsTrigger 
                value="login" 
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm rounded-lg"
              >
                تسجيل الدخول
              </TabsTrigger>
              <TabsTrigger 
                value="register" 
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm rounded-lg"
              >
                حساب جديد
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-slate-700 dark:text-slate-300">البريد الإلكتروني</Label>
                  <Input
                    id="login-email"
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="example@email.com"
                    required
                    className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-slate-700 dark:text-slate-300">كلمة المرور</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 h-11 rounded-xl"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white h-11 rounded-xl shadow-lg shadow-emerald-500/20"
                  disabled={loginLoading}
                >
                  {loginLoading ? (
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  ) : (
                    <LogIn className="ml-2 h-4 w-4" />
                  )}
                  تسجيل الدخول
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register" className="mt-6">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-name" className="text-slate-700 dark:text-slate-300">الاسم</Label>
                  <Input
                    id="register-name"
                    type="text"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    placeholder="اسمك الكامل"
                    required
                    className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-email" className="text-slate-700 dark:text-slate-300">البريد الإلكتروني</Label>
                  <Input
                    id="register-email"
                    type="email"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    placeholder="example@email.com"
                    required
                    className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password" className="text-slate-700 dark:text-slate-300">كلمة المرور</Label>
                  <Input
                    id="register-password"
                    type="password"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-code" className="text-slate-700 dark:text-slate-300">
                    كود الدعوة <span className="text-slate-400">(اختياري)</span>
                  </Label>
                  <Input
                    id="invite-code"
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="XXXXXXXX"
                    className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 font-mono tracking-wider h-11 rounded-xl"
                  />
                  <p className="text-xs text-slate-400">
                    إذا كان لديك كود دعوة، سيتم إرسال طلب انضمام للفريق
                  </p>
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white h-11 rounded-xl shadow-lg shadow-emerald-500/20"
                  disabled={registerLoading}
                >
                  {registerLoading ? (
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="ml-2 h-4 w-4" />
                  )}
                  إنشاء الحساب
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
