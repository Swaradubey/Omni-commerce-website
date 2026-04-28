import React, { useState, useEffect } from 'react';
import { Globe, Plus, CheckCircle2, AlertCircle, Trash2, ExternalLink, Loader2 } from 'lucide-react';
import { customDomainApi, CustomDomainData } from '../../api/customDomains';

export function CustomDomain() {
  const [domains, setDomains] = useState<CustomDomainData[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [domainInput, setDomainInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchDomains();
  }, []);

  const fetchDomains = async () => {
    try {
      setLoading(true);
      const response = await customDomainApi.getAll();
      if (response.success && response.data) {
        setDomains(response.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch domains');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainInput.trim()) return;

    try {
      setAdding(true);
      setError(null);
      setSuccess(null);
      const response = await customDomainApi.create({ domain: domainInput.trim() });
      if (response.success) {
        setSuccess('Domain added successfully');
        setDomainInput('');
        fetchDomains();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add domain');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteDomain = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this domain?')) return;

    try {
      const response = await customDomainApi.delete(id);
      if (response.success) {
        setSuccess('Domain removed successfully');
        fetchDomains();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete domain');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-white/10 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-indigo-600/10 flex items-center justify-center text-indigo-600">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Add Custom Domain</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Manage and connect custom domains for client websites.</p>
          </div>
        </div>

        <form onSubmit={handleAddDomain} className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Domain Name
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="example.com"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                disabled={adding}
                className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/50 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 transition-all"
              />
              <button
                type="submit"
                disabled={adding || !domainInput.trim()}
                className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add
              </button>
            </div>
            {error && <p className="text-xs text-rose-500">{error}</p>}
            {success && <p className="text-xs text-emerald-500">{success}</p>}
            <p className="text-sm text-gray-500">
              Enter the root domain or subdomain you want to connect.
            </p>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-900/20 p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-400">DNS Configuration</h3>
                <p className="text-xs text-amber-800 dark:text-amber-500/80 leading-relaxed">
                  To connect your domain, point your A record to <code>76.76.21.21</code> or CNAME record to <code>cname.Omni-Commerce-app.com</code>.
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5">
          <h2 className="font-bold text-gray-900 dark:text-white text-lg">Connected Domains</h2>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin mb-2" />
              <p>Loading domains...</p>
            </div>
          ) : domains.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <p>No custom domains connected yet.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  <th className="px-6 py-4 font-semibold">Domain</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Client</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                {domains.map((item) => (
                  <tr key={item._id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white">{item.domain}</span>
                        <a href={`http://${item.domain}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3 h-3 text-gray-400 hover:text-indigo-600 transition-colors" />
                        </a>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${item.status === 'Connected' || item.status === 'Active'
                        ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                        : 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400'
                        }`}>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {item.status}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {item.clientName || 'Omni-Commerce Store'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDeleteDomain(item._id)}
                        className="p-2 text-gray-400 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
