import { useState, useEffect } from 'react';
import { Plus, Search, FileText, Trash2, Download, CheckCircle, XCircle, AlertCircle, Printer, X, Calendar } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { ExportService } from '../services/ExportService';
import DOMPurify from 'dompurify';

export function PurchaseOrderPage() {
  const { showNotification } = useAppStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [domesticRate, setDomesticRate] = useState(2);
  const [receivingPo, setReceivingPo] = useState<any | null>(null);
  const [receivePaymentMode, setReceivePaymentMode] = useState('credit');
  const [viewingPo, setViewingPo] = useState<any | null>(null);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [formData, setFormData] = useState({
    supplierId: 0,
    date: new Date().toISOString().split('T')[0],
    expectedDate: '',
    notes: '',
    taxType: 'standard' as 'standard' | 'domestic',
    items: [] as Array<{ itemId: number; quantity: number; unitPrice: number; gstRate: number; gstApplicable?: boolean; sellingPrice?: number }>,
  });

  useEffect(() => {
    loadOrders();
    loadSuppliers();
    loadItems();
  }, []);

  const loadOrders = async () => {
    const api = window.electronSecureAPI;
    if (!api?.purchaseOrders) { setOrders([]); return; }
    try {
      const result = await api.purchaseOrders.getAll();
      if (result?.success) setOrders(result.data || []);
      else setOrders([]);
    } catch { setOrders([]); }
  };

  const loadSuppliers = async () => {
    const api = window.electronSecureAPI;
    if (!api?.contacts) { setSuppliers([]); return; }
    try {
      const result = await api.contacts.getAll('supplier');
      if (result?.success) setSuppliers(result.data || []);
      else setSuppliers([]);
    } catch { setSuppliers([]); }
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

  useEffect(() => {
    const fetchSettings = async () => {
      const res = await window.electronSecureAPI.settings.get();
      if (res?.success && res.data) {
        setDomesticRate(res.data.gst_rate_domestic || 2);
      }
    };
    fetchSettings();
  }, []);

  const addItem = () => setFormData({ ...formData, items: [...formData.items, { itemId: 0, quantity: 1, unitPrice: 0, sellingPrice: 0, gstRate: 0, gstApplicable: false }] });
  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    (newItems[index] as any)[field] = value;

    // When item is selected, auto-populate GST rate and selling price from item details
    if (field === 'itemId' && value > 0) {
      const selectedItem = items.find(i => i.id === value);
      if (selectedItem) {
        const isDomestic = formData.taxType === 'domestic';
        (newItems[index] as any).gstApplicable = selectedItem.gstApplicable ?? false;
        (newItems[index] as any).sellingPrice = selectedItem.sellingPrice || 0;
        
        if (isDomestic) {
          (newItems[index] as any).gstRate = (newItems[index] as any).gstApplicable ? domesticRate : 0;
        } else {
          (newItems[index] as any).gstRate = selectedItem.gstRate || 5;
        }
      }
    }

    setFormData({ ...formData, items: newItems });
  };
  const removeItem = (index: number) => setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplierId || formData.items.length === 0) {
      showNotification('Please select supplier and add items', 'error');
      return;
    }

    // Validate each item row
    for (let i = 0; i < formData.items.length; i++) {
      const item = formData.items[i];
      if (!item.itemId || item.itemId === 0) {
        showNotification(`Row ${i + 1}: Please select an item`, 'error');
        return;
      }
      if (!item.quantity || item.quantity <= 0) {
        showNotification(`Row ${i + 1}: Quantity must be greater than 0`, 'error');
        return;
      }
      if (!item.unitPrice || item.unitPrice <= 0) {
        showNotification(`Row ${i + 1}: Purchase price must be greater than 0`, 'error');
        return;
      }
    }

    try {
      const result = await window.electronSecureAPI.purchaseOrders?.create(formData);
      if (result?.success) {
        showNotification('Purchase order created', 'success');
        setShowAddModal(false);
        loadOrders();
        setFormData({ supplierId: 0, date: new Date().toISOString().split('T')[0], expectedDate: '', notes: '', taxType: 'standard', items: [] });
      } else {
        showNotification(result?.message || 'Failed to create PO', 'error');
      }
    } catch { showNotification('Failed to create PO', 'error'); }
  };

  const formatCurrency = (amount: number) => 'Nu. ' + amount.toFixed(2);
  const statusColors: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700 border-slate-200',
    sent: 'bg-blue-50 text-blue-700 border-blue-100',
    received: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    cancelled: 'bg-red-50 text-red-700 border-red-100',
  };

  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.poNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.supplierName?.toLowerCase().includes(searchQuery.toLowerCase());

    const orderDate = new Date(o.date);
    const matchesStartDate = !startDate || orderDate >= new Date(startDate);
    const matchesEndDate = !endDate || orderDate <= new Date(endDate + 'T23:59:59');

    return matchesSearch && matchesStartDate && matchesEndDate;
  });

  const handleViewPo = async (po: any) => {
    try {
      const result = await window.electronSecureAPI.purchaseOrders?.getById(po.id);
      if (result?.success && result.data) {
        setViewingPo(result.data);
      } else {
        showNotification('Failed to load PO details', 'error');
      }
    } catch (error) {
      showNotification('Failed to load purchase order details', 'error');
    }
  };

  const handleExport = () => {
    try {
      const exportService = new ExportService();
      exportService.exportPurchaseOrders(filteredOrders);
      showNotification('Purchase orders exported successfully', 'success');
    } catch (error) {
      console.error('Export error:', error);
      showNotification('Failed to export purchase orders', 'error');
    }
  };

  const handleCancelPo = async (poId: number) => {
    if (!confirm('Are you sure you want to cancel this purchase order?')) return;
    try {
      const result = await window.electronSecureAPI.purchaseOrders?.updateStatus(poId, 'cancelled');
      if (result?.success) {
        showNotification('Purchase order cancelled', 'success');
        loadOrders();
      } else {
        showNotification(result?.message || 'Failed to cancel PO', 'error');
      }
    } catch (error) {
      showNotification('Failed to cancel purchase order', 'error');
    }
  };

  const handlePrintPo = async (po: any) => {
    try {
      // Load full PO details with items
      const result = await window.electronSecureAPI.purchaseOrders?.getById(po.id);
      if (!result?.success || !result.data) {
        showNotification('Failed to load PO details', 'error');
        return;
      }

      const poData = result.data;

      // Build print HTML
      const printContent = `
        <div style="font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #7f1d1d; padding-bottom: 20px;">
            <h1 style="color: #7f1d1d; margin: 0; font-size: 28px;">Jinda</h1>
            <p style="color: #64748b; margin: 5px 0;">Purchase Order</p>
          </div>
          
          <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
            <div>
              <h2 style="color: #1e293b; margin: 0 0 10px 0;">${poData.poNo}</h2>
              <p style="color: #64748b; margin: 5px 0;"><strong>Date:</strong> ${poData.date}</p>
              ${poData.expectedDate ? `<p style="color: #64748b; margin: 5px 0;"><strong>Expected Delivery:</strong> ${poData.expectedDate}</p>` : ''}
              <p style="color: #64748b; margin: 5px 0;"><strong>Status:</strong> ${poData.status.toUpperCase()}</p>
            </div>
            <div style="text-align: right;">
              <h3 style="color: #1e293b; margin: 0 0 10px 0;">Supplier</h3>
              <p style="color: #64748b; margin: 5px 0;">${poData.supplierName}</p>
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
              ${poData.items.map((item: any) => `
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
                <td style="padding: 8px 0; color: #1e293b; font-weight: bold;">Nu. ${poData.subtotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 20px 8px 0; color: #64748b; font-weight: bold;">GST Amount:</td>
                <td style="padding: 8px 0; color: #1e293b; font-weight: bold;">Nu. ${poData.gstAmount.toFixed(2)}</td>
              </tr>
              <tr style="border-top: 2px solid #7f1d1d;">
                <td style="padding: 12px 20px 12px 0; color: #7f1d1d; font-weight: bold; font-size: 16px;">Total Amount:</td>
                <td style="padding: 12px 0; color: #7f1d1d; font-weight: bold; font-size: 16px;">Nu. ${poData.totalAmount.toFixed(2)}</td>
              </tr>
            </table>
          </div>

          ${poData.notes ? `
            <div style="margin-bottom: 30px; padding: 15px; background-color: #f8fafc; border-left: 4px solid #7f1d1d;">
              <p style="color: #64748b; margin: 0;"><strong>Notes:</strong> ${poData.notes}</p>
            </div>
          ` : ''}

          <div style="margin-top: 60px; border-top: 2px solid #e2e8f0; padding-top: 20px; text-align: center; color: #94a3b8; font-size: 12px;">
            <p>This is a system-generated document from Jinda Accounting System</p>
            <p>Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>
      `;

      const sanitizedContent = DOMPurify.sanitize(printContent, {
        ALLOWED_TAGS: ['div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'strong', 'b', 'br', 'hr'],
        ALLOWED_ATTR: ['style'],
      });

      const printResult = await window.electronSecureAPI.print.report('Purchase Order - ' + poData.poNo, sanitizedContent);
      if (printResult.success) {
        showNotification('Purchase order sent to printer', 'success');
      } else {
        showNotification(printResult.message || 'Failed to print', 'error');
      }
    } catch (error) {
      console.error('Print error:', error);
      showNotification('Failed to print purchase order', 'error');
    }
  };

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Purchase Orders</h1>
          <p className="text-slate-500">Manage supplier orders</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors text-sm font-bold text-slate-600">
            <Download className="w-4 h-4" /> Export
          </button>
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-bhutan-maroon text-white rounded-xl hover:bg-bhutan-maroon-dark transition-colors text-sm font-bold shadow-lg shadow-bhutan-maroon/20">
            <Plus className="w-4 h-4" /> New PO
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium" placeholder="Search purchase orders..." />
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-slate-400" />
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium" placeholder="Start date" />
          <span className="text-slate-400">to</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium" placeholder="End date" />
          {(startDate || endDate) && (
            <button onClick={() => { setStartDate(''); setEndDate(''); }} className="p-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600" title="Clear date filter">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-24 bg-slate-50/30">
            <FileText className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-sm">No purchase orders</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="overflow-x-auto w-full">
<table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left py-4 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">PO No</th>
                  <th className="text-left py-4 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Supplier</th>
                  <th className="text-left py-4 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Date</th>
                  <th className="text-left py-4 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Expected</th>
                  <th className="text-left py-4 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="text-right py-4 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Total</th>
                  <th className="text-center py-4 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map((po: any) => (
                  <tr key={po.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 text-sm font-bold text-slate-800">
                      <div className="flex flex-col">
                        <span>{po.poNo}</span>
                        {po.transactionId && <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Linked to Ledger</span>}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-600">{po.supplierName}</td>
                    <td className="py-4 px-6 text-sm text-slate-600">{po.date}</td>
                    <td className="py-4 px-6 text-sm text-slate-600">{po.expectedDate || '-'}</td>
                    <td className="py-4 px-6"><span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border ${statusColors[po.status] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>{po.status}</span></td>
                    <td className="py-4 px-6 text-sm font-bold text-slate-800 text-right">{formatCurrency(po.totalAmount)}</td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        {/* View Details */}
                        <button onClick={() => handleViewPo(po)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg" title="View Details"><FileText className="w-4 h-4" /></button>

                        {/* Print */}
                        <button onClick={() => handlePrintPo(po)} className="p-2 text-purple-500 hover:bg-purple-50 rounded-lg" title="Print PO"><Printer className="w-4 h-4" /></button>

                        {/* Mark as Sent */}
                        {po.status === 'draft' && <button onClick={async () => { await window.electronSecureAPI.purchaseOrders?.updateStatus(po.id, 'sent'); loadOrders(); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg" title="Mark as Sent"><FileText className="w-4 h-4" /></button>}

                        {/* Receive Items */}
                        {po.status === 'sent' && <button onClick={() => setReceivingPo(po)} className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg" title="Receive Items"><CheckCircle className="w-4 h-4" /></button>}

                        {/* Cancel PO */}
                        {(po.status === 'draft' || po.status === 'sent') && <button onClick={() => handleCancelPo(po.id)} className="p-2 text-orange-500 hover:bg-orange-50 rounded-lg" title="Cancel PO"><XCircle className="w-4 h-4" /></button>}

                        {/* Delete PO */}
                        <button onClick={async () => { if (confirm('Are you sure you want to delete this PO?')) { await window.electronSecureAPI.purchaseOrders?.delete(po.id); loadOrders(); } }} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg" title="Delete PO"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
</div>
          </div>
        )}
      </div>

      {/* Add PO Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 sm:p-8 my-auto shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-bhutan-maroon/10 text-bhutan-maroon rounded-lg"><FileText className="w-6 h-6" /></div>
                <div><h3 className="text-xl font-bold text-slate-800">New Purchase Order</h3><p className="text-sm text-slate-500">Order from supplier</p></div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg"><Plus className="w-5 h-5 rotate-45" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Supplier *</label>
                  <select value={formData.supplierId || ''} onChange={(e) => setFormData({ ...formData, supplierId: Number(e.target.value) })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium" required>
                    <option value={0}>Select supplier</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Expected Delivery</label>
                  <input type="date" value={formData.expectedDate} onChange={(e) => setFormData({ ...formData, expectedDate: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium" />
                </div>
              </div>

              {/* Tax Mode Toggle */}
              <div className="space-y-1.5 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Purchase Tax Mode</label>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Select if this is a domestic purchase</p>
                  </div>
                  <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                    <button
                      type="button"
                      onClick={() => {
                        const newTaxType = 'standard';
                        const updatedItems = formData.items.map(item => ({
                          ...item,
                          gstRate: item.gstApplicable ? 5 : 0
                        }));
                        setFormData({ ...formData, taxType: newTaxType, items: updatedItems });
                      }}
                      className={`px-4 py-1.5 rounded-md text-xs font-black uppercase tracking-wider transition-all ${formData.taxType === 'standard' ? 'bg-bhutan-maroon text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Standard
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const newTaxType = 'domestic';
                        const updatedItems = formData.items.map(item => ({
                          ...item,
                          gstRate: item.gstApplicable ? domesticRate : 0
                        }));
                        setFormData({ ...formData, taxType: newTaxType, items: updatedItems });
                      }}
                      className={`px-4 py-1.5 rounded-md text-xs font-black uppercase tracking-wider transition-all ${formData.taxType === 'domestic' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Domestic
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Items *</label>
                {formData.items.map((item, idx) => (
                  <div key={idx} className="flex gap-2 mb-2 items-center">
                    <select value={item.itemId || ''} onChange={(e) => updateItem(idx, 'itemId', Number(e.target.value))} className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                      <option value={0}>Select item</option>
                      {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                    </select>
                    <input type="number" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))} className="w-20 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" min={1} placeholder="Qty" title="Quantity" />
                    <input type="number" value={item.unitPrice} onChange={(e) => updateItem(idx, 'unitPrice', Number(e.target.value))} className="w-24 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" min={0.01} step={0.01} placeholder="Pur." title="Purchase Price" />
                    <input type="number" value={item.sellingPrice} onChange={(e) => updateItem(idx, 'sellingPrice', Number(e.target.value))} className="w-24 px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-lg text-sm font-bold text-emerald-700" min={0} step={0.01} placeholder="Sell" title="New Selling Price" />
                    <button type="button" onClick={() => removeItem(idx)} className="p-2 text-red-400 hover:text-red-600"><XCircle className="w-4 h-4" /></button>
                  </div>
                ))}
                <button type="button" onClick={addItem} className="text-sm font-bold text-bhutan-maroon hover:underline">+ Add Item</button>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Notes</label>
                <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium resize-none" rows={2} placeholder="Order notes..." />
              </div>

              {/* Live Summary */}
              <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 shadow-inner">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Subtotal</span>
                  <span className="text-sm font-bold text-white">Nu. {formData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">GST Amount ({formData.taxType === 'domestic' ? 'Domestic' : 'Standard'})</span>
                  <span className="text-sm font-bold text-emerald-400">
                    Nu. {formData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice * (item.gstRate || 0) / 100), 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-slate-800">
                  <span className="text-sm font-black text-slate-300 uppercase tracking-widest">Total Amount</span>
                  <span className="text-xl font-black text-white">
                    Nu. {formData.items.reduce((sum, item) => {
                      const lineTotal = item.quantity * item.unitPrice;
                      const lineGst = lineTotal * (item.gstRate || 0) / 100;
                      return sum + lineTotal + lineGst;
                    }, 0).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 border-2 border-slate-200 rounded-xl hover:bg-slate-50 font-bold text-slate-600">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-bhutan-maroon text-white rounded-xl hover:bg-bhutan-maroon-dark font-bold shadow-lg shadow-bhutan-maroon/20">Create Purchase Order</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Receive PO Modal */}
      {receivingPo && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><CheckCircle className="w-6 h-6" /></div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">Receive Inventory</h3>
                <p className="text-sm text-slate-500">PO No: {receivingPo.poNo}</p>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-500 font-medium">Supplier</span>
                  <span className="text-slate-800 font-bold">{receivingPo.supplierName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-medium">Total Amount</span>
                  <span className="text-slate-800 font-bold">{formatCurrency(receivingPo.totalAmount)}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Select Payment Method</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => setReceivePaymentMode('credit')}
                    className={`p-3 rounded-xl border-2 text-sm font-bold flex flex-col items-center gap-1 transition-all ${receivePaymentMode === 'credit' ? 'border-bhutan-maroon bg-bhutan-maroon/5 text-bhutan-maroon' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}
                  >
                    <AlertCircle className="w-5 h-5" />
                    On Credit
                  </button>
                  <button
                    onClick={() => setReceivePaymentMode('bank')}
                    className={`p-3 rounded-xl border-2 text-sm font-bold flex flex-col items-center gap-1 transition-all ${receivePaymentMode === 'bank' ? 'border-bhutan-maroon bg-bhutan-maroon/5 text-bhutan-maroon' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}
                  >
                    <Download className="w-5 h-5 rotate-180" />
                    Paid Immediately
                  </button>
                </div>
              </div>

              {receivePaymentMode !== 'credit' && (
                <div className="space-y-1.5 animate-in slide-in-from-top-2">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Payment Account</label>
                  <select
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                    onChange={(e) => setReceivePaymentMode(e.target.value)}
                    value={receivePaymentMode === 'bank' ? 'bank' : receivePaymentMode}
                  >
                    <option value="bank">🏦 Bank Account</option>
                    <option value="mBOB">📱 mBOB</option>
                    <option value="BNB">📱 BNB Pay</option>
                    <option value="cash">💵 Cash in Hand</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setReceivingPo(null)}
                className="flex-1 py-3 border-2 border-slate-200 rounded-xl hover:bg-slate-50 font-bold text-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    const result = await window.electronSecureAPI.purchaseOrders?.updateStatus(receivingPo.id, 'received', receivePaymentMode);
                    if (result?.success) {
                      showNotification('Inventory received and ledger updated!', 'success');
                      setReceivingPo(null);
                      loadOrders();
                    } else {
                      showNotification(result?.message || 'Failed to receive PO', 'error');
                    }
                  } catch (e) {
                    showNotification('An error occurred during reception', 'error');
                  }
                }}
                className="flex-1 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-bold transition-colors shadow-lg shadow-emerald-600/20"
              >
                Confirm Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View PO Details Modal */}
      {viewingPo && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[70] p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-3xl p-6 sm:p-8 my-auto shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><FileText className="w-6 h-6" /></div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Purchase Order Details</h3>
                  <p className="text-sm text-slate-500">{viewingPo.poNo}</p>
                </div>
              </div>
              <button onClick={() => setViewingPo(null)} className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-6">
              {/* PO Info */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wide mb-1">Supplier</p>
                  <p className="text-sm font-bold text-slate-800">{viewingPo.supplierName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wide mb-1">Status</p>
                  <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border ${statusColors[viewingPo.status]}`}>{viewingPo.status}</span>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wide mb-1">Date</p>
                  <p className="text-sm font-bold text-slate-800">{viewingPo.date}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wide mb-1">Expected Delivery</p>
                  <p className="text-sm font-bold text-slate-800">{viewingPo.expectedDate || '-'}</p>
                </div>
              </div>

              {/* Items Table */}
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
                      {viewingPo.items?.map((item: any) => (
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

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64">
                  <div className="flex justify-between py-2 text-sm">
                    <span className="text-slate-500 font-medium">Subtotal:</span>
                    <span className="font-bold text-slate-800">Nu. {viewingPo.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2 text-sm">
                    <span className="text-slate-500 font-medium">GST Amount:</span>
                    <span className="font-bold text-slate-800">Nu. {viewingPo.gstAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-3 text-base border-t-2 border-bhutan-maroon mt-2">
                    <span className="font-bold text-bhutan-maroon">Total Amount:</span>
                    <span className="font-black text-bhutan-maroon">Nu. {viewingPo.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {viewingPo.notes && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
                  <p className="text-xs text-amber-800 font-bold uppercase tracking-wide mb-1">Notes</p>
                  <p className="text-sm text-amber-900">{viewingPo.notes}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6 pt-6 border-t">
              <button onClick={() => setViewingPo(null)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-600">Close</button>
              <button onClick={() => { handlePrintPo(viewingPo); setViewingPo(null); }} className="flex-1 py-3 bg-bhutan-maroon text-white rounded-xl hover:bg-bhutan-maroon-dark font-bold flex items-center justify-center gap-2"><Printer className="w-4 h-4" /> Print PO</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
