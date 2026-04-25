import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { storeManagersApi, type StoreManager } from '../../api/storeManagers';
import { employeesApi, type EmployeeRow } from '../../api/employees';

type Mode = 'store_managers' | 'employees';

interface StaffListModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  mode: Mode;
  title: string;
}

export function StaffListModal({ isOpen, onClose, clientId, mode, title }: StaffListModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [managers, setManagers] = useState<StoreManager[]>([]);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);

  useEffect(() => {
    if (!isOpen || !clientId) return;
    setError(null);
    setLoading(true);
    void (async () => {
      try {
        if (mode === 'store_managers') {
          const res = await storeManagersApi.listByClient(clientId);
          if (res.success && Array.isArray(res.data)) {
            setManagers(res.data);
          } else {
            setManagers([]);
            throw new Error(res.message || 'Could not load store managers');
          }
        } else {
          const res = await employeesApi.listByClient(clientId, ['employee', 'staff', 'seo_manager']);
          if (res.success && Array.isArray(res.data)) {
            setEmployees(res.data);
          } else {
            setEmployees([]);
            throw new Error(res.message || 'Could not load employees');
          }
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load');
        setManagers([]);
        setEmployees([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [isOpen, clientId, mode]);

  if (!isOpen) return null;

  const rows =
    mode === 'store_managers'
      ? managers.map((m) => ({
          key: m._id,
          primary: m.name,
          secondary: m.email || m.phone,
          detail: m.address,
        }))
      : employees.map((m) => ({
          key: m._id,
          primary: m.name,
          secondary: [m.email || m.phone, m.role?.replace(/_/g, ' '), m.status].filter(Boolean).join(' · '),
          detail: m.address,
        }));

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#09090b]"
        >
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 px-6 py-4 dark:border-white/5 dark:bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Users className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-200 dark:hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="max-h-[min(70vh,420px)] overflow-y-auto p-6">
            {error && (
              <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
                <AlertCircle className="h-5 w-5 shrink-0" />
                {error}
              </div>
            )}
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-indigo-400/30 border-t-indigo-600" />
              </div>
            ) : rows.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200/90 bg-slate-50/50 py-8 text-center text-sm text-slate-600 dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-400">
                No records yet.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-white/10">
                {rows.map((r) => (
                  <li key={r.key} className="py-4 first:pt-0 last:pb-0">
                    <p className="font-semibold text-slate-900 dark:text-white">{r.primary}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{r.secondary}</p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{r.detail}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-gray-100 px-6 py-4 dark:border-white/5">
            <Button type="button" variant="outline" onClick={onClose} className="h-11 w-full rounded-xl sm:w-auto">
              Close
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
