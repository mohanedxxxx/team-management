'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Users } from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  avatar: string | null;
  createdAt: string;
}

const roleLabels: Record<string, string> = {
  ADMIN: 'مدير النظام',
  LEADER: 'قائد الفريق',
  MODERATOR: 'مشرف',
  MEMBER: 'عضو',
};

const roleColors: Record<string, string> = {
  ADMIN: 'bg-red-500',
  LEADER: 'bg-purple-500',
  MODERATOR: 'bg-blue-500',
  MEMBER: 'bg-gray-500',
};

export function UsersTab() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // إحصائيات
  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === 'ADMIN').length,
    leaders: users.filter((u) => u.role === 'LEADER').length,
    moderators: users.filter((u) => u.role === 'MODERATOR').length,
    members: users.filter((u) => u.role === 'MEMBER').length,
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
      <div>
        <h3 className="text-lg font-semibold text-white">الأعضاء</h3>
        <p className="text-sm text-slate-400">قائمة جميع أعضاء الفريق</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-4">
            <div className="text-xl sm:text-2xl font-bold text-white">{stats.total}</div>
            <div className="text-xs sm:text-sm text-slate-400">إجمالي الأعضاء</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-4">
            <div className="text-xl sm:text-2xl font-bold text-red-400">{stats.admins}</div>
            <div className="text-xs sm:text-sm text-slate-400">مديري النظام</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-4">
            <div className="text-xl sm:text-2xl font-bold text-purple-400">{stats.leaders}</div>
            <div className="text-xs sm:text-sm text-slate-400">قادة الفريق</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-4">
            <div className="text-xl sm:text-2xl font-bold text-blue-400">{stats.moderators}</div>
            <div className="text-xs sm:text-sm text-slate-400">مشرفين</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700 col-span-2 sm:col-span-1">
          <CardContent className="pt-4">
            <div className="text-xl sm:text-2xl font-bold text-gray-400">{stats.members}</div>
            <div className="text-xs sm:text-sm text-slate-400">أعضاء</div>
          </CardContent>
        </Card>
      </div>

      {/* Users Cards for mobile */}
      <div className="sm:hidden space-y-3">
        {users.map((user) => (
          <Card key={user.id} className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback className={`${roleColors[user.role]} text-white text-sm`}>
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{user.name || 'بدون اسم'}</p>
                  <p className="text-xs text-slate-400 truncate">{user.email}</p>
                </div>
                <Badge className={`${roleColors[user.role]} text-white text-xs`}>
                  {roleLabels[user.role]}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Users Table for desktop */}
      <Card className="hidden sm:block bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Users className="w-5 h-5" />
            قائمة الأعضاء
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700 hover:bg-slate-700/50">
                  <TableHead className="text-slate-400">المستخدم</TableHead>
                  <TableHead className="text-slate-400">البريد الإلكتروني</TableHead>
                  <TableHead className="text-slate-400">الدور</TableHead>
                  <TableHead className="text-slate-400">تاريخ الانضمام</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow
                    key={user.id}
                    className="border-slate-700 hover:bg-slate-700/50"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback className={`${roleColors[user.role]} text-white text-sm`}>
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-white font-medium">
                          {user.name || 'بدون اسم'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-400">{user.email}</TableCell>
                    <TableCell>
                      <Badge className={`${roleColors[user.role]} text-white`}>
                        {roleLabels[user.role]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-400">
                      {new Date(user.createdAt).toLocaleDateString('ar-EG')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
