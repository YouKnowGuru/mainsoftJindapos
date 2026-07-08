import { useState, useEffect } from 'react';
import { ArrowUpLeft, Search, Trash2, Download, Plus, Minus, Package } from 'lucide-react';
import { useAppStore } from '../store/appStore';

export function RefundPage() {
  const { showNotification } = useAppStore();
  const [refunds, setRefunds] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    originalTransactionId: 0,
    customerId: 0,
    date: new Date().toISOString().split('T')[0],
    reason: '',
    refundMode: 'cash',
    notes: '',
    items: [] as Array<{ itemId: number; quantity: number; unitPrice: number; gstRate: number; gstApplicable?: boolean }>,
  });

  useEffect(() => { loadRefunds(); loadItems(); loadTransactions(); }, []);

  const loadRefunds = async () => {
    const api = window.electronSecureAPI;
    if (!api?.refunds) { setRefunds([]); return; }
    try {
      const result = await api.refunds.getAll();
      if (result?.success) setRefunds(result.data || []);
      else setRefunds([]);
    } catch { setRefunds([]); }
  };

  const loadItems = async () => {
    const api = window.electronSecureAPI;
    if (!api?.inventory) { setItems([]); return; }
    try {
      const result = await api.inventory.getItems();
      if (result?.success) setItems(result.data || []);
      else setItems([]);
    } catch { setItems([]); }
  };

  const loadTransactions = async () => {
    const api = window.electronSecureAPI;
    if (!api?.transactions) { setTransactions([]); return; }
    try {
      const result = await api.transactions.getAll({ type: 'sale' });
      if (result?.success) setTransactions(result.data || []);
      else setTransactions([]);
    } catch { setTransactions([]); }
  };

  const handleTransactionSelect = (txId: number) => {
    const tx = transactions.find((t: any) => t.id === txId);
    if (tx) {
      setFormData(prev => ({
        ...prev,
        originalTransactionId: txId,
        customerId: tx.contact_id || tx.contactId || 0,
        // Start with empty items - user will manually add what they're returning
        items: [],
      }));
    }
  };

  const addRefundItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { itemId: 0, quantity: 1, unitPrice: 0, gstRate: 0, gstApplicable: false }],
    }));
  };

  const removeRefundItem = (idx: number) => {
    setFormData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
  };

  const updateRefundItem = (idx: number, field: string, value: any) => {
    const updated = [...formData.items];
    (updated[idx] as any)[field] = value;
    // Auto-fill price from item catalogue
    if (field === 'itemId') {
      const selectedItem = items.find(i => i.id === Number(value));
      if (selectedItem) {
        updated[idx].unitPrice = selectedItem.sellingPrice || selectedItem.purchasePrice || 0;
        updated[idx].gstRate = selectedItem.gstRate || 0;
        updated[idx].gstApplicable = selectedItem.gstApplicable ?? false;
      }
    }
    setFormData(prev => ({ ...prev, items: updated }));
  };

  const calcTotal = () => formData.items.reduce((sum, item) => {
    const lineTotal = item.quantity * item.unitPrice;
    const gstAmount = item.gstRate > 0 ? (lineTotal * item.gstRate / 100) : 0;
    return sum + lineTotal + gstAmount;
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.originalTransactionId || !formData.reason.trim()) {
      showNotification('Select original sale and enter reason', 'error');
      return;
    }
    if (formData.items.length === 0 || formData.items.some(i => !i.itemId || i.quantity <= 0)) {
      showNotification('Add at least one valid return item', 'error');
      return;
    }
    try {
      const result = await window.electronSecureAPI.refunds?.create(formData);
      if (result?.success) {
        showNotification('Refund processed successfully', 'success');
        setShowAddModal(false);
        loadRefunds();
        setFormData({
          originalTransactionId: 0, customerId: 0,
          date: new Date().toISOString().split('T')[0],
          reason: '', refundMode: 'cash', notes: '', items: [],
        });
      } else {
        showNotification(result?.message || 'Failed to process refund', 'error');
      }
    } catch (error: any) {
      showNotification(error.message || 'Failed to process refund', 'error');
    }
  };

  const exportToCSV = () => {
    if (refunds.length === 0) return;
    const headers = ['Refund No', 'Date', 'Customer', 'Reason', 'Mode', 'Amount'];
    const rows = refunds.map(r => [r.refundNo, r.date, r.customerName || 'Walk-in', r.reason, r.refundMode, r.totalAmount]);
    const csv = [headers, ...rows].map(row => row.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'refunds.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const formatCurrency = (amount: number) => 'Nu. ' + (amount || 0).toFixed(2);
  const filteredRefunds = refunds.filter(r =>
    (r.refundNo || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.reason || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-red-50 rounded-2xl text-red-600">
            <ArrowUpLeft className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Refunds</h1>
            <p className="text-slate-500 font-medium">Process returns and manage customer refunds</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={exportToCSV}
            disabled={refunds.length === 0}
            className="flex items-center gap-2 px-5 py-3 bg-white border-2 border-slate-100 rounded-2xl hover:border-red-200 hover:text-red-600 text-sm font-bold text-slate-600 shadow-sm disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> Export
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-5 py-3 bg-red-600 text-white rounded-2xl hover:bg-red-700 text-sm font-black shadow-lg shadow-red-600/20 transition-all"
          >
            <Plus className="w-4 h-4" /> New Refund
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-100 rounded-2xl text-sm font-bold focus:border-red-400 outline-none shadow-sm"
          placeholder="Search refunds by number, customer or reason..."
        />
      </div>

      <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        {filteredRefunds.length === 0 ? (
          <div className="text-center py-32 bg-slate-50/30">
            <ArrowUpLeft className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-sm">No refunds processed</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr>
                  <th className="text-left py-5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Refund No</th>
                  <th className="text-left py-5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Date</th>
                  <th className="text-left py-5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Customer</th>
                  <th className="text-left py-5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Reason</th>
                  <th className="text-left py-5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Mode</th>
                  <th className="text-right py-5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Amount</th>
                  <th className="text-center py-5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredRefunds.map((r: any) => (
                  <tr key={r.id} className="hover:bg-slate-50/60 transition-all group">
                    <td className="py-5 px-6 text-sm font-black text-slate-800">{r.refundNo}</td>
                    <td className="py-5 px-6 text-sm font-medium text-slate-600">{r.date}</td>
                    <td className="py-5 px-6 text-sm font-bold text-slate-700">{r.customerName || 'Walk-in'}</td>
                    <td className="py-5 px-6 text-sm text-slate-500 max-w-xs truncate">{r.reason}</td>
                    <td className="py-5 px-6">
                      <span className="inline-flex px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-[10px] font-black uppercase tracking-wider capitalize">{r.refundMode}</span>
                    </td>
                    <td className="py-5 px-6 text-sm font-black text-red-600 text-right">-{formatCurrency(r.totalAmount)}</td>
                    <td className="py-5 px-6 text-center">
                      <button
                        onClick={async () => {
                          if (confirm('Delete this refund record?')) {
                            await window.electronSecureAPI.refunds?.delete(r.id);
                            loadRefunds();
                          }
                        }}
                        className="p-2 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
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

      {/* New Refund Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl my-auto shadow-2xl animate-in fade-in zoom-in-95 duration-300 overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-600 text-white rounded-2xl"><ArrowUpLeft className="w-6 h-6" /></div>
                <div>
                  <h3 className="text-xl font-black text-slate-800">Process Refund</h3>
                  <p className="text-sm text-slate-500">Return items and credit the customer</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-2 text-slate-400 hover:text-slate-600 bg-white rounded-full">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <label className="block text-xs font-black text-slate-600 uppercase tracking-widest">Original Sale *</label>
                  <select
                    value={formData.originalTransactionId || ''}
                    onChange={(e) => handleTransactionSelect(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:border-red-400 outline-none"
                    required
                  >
                    <option value={0}>Select the original sale…</option>
                    {transactions.map(t => (
                      <option key={t.id} value={t.id}>
                        #{t.transaction_no || t.transactionNo} — {t.contact_name || t.contactName || 'Cash Sale'} — {formatCurrency(t.net_amount || t.netAmount || 0)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-600 uppercase tracking-widest">Date</label>
                  <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:border-red-400 outline-none" />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-600 uppercase tracking-widest">Refund Mode</label>
                  <select value={formData.refundMode} onChange={(e) => setFormData({ ...formData, refundMode: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:border-red-400 outline-none">
                    <option value="cash">Cash</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="card">Card</option>
                    <option value="credit">Credit to Account</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-600 uppercase tracking-widest">Reason for Return *</label>
                <textarea
                  value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-medium resize-none focus:border-red-400 outline-none"
                  rows={2} placeholder="Why is this being refunded?" required
                />
              </div>

              {/* Items to Return */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black text-slate-600 uppercase tracking-widest">Items to Return *</label>
                  <button type="button" onClick={addRefundItem}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-xl text-xs font-black hover:bg-red-100 transition-all">
                    <Plus className="w-3.5 h-3.5" /> Add Item
                  </button>
                </div>
                {formData.items.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-2xl">
                    <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-400 text-sm font-bold">Click "Add Item" to specify items being returned</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {formData.items.map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-center bg-slate-50 p-3 rounded-2xl">
                        <select
                          value={item.itemId || ''}
                          onChange={(e) => updateRefundItem(idx, 'itemId', Number(e.target.value))}
                          className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:border-red-400 outline-none"
                          required
                        >
                          <option value={0}>Select item…</option>
                          {items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.code})</option>)}
                        </select>
                        <div className="relative w-20">
                          <input
                            type="number" value={item.quantity} min={1} step={1}
                            onChange={(e) => updateRefundItem(idx, 'quantity', Number(e.target.value))}
                            className="w-full px-2 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-center focus:border-red-400 outline-none"
                            placeholder="Qty"
                          />
                        </div>
                        <div className="relative w-28">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">Nu.</span>
                          <input
                            type="number" value={item.unitPrice} min={0} step={0.01}
                            onChange={(e) => updateRefundItem(idx, 'unitPrice', Number(e.target.value))}
                            className="w-full pl-7 pr-2 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:border-red-400 outline-none"
                            placeholder="Price"
                          />
                        </div>
                        <div className="w-16 text-xs font-black text-slate-500 text-center">{item.gstRate}% GST</div>
                        <button type="button" onClick={() => removeRefundItem(idx)}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                          <Minus className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <div className="text-right text-sm font-black text-red-600 mt-2 pr-2">
                      Refund Total: {formatCurrency(calcTotal())}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-600 uppercase tracking-widest">Notes</label>
                <input type="text" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-medium focus:border-red-400 outline-none"
                  placeholder="Any additional notes…" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 border-2 border-slate-200 rounded-2xl hover:bg-slate-50 font-black text-slate-600 transition-all">
                  Cancel
                </button>
                <button type="submit"
                  className="flex-1 py-3 bg-red-600 text-white rounded-2xl hover:bg-red-700 font-black shadow-lg shadow-red-600/20 transition-all">
                  Process Refund
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
