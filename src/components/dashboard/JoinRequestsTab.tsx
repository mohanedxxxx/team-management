'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  UserPlus,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  AlertCircle,
} from 'lucide-react';
interface JoinRequest {
  id: string;
  status: string;
  message: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    avatar: string | null;
  };
  reviewedBy: {
    id: string;
    name: string | null;
  } | null;
  reviewedAt: string | null;
}

const statusLabels: Record<string, string> = {
  PENDING: 'قيد الانتظار',
  APPROVED: 'مقبول',
  REJECTED: 'مرفوض',
};

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-500/20 text-yellow-400',
  APPROVED: 'bg-green-500/20 text-green-400',
  REJECTED: 'bg-red-500/20 text-red-400',
};

export function JoinRequestsTab() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const canReview = user?.currentTeam?.role === 'ADMIN' || user?.currentTeam?.role === 'LEADER';

  const fetchRequests = async () => {
    try {
      const res = await fetch(`/api/join-requests?teamId=${user?.currentTeam?.id}`);
      const data = await res.json();
      if (res.ok) {
        setRequests(data.requests);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.currentTeam) {
      fetchRequests();
    }
  }, [user?.currentTeam]);

  const handleReview = async (requestId: string, action: 'approve' | 'reject', role?: string) => {
    setProcessing(requestId);
    try {
      const res = await fetch('/api/join-requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action, role }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(action === 'approve' ? 'تم قبول العضو' : 'تم رفض الطلب');
        fetchRequests();
      } else {
        toast.error(data.error || 'حدث خطأ');
      }
    } catch {
      toast.error('حدث خطأ');
    } finally {
      setProcessing(null);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const pendingRequests = requests.filter(r => r.status === 'PENDING');
  const processedRequests = requests.filter(r => r.status !== 'PENDING');

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
        <h3 className="text-lg font-semibold text-white">طلبات الانضمام</h3>
        <p className="text-sm text-slate-400">
          {canReview ? 'إدارة طلبات الانضمام للفريق' : 'طلبات الانضمام الخاصة بك'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{pendingRequests.length}</div>
                <div className="text-xs text-slate-400">قيد الانتظار</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {requests.filter(r => r.status === 'APPROVED').length}
                </div>
                <div className="text-xs text-slate-400">مقبول</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {requests.filter(r => r.status === 'REJECTED').length}
                </div>
                <div className="text-xs text-slate-400">مرفوض</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Requests */}
      {canReview && pendingRequests.length > 0 && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              طلبات قيد الانتظار ({pendingRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="bg-slate-700/50 rounded-lg p-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-slate-600 text-white">
                          {getInitials(request.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-white font-medium">{request.user.name || 'بدون اسم'}</p>
                        <p className="text-sm text-slate-400">{request.user.email}</p>
                        {request.message && (
                          <p className="text-xs text-slate-500 mt-1">{request.message}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select defaultValue="MEMBER">
                        <SelectTrigger className="w-28 bg-slate-600 border-slate-500 text-white text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-700 border-slate-600">
                          <SelectItem value="MEMBER">عضو</SelectItem>
                          <SelectItem value="MODERATOR">مشرف</SelectItem>
                          {user?.currentTeam?.role === 'ADMIN' && (
                            <SelectItem value="LEADER">قائد</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => {
                          const select = document.querySelector(`[data-request-id="${request.id}"]`) as HTMLSelectElement;
                          const role = select?.value || 'MEMBER';
                          handleReview(request.id, 'approve', role);
                        }}
                        disabled={processing === request.id}
                      >
                        {processing === request.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleReview(request.id, 'reject')}
                        disabled={processing === request.id}
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Processed Requests */}
      {processedRequests.length > 0 && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-base">الطلبات المعالجة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-slate-700/50">
                    <TableHead className="text-slate-400">المستخدم</TableHead>
                    <TableHead className="text-slate-400">الحالة</TableHead>
                    <TableHead className="text-slate-400">تمت بواسطة</TableHead>
                    <TableHead className="text-slate-400">التاريخ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedRequests.map((request) => (
                    <TableRow key={request.id} className="border-slate-700 hover:bg-slate-700/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="bg-slate-600 text-white text-xs">
                              {getInitials(request.user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-white text-sm">{request.user.name}</p>
                            <p className="text-xs text-slate-500">{request.user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[request.status]}>
                          {statusLabels[request.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-400">
                        {request.reviewedBy?.name || '-'}
                      </TableCell>
                      <TableCell className="text-slate-400">
                        {request.reviewedAt
                          ? new Date(request.reviewedAt).toLocaleDateString('ar-EG')
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {requests.length === 0 && (
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">لا توجد طلبات انضمام</p>
        </div>
      )}
    </div>
  );
}
