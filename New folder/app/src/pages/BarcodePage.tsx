import { useState, useEffect } from 'react';
import { QrCode, Barcode as BarcodeIcon, Plus, Search, Trash2, Download, Loader2 } from 'lucide-react';
import { useAppStore } from '../store/appStore';

export function BarcodePage() {
  const { showNotification } = useAppStore();
  const [items, setItems] = useState<any[]>([]);
  const [mappings, setMappings] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({ itemId: 0, barcode: '' });
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => { loadItems(); loadMappings(); }, []);

  const loadItems = async () => {
    const api = window.electronSecureAPI;
    if (!api?.inventory) { setItems([]); return; }
    try { 
      const result = await api.inventory.getItems(); 
      if (result?.success) setItems(result.data || []); 
      else setItems([]); 
    } catch { setItems([]); }
  };

  const loadMappings = async () => {
    const api = window.electronSecureAPI;
    if (!api?.barcodes) { setMappings([]); return; }
    try { 
      const result = await api.barcodes.getAll(); 
      if (result?.success) setMappings(result.data || []); 
      else setMappings([]); 
    } catch { setMappings([]); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.itemId || !formData.barcode.trim()) {
      showNotification('Select item and enter barcode', 'error');
      return;
    }
    try {
      const result = await window.electronSecureAPI.barcodes?.create({
        barcode: formData.barcode,
        itemId: formData.itemId
      });
      if (result?.success) {
        showNotification('Barcode mapped', 'success');
        setShowAddModal(false);
        loadMappings();
        setFormData({ itemId: 0, barcode: '' });
      } else {
        showNotification(result?.message || 'Failed to map barcode', 'error');
      }
    } catch { showNotification('Failed to map barcode', 'error'); }
  };

  const handlePrintLabels = async () => {
    if (mappings.length === 0) {
      showNotification('No barcodes to print', 'error');
      return;
    }

    const api = window.electronSecureAPI;
    if (!api?.print?.barcodes) {
      showNotification('Printing module not available', 'error');
      return;
    }

    setIsPrinting(true);
    try {
      const result = await api.print.barcodes(mappings);
      if (result?.success) {
        showNotification('Print job sent', 'success');
      } else {
        showNotification(result?.message || 'Print failed', 'error');
      }
    } catch (error) {
      console.error('Print error:', error);
      showNotification('Failed to start printing', 'error');
    } finally {
      setIsPrinting(false);
    }
  };

  const filteredMappings = mappings.filter(m =>
    m.barcode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.itemName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black truncate text-slate-900 tracking-tight">Barcode Manager</h1>
          <p className="text-slate-500 font-medium">Map and print barcodes for items</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handlePrintLabels}
            disabled={isPrinting || mappings.length === 0}
            className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-slate-100 rounded-2xl hover:border-bhutan-maroon/20 hover:bg-slate-50 text-sm font-black text-slate-600 transition-all active:scale-95 disabled:opacity-50"
          >
            {isPrinting ? <Loader2 className="w-4 h-4 animate-spin text-bhutan-maroon" /> : <Download className="w-4 h-4" />} 
            Print Labels
          </button>
          <button 
            onClick={() => setShowAddModal(true)} 
            className="flex items-center gap-2 px-6 py-3 bg-bhutan-maroon text-white rounded-2xl hover:bg-bhutan-maroon-dark text-sm font-black shadow-xl shadow-bhutan-maroon/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" /> Map Barcode
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="w-full pl-14 pr-6 py-4 bg-white border-2 border-transparent rounded-[24px] text-sm font-bold text-slate-800 shadow-sm focus:border-bhutan-maroon/20 focus:ring-4 focus:ring-bhutan-maroon/5 transition-all outline-none" 
            placeholder="Search barcodes or items..." 
          />
        </div>
      </div>

      <div className="bg-white rounded-[40px] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        {filteredMappings.length === 0 ? (
          <div className="text-center py-24 bg-slate-50/30">
            <div className="w-20 h-20 bg-slate-100 rounded-[32px] flex items-center justify-center mx-auto mb-6">
              <QrCode className="w-10 h-10 text-slate-300" />
            </div>
            <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-xs">No barcode mappings found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-slate-100 bg-slate-50/50">
                  <th className="text-left py-6 px-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Barcode</th>
                  <th className="text-left py-6 px-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Linked Item</th>
                  <th className="text-left py-6 px-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Item Code</th>
                  <th className="text-left py-6 px-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Created</th>
                  <th className="text-center py-6 px-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredMappings.map((m: any) => (
                  <tr key={m.id} className="group hover:bg-slate-50/80 transition-colors">
                    <td className="py-5 px-8">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center group-hover:bg-bhutan-maroon/5 group-hover:text-bhutan-maroon transition-colors">
                          <BarcodeIcon className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-mono font-black text-slate-800">{m.barcode}</span>
                      </div>
                    </td>
                    <td className="py-5 px-8 text-sm font-bold text-slate-600">{m.item_name || m.itemName}</td>
                    <td className="py-5 px-8 text-sm font-mono font-bold text-slate-400">{m.item_code || m.itemCode || '-'}</td>
                    <td className="py-5 px-8 text-sm font-bold text-slate-500">{new Date(m.created_at).toLocaleDateString()}</td>
                    <td className="py-5 px-8 text-center">
                      <button 
                        onClick={async () => { if (confirm('Remove this barcode mapping?')) { await window.electronSecureAPI.barcodes?.delete(m.id); loadMappings(); } }} 
                        className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
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

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[40px] w-full max-w-lg p-10 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-bhutan-maroon/10 text-bhutan-maroon rounded-3xl">
                  <QrCode className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Map Barcode</h3>
                  <p className="text-sm font-medium text-slate-500">Link a barcode to an inventory item</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddModal(false)} 
                className="p-3 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-2xl transition-all"
              >
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Select Item *</label>
                <select 
                  value={formData.itemId || ''} 
                  onChange={(e) => setFormData({ ...formData, itemId: Number(e.target.value) })} 
                  className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-[24px] text-sm font-bold text-slate-800 focus:bg-white focus:border-bhutan-maroon/20 focus:ring-4 focus:ring-bhutan-maroon/5 transition-all outline-none appearance-none" 
                  required
                >
                  <option value={0}>Choose an item...</option>
                  {items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.code})</option>)}
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Barcode Value *</label>
                <input 
                  type="text" 
                  value={formData.barcode} 
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })} 
                  className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-[24px] text-sm font-mono font-bold text-slate-800 focus:bg-white focus:border-bhutan-maroon/20 focus:ring-4 focus:ring-bhutan-maroon/5 transition-all outline-none" 
                  required 
                  placeholder="Scan item or type barcode..." 
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)} 
                  className="flex-1 py-4 border-2 border-slate-100 rounded-[24px] hover:bg-slate-50 font-black text-sm text-slate-600 transition-all active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-4 bg-bhutan-maroon text-white rounded-[24px] hover:bg-bhutan-maroon-dark font-black text-sm shadow-xl shadow-bhutan-maroon/20 transition-all active:scale-[0.98]"
                >
                  Save Mapping
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
