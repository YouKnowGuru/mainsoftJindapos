import { useState, useEffect, useRef } from 'react';
import { Search, Plus, Minus, Trash2, User, X, ShoppingCart, Check, Save, FolderOpen, Printer, Mail } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import type { Item, Contact, CartItem, PrintInvoiceData, PaymentMode } from '../types';
import { PrintPreviewModal } from '../components/PrintPreviewModal';
import { Button } from '../components/ui/button';

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
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Contact | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const [quickCustomer, setQuickCustomer] = useState({ name: '', phone: '', email: '', contactPerson: '', address: '', gstNumber: '' });

  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<any>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [printData, setPrintData] = useState<PrintInvoiceData | null>(null);
  const [showEmailInvoice, setShowEmailInvoice] = useState(false);
  const [emailInvoiceData, setEmailInvoiceData] = useState({ customerEmail: '', businessName: '' });
  const [defaultGstRate, setDefaultGstRate] = useState(5); // Will be overridden by settings
  const [domesticGstRate, setDomesticGstRate] = useState(0); // Domestic GST rate from settings
  const [taxType, setTaxType] = useState<'standard' | 'domestic'>('standard');
  const [customerPriceList, setCustomerPriceList] = useState<number | null>(null);
  const [notes, setNotes] = useState('');

  // Hold/Resume cart state
  const [showHoldCarts, setShowHoldCarts] = useState(false);
  const [heldCarts, setHeldCarts] = useState<any[]>([]);

  useEffect(() => { loadHeldCarts(); }, []);

  const loadHeldCarts = async () => {
    try {
      const result = await window.electronSecureAPI.heldCarts?.getAll();
      if (result?.success) setHeldCarts(result.data || []);
    } catch { /* */ }
  };

  const holdCart = async () => {
    if (cart.length === 0) { showNotification('Cart is empty', 'error'); return; }
    const cartName = prompt('Name this cart (e.g., "John Doe - ATM"):');
    if (!cartName) return;
    try {
      const data = {
        cartName,
        customerId: selectedCustomer?.id,
        items: cart.map(item => ({
          itemId: item.itemId,
          itemName: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          gstRate: item.gstRate,
        })),
      };
      const result = await window.electronSecureAPI.heldCarts?.save(data);
      if (result?.success) {
        showNotification('Cart saved', 'success');
        clearCart();
        loadHeldCarts();
      }
    } catch { showNotification('Failed to hold cart', 'error'); }
  };

  const resumeCart = async (heldCart: any) => {
    try {
      const result = await window.electronSecureAPI.heldCarts?.load(heldCart.id);
      if (result?.success && result.data) {
        // Restore cart items
        const restoredItems = result.data.items.map((item: any) => ({
          itemId: item.itemId,
          name: item.itemName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          gstRate: item.gstRate,
          total: item.quantity * item.unitPrice * (1 + item.gstRate / 100),
          gstAmount: item.quantity * item.unitPrice * item.gstRate / 100,
        }));
        setCart(restoredItems);
        // Restore customer
        if (result.data.customerId) {
          const cust = customers.find(c => c.id === result.data.customerId);
          if (cust) setSelectedCustomer(cust);
        }
        // Delete held cart
        await window.electronSecureAPI.heldCarts?.delete(heldCart.id);
        loadHeldCarts();
        setShowHoldCarts(false);
        showNotification('Cart restored', 'success');
      }
    } catch { showNotification('Failed to restore cart', 'error'); }
  };

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
      if (!window.electronSecureAPI?.settings) {
        console.warn('electronSecureAPI.settings not available');
        return;
      }
      const res = await window.electronSecureAPI.settings.getSmartDefaults();
      if (res) {
        const defaults = res;
        if (defaults.defaultPaymentMode) {
          setPaymentMode(defaults.defaultPaymentMode);
        }
        if (defaults.defaultGstRate !== undefined) {
          setDefaultGstRate(defaults.defaultGstRate);
        }
        if (defaults.domesticGstRate !== undefined) {
          setDomesticGstRate(defaults.domesticGstRate);
        }
      }
    } catch (error) {
      console.error('Failed to load defaults', error);
    }
  };

  // Search items when query changes (supports barcode scanner input)
  useEffect(() => {
    if (searchQuery.length >= 1) {
      searchItems();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  // Recalculate cart taxes when tax mode changes
  useEffect(() => {
    setCart(prevCart => prevCart.map(c => {
      const item = items.find(i => i.id === c.itemId);
      const isApplicable = item ? item.gstApplicable : (c.gstRate > 0); 
      
      const effectiveRate = taxType === 'domestic' ? domesticGstRate : (item?.gstRate ?? defaultGstRate);
      const newRate = isApplicable ? effectiveRate : 0;

      if (c.gstRate === newRate) return c;

      const subtotal = c.quantity * c.unitPrice;
      const newGstAmount = newRate > 0 ? (subtotal * newRate) / 100 : 0;

      return {
        ...c,
        gstRate: newRate,
        gstAmount: newGstAmount,
        total: subtotal + newGstAmount
      };
    }));
  }, [taxType, domesticGstRate, defaultGstRate, items]);

  const loadItems = async () => {
    try {
      if (!window.electronSecureAPI?.pos) {
        showNotification('POS API not available', 'error');
        return;
      }
      const result = await window.electronSecureAPI.pos.getItems();
      if (result?.success) setItems(result.data || []);
    } catch (error) {
      showNotification('Failed to load items', 'error');
    }
  };

  const loadCustomers = async () => {
    try {
      if (!window.electronSecureAPI?.pos) {
        showNotification('POS API not available', 'error');
        return;
      }
      const result = await window.electronSecureAPI.pos.getCustomers();
      if (result?.success) setCustomers(result.data || []);
    } catch (error) {
      showNotification('Failed to load customers', 'error');
    }
  };

  const searchItems = async () => {
    try {
      if (!window.electronSecureAPI?.pos) return;
      const result = await window.electronSecureAPI.pos.searchItems(searchQuery);
      if (result?.success) {
        const items = result.data || [];
        setSearchResults(items);

        // Auto-add on exact barcode/code match (scanner use case)
        if (items.length === 1 && items[0]._isExactMatch) {
          const item = items[0];
          if (item.quantityInStock > 0) {
            addToCart(item);
            setSearchQuery('');
            setSearchResults([]);
            searchInputRef.current?.focus();
          }
        }
      }
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const addToCart = async (item: Item) => {
    const existingItem = cart.find(c => c.itemId === item.id);

    if (existingItem) {
      if (existingItem.quantity >= item.quantityInStock) {
        showNotification(`Only ${item.quantityInStock} items in stock`, 'info');
        return;
      }

      setCart(cart.map(c => {
        if (c.itemId === item.id) {
          const newQuantity = c.quantity + 1;
          const lineSubtotal = newQuantity * c.unitPrice;
          // Only calculate GST if item is GST applicable
          const lineGst = c.gstRate > 0 ? (lineSubtotal * c.gstRate) / 100 : 0;
          return { ...c, quantity: newQuantity, gstAmount: lineGst, total: lineSubtotal + lineGst };
        }
        return c;
      }));
    } else {
      // Get price from customer's price list if available
      let unitPrice = item.sellingPrice; // Default to retail price

      if (customerPriceList) {
        try {
          const priceResult = await window.electronSecureAPI.tieredPricing?.getItemPrice(item.id, customerPriceList);
          if (priceResult?.success && priceResult.data > 0) {
            unitPrice = priceResult.data;
          }
        } catch (error) {
          console.error('Failed to get tiered price:', error);
        }
      }

      // Check if item is GST applicable - if not, set rate to 0
      // For domestic tax type, override the GST rate with the domestic rate
      const effectiveGstRate = taxType === 'domestic' ? domesticGstRate : (item.gstRate ?? defaultGstRate);
      const gstRate = item.gstApplicable ? effectiveGstRate : 0;
      const gstAmount = item.gstApplicable
        ? (unitPrice * gstRate / 100)
        : 0;

      setCart([...cart, {
        itemId: item.id,
        name: item.name,
        description: item.description || item.name,
        quantity: 1,
        unitPrice,
        gstRate,
        gstAmount,
        total: unitPrice + gstAmount,
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
        // Only calculate GST if rate is > 0 (tax exempt items have rate 0)
        const lineGst = c.gstRate > 0 ? (lineSubtotal * c.gstRate) / 100 : 0;
        return { ...c, quantity: newQuantity, gstAmount: lineGst, total: lineSubtotal + lineGst };
      }
      return c;
    }));
  };
  const updateDescription = (itemId: number, description: string) => {
    setCart(cart.map(c => c.itemId === itemId ? { ...c, description } : c));
  };

  const removeFromCart = (itemId: number) => {
    setCart(cart.filter(c => c.itemId !== itemId));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
    setCustomerPriceList(null);
    setDiscountAmount(0);
    setPaymentMode('cash');
    setNotes('');
  };

  const handleQuickAddCustomer = async () => {
    if (!quickCustomer.name.trim()) {
      showNotification('Customer name is required', 'error');
      return;
    }

    setIsSavingCustomer(true);
    try {
      const data = {
        name: quickCustomer.name,
        contactPerson: quickCustomer.contactPerson || quickCustomer.name,
        phone: quickCustomer.phone || '00000000',
        email: quickCustomer.email || '',
        address: quickCustomer.address || '',
        gstNumber: quickCustomer.gstNumber || 'N/A',
        type: 'customer'
      };

      const result = await window.electronSecureAPI.contacts?.create(data);
      if (result?.success) {
        showNotification('Customer added successfully', 'success');

        const newCustomerId = result.data?.id || result.data;

        const newCustomerObj = {
          id: newCustomerId || Date.now(),
          name: quickCustomer.name,
          phone: quickCustomer.phone,
          address: quickCustomer.address,
          gstNumber: quickCustomer.gstNumber,
          type: 'customer'
        };

        setSelectedCustomer(newCustomerObj as any);
        loadCustomers();

        setQuickCustomer({ name: '', phone: '', email: '', contactPerson: '', address: '', gstNumber: '' });
        setIsAddingCustomer(false);
        setShowCustomerModal(false);
      } else {
        showNotification(result?.message || 'Failed to add customer', 'error');
      }
    } catch (error) {
      showNotification('An error occurred while adding customer', 'error');
    } finally {
      setIsSavingCustomer(false);
    }
  };

  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

    // Calculate the discount factor to apply to GST proportionally
    // If subtotal is 0, factor is 1 (doesn't matter)
    const discountFactor = subtotal > 0 ? (subtotal - discountAmount) / subtotal : 1;

    const totalGst = cart.reduce((sum, item) => {
      // Calculate GST on the discounted price of the item
      const discountedUnitPrice = item.unitPrice * discountFactor;
      const perUnitGst = item.gstRate > 0 ? (discountedUnitPrice * item.gstRate) / 100 : 0;
      return sum + (item.quantity * perUnitGst);
    }, 0);

    const total = subtotal - discountAmount + totalGst;
    return { subtotal, gstAmount: totalGst, total };
  };

  const processSale = async () => {
    if (cart.length === 0) {
      showNotification('Cart is empty', 'error');
      return;
    }

    if (!notes.trim()) {
      showNotification('Please enter a sale description/note', 'error');
      return;
    }

    const totals = calculateTotals();
    const discountFactor = totals.subtotal > 0 ? (totals.subtotal - discountAmount) / totals.subtotal : 1;

    // Validate sale has value
    if (totals.subtotal <= 0) {
      showNotification('Sale amount cannot be zero. Please check item prices.', 'error');
      return;
    }

    // Prevent excessive discounts
    if (totals.subtotal + totals.gstAmount - discountAmount <= 0) {
      showNotification('Discount cannot exceed sale total.', 'error');
      return;
    }

    if (!selectedCustomer) {
      showNotification('Please select a customer', 'error');
      return;
    }

    if (!window.electronSecureAPI?.pos) {
      showNotification('POS API not available', 'error');
      return;
    }

    setIsProcessing(true);

    try {
      const saleData = {
        customerId: selectedCustomer?.id || null,
        items: cart.map(item => ({
          itemId: item.itemId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          gstRate: item.gstRate ?? defaultGstRate,
          description: item.description,
        })),
        paymentMode,
        discountAmount,
        notes,
        taxType,
      };

      const result = await window.electronSecureAPI.pos.createSale(saleData);

      if (result.success) {
        showNotification('Sale completed successfully', 'success');
        const invoice = result.data?.invoice;
        setLastInvoice(invoice);

        // Prepare print data for preview
        if (invoice) {
          try {
            const settingsRes = window.electronSecureAPI?.settings
              ? await window.electronSecureAPI.settings.get()
              : null;
            const settings = settingsRes?.data;
            const mappedPrintData: PrintInvoiceData = {
              invoiceNo: invoice.invoice_no,
              date: invoice.date,
              businessName: settings?.company_name || 'My Business',
              businessAddress: settings?.address,
              businessAddressStreet: settings?.address_street,
              businessAddressGewog: settings?.address_gewog,
              businessAddressDzongkhag: settings?.address_dzongkhag,
              businessPhone: settings?.phone,
              businessEmail: settings?.email,
              businessWebsite: settings?.website,
              businessTagline: settings?.tagline,
              businessLogo: settings?.company_logo,
              taxNo: settings?.tax_no,
              tradeLicenseNo: settings?.trade_license_no,
              customerName: selectedCustomer?.name,
              customerAddress: selectedCustomer?.address,
              customerAddressStreet: (selectedCustomer as any)?.addressStructured?.street,
              customerAddressGewog: (selectedCustomer as any)?.addressStructured?.gewog,
              customerAddressDzongkhag: (selectedCustomer as any)?.addressStructured?.dzongkhag,
              customerPhone: selectedCustomer?.phone,
              customerGst: selectedCustomer?.gstNumber,
              items: cart.map(item => {
                const itemGst = item.gstRate > 0 ? (item.unitPrice * item.quantity * item.gstRate) / 100 : 0;
                const discountedItemGst = itemGst * discountFactor;
                return {
                  description: item.name + (item.description && item.description !== item.name ? ` - ${item.description}` : ''),
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  gstRate: item.gstRate,
                  gstAmount: discountedItemGst,
                  total: (item.unitPrice * item.quantity) + discountedItemGst
                };
              }),
              subtotal: totals.subtotal,
              gstAmount: totals.gstAmount,
              discountAmount,
              totalAmount: totals.total,
              paymentMode,
              amountPaid: paymentMode === 'credit' ? 0 : totals.total,
              balanceDue: paymentMode === 'credit' ? totals.total : 0,
              terms: '',
              notes: notes || '',
              taxType,
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

  const handleEmailInvoice = async () => {
    if (!emailInvoiceData.customerEmail.trim()) {
      showNotification('Please enter a customer email', 'error');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInvoiceData.customerEmail)) {
      showNotification('Please enter a valid email address', 'error');
      return;
    }
    if (!lastInvoice) {
      showNotification('No invoice found', 'error');
      return;
    }
    try {
      const result = await window.electronSecureAPI.emailInvoice?.send({
        customerEmail: emailInvoiceData.customerEmail,
        invoiceNo: printData?.invoiceNo || '',
        totalAmount: printData?.totalAmount || 0,
        businessName: emailInvoiceData.businessName || printData?.businessName || 'Jinda',
      });
      if (result?.success) {
        showNotification('Invoice email opened successfully', 'success');
        setShowEmailInvoice(false);
        setEmailInvoiceData({ customerEmail: '', businessName: '' });
      } else {
        showNotification('Failed to send invoice email', 'error');
      }
    } catch {
      showNotification('Failed to send invoice email', 'error');
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
    <div className="h-full flex gap-4 lg:gap-6 overflow-hidden">
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
            placeholder="Scan barcode or search products by name, code..."
            className="w-full pl-10 pr-4 py-4 border-gray-200 rounded-2xl focus:ring-2 focus:ring-bhutan-maroon focus:border-transparent shadow-sm bg-white"
          />

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl z-20 max-h-64 overflow-auto animate-in fade-in slide-in-from-top-2 duration-200">
              {searchResults.map((item) => (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  disabled={item.quantityInStock <= 0}
                  className={`w-full flex items-center justify-between p-4 transition-colors border-b border-slate-50 last:border-0 group ${item.quantityInStock <= 0
                    ? 'opacity-50 cursor-not-allowed bg-slate-50'
                    : 'hover:bg-slate-50'
                    }`}
                >
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-800 group-hover:text-bhutan-maroon transition-colors">{item.name}</p>
                      {(item as any)._isExactMatch && searchResults.length > 1 && (
                        <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-bhutan-maroon/10 text-bhutan-maroon">Exact</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded ${item.quantityInStock > 10
                        ? 'bg-emerald-50 text-emerald-700'
                        : item.quantityInStock > 0
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-red-50 text-red-700'
                        }`}>
                        Stock: {item.quantityInStock}
                      </span>
                      {item.code && (
                        <span className="text-xs text-slate-400 font-mono">Code: {item.code}</span>
                      )}
                    </div>
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
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
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
      <div className="w-80 xl:w-96 flex-shrink-0 bg-white rounded-3xl shadow-2xl shadow-slate-200 flex flex-col border border-slate-50 relative overflow-hidden h-full">
        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-4 xl:p-6 border-b border-slate-50 bg-slate-50/30">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-bhutan-maroon" />
                Your Cart <span className="text-xs bg-bhutan-maroon text-white px-2 py-0.5 rounded-full">{cart.length}</span>
              </h3>
              <div className="flex items-center gap-2">
                {heldCarts.length > 0 && (
                  <button onClick={() => setShowHoldCarts(true)} className="text-blue-500 hover:text-blue-700 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                    <FolderOpen className="w-3 h-3" /> {heldCarts.length}
                  </button>
                )}
                {cart.length > 0 && (
                  <>
                    <button onClick={holdCart} className="text-amber-500 hover:text-amber-700 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                      <Save className="w-3 h-3" /> Hold
                    </button>
                    <button onClick={clearCart} className="text-red-500 hover:text-red-700 text-xs font-bold uppercase tracking-wider">Clear</button>
                  </>
                )}
              </div>
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
                      <div className="flex-1 mr-2">
                        <p className="font-bold text-sm text-slate-800">{item.name}</p>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateDescription(item.itemId, e.target.value)}
                          className="w-full text-[11px] text-slate-500 bg-transparent border-none p-0 focus:ring-0 italic placeholder:text-slate-300"
                          placeholder="Add specific description..."
                        />
                      </div>
                      <button onClick={() => removeFromCart(item.itemId)} className="text-slate-300 hover:text-red-500 transition-colors">
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
            <div className="w-full flex items-center justify-between p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
                 onClick={() => setShowCustomerModal(true)}
            >
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-gray-400" />
                <span>{selectedCustomer ? selectedCustomer.name : <><span className="text-red-500">*</span> Required: Select Customer</>}</span>
              </div>
              {selectedCustomer && (
                <button onClick={(e) => { e.stopPropagation(); setSelectedCustomer(null); }} className="text-red-400 hover:text-red-600 p-1 rounded">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
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

          {/* Sale Notes */}
          <div className="p-4 border-t border-slate-50">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Sale Note / Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Mandatory: Add description of items or sale..."
              className={`w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-bhutan-maroon focus:border-transparent bg-slate-50/50 resize-none h-16 ${!notes.trim() ? 'border-amber-200' : 'border-slate-200'}`}
            />
          </div>

          {/* GST Type Toggle */}
          <div className="px-4 py-3 border-t border-slate-50">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tax Mode</span>
              <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5">
                <button
                  onClick={() => setTaxType('standard')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                    taxType === 'standard'
                      ? 'bg-white text-bhutan-maroon shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Standard GST ({defaultGstRate}%)
                </button>
                <button
                  onClick={() => setTaxType('domestic')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                    taxType === 'domestic'
                      ? 'bg-white text-emerald-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Domestic GST ({domesticGstRate}%)
                </button>
              </div>
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
                <span>
                  {taxType === 'domestic' ? `Domestic GST (${domesticGstRate}%)` : `GST (${defaultGstRate}%)`}
                </span>
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
          <div className="p-4 xl:p-6 border-t border-slate-50 bg-white">
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
                <h3 className="text-lg font-semibold">{isAddingCustomer ? 'Add New Customer' : 'Select Customer'}</h3>
                <div className="flex items-center gap-2">
                  {!isAddingCustomer ? (
                    <button
                      onClick={() => setIsAddingCustomer(true)}
                      className="text-sm text-bhutan-maroon font-semibold flex items-center gap-1 hover:bg-bhutan-maroon/10 px-2 py-1 rounded transition-colors"
                    >
                      <Plus className="w-4 h-4" /> Add New
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsAddingCustomer(false)}
                      className="text-sm text-gray-500 font-semibold hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                    >
                      Search List
                    </button>
                  )}
                  <button onClick={() => { setShowCustomerModal(false); setIsAddingCustomer(false); }} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                </div>
              </div>

              {isAddingCustomer ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={quickCustomer.name}
                      onChange={(e) => setQuickCustomer({ ...quickCustomer, name: e.target.value })}
                      className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-bhutan-maroon focus:border-transparent outline-none transition-all"
                      placeholder="e.g. Karma Dorji"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Phone</label>
                    <input
                      type="text"
                      value={quickCustomer.phone}
                      onChange={(e) => setQuickCustomer({ ...quickCustomer, phone: e.target.value })}
                      className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-bhutan-maroon focus:border-transparent outline-none transition-all"
                      placeholder="e.g. 17000000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Address</label>
                    <input
                      type="text"
                      value={quickCustomer.address}
                      onChange={(e) => setQuickCustomer({ ...quickCustomer, address: e.target.value })}
                      className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-bhutan-maroon focus:border-transparent outline-none transition-all"
                      placeholder="e.g. Thimphu"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">CID / TPN / GST No</label>
                    <input
                      type="text"
                      value={quickCustomer.gstNumber}
                      onChange={(e) => setQuickCustomer({ ...quickCustomer, gstNumber: e.target.value })}
                      className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-bhutan-maroon focus:border-transparent outline-none transition-all"
                      placeholder="Tax Identification Number"
                    />
                  </div>
                  <div className="pt-2">
                    <Button
                      onClick={handleQuickAddCustomer}
                      disabled={isSavingCustomer || !quickCustomer.name.trim()}
                      className="w-full bg-bhutan-maroon hover:bg-bhutan-maroon-dark text-white py-2"
                    >
                      {isSavingCustomer ? 'Saving...' : 'Save & Select'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mb-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={customerSearchQuery}
                        onChange={(e) => setCustomerSearchQuery(e.target.value)}
                        placeholder="Search by name or phone..."
                        className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-bhutan-maroon focus:border-transparent outline-none transition-all text-sm"
                      />
                    </div>
                  </div>
                  <div className="max-h-64 overflow-auto rounded-lg border border-gray-100">
                    {customers.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 text-sm">No customers found. Click "Add New" to create one.</div>
                    ) : (
                      customers
                        .filter(c => c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) || (c.phone && c.phone.includes(customerSearchQuery)))
                        .map((customer) => (
                          <button
                            key={customer.id}
                            onClick={async () => {
                              setSelectedCustomer(customer);
                              setShowCustomerModal(false);

                              if (customer.id) {
                                try {
                                  const priceListResult = await window.electronSecureAPI.tieredPricing?.getCustomerPriceList(customer.id);
                                  if (priceListResult?.success) {
                                    setCustomerPriceList(priceListResult.data);
                                  } else {
                                    setCustomerPriceList(null);
                                  }
                                } catch (error) {
                                  console.error('Failed to load customer price list:', error);
                                  setCustomerPriceList(null);
                                }
                              }
                            }}
                            className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors"
                          >
                            <p className="font-medium text-gray-800">{customer.name}</p>
                            {customer.phone && <p className="text-sm text-gray-500 mt-0.5">{customer.phone}</p>}
                          </button>
                        ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Held Carts Modal */}
        {showHoldCarts && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2"><FolderOpen className="w-5 h-5 text-blue-500" /> Held Carts ({heldCarts.length})</h3>
                <button onClick={() => setShowHoldCarts(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
              </div>
              {heldCarts.length === 0 ? (
                <p className="text-center text-gray-400 py-8">No held carts</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {heldCarts.map((hc: any) => (
                    <div key={hc.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-blue-300 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-slate-800">{hc.cart_name}</span>
                        <span className="text-xs text-slate-400">{new Date(hc.created_at).toLocaleTimeString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500">{hc.items?.length || 0} items · {hc.customer_name || 'No customer'}</span>
                        <button onClick={() => resumeCart(hc)} className="px-4 py-1.5 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700">Resume</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                <Button
                  onClick={() => {
                    const customerEmail = selectedCustomer?.email || '';
                    setEmailInvoiceData({ customerEmail, businessName: '' });
                    setShowEmailInvoice(true);
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2 py-6 h-auto"
                >
                  <Mail className="w-5 h-5" />
                  Email Invoice
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

        {/* Email Invoice Modal */}
        {showEmailInvoice && lastInvoice && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 text-blue-600 rounded-lg">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Email Invoice</h3>
                    <p className="text-sm text-slate-500">Send invoice #{lastInvoice.invoice_no}</p>
                  </div>
                </div>
                <button
                  onClick={() => { setShowEmailInvoice(false); setEmailInvoiceData({ customerEmail: '', businessName: '' }); }}
                  className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Customer Email *</label>
                  <input
                    type="email"
                    value={emailInvoiceData.customerEmail}
                    onChange={(e) => setEmailInvoiceData({ ...emailInvoiceData, customerEmail: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all text-sm font-medium text-slate-800"
                    placeholder="customer@email.com"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Business Name</label>
                  <input
                    type="text"
                    value={emailInvoiceData.businessName}
                    onChange={(e) => setEmailInvoiceData({ ...emailInvoiceData, businessName: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all text-sm font-medium text-slate-800"
                    placeholder="Your Business Name"
                  />
                </div>

                <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Invoice No:</span>
                    <span className="font-bold text-slate-800">{lastInvoice.invoice_no}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Total Amount:</span>
                    <span className="font-bold text-bhutan-maroon">Nu. {lastInvoice.total_amount?.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowEmailInvoice(false); setEmailInvoiceData({ customerEmail: '', businessName: '' }); }}
                    className="flex-1 py-3 border-2 border-slate-200 rounded-xl hover:bg-slate-50 font-bold text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEmailInvoice}
                    className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                  >
                    <Mail className="w-4 h-4" />
                    Send Invoice
                  </button>
                </div>
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
