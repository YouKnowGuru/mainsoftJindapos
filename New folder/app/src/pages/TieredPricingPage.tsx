import { useState, useEffect } from 'react';
import { DollarSign, Search, Plus, Trash2, Tag } from 'lucide-react';
import { useAppStore } from '../store/appStore';

export function TieredPricingPage() {
  const { showNotification } = useAppStore();
  const [priceLists, setPriceLists] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', customerType: '', items: [] as Array<{ itemId: number; price: number }> });

  useEffect(() => { loadPriceLists(); loadItems(); }, []);

  const loadPriceLists = async () => {
    const api = window.electronSecureAPI;
    if (!api?.tieredPricing) { setPriceLists([]); return; }
    try { const result = await api.tieredPricing.getAll(); if (result?.success) setPriceLists(result.data || []); else setPriceLists([]); } catch { setPriceLists([]); }
  };

  const loadItems = async () => {
    const api = window.electronSecureAPI;
    if (!api?.inventory) { setItems([]); return; }
    try { const result = await api.inventory.getItems(); if (result?.success) setItems(result.data || []); else setItems([]); } catch { setItems([]); }
  };

  const addItem = () => setFormData({ ...formData, items: [...formData.items, { itemId: 0, price: 0 }] });
  const updateItem = (idx: number, field: string, value: any) => { const n = [...formData.items]; (n[idx] as any)[field] = value; setFormData({ ...formData, items: n }); };
  const removeItem = (idx: number) => setFormData({ ...formData, items: formData.items.filter((_, i) => i !== idx) });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || formData.items.length === 0) { showNotification('Name and items required', 'error'); return; }
    try {
      const result = await window.electronSecureAPI.tieredPricing?.create(formData);
      if (result?.success) { showNotification('Price list created', 'success'); setShowAddModal(false); loadPriceLists(); setFormData({ name: '', customerType: '', items: [] }); }
    } catch { showNotification('Failed to create', 'error'); }
  };

  const filteredLists = priceLists.filter(p => p.name?.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-3xl font-bold text-slate-800">Tiered Pricing</h1><p className="text-slate-500">Wholesale, dealer, and custom price lists</p></div>
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-bhutan-maroon text-white rounded-xl hover:bg-bhutan-maroon-dark text-sm font-bold shadow-lg shadow-bhutan-maroon/20"><Plus className="w-4 h-4" /> New Price List</button>
      </div>

      <div className="flex items-center gap-4"><div className="relative flex-1"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" /><input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium" placeholder="Search price lists..." /></div></div>

      {filteredLists.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 text-center py-24"><DollarSign className="w-12 h-12 text-slate-200 mx-auto mb-4" /><p className="text-slate-400 font-black uppercase tracking-[0.2em] text-sm">No price lists created</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLists.map((pl: any) => (
            <div key={pl.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-5 border-b border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-slate-800">{pl.name}</h3>
                  <button onClick={async () => { await window.electronSecureAPI.tieredPricing?.delete(pl.id); loadPriceLists(); }} className="p-1.5 text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                </div>
                {pl.customerType && <span className="inline-flex px-2 py-0.5 bg-bhutan-gold/10 text-bhutan-maroon rounded-full text-xs font-bold">{pl.customerType}</span>}
                <p className="text-xs text-slate-500 mt-1">{pl.items?.length || 0} items</p>
              </div>
              <div className="p-4 max-h-48 overflow-y-auto">
                {pl.items?.slice(0, 10).map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between py-1.5 text-sm">
                    <span className="text-slate-700">{item.item_name}</span>
                    <span className="font-bold text-slate-800">Nu. {item.price.toFixed(2)}</span>
                  </div>
                ))}
                {(pl.items?.length || 0) > 10 && <p className="text-xs text-slate-400 text-center mt-2">+{pl.items.length - 10} more</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 sm:p-8 my-auto shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3"><div className="p-2 bg-bhutan-maroon/10 text-bhutan-maroon rounded-lg"><Tag className="w-6 h-6" /></div><div><h3 className="text-xl font-bold text-slate-800">New Price List</h3><p className="text-sm text-slate-500">Wholesale, dealer, or custom pricing</p></div></div>
              <button onClick={() => setShowAddModal(false)} className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg"><Plus className="w-5 h-5 rotate-45" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5"><label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Name *</label><input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium" required placeholder="Wholesale Prices" /></div>
                <div className="space-y-1.5"><label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Customer Type</label><input type="text" value={formData.customerType} onChange={(e) => setFormData({ ...formData, customerType: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium" placeholder="Wholesale, Dealer..." /></div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Items & Prices *</label>
                {formData.items.map((item, idx) => (
                  <div key={idx} className="flex gap-2 mb-2 items-center">
                    <select value={item.itemId || ''} onChange={(e) => updateItem(idx, 'itemId', Number(e.target.value))} className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"><option value={0}>Select item</option>{items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select>
                    <input type="number" value={item.price} onChange={(e) => updateItem(idx, 'price', Number(e.target.value))} className="w-28 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" min={0.01} step={0.01} placeholder="Price" />
                    <button type="button" onClick={() => removeItem(idx)} className="p-2 text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
                <button type="button" onClick={addItem} className="text-sm font-bold text-bhutan-maroon hover:underline">+ Add Item</button>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 border-2 border-slate-200 rounded-xl hover:bg-slate-50 font-bold text-slate-600">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-bhutan-maroon text-white rounded-xl hover:bg-bhutan-maroon-dark font-bold shadow-lg shadow-bhutan-maroon/20">Create Price List</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
