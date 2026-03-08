import { useState, useEffect, useRef } from 'react';
import { Search, Plus, Minus, Trash2, User, X, ShoppingCart, Check } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import type { Item, Contact, CartItem, PrintInvoiceData, PaymentMode } from '../types';
import { PrintPreviewModal } from '../components/PrintPreviewModal';
import { Button } from '../components/ui/button';
import { Printer } from 'lucide-react';

/**
 * POSPage Component - Point of Sale interface
 */
export function POSPage() {
  const { showNotification } = useAppStore();

  // State
  const [items, setItems] = useState<Item[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Item[]>([]);
  const [customers, setCustomers] = useState<Contact[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Contact | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<any>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [printData, setPrintData] = useState<PrintInvoiceData | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load data on mount
  useEffect(() => {
    loadDefaults();
    loadItems();
    loadCustomers();
    searchInputRef.current?.focus();
  }, []);

  const loadDefaults = async () => {
    try {
      const defaults = await window.electronAPI.settings.getSmartDefaults();
      if (defaults) {
        if (defaults.defaultPaymentMode) {
          setPaymentMode(defaults.defaultPaymentMode);
        }
      }
    } catch (error) {
      console.error('Failed to load defaults', error);
    }
  };

  // Search items when query changes
  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchItems();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const loadItems = async () => {
    try {
      const result = await window.electronAPI.pos.getItems();
      if (result) setItems(result);
    } catch (error) {
      showNotification('Failed to load items', 'error');
    }
  };

  const loadCustomers = async () => {
    try {
      const result = await window.electronAPI.pos.getCustomers();
      if (result) setCustomers(result);
    } catch (error) {
      showNotification('Failed to load customers', 'error');
    }
  };

  const searchItems = async () => {
    try {
      const result = await window.electronAPI.pos.searchItems(searchQuery);
      if (result) setSearchResults(result);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const addToCart = (item: Item) => {
    const existingItem = cart.find(c => c.itemId === item.id);

    if (existingItem) {
      if (existingItem.quantity >= item.quantityInStock) {
        showNotification(`Only ${item.quantityInStock} items in stock`, 'error');
        return;
      }

      setCart(cart.map(c => {
        if (c.itemId === item.id) {
          const newQuantity = c.quantity + 1;
          const lineSubtotal = newQuantity * c.unitPrice;
          const lineGst = (lineSubtotal * c.gstRate) / 100;
          return { ...c, quantity: newQuantity, gstAmount: lineGst, total: lineSubtotal + lineGst };
        }
        return c;
      }));
    } else {
      const gstAmount = item.gstApplicable
        ? (item.sellingPrice * item.gstRate / 100)
        : 0;

      setCart([...cart, {
        itemId: item.id,
        name: item.name,
        quantity: 1,
        unitPrice: item.sellingPrice,
        gstRate: item.gstRate,
        gstAmount,
        total: item.sellingPrice + gstAmount,
      }]);
    }

    setSearchQuery('');
    setSearchResults([]);
    searchInputRef.current?.focus();
  };

  const updateQuantity = (itemId: number, delta: number) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    setCart(cart.map(c => {
      if (c.itemId === itemId) {
        const newQuantity = c.quantity + delta;
        if (newQuantity <= 0) return c;
        if (newQuantity > item.quantityInStock) {
          showNotification(`Only ${item.quantityInStock} items in stock`, 'error');
          return c;
        }
        const lineSubtotal = newQuantity * c.unitPrice;
        const lineGst = (lineSubtotal * c.gstRate) / 100;
        return { ...c, quantity: newQuantity, gstAmount: lineGst, total: lineSubtotal + lineGst };
      }
      return c;
    }));
  };

  const removeFromCart = (itemId: number) => {
    setCart(cart.filter(c => c.itemId !== itemId));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
    setDiscountAmount(0);
    setPaymentMode('cash');
  };

  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const totalGst = cart.reduce((sum, item) => {
      const perUnitGst = (item.unitPrice * item.gstRate) / 100;
      return sum + (item.quantity * perUnitGst);
    }, 0);
    const total = subtotal + totalGst - discountAmount;
    return { subtotal, gstAmount: totalGst, total };
  };

  const processSale = async () => {
    if (cart.length === 0) {
      showNotification('Cart is empty', 'error');
      return;
    }

    if (paymentMode === 'credit' && !selectedCustomer) {
      showNotification('Please select a customer for credit sale', 'error');
      return;
    }

    setIsProcessing(true);

    try {
      const saleData = {
        customerId: selectedCustomer?.id,
        items: cart.map(item => ({
          itemId: item.itemId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          gstRate: item.gstRate,
        })),
        paymentMode,
        discountAmount,
        notes: '',
      };

      const result = await window.electronAPI.pos.createSale(saleData);

      if (result.success) {
        showNotification('Sale completed successfully', 'success');
        const invoice = result.data?.invoice;
        setLastInvoice(invoice);

        // Prepare print data for preview
        if (invoice) {
          try {
            const settings = await window.electronAPI.settings.get();
            const mappedPrintData: PrintInvoiceData = {
              invoiceNo: invoice.invoice_no,
              date: invoice.date,
              businessName: settings?.company_name || 'My Business',
              businessAddress: settings?.address,
              businessPhone: settings?.phone,
              businessEmail: settings?.email,
              businessWebsite: settings?.website,
              businessTagline: settings?.tagline,
              businessLogo: settings?.company_logo,
              taxNo: settings?.tax_no,
              tradeLicenseNo: settings?.trade_license_no,
              customerName: selectedCustomer?.name,
              customerAddress: selectedCustomer?.address,
              customerPhone: selectedCustomer?.phone,
              customerGst: selectedCustomer?.gstNumber,
              items: cart.map(item => ({
                description: item.name,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                gstRate: item.gstRate,
                gstAmount: item.gstAmount,
                total: item.total
              })),
              subtotal,
              gstAmount,
              discountAmount,
              totalAmount: total,
              paymentMode,
              amountPaid: paymentMode === 'credit' ? 0 : total,
              balanceDue: paymentMode === 'credit' ? total : 0,
              terms: 'Goods once sold will not be taken back.',
              notes: ''
            };
            setPrintData(mappedPrintData);
          } catch (err) {
            console.error('Failed to prepare print data:', err);
          }
        }

        setShowReceipt(true);
        clearCart();
        loadItems();
      } else {
        showNotification(result.message || 'Sale failed', 'error');
      }
    } catch (error: any) {
      showNotification(error.message || 'Sale failed', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'BTN',
      minimumFractionDigits: 2,
    }).format(amount).replace('BTN', 'Nu.');
  };

  const { subtotal, gstAmount, total } = calculateTotals();

  return (
    <div className="h-full flex gap-6 overflow-hidden">
      {/* Left Panel - Product Selection */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products by name or code..."
            className="w-full pl-10 pr-4 py-4 border-gray-200 rounded-2xl focus:ring-2 focus:ring-bhutan-maroon focus:border-transparent shadow-sm bg-white"
          />

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl z-20 max-h-64 overflow-auto animate-in fade-in slide-in-from-top-2 duration-200">
              {searchResults.map((item) => (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 group"
                >
                  <div className="text-left">
                    <p className="font-bold text-slate-800 group-hover:text-bhutan-maroon transition-colors">{item.name}</p>
                    <p className="text-xs text-slate-400 font-medium tracking-wide">STOCK: {item.quantityInStock}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-bhutan-maroon">{formatCurrency(item.sellingPrice)}</p>
                    <p className="text-xs text-slate-400 uppercase font-bold">+{item.gstRate}% GST</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quick Products Grid */}
        <div className="flex-1 overflow-auto">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Quick Select</h3>
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {items.slice(0, 20).map((item) => (
              <button
                key={item.id}
                onClick={() => addToCart(item)}
                disabled={item.quantityInStock <= 0}
                className={`p-4 rounded-2xl border text-left transition-all duration-300 relative overflow-hidden group ${item.quantityInStock <= 0
                  ? 'bg-slate-50 border-slate-100 opacity-50 cursor-not-allowed'
                  : 'bg-white border-slate-100 hover:border-bhutan-gold hover:shadow-xl hover:shadow-bhutan-gold/10 hover:-translate-y-1'
                  }`}
              >
                <div className="relative z-10">
                  <p className="font-bold text-sm text-slate-800 truncate mb-1 group-hover:text-bhutan-maroon transition-colors">{item.name}</p>
                  <p className="text-bhutan-maroon font-bold text-base">{formatCurrency(item.sellingPrice)}</p>
                  <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-tight">Stock: {item.quantityInStock}</p>
                </div>
                {!item.quantityInStock && (
                  <div className="absolute top-0 right-0 p-1">
                    <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Cart */}
      <div className="w-96 bg-white rounded-3xl shadow-2xl shadow-slate-200 flex flex-col border border-slate-50 relative overflow-hidden h-full">
        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-6 border-b border-slate-50 bg-slate-50/30">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-bhutan-maroon" />
                Your Cart <span className="text-xs bg-bhutan-maroon text-white px-2 py-0.5 rounded-full">{cart.length}</span>
              </h3>
              {cart.length > 0 && (
                <button onClick={clearCart} className="text-red-500 hover:text-red-700 text-xs font-bold uppercase tracking-wider">
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-auto p-4">
            {cart.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Cart is empty</p>
                <p className="text-sm">Search or click products to add</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={item.itemId} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-medium text-sm">{item.name}</p>
                      <button onClick={() => removeFromCart(item.itemId)} className="text-red-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQuantity(item.itemId, -1)} className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center hover:bg-gray-300">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.itemId, 1)} className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center hover:bg-gray-300">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="font-medium">{formatCurrency(item.total)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Customer Selection */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={() => setShowCustomerModal(true)}
              className="w-full flex items-center justify-between p-3 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-gray-400" />
                <span>{selectedCustomer ? selectedCustomer.name : 'Select Customer (Optional)'}</span>
              </div>
              {selectedCustomer && (
                <button onClick={(e) => { e.stopPropagation(); setSelectedCustomer(null); }} className="text-red-400 hover:text-red-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </button>
          </div>

          {/* Payment Mode Selection */}
          <div className="p-4 border-t border-slate-50">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Select Payment Method</p>

            <div className="grid grid-cols-2 gap-2 mb-2">
              {/* Primary Modes */}
              <button
                onClick={() => setPaymentMode('cash')}
                className={`flex items-center justify-center p-3 rounded-xl border-2 transition-all font-bold text-xs uppercase tracking-wider ${paymentMode === 'cash'
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm'
                  : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200'}`}
              >
                Cash
              </button>
              <button
                onClick={() => setPaymentMode('card')}
                className={`flex items-center justify-center p-3 rounded-xl border-2 transition-all font-bold text-xs uppercase tracking-wider ${paymentMode === 'card'
                  ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm'
                  : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200'}`}
              >
                Card
              </button>
            </div>

            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest my-3">Digital Scan & Pay (Bhutan Banks)</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setPaymentMode('mBOB')}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all ${paymentMode === 'mBOB'
                  ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-sm scale-105 z-10'
                  : 'bg-white border-slate-100 text-slate-500 hover:border-blue-200'}`}
              >
                <span className="text-[10px] font-black">mBOB</span>
              </button>
              <button
                onClick={() => setPaymentMode('BNB')}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all ${paymentMode === 'BNB'
                  ? 'bg-yellow-50 border-yellow-600 text-yellow-700 shadow-sm scale-105 z-10'
                  : 'bg-white border-slate-100 text-slate-500 hover:border-yellow-200'}`}
              >
                <span className="text-[10px] font-black">BNB Pay</span>
              </button>
              <button
                onClick={() => setPaymentMode('TPay')}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all ${paymentMode === 'TPay'
                  ? 'bg-red-50 border-red-600 text-red-700 shadow-sm scale-105 z-10'
                  : 'bg-white border-slate-100 text-slate-500 hover:border-red-200'}`}
              >
                <span className="text-[10px] font-black">T-Pay</span>
              </button>
              <button
                onClick={() => setPaymentMode('DrukPNB')}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all ${paymentMode === 'DrukPNB'
                  ? 'bg-purple-50 border-purple-600 text-purple-700 shadow-sm scale-105 z-10'
                  : 'bg-white border-slate-100 text-slate-500 hover:border-purple-200'}`}
              >
                <span className="text-[10px] font-black">PNB</span>
              </button>
              <button
                onClick={() => setPaymentMode('BDBL')}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all ${paymentMode === 'BDBL'
                  ? 'bg-emerald-50 border-emerald-600 text-emerald-700 shadow-sm scale-105 z-10'
                  : 'bg-white border-slate-100 text-slate-500 hover:border-emerald-200'}`}
              >
                <span className="text-[10px] font-black">BDBL</span>
              </button>
              <button
                onClick={() => setPaymentMode('DKBank')}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all ${paymentMode === 'DKBank'
                  ? 'bg-cyan-50 border-cyan-500 text-cyan-600 shadow-sm scale-105 z-10'
                  : 'bg-white border-slate-100 text-slate-500 hover:border-cyan-200'}`}
              >
                <span className="text-[10px] font-black">DKid</span>
              </button>
            </div>

            <div className="mt-3">
              <button
                onClick={() => setPaymentMode('credit')}
                className={`w-full flex items-center justify-center p-3 rounded-xl border-2 transition-all font-bold text-xs uppercase tracking-wider ${paymentMode === 'credit'
                  ? 'bg-bhutan-orange/10 border-bhutan-orange text-bhutan-orange shadow-sm'
                  : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200'}`}
              >
                Credit (On Account)
              </button>
            </div>
          </div>

          {/* Totals */}
          <div className="p-6 border-t border-slate-50 bg-slate-50/50">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between font-medium text-slate-500">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between font-medium text-slate-500">
                <span>GST (5%)</span>
                <span>{formatCurrency(gstAmount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-500">Discount</span>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Nu.</span>
                  <input
                    type="number"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(Number(e.target.value))}
                    className="w-28 text-right pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-bhutan-gold transition-all font-bold"
                    min={0}
                  />
                </div>
              </div>
              <div className="flex justify-between text-2xl font-black pt-4 border-t border-slate-100 text-slate-900">
                <span>Total</span>
                <span className="text-bhutan-maroon">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          {/* Fixed Footer - Checkout Button */}
          <div className="p-6 border-t border-slate-50 bg-white">
            <button
              onClick={processSale}
              disabled={cart.length === 0 || isProcessing}
              className="w-full bg-bhutan-maroon text-white py-5 rounded-2xl font-bold text-lg hover:bg-bhutan-maroon-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-xl shadow-bhutan-maroon/20 hover:shadow-bhutan-maroon/30 transition-all active:scale-95 group"
            >
              {isProcessing ? (
                <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>Processing...</>
              ) : (
                <><Check className="w-6 h-6 group-hover:scale-110 transition-transform" />Complete Sale</>
              )}
            </button>
          </div>
        </div>

        {/* Customer Selection Modal */}
        {showCustomerModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Select Customer</h3>
                <button onClick={() => setShowCustomerModal(false)}><X className="w-5 h-5" /></button>
              </div>
              <div className="max-h-64 overflow-auto">
                {customers.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => { setSelectedCustomer(customer); setShowCustomerModal(false); }}
                    className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                  >
                    <p className="font-medium">{customer.name}</p>
                    <p className="text-sm text-gray-500">{customer.phone}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Receipt Modal */}
        {showReceipt && lastInvoice && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl w-full max-w-sm p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Check className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-xl font-semibold">Sale Completed!</h3>
                <p className="text-gray-500">Invoice: {lastInvoice.invoice_no}</p>
              </div>
              <div className="space-y-3">
                <Button
                  onClick={() => setShowPrintPreview(true)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 py-6 h-auto"
                >
                  <Printer className="w-5 h-5" />
                  Print Invoice
                </Button>
                <button
                  onClick={() => setShowReceipt(false)}
                  className="w-full py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        <PrintPreviewModal
          isOpen={showPrintPreview}
          onClose={() => setShowPrintPreview(false)}
          data={printData}
        />
      </div>
    </div>
  );
}
