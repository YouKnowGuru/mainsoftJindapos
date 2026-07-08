import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Trash2,
  Package,
  AlertTriangle,
  TrendingUp,
  Edit2
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import type { Item, ItemCategory, ItemUnit } from '../types';

export function InventoryPage() {
  const { showNotification } = useAppStore();
  const [items, setItems] = useState<Item[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [lowStockItems, setLowStockItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [units, setUnits] = useState<ItemUnit[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newUnitName, setNewUnitName] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    category: '',
    unit: 'pcs',
    purchasePrice: 0,
    sellingPrice: 0,
    reorderLevel: 10,
    gstApplicable: true,
    gstRate: 5,
    openingStock: 0,
    openingPurchasePrice: 0,
    totalInitialValue: 0,
  });

  const [isProcessing, setIsProcessing] = useState(false);

  const [stockData, setStockData] = useState({
    quantity: 1,
    purchasePrice: 0,
    sellingPrice: 0,
    supplierId: undefined as number | undefined,
    paymentMode: 'cash' as 'cash' | 'bank' | 'credit',
    reference: '',
    notes: '',
    totalAmount: 0,
  });

  useEffect(() => {
    loadDefaults();
    loadItems();
    loadLowStock();
    loadCategories();
    loadUnits();
  }, []);

  const loadDefaults = async () => {
    try {
      const res = await window.electronSecureAPI.settings.getSmartDefaults();
      if (res?.success && res.data) {
        const defaults = res.data;
        if (defaults.defaultPaymentMode) {
          setStockData(prev => ({ ...prev, paymentMode: defaults.defaultPaymentMode }));
        }
        if (defaults.defaultGstRate !== undefined) {
          setFormData(prev => ({ ...prev, gstRate: defaults.defaultGstRate }));
        }
      }
    } catch (error) {
      console.error('Failed to load smart defaults', error);
    }
  };

  const loadCategories = async () => {
    try {
      const result = await window.electronSecureAPI.inventory.getCategories();
      if (result?.success) setCategories(result.data || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadUnits = async () => {
    try {
      const result = await window.electronSecureAPI.inventory.getUnits();
      if (result?.success) setUnits(result.data || []);
    } catch (error) {
      console.error('Failed to load units:', error);
    }
  };

  const loadItems = async () => {
    try {
      const result = await window.electronSecureAPI.inventory.getItems();
      if (result?.success) {
        setItems(Array.isArray(result.data) ? result.data : []);
      }
    } catch (error) {
      showNotification('Failed to load items', 'error');
    }
  };

  const loadLowStock = async () => {
    try {
      const result = await window.electronSecureAPI.inventory.getLowStock();
      if (result?.success) {
        setLowStockItems(Array.isArray(result.data) ? result.data : []);
      }
    } catch (error) {
      console.error('Failed to load low stock items:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const result = isEditing && selectedItem
        ? await window.electronSecureAPI.inventory.updateItem(selectedItem.id, {
          name: formData.name,
          description: formData.description,
          category: formData.category,
          unit: formData.unit,
          purchasePrice: formData.purchasePrice,
          sellingPrice: formData.sellingPrice,
          reorderLevel: formData.reorderLevel,
          gstApplicable: formData.gstApplicable,
          gstRate: formData.gstRate,
        })
        : await window.electronSecureAPI.inventory.createItem({
          name: formData.name,
          description: formData.description,
          category: formData.category,
          unit: formData.unit,
          purchasePrice: formData.purchasePrice,
          sellingPrice: formData.sellingPrice,
          reorderLevel: formData.reorderLevel,
          gstApplicable: formData.gstApplicable,
          gstRate: formData.gstRate,
          openingStock: formData.openingStock,
          openingPurchasePrice: formData.openingPurchasePrice,
        });

      if (result.success) {
        showNotification(isEditing ? 'Item updated successfully' : 'Item created successfully', 'success');
        setShowAddModal(false);
        setIsEditing(false);
        setSelectedItem(null);
        loadItems();
        resetForm();
      } else {
        showNotification(result.message || 'Failed to create item', 'error');
      }
    } catch (error: any) {
      showNotification(error.message || 'Failed to create item', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    setIsProcessing(true);
    try {
      const result = await window.electronSecureAPI.inventory.addStock({
        itemId: selectedItem.id,
        quantity: stockData.quantity,
        purchasePrice: stockData.purchasePrice || selectedItem.purchasePrice,
        sellingPrice: stockData.sellingPrice || selectedItem.sellingPrice,
        paymentMode: stockData.paymentMode,
        reference: stockData.reference,
        notes: stockData.notes,
      });

      if (result.success) {
        showNotification('Stock added successfully', 'success');
        setShowStockModal(false);
        loadItems();
        loadLowStock();
        resetStockForm();
      } else {
        showNotification(result.message || 'Failed to add stock', 'error');
      }
    } catch (error: any) {
      showNotification(error.message || 'Failed to add stock', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEdit = (item: Item) => {
    setSelectedItem(item);
    setFormData({
      name: item.name,
      code: item.code || '',
      description: item.description || '',
      category: item.category || '',
      unit: item.unit || 'pcs',
      purchasePrice: item.purchasePrice,
      sellingPrice: item.sellingPrice,
      reorderLevel: item.reorderLevel,
      gstApplicable: item.gstApplicable,
      gstRate: item.gstRate,
      openingStock: item.quantityInStock,
      openingPurchasePrice: item.purchasePrice,
      totalInitialValue: item.quantityInStock * item.purchasePrice,
    });
    setIsEditing(true);
    setShowAddModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const result = await window.electronSecureAPI.inventory.deleteItem(id);
      if (result.success) {
        showNotification('Item deleted successfully', 'success');
        loadItems();
      } else {
        showNotification(result.message || 'Failed to delete item', 'error');
      }
    } catch (error: any) {
      showNotification(error.message || 'Failed to delete item', 'error');
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName) return;
    try {
      const result = await window.electronSecureAPI.inventory.createCategory(newCategoryName);
      if (result.success) {
        showNotification('Category added', 'success');
        setNewCategoryName('');
        setShowCategoryModal(false);
        loadCategories();
        setFormData({ ...formData, category: result.data.name });
      } else {
        showNotification(result.message || 'Failed to add category', 'error');
      }
    } catch (error: any) {
      showNotification(error.message || 'Failed to add category', 'error');
    }
  };

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnitName) return;
    try {
      const result = await window.electronSecureAPI.inventory.createUnit(newUnitName);
      if (result.success) {
        showNotification('Unit added', 'success');
        setNewUnitName('');
        setShowUnitModal(false);
        loadUnits();
        setFormData({ ...formData, unit: result.data.name });
      } else {
        showNotification(result.message || 'Failed to add unit', 'error');
      }
    } catch (error: any) {
      showNotification(error.message || 'Failed to add unit', 'error');
    }
  };

  const handleUpdateForm = (updates: Partial<typeof formData>) => {
    const nextForm = { ...formData, ...updates };

    // Auto-calculate logic: Quantity * Unit Cost = Total Value
    if ('openingStock' in updates || 'openingPurchasePrice' in updates) {
      nextForm.totalInitialValue = parseFloat((nextForm.openingStock * nextForm.openingPurchasePrice).toFixed(2));
    } else if ('totalInitialValue' in updates) {
      if (nextForm.openingStock > 0) {
        nextForm.openingPurchasePrice = parseFloat((nextForm.totalInitialValue / nextForm.openingStock).toFixed(2));
      }
    }

    setFormData(nextForm);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      category: '',
      unit: 'pcs',
      purchasePrice: 0,
      sellingPrice: 0,
      reorderLevel: 10,
      gstApplicable: true,
      gstRate: 5,
      openingStock: 0,
      openingPurchasePrice: 0,
      totalInitialValue: 0,
    });
  };

  const resetStockForm = () => {
    setStockData({
      quantity: 1,
      purchasePrice: 0,
      sellingPrice: 0,
      supplierId: undefined,
      paymentMode: 'cash',
      reference: '',
      notes: '',
      totalAmount: 0,
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'BTN',
      minimumFractionDigits: 2,
    }).format(amount).replace('BTN', 'Nu.');
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <div className="bg-gradient-to-r from-red-50 to-white border border-red-100 rounded-2xl p-6 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-3xl -mr-16 -mt-16"></div>
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <div className="p-2 bg-red-100 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Low Stock Warning</h3>
              <p className="text-xs text-slate-500 font-medium">{lowStockItems.length} items are below reorder level</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 relative z-10">
            {lowStockItems.slice(0, 8).map((item) => (
              <span key={item.id} className="bg-white text-red-600 text-xs font-black uppercase tracking-tight px-3 py-1.5 rounded-xl border border-red-100 shadow-sm">
                {item.name} <span className="text-slate-400 ml-1">•</span> {item.quantityInStock} left
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-xl group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-bhutan-maroon transition-colors" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search inventory by name, code or category..."
            className="w-full pl-12 pr-4 py-4 bg-white border-slate-100 rounded-2xl focus:ring-2 focus:ring-bhutan-maroon/20 focus:border-bhutan-maroon transition-all shadow-sm font-medium"
          />
        </div>
        <button
          onClick={() => {
            setIsEditing(false);
            setSelectedItem(null);
            resetForm();
            setShowAddModal(true);
          }}
          className="flex items-center gap-3 bg-bhutan-maroon text-white px-8 py-4 rounded-2xl hover:bg-bhutan-maroon-dark transition-all shadow-lg shadow-bhutan-maroon/10 active:scale-95 font-bold uppercase tracking-widest text-xs"
        >
          <Plus className="w-5 h-5" />
          Add New Item
        </button>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-[32px] shadow-2xl shadow-slate-200/50 overflow-hidden border border-slate-50">
        <div className="overflow-x-auto w-full">
          <table className="w-full">
            <thead>
            <tr className="bg-slate-50/50">
              <th className="text-left py-5 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Item Description</th>
              <th className="text-left py-5 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Code</th>
              <th className="text-right py-5 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Stock Level</th>
              <th className="text-right py-5 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Purchase</th>
              <th className="text-right py-5 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Selling</th>
              <th className="text-center py-5 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Taxation</th>
              <th className="text-center py-5 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredItems.map((item) => (
              <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors">
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-bhutan-maroon/5 group-hover:text-bhutan-maroon transition-colors">
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 group-hover:text-bhutan-maroon transition-colors">{item.name}</p>
                      {item.category && (
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">{item.category}</p>
                      )}
                      {item.description && (
                        <p className="text-[10px] text-slate-400 italic line-clamp-1">{item.description}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-4 px-6 text-sm font-medium text-slate-500">{item.code || '-'}</td>
                <td className="py-4 px-6 text-right">
                  <div className="flex flex-col items-end">
                    <span className={`text-sm font-black ${item.quantityInStock <= item.reorderLevel
                      ? 'text-red-500'
                      : 'text-slate-700'
                      }`}>
                      {item.quantityInStock} {item.unit}
                    </span>
                    {item.quantityInStock <= item.reorderLevel && (
                      <span className="text-xs font-black text-red-400 uppercase tracking-tighter">Low Stock</span>
                    )}
                  </div>
                </td>
                <td className="py-4 px-6 text-right text-sm font-bold text-slate-600">
                  {formatCurrency(item.purchasePrice)}
                </td>
                <td className="py-4 px-6 text-right text-sm font-bold text-bhutan-maroon">
                  {formatCurrency(item.sellingPrice)}
                </td>
                <td className="py-4 px-6 text-center">
                  {item.gstApplicable ? (
                    <span className="bg-bhutan-gold/10 text-bhutan-gold text-xs font-black px-2.5 py-1 rounded-lg uppercase tracking-wider border border-bhutan-gold/20">
                      {item.gstRate}% GST
                    </span>
                  ) : (
                    <span className="bg-slate-100 text-slate-400 text-xs font-black px-2.5 py-1 rounded-lg uppercase tracking-wider">
                      Tax Exempt
                    </span>
                  )}
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => {
                        setSelectedItem(item);
                        setStockData({
                          ...stockData,
                          purchasePrice: item.purchasePrice,
                          sellingPrice: item.sellingPrice,
                          totalAmount: item.purchasePrice * stockData.quantity
                        });
                        setShowStockModal(true);
                      }}
                      className="p-2 text-bhutan-orange hover:bg-bhutan-orange/10 rounded-xl transition-colors"
                      title="Add Stock"
                    >
                      <TrendingUp className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-colors"
                      title="Edit Item"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-20 bg-slate-50/30">
            <div className="inline-flex p-6 rounded-[32px] bg-white shadow-sm mb-4">
              <Package className="w-12 h-12 text-slate-200" />
            </div>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No matching inventory found</p>
          </div>
        )}
      </div>

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[40px] w-full max-w-2xl p-10 max-h-[90vh] overflow-auto shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-300">
            <div className="mb-8">
              <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-2">{isEditing ? 'Edit Item' : 'Create New Item'}</h3>
              <p className="text-sm text-slate-400 font-medium">{isEditing ? 'Modify existing item details' : 'Add a new product to your Bhutanese inventory system'}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 space-y-2">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Item Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-bhutan-maroon/20 focus:bg-white transition-all font-bold text-slate-800"
                    placeholder="Enter item name..."
                    required
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Detailed Description (Optional)</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-5 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-bhutan-maroon/20 focus:bg-white transition-all font-bold text-slate-800 resize-none h-20"
                    placeholder="Enter detailed description for invoices..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Barcode / SKU</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-bhutan-maroon/20 focus:bg-white transition-all font-bold text-slate-800"
                    placeholder="Optional code"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Category</label>
                  <div className="flex gap-2">
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="flex-1 px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-bhutan-maroon/20 focus:bg-white transition-all font-bold text-slate-800 appearance-none cursor-pointer"
                    >
                      <option value="">Select Category</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowCategoryModal(true)}
                      className="p-4 bg-slate-100 hover:bg-bhutan-maroon/10 text-bhutan-maroon rounded-2xl transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Stock Unit</label>
                  <div className="flex gap-2">
                    <select
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="flex-1 px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-bhutan-maroon/20 focus:bg-white transition-all font-bold text-slate-800 appearance-none cursor-pointer"
                    >
                      {units.map(u => (
                        <option key={u.id} value={u.name}>{u.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowUnitModal(true)}
                      className="p-4 bg-slate-100 hover:bg-bhutan-maroon/10 text-bhutan-maroon rounded-2xl transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Reorder Level</label>
                  <input
                    type="number"
                    value={formData.reorderLevel}
                    onChange={(e) => setFormData({ ...formData, reorderLevel: Number(e.target.value) })}
                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-bhutan-maroon/20 focus:bg-white transition-all font-bold text-slate-800"
                    min={0}
                  />
                </div>
              </div>

              {!isEditing && (
                <div className="p-8 bg-bhutan-maroon/5 rounded-[32px] border border-bhutan-maroon/10 space-y-6">
                  <p className="text-xs font-black text-bhutan-maroon uppercase tracking-[0.2em]">Initial Opening Stock</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Quantity</label>
                      <input
                        type="number"
                        value={formData.openingStock}
                        onChange={(e) => handleUpdateForm({ openingStock: Number(e.target.value) })}
                        className="w-full px-4 py-3 bg-white border-none rounded-xl focus:ring-2 focus:ring-bhutan-maroon/20 font-bold text-slate-800"
                        min={0}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Unit Cost (Nu.)</label>
                      <input
                        type="number"
                        value={formData.openingPurchasePrice}
                        onChange={(e) => handleUpdateForm({ openingPurchasePrice: Number(e.target.value) })}
                        className="w-full px-4 py-3 bg-white border-none rounded-xl focus:ring-2 focus:ring-bhutan-maroon/20 font-bold text-slate-800"
                        min={0}
                        step={0.01}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Total Valuation</label>
                      <input
                        type="number"
                        value={formData.totalInitialValue}
                        onChange={(e) => handleUpdateForm({ totalInitialValue: Number(e.target.value) })}
                        className="w-full px-4 py-3 bg-bhutan-maroon text-white border-none rounded-xl focus:ring-2 focus:ring-bhutan-maroon/20 font-black"
                        min={0}
                        step={0.01}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Selling Price (Nu.) *</label>
                  <input
                    type="number"
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: Number(e.target.value) })}
                    className="w-full px-5 py-4 bg-slate-900 text-bhutan-gold border-none rounded-2xl focus:ring-2 focus:ring-bhutan-gold/50 text-xl font-black"
                    min={0}
                    step={0.01}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">GST Compliance</label>
                  <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl h-[60px]">
                    <input
                      type="number"
                      value={formData.gstRate}
                      onChange={(e) => setFormData({ ...formData, gstRate: Number(e.target.value) })}
                      className="w-16 bg-transparent border-none focus:ring-0 font-bold text-slate-800"
                      min={0}
                      max={100}
                    />
                    <span className="text-slate-400 font-bold">%</span>
                    <label className="ml-auto inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.gstApplicable}
                        onChange={(e) => setFormData({ ...formData, gstApplicable: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-bhutan-orange"></div>
                      <span className="ms-3 text-xs font-black text-slate-500 uppercase">Taxable</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-4 text-slate-400 font-bold uppercase tracking-widest text-xs hover:text-slate-600 transition-colors"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="flex-[2] py-4 bg-bhutan-maroon text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-bhutan-maroon-dark shadow-xl shadow-bhutan-maroon/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isProcessing ? 'Saving...' : (isEditing ? 'Update Item' : 'Confirm & Save Item')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Stock Modal */}
      {showStockModal && selectedItem && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[40px] w-full max-w-lg p-10 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-300">
            <div className="mb-8">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2 truncate">Stock In: {selectedItem.name}</h3>
              <p className="text-sm text-slate-400 font-medium">Add received quantity to existing inventory</p>
            </div>

            <form onSubmit={handleAddStock} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Receive Quantity *</label>
                <input
                  type="number"
                  value={stockData.quantity}
                  onChange={(e) => {
                    const qty = Number(e.target.value);
                    const price = stockData.purchasePrice || selectedItem.purchasePrice;
                    setStockData({
                      ...stockData,
                      quantity: qty,
                      totalAmount: qty * price
                    });
                  }}
                  className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-bhutan-maroon/20 font-bold text-slate-800"
                  min={1}
                  required
                />
              </div>

              <div className="p-6 bg-bhutan-maroon/5 rounded-3xl border border-bhutan-maroon/10 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-bhutan-maroon uppercase tracking-widest">Total Valuation</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-bhutan-maroon/60">Nu.</span>
                    <input
                      type="number"
                      value={stockData.totalAmount}
                      onChange={(e) => {
                        const total = Number(e.target.value);
                        const qty = stockData.quantity || 1;
                        setStockData({
                          ...stockData,
                          totalAmount: total,
                          purchasePrice: total / qty
                        });
                      }}
                      className="bg-transparent border-none focus:ring-0 text-xl font-black text-bhutan-maroon text-right w-32"
                      min={0}
                      step={0.01}
                    />
                  </div>
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-400">
                  <span>UNIT PURCHASE COST</span>
                  <span>{formatCurrency(stockData.purchasePrice || selectedItem.purchasePrice)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Selling Price</label>
                  <input
                    type="number"
                    value={stockData.sellingPrice || selectedItem.sellingPrice}
                    onChange={(e) => setStockData({ ...stockData, sellingPrice: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-bhutan-maroon/20 font-bold text-slate-800"
                    min={0}
                    step={0.01}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Payment Mode</label>
                  <select
                    value={stockData.paymentMode}
                    onChange={(e) => setStockData({ ...stockData, paymentMode: e.target.value as any })}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-bhutan-maroon/20 font-bold text-slate-800"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank">Bank</option>
                    <option value="credit">Credit</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Notes / Reference</label>
                <input
                  type="text"
                  value={stockData.reference}
                  onChange={(e) => setStockData({ ...stockData, reference: e.target.value })}
                  className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-bhutan-maroon/20 font-bold text-slate-800"
                  placeholder="Invoice # or Vendor name"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowStockModal(false)}
                  className="flex-1 py-4 text-slate-400 font-bold uppercase tracking-widest text-xs hover:text-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="flex-[2] py-4 bg-bhutan-orange text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-bhutan-orange-dark shadow-xl shadow-bhutan-orange/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isProcessing ? 'Updating...' : 'Increase Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-[32px] w-full max-w-sm p-8 shadow-2xl border border-white/20 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
              <div className="p-2 bg-bhutan-maroon/10 rounded-xl text-bhutan-maroon">
                <Plus className="w-5 h-5" />
              </div>
              New Category
            </h3>
            <form onSubmit={handleCreateCategory} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Category Name</label>
                <input
                  autoFocus
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-bhutan-maroon/20 font-bold text-slate-800"
                  placeholder="e.g. Beverages, Electronics..."
                  required
                />
              </div>
              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="flex-1 py-4 text-slate-400 font-bold uppercase tracking-widest text-xs hover:text-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-4 bg-bhutan-maroon text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-bhutan-maroon-dark shadow-lg shadow-bhutan-maroon/10 transition-all active:scale-95"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Unit Modal */}
      {showUnitModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-[32px] w-full max-w-sm p-8 shadow-2xl border border-white/20 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
              <div className="p-2 bg-bhutan-gold/10 rounded-xl text-bhutan-gold">
                <Plus className="w-5 h-5" />
              </div>
              New Unit
            </h3>
            <form onSubmit={handleCreateUnit} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Unit Name</label>
                <input
                  autoFocus
                  type="text"
                  value={newUnitName}
                  onChange={(e) => setNewUnitName(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-bhutan-gold/30 font-bold text-slate-800"
                  placeholder="e.g. kg, box, ltr, pcs..."
                  required
                />
              </div>
              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUnitModal(false)}
                  className="flex-1 py-4 text-slate-400 font-bold uppercase tracking-widest text-xs hover:text-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-4 bg-bhutan-gold text-bhutan-maroon rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-white border-2 border-transparent hover:border-bhutan-gold shadow-lg shadow-bhutan-gold/10 transition-all active:scale-95"
                >
                  Save Unit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
