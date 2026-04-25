import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, ScrollText, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import ApiService from '../../api/apiService';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { isSuperAdminRole } from '../../utils/staffRoles';

type AdminLogRow = {
  _id: string;
  email: string;
  role?: string;
  status?: string;
  message?: string;
  ipAddress?: string | null;
  createdAt?: string;
};

export function DashboardAdminLogs() {
  const { user } = useAuth();
  const canDeleteLogs = isSuperAdminRole(user?.role);
  const [logs, setLogs] = useState<AdminLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ApiService.get<AdminLogRow[]>('/api/admin-login/logs?limit=100');
      if (!res.success || res.data == null) {
        throw new Error(res.message || 'Could not load logs');
      }
      setLogs(Array.isArray(res.data) ? res.data : []);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to load logs');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onDeleteRow = async (row: AdminLogRow) => {
    if (!canDeleteLogs || !row._id) return;
    if (
      !window.confirm(
        'Delete this login log entry permanently? This cannot be undone.'
      )
    ) {
      return;
    }
    setDeletingId(row._id);
    try {
      const res = await ApiService.delete<{ _id?: string }>(
        `/api/admin-login/logs/${encodeURIComponent(row._id)}`
      );
      if (!res.success) {
        throw new Error(res.message || 'Could not delete log');
      }
      setLogs((prev) => prev.filter((l) => l._id !== row._id));
      toast.success(res.message || 'Log deleted');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete log');
    } finally {
      setDeletingId(null);
    }
  };

  const colCount = canDeleteLogs ? 6 : 5;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 mb-1">
          <ScrollText className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-wider">Audit</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Admin login logs</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Recent privileged sign-ins (Super Admin only).
        </p>
      </motion.div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Recent events</CardTitle>
          <CardDescription>Latest 100 entries</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-gray-200 dark:border-white/10 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-white/5 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">When</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Message</th>
                  {canDeleteLogs ? (
                    <th className="px-4 py-3 font-semibold text-right w-[1%] whitespace-nowrap">
                      Action
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={colCount} className="px-4 py-10 text-center text-muted-foreground">
                      Loading…
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={colCount} className="px-4 py-10 text-center text-muted-foreground">
                      No log entries.
                    </td>
                  </tr>
                ) : (
                  logs.map((row) => (
                    <tr
                      key={row._id}
                      className="border-t border-gray-100 dark:border-white/10 hover:bg-gray-50/80 dark:hover:bg-white/5"
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3 font-medium">{row.email}</td>
                      <td className="px-4 py-3">{row.role ?? '—'}</td>
                      <td className="px-4 py-3">{row.status ?? '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground max-w-[280px] truncate">
                        {row.message ?? '—'}
                      </td>
                      {canDeleteLogs ? (
                        <td className="px-4 py-3 text-right align-middle">
                          <button
                            type="button"
                            aria-label="Delete log entry"
                            disabled={deletingId === row._id}
                            onClick={() => void onDeleteRow(row)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                          >
                            {deletingId === row._id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </td>
                      ) : null}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
