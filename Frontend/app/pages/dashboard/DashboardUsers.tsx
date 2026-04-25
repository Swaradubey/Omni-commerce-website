import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { ExternalLink, Search, Save, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { userApi, type PlatformUserRow } from '../../api/user';
import { superadminApi } from '../../api/superadmin';
import { useAuth, IMPERSONATION_SUPER_TOKEN_BACKUP_KEY } from '../../context/AuthContext';
import { getRoleOpenPanelConfig, roleDisplayName } from '../../utils/roleOpenPanelConfig';
import { toast } from 'sonner';

const ASSIGNABLE_ROLES = [
  'user',
  'customer',
  'admin',
  'staff',
  'cashier',
  'inventory_manager',
  'seo_manager',
  'client',
  'store_manager',
  'employee',
] as const;

export function DashboardUsers() {
  const navigate = useNavigate();
  const { refreshSession } = useAuth();
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<PlatformUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [pendingRole, setPendingRole] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [openingPanelUserId, setOpeningPanelUserId] = useState<string | null>(null);

  const limit = 15;

  const load = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await userApi.getPlatformUsers({
        page,
        limit,
        search: appliedSearch.trim() || undefined,
      });
      if (!res.success || !res.data) {
        throw new Error(res.message || 'Could not load users');
      }
      setUsers(res.data.users);
      setTotal(res.data.total);
      setPages(res.data.pages);
      setPendingRole({});
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load users';
      setFetchError(msg);
      toast.error(msg);
      setUsers([]);
      setTotal(0);
      setPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, appliedSearch]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleOpenRolePanel = async (u: PlatformUserRow) => {
    const cfg = getRoleOpenPanelConfig(u.role);
    if (!cfg) return;

    if (!cfg.useImpersonation) {
      navigate(cfg.path);
      return;
    }

    const cur = localStorage.getItem('eco_shop_token');
    if (cur) {
      localStorage.setItem(IMPERSONATION_SUPER_TOKEN_BACKUP_KEY, cur);
    }
    setOpeningPanelUserId(u._id);
    try {
      const res = await superadminApi.impersonate(u._id);
      if (!res.success || !res.data?.token) {
        throw new Error(res.message || 'Could not open session for this account');
      }
      localStorage.setItem('eco_shop_token', res.data.token);
      await refreshSession();
      toast.success(`Opening ${roleDisplayName(u.role)} as ${u.name}`);
      navigate(cfg.path);
    } catch (e: unknown) {
      localStorage.removeItem(IMPERSONATION_SUPER_TOKEN_BACKUP_KEY);
      toast.error(e instanceof Error ? e.message : 'Failed to open panel');
    } finally {
      setOpeningPanelUserId(null);
    }
  };

  const handleSaveRole = async (u: PlatformUserRow) => {
    const id = u._id;
    const next = pendingRole[id] ?? u.role;
    if (next === u.role) {
      toast.message('No role change');
      return;
    }
    setSavingId(id);
    try {
      const res = await userApi.patchPlatformUserRole(id, next);
      if (!res.success || !res.data) {
        throw new Error(res.message || 'Update failed');
      }
      toast.success('Role updated');
      setUsers((prev) =>
        prev.map((row) => (String(row._id) === String(res.data!._id) ? { ...row, ...res.data! } : row)),
      );
      setPendingRole((prev) => {
        const nextMap = { ...prev };
        delete nextMap[id];
        return nextMap;
      });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not update role');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 mb-1">
            <Shield className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Platform</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Users & roles</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Search accounts and assign roles (Super Admin only). The seeded Super Admin account cannot be changed
            here.
          </p>
        </div>
      </motion.div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Directory</CardTitle>
          <CardDescription>{total.toLocaleString()} user(s) match filters</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search name or email…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setPage(1);
                    setAppliedSearch(searchInput.trim());
                  }
                }}
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setPage(1);
                setAppliedSearch(searchInput.trim());
              }}
            >
              Search
            </Button>
          </div>

          {fetchError ? (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/30 px-3 py-2 text-sm text-red-800 dark:text-red-200"
            >
              {fetchError}
            </div>
          ) : null}

          <div className="rounded-xl border border-gray-200 dark:border-white/10 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-white/5 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold w-[140px]">Open panel</th>
                  <th className="px-4 py-3 font-semibold w-[140px]" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                      Loading…
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const id = u._id;
                    const current = pendingRole[id] ?? u.role;
                    const roleOptions =
                      u.role === 'super_admin'
                        ? (['super_admin'] as const)
                        : [...new Set([u.role, ...ASSIGNABLE_ROLES])];
                    const panelCfg = getRoleOpenPanelConfig(u.role);
                    return (
                      <tr
                        key={id}
                        className="border-t border-gray-100 dark:border-white/10 hover:bg-gray-50/80 dark:hover:bg-white/5"
                      >
                        <td className="px-4 py-3 font-medium">{u.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                        <td className="px-4 py-3">
                          <select
                            className="rounded-lg border border-gray-200 dark:border-white/15 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm"
                            value={current}
                            disabled={u.role === 'super_admin'}
                            onChange={(e) => setPendingRole((prev) => ({ ...prev, [id]: e.target.value }))}
                          >
                            {roleOptions.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          {panelCfg ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              disabled={openingPanelUserId === u._id}
                              onClick={() => void handleOpenRolePanel(u)}
                              title={
                                panelCfg.useImpersonation
                                  ? `Open this account’s panel (Super Admin impersonation)`
                                  : `Open the ${roleDisplayName(u.role)} workspace`
                              }
                            >
                              <ExternalLink className="w-3.5 h-3.5 mr-1" />
                              {openingPanelUserId === u._id ? 'Opening…' : panelCfg.buttonLabel}
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {u.role !== 'super_admin' ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={savingId === id || current === u.role}
                              onClick={() => void handleSaveRole(u)}
                            >
                              <Save className="w-3.5 h-3.5 mr-1" />
                              Save
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">Protected</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <Button type="button" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="text-muted-foreground">
                Page {page} of {pages}
              </span>
              <Button
                type="button"
                variant="ghost"
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
