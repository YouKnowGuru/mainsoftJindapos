import { useState, useEffect } from 'react';
import { Building2, Search, Plus, Trash2, Download } from 'lucide-react';
import { useAppStore } from '../store/appStore';

export function BranchPage() {
  const { showNotification } = useAppStore();
  const [branches, setBranches] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', code: '', address: '', phone: '', email: '' });

  useEffect(() => { loadBranches(); }, []);

  const loadBranches = async () => {
    const api = window.electronSecureAPI;
    if (!api?.branches) { setBranches([]); return; }
    try { const result = await api.branches.getAll(); if (result?.success) setBranches(result.data || []); else setBranches([]); } catch { setBranches([]); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) { showNotification('Name and code required', 'error'); return; }
    try {
      const result = await window.electronSecureAPI.branches?.create(formData);
      if (result?.success) { showNotification('Branch created', 'success'); setShowAddModal(false); loadBranches(); setFormData({ name: '', code: '', address: '', phone: '', email: '' }); }
    } catch { showNotification('Failed to create', 'error'); }
  };

  const filteredBranches = branches.filter(b => b.name?.toLowerCase().includes(searchQuery.toLowerCase()) || b.code?.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-3xl font-bold text-slate-800">Branches</h1><p className="text-slate-500">Manage multiple business locations</p></div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 rounded-xl hover:bg-slate-200 text-sm font-bold text-slate-600"><Download className="w-4 h-4" /> Export</button>
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-bhutan-maroon text-white rounded-xl hover:bg-bhutan-maroon-dark text-sm font-bold shadow-lg shadow-bhutan-maroon/20"><Plus className="w-4 h-4" /> Add Branch</button>
        </div>
      </div>

      <div className="flex items-center gap-4"><div className="relative flex-1"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" /><input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium" placeholder="Search branches..." /></div></div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {filteredBranches.length === 0 ? (
          <div className="text-center py-24 bg-slate-50/30"><Building2 className="w-12 h-12 text-slate-200 mx-auto mb-4" /><p className="text-slate-400 font-black uppercase tracking-[0.2em] text-sm">No branches configured</p></div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full"><thead className="bg-slate-50"><tr>
              <th className="text-left py-4 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Code</th>
              <th className="text-left py-4 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Name</th>
              <th className="text-left py-4 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Address</th>
              <th className="text-left py-4 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Phone</th>
              <th className="text-left py-4 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Email</th>
              <th className="text-center py-4 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Actions</th>
            </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBranches.map((b: any) => (
                  <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 text-sm font-mono font-bold text-slate-800">{b.code}</td>
                    <td className="py-4 px-6 text-sm font-bold text-slate-800">{b.name}</td>
                    <td className="py-4 px-6 text-sm text-slate-600">{b.address || '-'}</td>
                    <td className="py-4 px-6 text-sm text-slate-600">{b.phone || '-'}</td>
                    <td className="py-4 px-6 text-sm text-slate-600">{b.email || '-'}</td>
                    <td className="py-4 px-6 text-center"><button onClick={async () => { if (confirm('Deactivate?')) { await window.electronSecureAPI.branches?.delete(b.id); loadBranches(); } }} className="p-2 text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button></td>
                  </tr>
                ))}
              </tbody></table>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3"><div className="p-2 bg-bhutan-maroon/10 text-bhutan-maroon rounded-lg"><Building2 className="w-6 h-6" /></div><div><h3 className="text-xl font-bold text-slate-800">Add Branch</h3><p className="text-sm text-slate-500">New business location</p></div></div>
              <button onClick={() => setShowAddModal(false)} className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg"><Plus className="w-5 h-5 rotate-45" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5"><label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Name *</label><input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium" required placeholder="Branch name" /></div>
                <div className="space-y-1.5"><label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Code *</label><input type="text" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold" required placeholder="BR01" maxLength={10} /></div>
              </div>
              <div className="space-y-1.5"><label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Address</label><input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium" placeholder="Full address" /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5"><label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Phone</label><input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium" placeholder="+975..." /></div>
                <div className="space-y-1.5"><label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Email</label><input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium" placeholder="branch@email.com" /></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 border-2 border-slate-200 rounded-xl hover:bg-slate-50 font-bold text-slate-600">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-bhutan-maroon text-white rounded-xl hover:bg-bhutan-maroon-dark font-bold shadow-lg shadow-bhutan-maroon/20">Create Branch</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
