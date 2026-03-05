'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import {
  Plus,
  Send,
  Copy,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface Invitation {
  id: string;
  email: string;
  code: string;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  invitedBy: {
    id: string;
    name: string | null;
  };
  acceptedBy: {
    id: string;
    name: string | null;
  } | null;
  team: {
    id: string;
    name: string;
  };
}

const statusLabels: Record<string, string> = {
  PENDING: 'قيد الانتظار',
  ACCEPTED: 'مقبولة',
  REJECTED: 'مرفوضة',
  EXPIRED: 'منتهية',
};

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-500/20 text-yellow-400',
  ACCEPTED: 'bg-green-500/20 text-green-400',
  REJECTED: 'bg-red-500/20 text-red-400',
  EXPIRED: 'bg-gray-500/20 text-gray-400',
};

const roleLabels: Record<string, string> = {
  ADMIN: 'مدير النظام',
  LEADER: 'قائد الفريق',
  MODERATOR: 'مشرف',
  MEMBER: 'عضو',
};

export function InvitationsTab() {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('MEMBER');
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  const isAdmin = user?.currentTeam?.role === 'ADMIN';

  const fetchInvitations = async () => {
    try {
      const res = await fetch('/api/invitations');
      const data = await res.json();
      if (res.ok) {
        setInvitations(data.invitations);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('البريد الإلكتروني مطلوب');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('تم إنشاء الدعوة بنجاح');
        setCreatedCode(data.invitation.code);
        setEmail('');
        setRole('MEMBER');
        fetchInvitations();
      } else {
        toast.error(data.error || 'حدث خطأ');
      }
    } catch {
      toast.error('حدث خطأ في الاتصال');
    } finally {
      setSubmitting(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('تم نسخ الكود');
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
        <Label className="text-slate-300">البريد الإلكتروني</Label>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="example@email.com"
          className="bg-slate-700 border-slate-600 text-white"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-slate-300">الدور</Label>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-700 border-slate-600">
            <SelectItem value="MEMBER">عضو</SelectItem>
            <SelectItem value="MODERATOR">مشرف</SelectItem>
            {isAdmin && (
              <>
                <SelectItem value="LEADER">قائد فريق</SelectItem>
                <SelectItem value="ADMIN">مدير نظام</SelectItem>
              </>
            )}
          </SelectContent>
        </Select>
      </div>
    </form>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">الدعوات</h3>
          <p className="text-sm text-slate-400">إدارة دعوات الأعضاء الجدد</p>
        </div>
        <>
          {/* Desktop Dialog */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="hidden sm:flex bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4 ml-2" />
                إنشاء دعوة
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-white">إنشاء دعوة جديدة</DialogTitle>
                <DialogDescription className="text-slate-400">
                  أدخل بيانات الدعوة
                </DialogDescription>
              </DialogHeader>
              {createdCode ? (
                <div className="space-y-4">
                  <div className="bg-emerald-600/20 border border-emerald-500/30 rounded-lg p-4 text-center">
                    <p className="text-emerald-400 mb-2">تم إنشاء الدعوة!</p>
                    <p className="text-2xl font-mono font-bold text-white tracking-wider">
                      {createdCode}
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4 border-emerald-500 text-emerald-400"
                      onClick={() => copyCode(createdCode)}
                    >
                      <Copy className="w-4 h-4 ml-2" />
                      نسخ الكود
                    </Button>
                  </div>
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => {
                      setCreatedCode(null);
                      setDialogOpen(false);
                    }}
                  >
                    إغلاق
                  </Button>
                </div>
              ) : (
                <>
                  <FormContent />
                  <DialogFooter>
                    <Button
                      onClick={handleSubmit}
                      className="bg-emerald-600 hover:bg-emerald-700"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="w-4 h-4 ml-2" />
                          إنشاء الدعوة
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>

          {/* Mobile Drawer */}
          <Drawer open={dialogOpen} onOpenChange={setDialogOpen}>
            <DrawerTrigger asChild>
              <Button className="sm:hidden bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4 ml-2" />
                إنشاء
              </Button>
            </DrawerTrigger>
            <DrawerContent className="bg-slate-800 border-t-slate-700">
              <DrawerHeader>
                <DrawerTitle className="text-white">إنشاء دعوة جديدة</DrawerTitle>
                <DrawerDescription className="text-slate-400">
                  أدخل بيانات الدعوة
                </DrawerDescription>
              </DrawerHeader>
              {createdCode ? (
                <div className="px-4 space-y-4">
                  <div className="bg-emerald-600/20 border border-emerald-500/30 rounded-lg p-4 text-center">
                    <p className="text-emerald-400 mb-2">تم إنشاء الدعوة!</p>
                    <p className="text-2xl font-mono font-bold text-white tracking-wider">
                      {createdCode}
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4 border-emerald-500 text-emerald-400"
                      onClick={() => copyCode(createdCode)}
                    >
                      <Copy className="w-4 h-4 ml-2" />
                      نسخ الكود
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="px-4 overflow-y-auto max-h-[60vh]">
                  <FormContent />
                </div>
              )}
              <DrawerFooter>
                {createdCode ? (
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => {
                      setCreatedCode(null);
                      setDialogOpen(false);
                    }}
                  >
                    إغلاق
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    className="bg-emerald-600 hover:bg-emerald-700"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4 ml-2" />
                        إنشاء الدعوة
                      </>
                    )}
                  </Button>
                )}
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        </>
      </div>

      {/* Invitations List - Cards for mobile, Table for desktop */}
      <div className="sm:hidden space-y-3">
        {invitations.map((invitation) => (
          <Card key={invitation.id} className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-white truncate">{invitation.email}</p>
                  <p className="text-xs text-slate-400">{roleLabels[invitation.role]}</p>
                </div>
                <Badge className={statusColors[invitation.status]}>
                  {statusLabels[invitation.status]}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <code className="bg-slate-700 px-2 py-1 rounded text-sm text-white font-mono">
                  {invitation.code}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-400 hover:text-white"
                  onClick={() => copyCode(invitation.code)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-slate-500">
                ينتهي: {new Date(invitation.expiresAt).toLocaleDateString('ar-EG')}
              </p>
            </CardContent>
          </Card>
        ))}
        {invitations.length === 0 && (
          <div className="text-center py-8">
            <AlertCircle className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">لا توجد دعوات</p>
          </div>
        )}
      </div>

      {/* Desktop Table */}
      <Card className="hidden sm:block bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white text-base">قائمة الدعوات</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700 hover:bg-slate-700/50">
                  <TableHead className="text-slate-400">البريد الإلكتروني</TableHead>
                  <TableHead className="text-slate-400">الكود</TableHead>
                  <TableHead className="text-slate-400">الدور</TableHead>
                  <TableHead className="text-slate-400">الحالة</TableHead>
                  <TableHead className="text-slate-400">تاريخ الانتهاء</TableHead>
                  <TableHead className="text-slate-400">بواسطة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => (
                  <TableRow
                    key={invitation.id}
                    className="border-slate-700 hover:bg-slate-700/50"
                  >
                    <TableCell className="text-white">{invitation.email}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="bg-slate-700 px-2 py-1 rounded text-sm text-white font-mono">
                          {invitation.code}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-slate-400 hover:text-white"
                          onClick={() => copyCode(invitation.code)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-white">
                      {roleLabels[invitation.role]}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[invitation.status]}>
                        {statusLabels[invitation.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-400">
                      {new Date(invitation.expiresAt).toLocaleDateString('ar-EG')}
                    </TableCell>
                    <TableCell className="text-slate-400">
                      {invitation.invitedBy.name}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {invitations.length === 0 && (
            <div className="text-center py-8">
              <AlertCircle className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">لا توجد دعوات</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
