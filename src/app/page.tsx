'use client';

import { useAuth } from '@/contexts/AuthContext';
import { LoginForm } from '@/components/dashboard/LoginForm';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { InstallPrompt } from '@/components/InstallPrompt';
import { NotificationPermission } from '@/components/NotificationPermission';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!user) {
    return <LoginForm onLoginSuccess={() => {}} />;
  }

  return (
    <>
      <Dashboard />
      <InstallPrompt />
      <NotificationPermission />
    </>
  );
}
