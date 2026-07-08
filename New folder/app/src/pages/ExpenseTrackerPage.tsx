import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  FileText,
  Trash2,
  TrendingDown,
  Download,
  Calendar,
  X
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { ExportService } from '../services/ExportService';

export function ExpenseTrackerPage() {
  const { showNotification } = useAppStore();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    category: '', // This will store the account name for display
    accountId: 0,
    amount: 0,
    paymentMode: 'cash',
    vendor: '',
    description: '',
  });

  useEffect(() => {
    loadExpenses();
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const result = await window.electronSecureAPI.accounts.getAll();
      if (result.success) {
        // Filter for expense, asset (for purchase of fixed assets), or liability accounts
        const allowedTypes = ['expense', 'asset', 'liability'];
        setAccounts(result.data.filter((a: any) => allowedTypes.includes(a.type)));
      }
    } catch (e) {
      console.error('Failed to load accounts', e);
    }
  };

  const loadExpenses = async () => {
    try {
      const api = window.electronSecureAPI;
      if (!api?.expenses) {
        console.error('[ExpenseTracker] expenses API not available');
        setExpenses([]);
        return;
      }

      // Pass date filters to the API
      const filters: any = {};
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;

      const result = await api.expenses.getAll(filters);

      if (result?.success && result.data) {
        setExpenses(result.data);
      } else {
        setExpenses([]);
      }
    } catch (err) {
      console.error('[ExpenseTracker] Exception loading expenses:', err);
      setExpenses([]);
    }
  };

  const handleExport = () => {
    try {
      const exportService = new ExportService();
      exportService.exportExpenses(filteredExpenses);
      showNotification('Expenses exported successfully', 'success');
    } catch (error) {
      console.error('Export error:', error);
      showNotification('Failed to export expenses', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.accountId || formData.amount <= 0) {
      showNotification('Please select an account and enter an amount', 'error');
      return;
    }
    try {
      const result = await window.electronSecureAPI.expenses?.create(formData);
      if (result?.success) {
        showNotification('Expense recorded in ledger', 'success');
        setShowAddModal(false);
        await loadExpenses();
        setFormData({
          date: new Date().toISOString().split('T')[0],
          category: '',
          accountId: 0,
          amount: 0,
          paymentMode: 'cash',
          vendor: '',
          description: ''
        });
      } else {
        showNotification(result?.message || 'Failed to record expense', 'error');
      }
    } catch (error: any) {
      showNotification('Error: ' + error.message, 'error');
    }
  };

  const formatCurrency = (amount: number) => 'Nu. ' + amount.toFixed(2);
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);

  const filteredExpenses = expenses.filter(exp =>
    exp.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exp.vendor?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exp.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate summary for filtered expenses
  const filteredTotal = filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const thisMonthTotal = expenses.filter(e => e.date?.startsWith(new Date().toISOString().slice(0, 7))).reduce((s, e) => s + (e.amount || 0), 0);

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 truncate" >Expense Tracker</h1>
          <p className="text-slate-500">Track and manage business expenses</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors text-sm font-bold text-slate-600">
            <Download className="w-4 h-4" /> Export
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-bhutan-maroon text-white rounded-xl hover:bg-bhutan-maroon-dark transition-colors text-sm font-bold shadow-lg shadow-bhutan-maroon/20"
          >
            <Plus className="w-4 h-4" /> Add Expense
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                {startDate || endDate ? 'Filtered Total' : 'Total Expenses'}
              </p>
              <p className="text-2xl font-bold text-slate-800 truncate" >
                {formatCurrency(startDate || endDate ? filteredTotal : totalExpenses)}
              </p>
            </div>
            <div className="bg-red-500/10 p-4 rounded-xl"><TrendingDown className="w-6 h-6 text-red-600" /></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Entries</p>
              <p className="text-2xl font-bold text-slate-800 truncate" >{expenses.length}</p>
            </div>
            <div className="bg-blue-500/10 p-4 rounded-xl"><FileText className="w-6 h-6 text-blue-600" /></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">This Month</p>
              <p className="text-2xl font-bold text-slate-800 truncate" >
                {formatCurrency(thisMonthTotal)}
              </p>
            </div>
            <div className="bg-bhutan-gold/10 p-4 rounded-xl"><Calendar className="w-6 h-6 text-bhutan-maroon" /></div>
          </div>
        </div>
      </div>

      {/* Search and Date Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-bhutan-maroon/20 focus:border-bhutan-maroon focus:bg-white transition-all text-sm font-medium text-slate-800"
            placeholder="Search expenses..."
          />
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-slate-400" />
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium" placeholder="Start date" />
          <span className="text-slate-400">to</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium" placeholder="End date" />
          {(startDate || endDate) && (
            <button onClick={() => { setStartDate(''); setEndDate(''); loadExpenses(); }} className="p-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600" title="Clear date filter">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Expense Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {filteredExpenses.length === 0 ? (
          <div className="text-center py-24 bg-slate-50/30">
            <div className="inline-flex p-6 rounded-full bg-white shadow-sm mb-6">
              <TrendingDown className="w-12 h-12 text-slate-200" />
            </div>
            <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-sm">No expenses recorded</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left py-4 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">#</th>
                  <th className="text-left py-4 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Date</th>
                  <th className="text-left py-4 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Category</th>
                  <th className="text-left py-4 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Vendor</th>
                  <th className="text-left py-4 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Payment</th>
                  <th className="text-left py-4 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Description</th>
                  <th className="text-right py-4 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Amount</th>
                  <th className="text-center py-4 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExpenses.map((expense: any) => (
                  <tr key={expense.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 text-sm font-bold text-slate-400">{expense.expense_no}</td>
                    <td className="py-4 px-6 text-sm text-slate-600">{expense.date}</td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="inline-flex px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold w-fit mb-1">{expense.account_name || expense.category}</span>
                        <span className="text-[10px] text-slate-400 font-medium px-1 uppercase tracking-wider">{expense.category !== (expense.account_name || expense.category) ? expense.category : ''}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-600">{expense.vendor || '-'}</td>
                    <td className="py-4 px-6 text-sm text-slate-600 capitalize">{expense.payment_mode || '-'}</td>
                    <td className="py-4 px-6 text-sm text-slate-500 max-w-xs truncate">{expense.description || '-'}</td>
                    <td className="py-4 px-6 text-sm font-bold text-slate-800 text-right">{formatCurrency(expense.amount)}</td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={async () => {
                          if (!confirm(`Are you sure you want to delete ${expense.expense_no}? This will also void the associated transaction in the ledger.`)) return;
                          const result = await window.electronSecureAPI.expenses?.delete(expense.id);
                          if (result.success) {
                            showNotification('Expense deleted and transaction voided', 'success');
                            loadExpenses();
                          } else {
                            showNotification(result.message || 'Failed to delete expense', 'error');
                          }
                        }}
                        className="p-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/10 text-red-600 rounded-lg"><TrendingDown className="w-6 h-6" /></div>
                <div><h3 className="text-xl font-bold text-slate-800">Record Expense</h3><p className="text-sm text-slate-500">Add a new business expense</p></div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-colors">
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Date</label>
                  <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium" required />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Expense Account *</label>
                  <select
                    value={formData.accountId}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      const acc = accounts.find(a => a.id === id);
                      setFormData({ ...formData, accountId: id, category: acc ? acc.name : '' });
                    }}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-bhutan-maroon/20 focus:border-bhutan-maroon outline-none transition-all"
                    required
                  >
                    <option value={0}>Select account</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Amount *</label>
                <input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" min={0.01} step={0.01} required placeholder="0.00" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Payment Mode</label>
                  <select value={formData.paymentMode} onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-bhutan-maroon/20 focus:border-bhutan-maroon outline-none transition-all">
                    <option value="cash">💵 Cash</option>
                    <option value="mBOB">📱 mBOB</option>
                    <option value="BNB">📱 BNB Pay</option>
                    <option value="TPay">📱 T-Pay</option>
                    <option value="bank">🏦 Bank Transfer</option>
                    <option value="card">💳 Card Payment</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Vendor</label>
                  <input type="text" value={formData.vendor} onChange={(e) => setFormData({ ...formData, vendor: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium" placeholder="Vendor name" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Description</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium resize-none" rows={2} placeholder="Expense details..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 border-2 border-slate-200 rounded-xl hover:bg-slate-50 font-bold text-slate-600 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 font-bold transition-colors shadow-lg shadow-red-600/20">Record Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
