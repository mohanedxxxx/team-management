'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Building2, ChevronDown, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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

export function TeamSwitcher() {
  const { user, refreshUser } = useAuth();
  const [switching, setSwitching] = useState(false);
  const [open, setOpen] = useState(false);

  const teams = user?.teams || [];
  const currentTeam = user?.currentTeam;

  const handleSwitchTeam = async (teamId: string) => {
    if (teamId === currentTeam?.id) return;

    setSwitching(true);
    try {
      const res = await fetch('/api/auth/switch-team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId }),
      });

      if (res.ok) {
        await refreshUser();
        toast.success('تم تبديل الفريق');
        setOpen(false);
        // Refresh the page to load new team data
        window.location.reload();
      } else {
        const data = await res.json();
        toast.error(data.error || 'حدث خطأ');
      }
    } catch {
      toast.error('حدث خطأ في تبديل الفريق');
    } finally {
      setSwitching(false);
    }
  };

  if (teams.length <= 1) {
    // Show just the current team name if only one team
    return currentTeam ? (
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl">
        <Building2 className="w-4 h-4 text-emerald-500" />
        <span className="text-sm font-medium text-slate-900 dark:text-white truncate max-w-[150px]">
          {currentTeam.name}
        </span>
      </div>
    ) : null;
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 px-3 py-2 h-auto bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl"
        >
          <Building2 className="w-4 h-4 text-emerald-500" />
          <span className="text-sm font-medium text-slate-900 dark:text-white truncate max-w-[120px]">
            {currentTeam?.name || 'اختر فريق'}
          </span>
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-64 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl shadow-lg"
      >
        <DropdownMenuLabel className="text-slate-500 dark:text-slate-400">
          فرقك ({teams.length})
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />
        {teams.map((team) => (
          <DropdownMenuItem
            key={team.id}
            onClick={() => handleSwitchTeam(team.id)}
            disabled={switching}
            className={`flex items-center gap-3 p-3 cursor-pointer rounded-lg mx-1 my-1 ${
              currentTeam?.id === team.id
                ? 'bg-emerald-50 dark:bg-emerald-900/30'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Avatar className="w-8 h-8">
              <AvatarFallback className={`${roleColors[team.role]} text-white text-xs`}>
                {team.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                {team.name}
              </p>
              <Badge className={`${roleColors[team.role]} text-white text-[10px] mt-0.5`}>
                {roleLabels[team.role]}
              </Badge>
            </div>
            {currentTeam?.id === team.id && (
              <Check className="w-4 h-4 text-emerald-500" />
            )}
            {switching && currentTeam?.id !== team.id && (
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
