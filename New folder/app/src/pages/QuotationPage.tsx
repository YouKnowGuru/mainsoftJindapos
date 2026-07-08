import { useState, useEffect } from 'react';
import { Plus, Search, FileText, Trash2, Download, CheckCircle, XCircle, AlertCircle, Eye, Printer } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { ExportService } from '../services/ExportService';
import DOMPurify from 'dompurify';

export function QuotationPage() {
  const { showNotification } = useAppStore();
  const [quotes, setQuotes] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewingQuote, setViewingQuote] = useState<any | null>(null);
  const [convertingQuote, setConvertingQuote] = useState<any | null>(null);
  const [convertPaymentMode, setConvertPaymentMode] = useState('cash');
  const [customers, setCustomers] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    customerId: 0,
    date: new Date().toISOString().split('T')[0],
    expiryDate: '',
    notes: '',
    items: [] as Array<{ itemId: number; quantity: number; unitPrice: number; gstRate: number; gstApplicable: boolean }>,
  });

  useEffect(() => { loadQuotes(); loadCustomers(); loadItems(); }, []);

  const loadQuotes = async () => {
    const api = window.electronSecureAPI;
    if (!api?.quotations) { setQuotes([]); return; }
    try { const result = await api.quotations.getAll(); if (result?.success) setQuotes(result.data || []); else setQuotes([]); } catch { setQuotes([]); }
  };
  const loadCustomers = async () => {
    const api = window.electronSecureAPI;
    if (!api?.contacts) { setCustomers([]); return; }
    try { const result = await api.contacts.getAll('customer'); if (result?.success) setCustomers(result.data || []); else setCustomers([]); } catch { setCustomers([]); }
  };
  const loadItems = async () => {
    const api = window.electronSecureAPI;
    if (!api?.inventory) { setItems([]); return; }
    try { const result = await api.inventory.getItems(); if (result?.success) setItems(result.data || []); else setItems([]); } catch { setItems([]); }
  };

  const addItem = () => setFormData({ ...formData, items: [...formData.items, { itemId: 0, quantity: 1, unitPrice: 0, gstRate: 0, gstApplicable: false }] });
  const updateItem = (idx: number, field: string, value: any) => {
    const n = [...formData.items];
    (n[idx] as any)[field] = value;

    // When item is selected, auto-populate GST rate from item details
    if (field === 'itemId' && value > 0) {
      const selectedItem = items.find(i => i.id === value);
      if (selectedItem) {
        (n[idx] as any).gstRate = selectedItem.gstRate || 0;
        (n[idx] as any).gstApplicable = selectedItem.gstApplicable ?? false;
      }
    }

    setFormData({ ...formData, items: n });
  };
  const removeItem = (idx: number) => setFormData({ ...formData, items: formData.items.filter((_, i) => i !== idx) });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId || formData.items.length === 0) { showNotification('Select customer and add items', 'error'); return; }
    try {
      const result = await window.electronSecureAPI.quotations?.create(formData);
      if (result?.success) { showNotification('Quotation created', 'success'); setShowAddModal(false); loadQuotes(); setFormData({ customerId: 0, date: new Date().toISOString().split('T')[0], expiryDate: '', notes: '', items: [] }); }
    } catch { showNotification('Failed to create', 'error'); }
  };

  const formatCurrency = (amount: number) => 'Nu. ' + amount.toFixed(2);
  const statusColors: Record<string, string> = { draft: 'bg-slate-100 text-slate-700', sent: 'bg-blue-100 text-blue-700', accepted: 'bg-emerald-100 text-emerald-700', converted: 'bg-violet-100 text-violet-700', expired: 'bg-amber-100 text-amber-700', cancelled: 'bg-red-100 text-red-700' };
  const filteredQuotes = quotes.filter(q => q.quoteNo?.toLowerCase().includes(searchQuery.toLowerCase()) || q.customerName?.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleExport = () => {
    try {
      const exportService = new ExportService();
      exportService.exportQuotations(filteredQuotes);
      showNotification('Quotations exported successfully', 'success');
    } catch (error) {
      console.error('Export error:', error);
      showNotification('Failed to export quotations', 'error');
    }
  };

  const handleViewQuote = async (quote: any) => {
    try {
      const result = await window.electronSecureAPI.quotations?.getById(quote.id);
      if (result?.success && result.data) {
        setViewingQuote(result.data);
      } else {
        showNotification('Failed to load quotation details', 'error');
      }
    } catch (error) {
      showNotification('Failed to load quotation details', 'error');
    }
  };

  const handlePrintQuote = async (quote: any) => {
    try {
      const result = await window.electronSecureAPI.quotations?.getById(quote.id);
      if (!result?.success || !result.data) {
        showNotification('Failed to load quotation details', 'error');
        return;
      }

      const quoteData = result.data;

      const printContent = `
        <div style="font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #7f1d1d; padding-bottom: 20px;">
            <h1 style="color: #7f1d1d; margin: 0; font-size: 28px;">Dhisum Tseyig</h1>
            <p style="color: #64748b; margin: 5px 0;">Quotation</p>
          </div>
          
          <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
            <div>
              <h2 style="color: #1e293b; margin: 0 0 10px 0;">${quoteData.quoteNo}</h2>
              <p style="color: #64748b; margin: 5px 0;"><strong>Date:</strong> ${quoteData.date}</p>
              ${quoteData.expiryDate ? `<p style="color: #64748b; margin: 5px 0;"><strong>Valid Until:</strong> ${quoteData.expiryDate}</p>` : ''}
              <p style="color: #64748b; margin: 5px 0;"><strong>Status:</strong> ${quoteData.status.toUpperCase()}</p>
            </div>
            <div style="text-align: right;">
              <h3 style="color: #1e293b; margin: 0 0 10px 0;">Customer</h3>
              <p style="color: #64748b; margin: 5px 0;">${quoteData.customerName}</p>
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
            <thead>
              <tr style="background-color: #f1f5f9;">
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0; color: #475569; font-size: 12px;">Item</th>
                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e2e8f0; color: #475569; font-size: 12px;">Qty</th>
                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e2e8f0; color: #475569; font-size: 12px;">Unit Price</th>
                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e2e8f0; color: #475569; font-size: 12px;">GST</th>
                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e2e8f0; color: #475569; font-size: 12px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${quoteData.items.map((item: any) => `
                <tr>
                  <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #1e293b;">${item.itemName}</td>
                  <td style="padding: 12px; text-align: center; border-bottom: 1px solid #e2e8f0; color: #1e293b;">${item.quantity}</td>
                  <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e2e8f0; color: #1e293b;">Nu. ${item.unitPrice.toFixed(2)}</td>
                  <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e2e8f0; color: #1e293b;">${item.gstRate}%</td>
                  <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e2e8f0; color: #1e293b; font-weight: bold;">Nu. ${item.totalAmount.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div style="text-align: right; margin-bottom: 30px;">
            <table style="margin-left: auto;">
              <tr>
                <td style="padding: 8px 20px 8px 0; color: #64748b; font-weight: bold;">Subtotal:</td>
                <td style="padding: 8px 0; color: #1e293b; font-weight: bold;">Nu. ${quoteData.subtotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 20px 8px 0; color: #64748b; font-weight: bold;">GST Amount:</td>
                <td style="padding: 8px 0; color: #1e293b; font-weight: bold;">Nu. ${quoteData.gstAmount.toFixed(2)}</td>
              </tr>
              <tr style="border-top: 2px solid #7f1d1d;">
                <td style="padding: 12px 20px 12px 0; color: #7f1d1d; font-weight: bold; font-size: 16px;">Total Amount:</td>
                <td style="padding: 12px 0; color: #7f1d1d; font-weight: bold; font-size: 16px;">Nu. ${quoteData.totalAmount.toFixed(2)}</td>
              </tr>
            </table>
          </div>

          ${quoteData.notes ? `
            <div style="margin-bottom: 30px; padding: 15px; background-color: #f8fafc; border-left: 4px solid #7f1d1d;">
              <p style="color: #64748b; margin: 0;"><strong>Notes:</strong> ${quoteData.notes}</p>
            </div>
          ` : ''}

          <div style="margin-top: 60px; border-top: 2px solid #e2e8f0; padding-top: 20px; text-align: center; color: #94a3b8; font-size: 12px;">
            <p>This quotation is valid for 30 days from the date of issue</p>
            <p>Generated by Dhisum Tseyig Accounting System on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>
      `;

      const sanitizedContent = DOMPurify.sanitize(printContent, {
        ALLOWED_TAGS: ['div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'strong', 'b', 'br', 'hr'],
        ALLOWED_ATTR: ['style'],
      });

      const printResult = await window.electronSecureAPI.print.report('Quotation - ' + quoteData.quoteNo, sanitizedContent);
      if (printResult.success) {
        showNotification('Quotation sent to printer', 'success');
      } else {
        showNotification(printResult.message || 'Failed to print', 'error');
      }
    } catch (error) {
      console.error('Print error:', error);
      showNotification('Failed to print quotation', 'error');
    }
  };

  const handleConvertToSale = async () => {
    if (!convertingQuote) return;

    try {
      const result = await window.electronSecureAPI.quotations?.convertToSale(convertingQuote.id, convertPaymentMode);
      if (result?.success) {
        showNotification(result.message || 'Quotation converted to sale successfully', 'success');
        setConvertingQuote(null);
        loadQuotes();
      } else {
        showNotification(result?.message || 'Failed to convert quotation', 'error');
      }
    } catch (error) {
      showNotification('Failed to convert quotation', 'error');
    }
  };

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div><h1 className="text-3xl font-bold text-slate-800">Quotations</h1><p className="text-slate-500">Create and manage price quotes</p></div>
        <div className="flex gap-3">
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 rounded-xl hover:bg-slate-200 text-sm font-bold text-slate-600"><Download className="w-4 h-4" /> Export</button>
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-bhutan-maroon text-white rounded-xl hover:bg-bhutan-maroon-dark text-sm font-bold shadow-lg shadow-bhutan-maroon/20"><Plus className="w-4 h-4" /> New Quote</button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" /><input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium" placeholder="Search quotations..." /></div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {filteredQuotes.length === 0 ? (<div className="text-center py-24 bg-slate-50/30"><FileText className="w-12 h-12 text-slate-200 mx-auto mb-4" /><p className="text-slate-400 font-black uppercase tracking-[0.2em] text-sm">No quotations</p></div>) : (
          <div className="overflow-x-auto">
            <div className="overflow-x-auto w-full">
<table className="w-full"><thead className="bg-slate-50"><tr>
              <th className="text-left py-4 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Quote No</th>
              <th className="text-left py-4 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Customer</th>
              <th className="text-left py-4 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Date</th>
              <th className="text-left py-4 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Expiry</th>
              <th className="text-left py-4 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
              <th className="text-right py-4 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Total</th>
              <th className="text-center py-4 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Actions</th>
            </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {filteredQuotes.map((q: any) => (
                  <tr key={q.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 text-sm font-bold text-slate-800">{q.quoteNo}</td>
                    <td className="py-4 px-6 text-sm text-slate-600">{q.customerName}</td>
                    <td className="py-4 px-6 text-sm text-slate-600">{q.date}</td>
                    <td className="py-4 px-6 text-sm text-slate-600">{q.expiryDate || '-'}</td>
                    <td className="py-4 px-6"><span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${statusColors[q.status] || 'bg-gray-100 text-gray-700'}`}>{q.status}</span></td>
                    <td className="py-4 px-6 text-sm font-bold text-slate-800 text-right">{formatCurrency(q.totalAmount)}</td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        {/* View Details */}
                        <button onClick={() => handleViewQuote(q)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg" title="View Details"><Eye className="w-4 h-4" /></button>

                        {/* Print */}
                        <button onClick={() => handlePrintQuote(q)} className="p-2 text-purple-500 hover:bg-purple-50 rounded-lg" title="Print"><Printer className="w-4 h-4" /></button>

                        {/* Accept (sent -> accepted) */}
                        {q.status === 'sent' && <button onClick={async () => { await window.electronSecureAPI.quotations?.updateStatus(q.id, 'accepted'); loadQuotes(); }} className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg" title="Accept"><CheckCircle className="w-4 h-4" /></button>}

                        {/* Convert to Sale (accepted -> converted) */}
                        {q.status === 'accepted' && <button onClick={() => setConvertingQuote(q)} className="p-2 text-violet-500 hover:bg-violet-50 rounded-lg" title="Convert to Sale"><AlertCircle className="w-4 h-4" /></button>}

                        {/* Delete */}
                        <button onClick={async () => { if (confirm('Delete this quotation?')) { await window.electronSecureAPI.quotations?.delete(q.id); loadQuotes(); } }} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody></table>
</div>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 sm:p-8 my-auto shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3"><div className="p-2 bg-bhutan-maroon/10 text-bhutan-maroon rounded-lg"><FileText className="w-6 h-6" /></div><div><h3 className="text-xl font-bold text-slate-800">New Quotation</h3><p className="text-sm text-slate-500">Price quote for customer</p></div></div>
              <button onClick={() => setShowAddModal(false)} className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg"><Plus className="w-5 h-5 rotate-45" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5"><label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Customer *</label><select value={formData.customerId || ''} onChange={(e) => setFormData({ ...formData, customerId: Number(e.target.value) })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium" required><option value={0}>Select customer</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                <div className="space-y-1.5"><label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Expiry Date</label><input type="date" value={formData.expiryDate} onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium" /></div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Items *</label>
                {formData.items.map((item, idx) => (
                  <div key={idx} className="flex gap-2 mb-2 items-center">
                    <select value={item.itemId || ''} onChange={(e) => updateItem(idx, 'itemId', Number(e.target.value))} className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"><option value={0}>Select item</option>{items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select>
                    <input type="number" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))} className="w-20 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" min={1} placeholder="Qty" />
                    <input type="number" value={item.unitPrice} onChange={(e) => updateItem(idx, 'unitPrice', Number(e.target.value))} className="w-28 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" min={0.01} step={0.01} placeholder="Price" />
                    <button type="button" onClick={() => removeItem(idx)} className="p-2 text-red-400 hover:text-red-600"><XCircle className="w-4 h-4" /></button>
                  </div>
                ))}
                <button type="button" onClick={addItem} className="text-sm font-bold text-bhutan-maroon hover:underline">+ Add Item</button>
              </div>
              <div className="space-y-1.5"><label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Notes</label><textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium resize-none" rows={2} placeholder="Quote notes..." /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 border-2 border-slate-200 rounded-xl hover:bg-slate-50 font-bold text-slate-600">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-bhutan-maroon text-white rounded-xl hover:bg-bhutan-maroon-dark font-bold shadow-lg shadow-bhutan-maroon/20">Create Quotation</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Quotation Modal */}
      {viewingQuote && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[70] p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-3xl p-6 sm:p-8 my-auto shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><FileText className="w-6 h-6" /></div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Quotation Details</h3>
                  <p className="text-sm text-slate-500">{viewingQuote.quoteNo}</p>
                </div>
              </div>
              <button onClick={() => setViewingQuote(null)} className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg"><XCircle className="w-5 h-5" /></button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wide mb-1">Customer</p>
                  <p className="text-sm font-bold text-slate-800">{viewingQuote.customerName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wide mb-1">Status</p>
                  <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${statusColors[viewingQuote.status]}`}>{viewingQuote.status}</span>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wide mb-1">Date</p>
                  <p className="text-sm font-bold text-slate-800">{viewingQuote.date}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wide mb-1">Valid Until</p>
                  <p className="text-sm font-bold text-slate-800">{viewingQuote.expiryDate || '-'}</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wide">Items</h4>
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <div className="overflow-x-auto w-full">
<table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Item</th>
                        <th className="text-center py-3 px-4 text-xs font-bold text-slate-500 uppercase">Qty</th>
                        <th className="text-right py-3 px-4 text-xs font-bold text-slate-500 uppercase">Unit Price</th>
                        <th className="text-right py-3 px-4 text-xs font-bold text-slate-500 uppercase">GST</th>
                        <th className="text-right py-3 px-4 text-xs font-bold text-slate-500 uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {viewingQuote.items?.map((item: any) => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4 text-sm font-medium text-slate-800">{item.itemName}</td>
                          <td className="py-3 px-4 text-sm text-slate-600 text-center">{item.quantity}</td>
                          <td className="py-3 px-4 text-sm text-slate-600 text-right">Nu. {item.unitPrice.toFixed(2)}</td>
                          <td className="py-3 px-4 text-sm text-slate-600 text-right">{item.gstRate}%</td>
                          <td className="py-3 px-4 text-sm font-bold text-slate-800 text-right">Nu. {item.totalAmount.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
</div>
                </div>
              </div>

              <div className="flex justify-end">
                <div className="w-64">
                  <div className="flex justify-between py-2 text-sm">
                    <span className="text-slate-500 font-medium">Subtotal:</span>
                    <span className="font-bold text-slate-800">Nu. {viewingQuote.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2 text-sm">
                    <span className="text-slate-500 font-medium">GST Amount:</span>
                    <span className="font-bold text-slate-800">Nu. {viewingQuote.gstAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-3 text-base border-t-2 border-bhutan-maroon mt-2">
                    <span className="font-bold text-bhutan-maroon">Total Amount:</span>
                    <span className="font-black text-bhutan-maroon">Nu. {viewingQuote.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {viewingQuote.notes && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
                  <p className="text-xs text-amber-800 font-bold uppercase tracking-wide mb-1">Notes</p>
                  <p className="text-sm text-amber-900">{viewingQuote.notes}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6 pt-6 border-t">
              <button onClick={() => setViewingQuote(null)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-600">Close</button>
              <button onClick={() => { handlePrintQuote(viewingQuote); setViewingQuote(null); }} className="flex-1 py-3 bg-bhutan-maroon text-white rounded-xl hover:bg-bhutan-maroon-dark font-bold flex items-center justify-center gap-2"><Printer className="w-4 h-4" /> Print Quote</button>
            </div>
          </div>
        </div>
      )}

      {/* Convert to Sale Modal */}
      {convertingQuote && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-violet-100 text-violet-600 rounded-lg"><AlertCircle className="w-6 h-6" /></div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">Convert to Sale</h3>
                <p className="text-sm text-slate-500">{convertingQuote.quoteNo}</p>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-500 font-medium">Customer</span>
                  <span className="text-slate-800 font-bold">{convertingQuote.customerName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-medium">Total Amount</span>
                  <span className="text-slate-800 font-bold">{formatCurrency(convertingQuote.totalAmount)}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Payment Method</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {['cash', 'bank', 'mBOB', 'BNB', 'card', 'credit'].map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setConvertPaymentMode(mode)}
                      className={`p-3 rounded-xl border-2 text-sm font-bold capitalize transition-all ${convertPaymentMode === mode ? 'border-bhutan-maroon bg-bhutan-maroon/5 text-bhutan-maroon' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
                <p className="text-xs text-amber-800 font-bold mb-1">⚠️ Warning</p>
                <p className="text-xs text-amber-900">This will create a sale transaction, reduce stock, and post accounting entries. This action cannot be undone.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setConvertingQuote(null)} className="flex-1 py-3 border-2 border-slate-200 rounded-xl hover:bg-slate-50 font-bold text-slate-600 transition-colors">Cancel</button>
              <button onClick={handleConvertToSale} className="flex-1 py-3 bg-violet-600 text-white rounded-xl hover:bg-violet-700 font-bold transition-colors shadow-lg shadow-violet-600/20">Convert to Sale</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
