import { useState, useEffect, useMemo } from 'react';
import {
  Search, Shield, Download, ClipboardList,
  User as UserIcon, Calendar, Eye, Clock,
  LogIn, Trash2, Plus, Edit, Lock, XCircle,
  ArrowLeftRight, DollarSign, RotateCcw, Receipt, Package,
  RefreshCw, ChevronLeft, ChevronRight, Filter
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { format, formatDistanceToNow, parseISO } from 'date-fns';

/**
 * Audit Trail Page
 * Complete application activity and security history with:
 * - Summary stats cards (total actions, unique users, recent logins, deletions)
 * - Date range + action type + search filters
 * - Color-coded action badges with proper icons
 * - Activity timeline table
 * - Detail modal with safe JSON rendering
 * - Pagination
 * - CSV export
 */

// ─── Action config ──────────────────────────────────────────────────────────

interface ActionConfig {
  icon: React.ComponentType<{ className?: string }>;
  bg: string;
  text: string;
  category: 'auth' | 'create' | 'update' | 'delete' | 'sale' | 'payment' | 'void' | 'transfer' | 'inventory';
}

const ACTION_MAP: Record<string, ActionConfig> = {
  LOGIN: { icon: LogIn, bg: 'bg-indigo-50', text: 'text-indigo-600', category: 'auth' },
  LOGOUT: { icon: LogIn, bg: 'bg-slate-100', text: 'text-slate-500', category: 'auth' },
  CHANGE_PASSWORD: { icon: Lock, bg: 'bg-amber-50', text: 'text-amber-600', category: 'update' },
  CREATE_CONTACT: { icon: Plus, bg: 'bg-emerald-50', text: 'text-emerald-600', category: 'create' },
  UPDATE_CONTACT: { icon: Edit, bg: 'bg-blue-50', text: 'text-blue-600', category: 'update' },
  DELETE_CONTACT: { icon: Trash2, bg: 'bg-red-50', text: 'text-red-600', category: 'delete' },
  CREATE_SALE: { icon: Receipt, bg: 'bg-green-50', text: 'text-green-600', category: 'sale' },
  VOID_TRANSACTION: { icon: XCircle, bg: 'bg-orange-50', text: 'text-orange-600', category: 'void' },
  RECEIVE_MONEY: { icon: DollarSign, bg: 'bg-emerald-50', text: 'text-emerald-600', category: 'payment' },
  PAY_MONEY: { icon: DollarSign, bg: 'bg-red-50', text: 'text-red-600', category: 'payment' },
  TRANSFER: { icon: ArrowLeftRight, bg: 'bg-purple-50', text: 'text-purple-600', category: 'transfer' },
  CREATE_ITEM: { icon: Package, bg: 'bg-teal-50', text: 'text-teal-600', category: 'inventory' },
  UPDATE_ITEM: { icon: Edit, bg: 'bg-teal-50', text: 'text-teal-600', category: 'inventory' },
  DELETE_ITEM: { icon: Trash2, bg: 'bg-red-50', text: 'text-red-600', category: 'inventory' },
  RESTOCK_ITEM: { icon: Package, bg: 'bg-teal-50', text: 'text-teal-600', category: 'inventory' },
};

const DEFAULT_CONFIG: ActionConfig = { icon: Shield, bg: 'bg-slate-100', text: 'text-slate-600', category: 'update' };

function getActionConfig(action: string): ActionConfig {
  return ACTION_MAP[action] || DEFAULT_CONFIG;
}

function formatEntityName(entityType: string | null): string {
  if (!entityType) return '—';
  const map: Record<string, string> = {
    contacts: 'Contact',
    transactions: 'Transaction',
    items: 'Item',
    users: 'User',
    invoices: 'Invoice',
    settings: 'Settings',
    barcode_mappings: 'Barcode',
  };
  return map[entityType] || entityType;
}

function formatRelative(dateStr: string): string {
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
  } catch {
    return dateStr;
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export function AuditLogViewer() {
  const { showNotification } = useAppStore();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  useEffect(() => { loadLogs(); }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const result = await window.electronSecureAPI.auditLogs.getAll();
      if (result?.success) {
        setLogs(result.data || []);
      } else {
        setLogs([]);
        showNotification(result?.message || 'Failed to load logs', 'error');
      }
    } catch (error) {
      console.error('Audit logs error:', error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  // ─── Stats ──────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const totalActions = logs.length;
    const uniqueUsers = new Set(logs.map(l => l.user_id)).size;
    const today = new Date().toISOString().split('T')[0];
    const todayCount = logs.filter(l => l.created_at?.startsWith(today)).length;
    const deleteCount = logs.filter(l => l.action.includes('DELETE')).length;
    const loginCount = logs.filter(l => l.action.includes('LOGIN')).length;
    const saleCount = logs.filter(l => l.action.includes('SALE')).length;
    return { totalActions, uniqueUsers, todayCount, deleteCount, loginCount, saleCount };
  }, [logs]);

  // ─── Filtered ───────────────────────────────────────────────────────────

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const userStr = `${log.full_name || ''} ${log.username || ''}`.toLowerCase();
      const actionStr = log.action.toLowerCase();
      const entityStr = (log.entity_type || '').toLowerCase();
      const q = searchQuery.toLowerCase();

      const matchesSearch = !q || userStr.includes(q) || actionStr.includes(q) || entityStr.includes(q);
      const matchesAction = !filterAction || log.action === filterAction;
      const matchesCategory = !filterCategory || getActionConfig(log.action).category === filterCategory;
      return matchesSearch && matchesAction && matchesCategory;
    });
  }, [logs, searchQuery, filterAction, filterCategory]);

  // ─── Pagination ─────────────────────────────────────────────────────────

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, filterAction, filterCategory]);

  // ─── Unique actions for dropdown ────────────────────────────────────────

  const uniqueActions = [...new Set(logs.map(l => l.action))];

  // ─── Export CSV ─────────────────────────────────────────────────────────

  const exportToCSV = () => {
    if (filteredLogs.length === 0) {
      showNotification('No data to export', 'error');
      return;
    }
    const headers = ['#', 'Date/Time', 'Action', 'User', 'Username', 'Entity', 'Entity ID', 'Details'];
    const rows = filteredLogs.map(l => {
      let details = '';
      try {
        const vals = typeof l.new_values === 'string' ? JSON.parse(l.new_values) : l.new_values;
        details = vals ? JSON.stringify(vals).replace(/"/g, '""') : '';
      } catch { details = l.new_values ? String(l.new_values).replace(/"/g, '""') : ''; }

      return [
        l.id,
        l.created_at ? format(new Date(l.created_at), 'yyyy-MM-dd HH:mm:ss') : '',
        l.action.replace(/_/g, ' '),
        l.full_name || '—',
        l.username || '—',
        formatEntityName(l.entity_type),
        l.entity_id || '—',
        details
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit_trail_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification(`${filteredLogs.length} records exported`, 'success');
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-8 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-slate-900 rounded-2xl text-white">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Audit Trail</h1>
            <p className="text-slate-500 font-medium">Complete application activity and security history</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadLogs}
            className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-sm font-bold text-slate-600 transition-all shadow-sm"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={exportToCSV}
            disabled={filteredLogs.length === 0}
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 text-sm font-black shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Actions', value: stats.totalActions, color: 'bg-slate-900', textColor: 'text-slate-900' },
          { label: 'Today', value: stats.todayCount, color: 'bg-emerald-500', textColor: 'text-emerald-600' },
          { label: 'Unique Users', value: stats.uniqueUsers, color: 'bg-indigo-500', textColor: 'text-indigo-600' },
          { label: 'Logins', value: stats.loginCount, color: 'bg-blue-500', textColor: 'text-blue-600' },
          { label: 'Sales', value: stats.saleCount, color: 'bg-green-500', textColor: 'text-green-600' },
          { label: 'Deletions', value: stats.deleteCount, color: 'bg-red-500', textColor: 'text-red-600' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-2 h-2 rounded-full ${stat.color}`} />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</span>
            </div>
            <p className={`text-2xl font-black ${stat.textColor}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[250px] group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-600 transition-colors" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:border-slate-400 outline-none transition-all placeholder:text-slate-400"
            placeholder="Search by action, user, or entity..."
          />
        </div>

        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="pl-9 pr-8 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:border-slate-400 outline-none appearance-none cursor-pointer transition-all"
          >
            <option value="">All Categories</option>
            <option value="auth">Authentication</option>
            <option value="create">Created</option>
            <option value="update">Updated</option>
            <option value="delete">Deleted</option>
            <option value="sale">Sales</option>
            <option value="payment">Payments</option>
            <option value="void">Voided</option>
            <option value="transfer">Transfers</option>
            <option value="inventory">Inventory</option>
          </select>
        </div>

        <div className="relative">
          <ClipboardList className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="pl-9 pr-8 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:border-slate-400 outline-none appearance-none cursor-pointer transition-all max-w-[200px]"
          >
            <option value="">All Actions</option>
            {uniqueActions.sort().map(a => (
              <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>

        {(searchQuery || filterAction || filterCategory) && (
          <span className="text-xs font-bold text-slate-500">
            {filteredLogs.length} result{filteredLogs.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="text-center py-32">
            <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-400 font-bold text-sm">Loading audit trail...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-32 bg-slate-50/50">
            <ClipboardList className="w-14 h-14 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400 font-bold">No matching records found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/40">
                    <th className="text-left py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Action</th>
                    <th className="text-left py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">User</th>
                    <th className="text-left py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Target</th>
                    <th className="text-left py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">When</th>
                    <th className="py-4 px-6 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paginatedLogs.map((log: any) => {
                    const config = getActionConfig(log.action);
                    const ActionIcon = config.icon;
                    return (
                      <tr key={log.id} className="group hover:bg-slate-50/80 transition-all">
                        {/* Action */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl ${config.bg} ${config.text} flex items-center justify-center flex-shrink-0`}>
                              <ActionIcon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-800 whitespace-nowrap">
                                {log.action.replace(/_/g, ' ')}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* User */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 flex-shrink-0">
                              <UserIcon className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-700 truncate">
                                {log.full_name || log.username || 'System'}
                              </p>
                              {log.full_name && log.username && (
                                <p className="text-[10px] text-slate-400">@{log.username}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Target */}
                        <td className="py-4 px-6">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-slate-600">
                              {formatEntityName(log.entity_type)}
                            </span>
                            {log.entity_id && (
                              <span className="text-[10px] text-slate-400 font-mono">#{log.entity_id}</span>
                            )}
                          </div>
                        </td>

                        {/* When */}
                        <td className="py-4 px-6">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5 text-slate-600 text-xs font-semibold">
                              <Clock className="w-3 h-3" />
                              {formatRelative(log.created_at)}
                            </div>
                            <span className="text-[10px] text-slate-400 ml-5">
                              {log.created_at ? format(new Date(log.created_at), 'MMM d, HH:mm') : '—'}
                            </span>
                          </div>
                        </td>

                        {/* View button */}
                        <td className="py-4 px-6">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="p-2 text-slate-300 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/30">
                <span className="text-xs font-medium text-slate-500">
                  Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredLogs.length)} of {filteredLogs.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let page: number;
                    if (totalPages <= 5) {
                      page = i + 1;
                    } else if (currentPage <= 3) {
                      page = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      page = totalPages - 4 + i;
                    } else {
                      page = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${page === currentPage
                            ? 'bg-slate-900 text-white'
                            : 'text-slate-600 hover:bg-slate-200'
                          }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── Detail Modal ─────────────────────────────────────────────── */}
      {selectedLog && (
        <DetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </div>
  );
}

// ─── Detail Modal ───────────────────────────────────────────────────────────

function DetailModal({ log, onClose }: { log: any; onClose: () => void }) {
  const config = getActionConfig(log.action);
  const ActionIcon = config.icon;

  const safeParse = (raw: any) => {
    if (!raw) return null;
    if (typeof raw === 'object') return raw;
    try { return JSON.parse(raw); }
    catch { return null; }
  };

  const newValues = safeParse(log.new_values);
  const oldValues = safeParse(log.old_values);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${config.bg} ${config.text}`}>
              <ActionIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800">{log.action.replace(/_/g, ' ')}</h2>
              <p className="text-xs text-slate-400 font-mono">Entry #{log.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-white rounded-xl transition-all">
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 space-y-5 max-h-[65vh] overflow-y-auto">
          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'User', value: log.full_name || log.username || 'System' },
              { label: 'Username', value: log.username || '—' },
              { label: 'Entity', value: formatEntityName(log.entity_type) + (log.entity_id ? ` #${log.entity_id}` : '') },
              { label: 'Date/Time', value: log.created_at ? format(new Date(log.created_at), 'MMMM d, yyyy — HH:mm:ss') : '—' },
            ].map(item => (
              <div key={item.label} className="p-3 bg-slate-50 rounded-xl">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
                <p className="text-sm font-semibold text-slate-700">{item.value}</p>
              </div>
            ))}
          </div>

          {/* New values */}
          {newValues && (
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">New Values</p>
              <pre className="bg-slate-900 text-emerald-400 rounded-xl p-5 text-xs font-mono overflow-x-auto leading-relaxed">
                {JSON.stringify(newValues, null, 2)}
              </pre>
            </div>
          )}

          {/* Old values */}
          {oldValues && (
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Previous Values</p>
              <pre className="bg-amber-50 text-amber-800 rounded-xl p-5 text-xs font-mono overflow-x-auto leading-relaxed border border-amber-100">
                {JSON.stringify(oldValues, null, 2)}
              </pre>
            </div>
          )}

          {!newValues && !oldValues && (
            <div className="text-center py-8 text-slate-400 text-sm font-medium">
              No payload data for this action
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-slate-100 bg-slate-50/50 text-right">
          <button
            onClick={onClose}
            className="px-8 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
