import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, Eye, Calendar, RefreshCw, AlertCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { superAdminClientsApi, type SuperAdminClientData } from '../../api/superAdminClientsApi';
import { toast } from 'sonner';
import { Link } from 'react-router';

export function SuperAdminClients() {
  const [clients, setClients] = useState<SuperAdminClientData[]>([]);
  const [loading, setLoading] = useState(true);

  const loadClients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await superAdminClientsApi.listClients();
      if (!res.success || !res.data) {
        throw new Error(res.message || 'Could not load clients');
      }
      setClients(Array.isArray(res.data) ? res.data : []);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to load clients');
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  const handleUpdateTrial = async (clientId: string, action: 'extend' | 'reset' | 'expire') => {
    try {
      const res = await superAdminClientsApi.updateTrial(clientId, action);
      if (!res.success) {
        throw new Error(res.message || `Failed to ${action} trial`);
      }
      toast.success(`Trial ${action}ed successfully`);
      void loadClients();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : `Failed to ${action} trial`);
    }
  };

  const getDaysLeft = (endDate?: string) => {
    if (!endDate) return 0;
    const now = new Date();
    const end = new Date(endDate);
    const diff = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 pb-2">
          <Badge variant="outline" className="gap-1.5 px-3 py-1 border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300 w-fit">
            <Building2 className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold uppercase tracking-wide">Super Admin</span>
          </Badge>
        </div>
        <div className="space-y-2">
          <h2 className="text-4xl font-bold tracking-tight text-foreground">Clients Overview</h2>
          <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
            View all registered clients. Select a client to view their sales, invoices, and customer data.
          </p>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="border-border/60 shadow-lg shadow-black/5 dark:shadow-black/20 rounded-xl overflow-hidden">
          <CardHeader className="pb-4 px-8 pt-6 bg-gradient-to-br from-slate-50/50 to-gray-50/30 dark:from-slate-950/20 dark:to-gray-950/10 border-b border-border/50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="space-y-1">
                <CardTitle className="text-xl flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 shadow-sm">
                    <Building2 className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                  </div>
                  <span className="text-foreground">Registered Clients</span>
                </CardTitle>
                <CardDescription className="text-base">
                  {loading ? 'Loading…' : `${clients.length} client(s) on record`}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/80 dark:bg-slate-950/50 text-muted-foreground border-b border-border/50">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Company</th>
                    <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Shop</th>
                    <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Phone</th>
                    <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Email</th>
                    <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Created</th>
                    <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-right">Trial Info</th>
                    <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                        Loading…
                      </td>
                    </tr>
                  ) : clients.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                        No clients found.
                      </td>
                    </tr>
                  ) : (
                    clients.map((c) => (
                      <tr
                        key={c._id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-950/30 transition-colors duration-150"
                      >
                        <td className="px-6 py-4 font-medium text-foreground">{c.companyName}</td>
                        <td className="px-6 py-4 max-w-[160px] truncate text-muted-foreground" title={c.shopName || ''}>
                          {c.shopName || '—'}
                        </td>
                        <td className="px-6 py-4 text-foreground">{c.phone}</td>
                        <td className="px-6 py-4 text-foreground">{c.email}</td>
                        <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                          {c.createdAt
                            ? new Date(c.createdAt).toLocaleString(undefined, {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })
                            : '—'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex flex-col items-end gap-1.5">
                            <div className="flex items-center gap-1.5">
                              {c.isTrialExpired ? (
                                <Badge variant="destructive" className="text-[10px] uppercase font-bold px-1.5 py-0">Expired</Badge>
                              ) : (
                                <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] uppercase font-bold px-1.5 py-0">Active</Badge>
                              )}
                              <span className="text-xs font-bold text-gray-700">
                                {getDaysLeft(c.trialEndDate)} Days Left
                              </span>
                            </div>
                            <span className="text-[10px] text-muted-foreground font-medium">
                              Ends: {c.trialEndDate ? new Date(c.trialEndDate).toLocaleDateString() : 'N/A'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="flex gap-1">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 w-8 p-0 border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700"
                                onClick={() => handleUpdateTrial(c._id, 'extend')}
                                title="Extend 7 Days"
                              >
                                <Calendar className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 w-8 p-0 border-amber-200 text-amber-600 hover:bg-amber-50 hover:text-amber-700"
                                onClick={() => handleUpdateTrial(c._id, 'reset')}
                                title="Reset to 14 Days"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 w-8 p-0 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                onClick={() => handleUpdateTrial(c._id, 'expire')}
                                title="Mark as Expired"
                              >
                                <AlertCircle className="w-4 h-4" />
                              </Button>
                            </div>
                            <Button asChild variant="secondary" size="sm" className="h-8 gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200">
                              <Link to={`/super-admin/clients/${c._id}`}>
                                <Eye className="w-4 h-4" />
                              </Link>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
