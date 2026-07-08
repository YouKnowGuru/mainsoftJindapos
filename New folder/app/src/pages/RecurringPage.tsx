import { useState, useEffect } from 'react';
import { Clock, Search, Trash2, Play, Pause, Plus, AlertCircle } from 'lucide-react';
import { useAppStore } from '../store/appStore';

export function RecurringPage() {
  const { showNotification } = useAppStore();
  const [recurring, setRecurring] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'payment' as string,
    amount: 0,
    frequency: 'monthly' as string,
    nextDueDate: new Date().toISOString().split('T')[0],
    accountId: 0,
    contactId: 0,
    paymentMode: 'cash',
    description: '',
  });

  useEffect(() => {
    loadRecurring();
    loadAccounts();
    loadContacts();
  }, []);

  const safeArray = (data: any): any[] => Array.isArray(data) ? data : [];

  const loadRecurring = async () => {
    const api = window.electronSecureAPI;
    if (!api?.recurring) { setRecurring([]); return; }
    try {
      const result = await api.recurring.getAll(false);
      setRecurring(safeArray(result?.success ? result.data : []));
    } catch (err) {
      console.error('Failed to load recurring:', err);
      setRecurring([]);
    }
  };

  const loadAccounts = async () => {
    const api = window.electronSecureAPI;
    if (!api?.accounts) { setAccounts([]); return; }
    try {
      const result = await api.accounts.getAll();
      setAccounts(safeArray(result?.success ? result.data : []));
    } catch (err) {
      console.error('Failed to load accounts:', err);
      setAccounts([]);
    }
  };

  const loadContacts = async () => {
    const api = window.electronSecureAPI;
    if (!api?.contacts) { setContacts([]); return; }
    try {
      const result = await api.contacts.getAll();
      setContacts(safeArray(result?.success ? result.data : []));
    } catch (err) {
      console.error('Failed to load contacts:', err);
      setContacts([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.accountId || formData.amount <= 0 || !formData.nextDueDate) {
      showNotification('Fill all required fields (Name, Account, Amount, Next Due Date)', 'error');
      return;
    }
    try {
      const result = await window.electronSecureAPI.recurring?.create(formData);
      if (result?.success) {
        showNotification('Recurring transaction scheduled', 'success');
        setShowAddModal(false);
        loadRecurring();
        setFormData({
          name: '', type: 'payment', amount: 0, frequency: 'monthly',
          nextDueDate: new Date().toISOString().split('T')[0],
          accountId: 0, contactId: 0, paymentMode: 'cash', description: '',
        });
      } else {
        showNotification(result?.message || 'Failed to create', 'error');
      }
    } catch (error: any) {
      showNotification(error.message || 'Failed to create', 'error');
    }
  };

  const handleProcessDue = async () => {
    setIsProcessing(true);
    try {
      const result = await window.electronSecureAPI.recurring?.processDue();
      showNotification(
        result?.success ? (result.message || 'Processed successfully') : (result?.message || 'Failed to process'),
        result?.success ? 'success' : 'error'
      );
      loadRecurring();
    } catch (err: any) {
      showNotification(err.message || 'Processing failed', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => 'Nu. ' + (amount || 0).toFixed(2);

  // Guard: always an array
  const filteredRecurring = safeArray(recurring).filter(r =>
    (r.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const overdueCount = safeArray(recurring).filter(r => {
    const today = new Date().toISOString().split('T')[0];
    return r.next_due_date <= today && r.is_active;
  }).length;

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
            <Clock className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Recurring Transactions</h1>
            <p className="text-slate-500 font-medium">Automate regular payments and income</p>
          </div>
        </div>
        <div className="flex gap-3">
          {overdueCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-700 text-sm font-bold">
              <AlertCircle className="w-4 h-4" />
              {overdueCount} overdue
            </div>
          )}
          <button
            onClick={handleProcessDue}
            disabled={isProcessing}
            className="flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 text-sm font-black shadow-lg shadow-emerald-600/20 disabled:opacity-60 transition-all"
          >
            <Play className="w-4 h-4" />
            {isProcessing ? 'Processing…' : 'Process Due Now'}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 text-sm font-black shadow-lg shadow-blue-600/20 transition-all"
          >
            <Plus className="w-4 h-4" /> New Recurring
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-100 rounded-2xl text-sm font-bold focus:border-blue-400 outline-none shadow-sm"
          placeholder="Search by name…"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        {filteredRecurring.length === 0 ? (
          <div className="text-center py-32 bg-slate-50/30">
            <Clock className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-sm">No recurring transactions</p>
            <p className="text-slate-300 text-xs mt-2">Click "New Recurring" to schedule automatic transactions</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr>
                  <th className="text-left py-5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Name</th>
                  <th className="text-left py-5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Type</th>
                  <th className="text-left py-5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Account</th>
                  <th className="text-left py-5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Mode</th>
                  <th className="text-right py-5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Amount</th>
                  <th className="text-left py-5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Next Due</th>
                  <th className="text-center py-5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                  <th className="text-center py-5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredRecurring.map((r: any) => {
                  const today = new Date().toISOString().split('T')[0];
                  const isOverdue = r.is_active && r.next_due_date <= today;
                  return (
                    <tr key={r.id} className={`hover:bg-slate-50/60 transition-all ${!r.is_active ? 'opacity-50' : ''}`}>
                      <td className="py-5 px-6">
                        <div>
                          <span className="text-sm font-black text-slate-800 block">{r.name}</span>
                          {r.description && <span className="text-xs text-slate-400">{r.description}</span>}
                        </div>
                      </td>
                      <td className="py-5 px-6">
                        <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider capitalize ${r.type === 'receipt' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {r.type}
                        </span>
                      </td>
                      <td className="py-5 px-6 text-sm font-medium text-slate-600">{r.account_name || '—'}</td>
                      <td className="py-5 px-6 text-sm text-slate-600 capitalize">{r.payment_mode}</td>
                      <td className="py-5 px-6 text-sm font-black text-slate-800 text-right">{formatCurrency(r.amount)}</td>
                      <td className="py-5 px-6">
                        <div>
                          <span className={`text-sm font-bold ${isOverdue ? 'text-red-600' : 'text-slate-600'}`}>{r.next_due_date}</span>
                          <span className="text-[10px] text-slate-400 block capitalize">{r.frequency}</span>
                        </div>
                      </td>
                      <td className="py-5 px-6 text-center">
                        {isOverdue ? (
                          <span className="inline-flex px-3 py-1 bg-red-50 text-red-600 rounded-full text-[10px] font-black uppercase tracking-wider">Overdue</span>
                        ) : r.is_active ? (
                          <span className="inline-flex px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-wider">Active</span>
                        ) : (
                          <span className="inline-flex px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-wider">Paused</span>
                        )}
                      </td>
                      <td className="py-5 px-6">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={async () => {
                              await window.electronSecureAPI.recurring?.toggleActive(r.id);
                              loadRecurring();
                            }}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                            title={r.is_active ? 'Pause' : 'Resume'}
                          >
                            {r.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm('Delete this recurring transaction?')) {
                                await window.electronSecureAPI.recurring?.delete(r.id);
                                loadRecurring();
                              }
                            }}
                            className="p-2 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Recurring Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg my-auto shadow-2xl animate-in fade-in zoom-in-95 duration-300 overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-600 text-white rounded-2xl"><Clock className="w-6 h-6" /></div>
                <div>
                  <h3 className="text-xl font-black text-slate-800">Schedule Recurring</h3>
                  <p className="text-sm text-slate-500">Automate a regular transaction</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-2 text-slate-400 hover:text-slate-600 bg-white rounded-full">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-600 uppercase tracking-widest">Name *</label>
                <input
                  type="text" value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:border-blue-400 outline-none"
                  required placeholder="e.g. Monthly Rent"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-600 uppercase tracking-widest">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:border-blue-400 outline-none"
                  >
                    <option value="receipt">Income (Receipt)</option>
                    <option value="payment">Expense (Payment)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-600 uppercase tracking-widest">Frequency</label>
                  <select
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:border-blue-400 outline-none"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-600 uppercase tracking-widest">Amount (Nu.) *</label>
                  <input
                    type="number" value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-black focus:border-blue-400 outline-none"
                    min={0.01} step={0.01} required placeholder="0.00"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-600 uppercase tracking-widest">Next Due Date *</label>
                  <input
                    type="date" value={formData.nextDueDate}
                    onChange={(e) => setFormData({ ...formData, nextDueDate: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:border-blue-400 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-600 uppercase tracking-widest">Account Category *</label>
                  <select
                    value={formData.accountId || ''}
                    onChange={(e) => setFormData({ ...formData, accountId: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:border-blue-400 outline-none"
                    required
                  >
                    <option value={0}>Select account…</option>
                    {safeArray(accounts).map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({a.code})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-600 uppercase tracking-widest">Payment Mode *</label>
                  <select
                    value={formData.paymentMode}
                    onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:border-blue-400 outline-none"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="mBOB">mBOB</option>
                    <option value="TPay">T-Pay</option>
                    <option value="BNB">BNB Pay</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-600 uppercase tracking-widest">Contact (Optional)</label>
                <select
                  value={formData.contactId || ''}
                  onChange={(e) => setFormData({ ...formData, contactId: Number(e.target.value) })}
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:border-blue-400 outline-none"
                >
                  <option value={0}>None</option>
                  {safeArray(contacts).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-600 uppercase tracking-widest">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-medium resize-none focus:border-blue-400 outline-none"
                  rows={2} placeholder="Optional notes…"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button" onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 border-2 border-slate-200 rounded-2xl hover:bg-slate-50 font-black text-slate-600 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 font-black shadow-lg shadow-blue-600/20 transition-all"
                >
                  Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
