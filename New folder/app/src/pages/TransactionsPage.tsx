import { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Trash2,
  Printer,
  User,
  Building2,
  Wallet,
  ArrowLeftRight,
  Mail,
  Download
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { PrintPreviewModal } from '../components/PrintPreviewModal';
import type { PrintInvoiceData, PaymentMode } from '../types';

export function TransactionsPage() {
  const { showNotification } = useAppStore();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [printData, setPrintData] = useState<PrintInvoiceData | null>(null);
  const [showEmailInvoice, setShowEmailInvoice] = useState(false);
  const [emailInvoiceData, setEmailInvoiceData] = useState({ customerEmail: '', invoiceNo: '', totalAmount: 0, businessName: '' });

  const [receiveData, setReceiveData] = useState({
    contactId: undefined as number | undefined,
    accountId: undefined as number | undefined,
    amount: 0,
    paymentMode: 'cash' as PaymentMode,
    date: new Date().toISOString().split('T')[0],
    reference: '',
    description: '',
  });

  const [payData, setPayData] = useState({
    contactId: undefined as number | undefined,
    accountId: undefined as number | undefined,
    amount: 0,
    paymentMode: 'cash' as PaymentMode,
    date: new Date().toISOString().split('T')[0],
    reference: '',
    description: '',
  });

  const [transferData, setTransferData] = useState({
    fromAccountId: 0,
    toAccountId: 0,
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    reference: '',
    description: '',
  });

  const [contacts, setContacts] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);

  useEffect(() => {
    loadTransactions();
    loadContacts();
    loadAccounts();
  }, [filterType]);

  const loadTransactions = async () => {
    try {
      const filters: any = {};
      if (filterType) filters.type = filterType;

      const result = await window.electronSecureAPI.transactions.getAll(filters);
      if (result?.success) {
        setTransactions(Array.isArray(result.data) ? result.data : []);
      }
    } catch (error) {
      showNotification('Failed to load transactions', 'error');
    }
  };

  const loadContacts = async () => {
    try {
      const result = await window.electronSecureAPI.contacts.getAll();
      if (result?.success) {
        setContacts(Array.isArray(result.data) ? result.data : []);
      }
    } catch (error) {
      console.error('Failed to load contacts:', error);
    }
  };

  const loadAccounts = async () => {
    try {
      const accountsResponse = await window.electronSecureAPI.accounts.getAll();
      const accountsArray = Array.isArray(accountsResponse) ? accountsResponse :
        (accountsResponse?.success && Array.isArray(accountsResponse.data)) ? accountsResponse.data : [];
      setAccounts(accountsArray);
    } catch (error) {
      console.error('[loadAccounts] Error:', error);
    }
  };

  const handleExport = async () => {
    try {
      const filters: any = {};
      if (filterType) filters.type = filterType;
      const result = await window.electronSecureAPI.transactions?.export(filters);
      if (result?.success) {
        showNotification(result.message, 'success');
      } else {
        showNotification(result?.message || 'Failed to export transactions', 'error');
      }
    } catch {
      showNotification('Failed to export transactions', 'error');
    }
  };

  const handleReceiveMoney = async (e: React.FormEvent) => {
    e.preventDefault();

    // Strict validation
    const hasValidContact = !!receiveData.contactId && typeof receiveData.contactId === 'number';
    const hasValidAccount = !!receiveData.accountId && typeof receiveData.accountId === 'number';

    if (!hasValidContact && !hasValidAccount) {
      showNotification('Validation Error: You must select either a Customer OR a Category Account.', 'error');
      return;
    }

    try {
      const result = await window.electronSecureAPI.transactions.receiveMoney(receiveData);
      if (result.success) {
        showNotification('Payment received successfully', 'success');
        setShowReceiveModal(false);
        loadTransactions();
      } else {
        showNotification(result.message || 'Failed to receive payment', 'error');
      }
    } catch (error: any) {
      showNotification(error.message || 'Failed to receive payment', 'error');
    }
  };

  const handlePayMoney = async (e: React.FormEvent) => {
    e.preventDefault();

    // Strict validation
    const hasValidContact = !!payData.contactId && typeof payData.contactId === 'number';
    const hasValidAccount = !!payData.accountId && typeof payData.accountId === 'number';

    if (!hasValidContact && !hasValidAccount) {
      showNotification('Validation Error: You must select either a Supplier OR a Category Account.', 'error');
      return;
    }

    try {
      const result = await window.electronSecureAPI.transactions.payMoney(payData);
      if (result.success) {
        showNotification('Payment made successfully', 'success');
        setShowPayModal(false);
        loadTransactions();
      } else {
        showNotification(result.message || 'Failed to make payment', 'error');
      }
    } catch (error: any) {
      showNotification(error.message || 'Failed to make payment', 'error');
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const transferPayload = {
        fromAccountId: transferData.fromAccountId,
        toAccountId: transferData.toAccountId,
        amount: transferData.amount,
        date: transferData.date,
        reference: transferData.reference,
        description: transferData.description,
      };
      const result = await window.electronSecureAPI.transactions.transfer(transferPayload);
      if (result.success) {
        showNotification('Transfer completed successfully', 'success');
        setShowTransferModal(false);
        loadTransactions();
      } else {
        showNotification(result.message || 'Failed to transfer', 'error');
      }
    } catch (error: any) {
      showNotification(error.message || 'Failed to transfer', 'error');
    }
  };

  const handlePrintPreview = async (transaction: any) => {
    try {
      const result = await window.electronSecureAPI.transactions.getInvoiceData(transaction.id);
      if (result.success && result.data) {
        // Handle potential double-wrapping from preload-secure
        const invoice = result.data.data ? result.data.data : result.data;
        const settingsRes = await window.electronSecureAPI.settings.get();
        const settings = settingsRes?.data;

        const mappedData: PrintInvoiceData = {
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
          customerName: invoice.customer_name,
          customerAddress: invoice.customer_address,
          customerAddressStreet: invoice.customer_address_street,
          customerAddressGewog: invoice.customer_address_gewog,
          customerAddressDzongkhag: invoice.customer_address_dzongkhag,
          customerPhone: invoice.customer_phone,
          customerGst: invoice.customer_gst,
          items: (invoice.items || []).map((it: any) => ({
            ...it,
            quantity: Number(it.quantity) || 0,
            unitPrice: Number(it.unitPrice) || 0,
            gstRate: Number(it.gstRate) || 0,
            gstAmount: Number(it.gstAmount) || 0,
            total: Number(it.total) || 0,
          })),
          subtotal: Number(invoice.subtotal) || 0,
          gstAmount: Number(invoice.gst_amount) || 0,
          discountAmount: Number(invoice.discount_amount) || 0,
          totalAmount: Number(invoice.total_amount) || 0,
          paymentMode: transaction.paymentMode || transaction.payment_mode || 'cash',
          amountPaid: (Number(invoice.total_amount) || 0) - (Number(invoice.balance_due) || 0),
          balanceDue: Number(invoice.balance_due) || 0,
          terms: invoice.terms || '',
          notes: invoice.notes || '',
          taxType: invoice.tax_type || invoice.taxType || 'standard',
          isDuplicate: true // Since it's from history
        };

        setPrintData(mappedData);
        setShowPrintPreview(true);
      } else {
        showNotification(result.message || 'Invoice details not found for this transaction', 'error');
      }
    } catch (error: any) {
      showNotification('Failed to load invoice details: ' + error.message, 'error');
    }
  };

  const handleVoid = async (id: number) => {
    const reason = prompt('Enter reason for voiding this transaction:');
    if (!reason) return;

    try {
      const result = await window.electronSecureAPI.transactions.void({
        transactionId: id,
        reason,
      });
      if (result.success) {
        showNotification('Transaction voided successfully', 'success');
        loadTransactions();
      } else {
        showNotification(result.message || 'Failed to void transaction', 'error');
      }
    } catch (error: any) {
      showNotification(error.message || 'Failed to void transaction', 'error');
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
    try {
      const result = await window.electronSecureAPI.emailInvoice?.send({
        customerEmail: emailInvoiceData.customerEmail,
        invoiceNo: emailInvoiceData.invoiceNo,
        totalAmount: emailInvoiceData.totalAmount,
        businessName: emailInvoiceData.businessName || 'Jinda',
      });
      if (result?.success) {
        showNotification('Invoice email opened successfully', 'success');
        setShowEmailInvoice(false);
        setEmailInvoiceData({ customerEmail: '', invoiceNo: '', totalAmount: 0, businessName: '' });
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

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'sale':
      case 'receipt':
        return <ArrowDownLeft className="w-5 h-5 text-emerald-600" />;
      case 'purchase':
      case 'payment':
        return <ArrowUpRight className="w-5 h-5 text-red-600" />;
      case 'transfer':
        return <RefreshCw className="w-5 h-5 text-blue-600" />;
      default:
        return <RefreshCw className="w-5 h-5 text-gray-600" />;
    }
  };

  const filteredTransactions = transactions.filter(t =>
    (t.transaction_no || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.contact_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setShowReceiveModal(true)}
          className="flex-1 min-w-[140px] flex items-center justify-center gap-3 bg-emerald-500 text-white px-4 py-4 rounded-[24px] hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/10 active:scale-95 font-black uppercase tracking-widest text-xs"
        >
          <div className="p-2 bg-white/20 rounded-xl">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
          Receive Payment
        </button>
        <button
          onClick={() => setShowPayModal(true)}
          className="flex-1 min-w-[140px] flex items-center justify-center gap-3 bg-red-500 text-white px-4 py-4 rounded-[24px] hover:bg-red-600 transition-all shadow-lg shadow-red-500/10 active:scale-95 font-black uppercase tracking-widest text-xs"
        >
          <div className="p-2 bg-white/20 rounded-xl">
            <ArrowUpRight className="w-5 h-5" />
          </div>
          Make Payment
        </button>
        <button
          onClick={() => setShowTransferModal(true)}
          className="flex-1 min-w-[140px] flex items-center justify-center gap-3 bg-bhutan-orange text-white px-4 py-4 rounded-[24px] hover:bg-bhutan-orange-dark transition-all shadow-lg shadow-bhutan-orange/10 active:scale-95 font-black uppercase tracking-widest text-xs"
        >
          <div className="p-2 bg-white/20 rounded-xl">
            <RefreshCw className="w-5 h-5" />
          </div>
          Fund Transfer
        </button>
        <button
          onClick={handleExport}
          className="flex items-center justify-center gap-3 bg-slate-700 text-white px-5 py-4 rounded-[24px] hover:bg-slate-800 transition-all shadow-lg shadow-slate-500/10 active:scale-95 font-black uppercase tracking-widest text-xs"
        >
          <div className="p-2 bg-white/20 rounded-xl">
            <Download className="w-5 h-5" />
          </div>
          Export
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 bg-white/50 backdrop-blur-md p-2 rounded-[28px] border border-white shadow-sm">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-bhutan-maroon transition-colors" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ID, Contact or description..."
            className="w-full pl-12 pr-4 py-3.5 bg-white/80 border-none rounded-[22px] focus:ring-2 focus:ring-bhutan-maroon/10 focus:bg-white transition-all font-medium text-slate-700 placeholder:text-slate-300"
          />
        </div>
        <div className="h-8 w-px bg-slate-100 mx-2"></div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-6 py-3.5 bg-white/80 border-none rounded-[22px] focus:ring-2 focus:ring-bhutan-maroon/10 focus:bg-white transition-all font-black text-xs uppercase tracking-widest text-slate-500 appearance-none cursor-pointer min-w-[160px]"
        >
          <option value="">All Transactions</option>
          <option value="sale">Revenue / Sales</option>
          <option value="purchase">Cost / Purchases</option>
          <option value="receipt">Customer Receipts</option>
          <option value="payment">Vendor Payments</option>
          <option value="transfer">Internal Transfers</option>
        </select>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-[40px] shadow-2xl shadow-slate-200/50 overflow-hidden border border-slate-50">
        <div className="overflow-x-auto w-full">
          <table className="w-full">
            <thead>
            <tr className="bg-slate-900">
              <th className="text-left py-6 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Type</th>
              <th className="text-left py-6 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Transaction Ref</th>
              <th className="text-left py-6 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Entity Name</th>
              <th className="text-right py-6 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Total Valuation</th>
              <th className="text-center py-6 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
              <th className="text-center py-6 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredTransactions.map((transaction) => (
              <tr key={transaction.id} className="group hover:bg-slate-50/80 transition-all duration-300">
                <td className="py-5 px-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-slate-50 group-hover:bg-white transition-colors">
                      {getTransactionIcon(transaction.type)}
                    </div>
                    <div>
                      <span className="text-xs font-black uppercase tracking-widest text-slate-400 block">{transaction.type}</span>
                      <span className="text-xs font-medium text-slate-300">{transaction.date || '-'}</span>
                    </div>
                  </div>
                </td>
                <td className="py-5 px-4">
                  <span className="text-sm font-black text-slate-700">#{transaction.transaction_no || transaction.transactionNo || '---'}</span>
                </td>
                <td className="py-5 px-4">
                  <div className="max-w-[200px]">
                    <span className="text-sm font-bold text-slate-600 block truncate">{transaction.contact_name || transaction.contactName || 'Cash Sale / Other'}</span>
                    <span className="text-xs text-slate-400 truncate block">{transaction.description || '--'}</span>
                  </div>
                </td>
                <td className="py-5 px-4 text-right whitespace-nowrap">
                  <span className="text-lg font-black text-slate-900">
                    {formatCurrency(transaction.net_amount || transaction.netAmount || 0)}
                  </span>
                </td>
                <td className="py-5 px-4 text-center">
                  <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${transaction.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                    transaction.status === 'void' ? 'bg-red-50 text-red-500' :
                      'bg-bhutan-orange/10 text-bhutan-orange'
                    }`}>
                    {transaction.status}
                  </span>
                </td>
                <td className="py-5 px-6 text-center">
                  <div className="flex justify-center gap-2">
                    {transaction.status !== 'void' && (
                      <>
                        {transaction.type === 'sale' && (
                          <>
                            <button
                              onClick={() => handlePrintPreview(transaction)}
                              className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 hover:text-bhutan-maroon hover:bg-bhutan-maroon/10 rounded-xl transition-all"
                              title="Print Invoice"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  const result = await window.electronSecureAPI.transactions.getInvoiceData(transaction.id);
                                  if (result.success && result.data) {
                                    // Handle potential double-wrapping from preload-secure
                                    const invoice = result.data.data ? result.data.data : result.data;
                                    const settingsRes = await window.electronSecureAPI.settings.get();
                                    const settings = settingsRes?.data;
                                    setEmailInvoiceData({
                                      customerEmail: invoice.customer_email || '',
                                      invoiceNo: invoice.invoice_no,
                                      totalAmount: invoice.total_amount,
                                      businessName: settings?.company_name || 'Jinda',
                                    });
                                    setShowEmailInvoice(true);
                                  } else {
                                    showNotification('Invoice details not found', 'error');
                                  }
                                } catch {
                                  showNotification('Failed to load invoice details', 'error');
                                }
                              }}
                              className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                              title="Email Invoice"
                            >
                              <Mail className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleVoid(transaction.id)}
                          className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          title="Void Entry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        {filteredTransactions.length === 0 && (
          <div className="text-center py-24 bg-slate-50/30">
            <div className="inline-flex p-6 rounded-full bg-white shadow-sm mb-6">
              <Filter className="w-12 h-12 text-slate-200" />
            </div>
            <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-sm">No ledger entries found</p>
            <p className="text-slate-300 text-xs mt-2 font-medium">Try adjusting your filters or search query</p>
          </div>
        )}
      </div>

      {/* Receive Money Modal */}
      {showReceiveModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 sm:p-8 my-auto shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg">
                  <ArrowDownLeft className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Receive Money</h3>
                  <p className="text-sm text-slate-500 font-medium">Record incoming payment</p>
                </div>
              </div>
              <button
                onClick={() => setShowReceiveModal(false)}
                className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
              >
                <ArrowDownLeft className="w-5 h-5 rotate-[135deg]" />
              </button>
            </div>

            <form onSubmit={handleReceiveMoney} className="space-y-6">
              {/* Party / Account Section */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400" /> Payment Source
                </h4>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">From Customer</label>
                  <select
                    value={receiveData.contactId || ''}
                    onChange={(e) => setReceiveData({ ...receiveData, contactId: Number(e.target.value) || undefined, accountId: undefined })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all text-sm font-medium text-slate-800"
                  >
                    <option value="">General Income / Other</option>
                    {contacts.filter(c => c.type === 'customer').map((contact) => (
                      <option key={contact.id} value={contact.id}>{contact.name}</option>
                    ))}
                  </select>
                </div>

                {!receiveData.contactId && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Category Account (Target) *</label>
                    <select
                      value={receiveData.accountId || ''}
                      onChange={(e) => setReceiveData({ ...receiveData, accountId: Number(e.target.value) || undefined })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all text-sm font-medium text-slate-800"
                      required
                    >
                      <option value="">Select Income/Target Account</option>
                      {accounts.filter(a => !a.type || ['income', 'equity', 'liability', 'asset'].includes(a.type)).map((acc) => (
                        <option key={acc.id} value={acc.id}>{acc.name} — {acc.type || 'unknown'} ({acc.code})</option>
                      ))}
                    </select>
                    {accounts.length === 0 && (
                      <p className="text-xs text-red-500 mt-1">No accounts available. Please create accounts first.</p>
                    )}
                    {accounts.length > 0 && accounts.filter(a => !a.type || ['income', 'equity', 'liability', 'asset'].includes(a.type)).length === 0 && (
                      <p className="text-xs text-amber-600 mt-1">No income/equity/liability/asset accounts found. Total accounts: {accounts.length}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Amount & Payment Details */}
              <div className="border-t border-slate-200 pt-5">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2 mb-4">
                  <Wallet className="w-4 h-4 text-slate-400" /> Payment Details
                </h4>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Amount *</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">Nu.</span>
                      <input
                        type="number"
                        value={receiveData.amount}
                        onChange={(e) => setReceiveData({ ...receiveData, amount: Number(e.target.value) })}
                        className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all text-sm font-bold text-slate-800"
                        min={0.01}
                        step={0.01}
                        required
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Payment Mode</label>
                      <select
                        value={receiveData.paymentMode}
                        onChange={(e) => setReceiveData({ ...receiveData, paymentMode: e.target.value as any })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all text-sm font-medium text-slate-800"
                      >
                        <option value="cash">💵 Cash</option>
                        <option value="mBOB">📱 mBOB</option>
                        <option value="BNB">📱 BNB Pay</option>
                        <option value="TPay">📱 T-Pay</option>
                        <option value="DrukPNB">🏦 Druk PNB</option>
                        <option value="BDBL">🏦 BDBL</option>
                        <option value="DKBank">🏦 DKid (Digital Kidu)</option>
                        <option value="card">💳 Card Payment</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Date</label>
                      <input
                        type="date"
                        value={receiveData.date}
                        onChange={(e) => setReceiveData({ ...receiveData, date: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all text-sm font-medium text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Reference</label>
                    <input
                      type="text"
                      value={receiveData.reference}
                      onChange={(e) => setReceiveData({ ...receiveData, reference: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all text-sm font-medium text-slate-800"
                      placeholder="Cheque number, receipt reference, etc."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Description</label>
                    <textarea
                      value={receiveData.description}
                      onChange={(e) => setReceiveData({ ...receiveData, description: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all text-sm font-medium text-slate-800 min-h-[60px] resize-none"
                      placeholder="Optional notes about this payment..."
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReceiveModal(false)}
                  className="flex-1 py-3 border-2 border-slate-200 rounded-xl hover:bg-slate-50 font-bold text-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-bold transition-colors shadow-lg shadow-emerald-600/20"
                >
                  Receive Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Money Modal */}
      {showPayModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 sm:p-8 my-auto shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/10 text-red-600 rounded-lg">
                  <ArrowUpRight className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Pay Money</h3>
                  <p className="text-sm text-slate-500 font-medium">Record outgoing payment</p>
                </div>
              </div>
              <button
                onClick={() => setShowPayModal(false)}
                className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
              >
                <ArrowUpRight className="w-5 h-5 rotate-[135deg]" />
              </button>
            </div>

            <form onSubmit={handlePayMoney} className="space-y-6">
              {/* Party / Account Section */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-400" /> Payment Destination
                </h4>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">To Supplier</label>
                  <select
                    value={payData.contactId || ''}
                    onChange={(e) => setPayData({ ...payData, contactId: Number(e.target.value) || undefined, accountId: undefined })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:bg-white transition-all text-sm font-medium text-slate-800"
                  >
                    <option value="">Direct Expense / General</option>
                    {contacts.filter(c => c.type === 'supplier').map((contact) => (
                      <option key={contact.id} value={contact.id}>{contact.name}</option>
                    ))}
                  </select>
                </div>

                {!payData.contactId && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Category Account (Detail) *</label>
                    <select
                      value={payData.accountId || ''}
                      onChange={(e) => setPayData({ ...payData, accountId: Number(e.target.value) || undefined })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:bg-white transition-all text-sm font-medium text-slate-800"
                      required
                    >
                      <option value="">Select Expense/Payment Type</option>
                      {accounts.filter(a => !a.type || ['expense', 'asset', 'liability', 'equity'].includes(a.type)).map((acc) => (
                        <option key={acc.id} value={acc.id}>{acc.name} — {acc.type || 'unknown'} ({acc.code})</option>
                      ))}
                    </select>
                    {accounts.length === 0 && (
                      <p className="text-xs text-red-500 mt-1">No accounts available. Please create accounts first.</p>
                    )}
                    {accounts.length > 0 && accounts.filter(a => !a.type || ['expense', 'asset', 'liability', 'equity'].includes(a.type)).length === 0 && (
                      <p className="text-xs text-amber-600 mt-1">No expense/asset/liability/equity accounts found. Total accounts: {accounts.length}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Amount & Payment Details */}
              <div className="border-t border-slate-200 pt-5">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2 mb-4">
                  <Wallet className="w-4 h-4 text-slate-400" /> Payment Details
                </h4>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Amount *</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">Nu.</span>
                      <input
                        type="number"
                        value={payData.amount}
                        onChange={(e) => setPayData({ ...payData, amount: Number(e.target.value) })}
                        className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:bg-white transition-all text-sm font-bold text-slate-800"
                        min={0.01}
                        step={0.01}
                        required
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Payment Mode</label>
                      <select
                        value={payData.paymentMode}
                        onChange={(e) => setPayData({ ...payData, paymentMode: e.target.value as any })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:bg-white transition-all text-sm font-medium text-slate-800"
                      >
                        <option value="cash">💵 Cash</option>
                        <option value="mBOB">📱 mBOB</option>
                        <option value="BNB">📱 BNB Pay</option>
                        <option value="TPay">📱 T-Pay</option>
                        <option value="DrukPNB">🏦 Druk PNB</option>
                        <option value="BDBL">🏦 BDBL</option>
                        <option value="DKBank">🏦 DKid (Digital Kidu)</option>
                        <option value="card">💳 Card Payment</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Date</label>
                      <input
                        type="date"
                        value={payData.date}
                        onChange={(e) => setPayData({ ...payData, date: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:bg-white transition-all text-sm font-medium text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Reference</label>
                    <input
                      type="text"
                      value={payData.reference}
                      onChange={(e) => setPayData({ ...payData, reference: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:bg-white transition-all text-sm font-medium text-slate-800"
                      placeholder="Cheque number, payment reference, etc."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Description</label>
                    <textarea
                      value={payData.description}
                      onChange={(e) => setPayData({ ...payData, description: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:bg-white transition-all text-sm font-medium text-slate-800 min-h-[60px] resize-none"
                      placeholder="Optional notes about this payment..."
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="flex-1 py-3 border-2 border-slate-200 rounded-xl hover:bg-slate-50 font-bold text-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 font-bold transition-colors shadow-lg shadow-red-600/20"
                >
                  Make Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 sm:p-8 my-auto shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 text-blue-600 rounded-lg">
                  <ArrowLeftRight className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Transfer Funds</h3>
                  <p className="text-sm text-slate-500 font-medium">Move money between accounts</p>
                </div>
              </div>
              <button
                onClick={() => setShowTransferModal(false)}
                className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
              >
                <ArrowLeftRight className="w-5 h-5 rotate-[135deg]" />
              </button>
            </div>

            <form onSubmit={handleTransfer} className="space-y-6">
              {/* Account Selection */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-400" /> Account Selection
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">From Account *</label>
                    <select
                      value={transferData.fromAccountId}
                      onChange={(e) => setTransferData({ ...transferData, fromAccountId: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all text-sm font-medium text-slate-800"
                      required
                    >
                      <option value={0}>Select Source</option>
                      {accounts.filter(a => !a.type || a.type === 'asset').map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name} ({account.code}) — Nu. {(account.balance || 0).toFixed(2)}
                        </option>
                      ))}
                    </select>
                    {accounts.length > 0 && accounts.filter(a => !a.type || a.type === 'asset').length === 0 && (
                      <p className="text-xs text-amber-600 mt-1">No asset accounts found. Total accounts: {accounts.length}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">To Account *</label>
                    <select
                      value={transferData.toAccountId}
                      onChange={(e) => setTransferData({ ...transferData, toAccountId: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all text-sm font-medium text-slate-800"
                      required
                    >
                      <option value={0}>Select Destination</option>
                      {accounts.filter(a => !a.type || a.type === 'asset').map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name} ({account.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Transfer Details */}
              <div className="border-t border-slate-200 pt-5">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2 mb-4">
                  <Wallet className="w-4 h-4 text-slate-400" /> Transfer Details
                </h4>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Amount *</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">Nu.</span>
                      <input
                        type="number"
                        value={transferData.amount}
                        onChange={(e) => setTransferData({ ...transferData, amount: Number(e.target.value) })}
                        className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all text-sm font-bold text-slate-800"
                        min={0.01}
                        step={0.01}
                        required
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Date</label>
                      <input
                        type="date"
                        value={transferData.date}
                        onChange={(e) => setTransferData({ ...transferData, date: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all text-sm font-medium text-slate-800"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Reference</label>
                      <input
                        type="text"
                        value={transferData.reference}
                        onChange={(e) => setTransferData({ ...transferData, reference: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all text-sm font-medium text-slate-800"
                        placeholder="Transfer reference"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Description</label>
                    <textarea
                      value={transferData.description}
                      onChange={(e) => setTransferData({ ...transferData, description: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all text-sm font-medium text-slate-800 min-h-[60px] resize-none"
                      placeholder="Reason for transfer..."
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="flex-1 py-3 border-2 border-slate-200 rounded-xl hover:bg-slate-50 font-bold text-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold transition-colors shadow-lg shadow-blue-600/20"
                >
                  Transfer Funds
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <PrintPreviewModal
        isOpen={showPrintPreview}
        onClose={() => setShowPrintPreview(false)}
        data={printData}
      />

      {/* Email Invoice Modal */}
      {showEmailInvoice && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 sm:p-8 my-auto shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 text-blue-600 rounded-lg">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Email Invoice</h3>
                  <p className="text-sm text-slate-500 font-medium">Send invoice #{emailInvoiceData.invoiceNo}</p>
                </div>
              </div>
              <button
                onClick={() => { setShowEmailInvoice(false); setEmailInvoiceData({ customerEmail: '', invoiceNo: '', totalAmount: 0, businessName: '' }); }}
                className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
              >
                <Mail className="w-5 h-5 rotate-[135deg]" />
              </button>
            </div>

            <div className="space-y-5">
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

              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Invoice No:</span>
                  <span className="font-bold text-slate-800">{emailInvoiceData.invoiceNo}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Total Amount:</span>
                  <span className="font-bold text-bhutan-maroon">Nu. {emailInvoiceData.totalAmount?.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowEmailInvoice(false); setEmailInvoiceData({ customerEmail: '', invoiceNo: '', totalAmount: 0, businessName: '' }); }}
                  className="flex-1 py-3 border-2 border-slate-200 rounded-xl hover:bg-slate-50 font-bold text-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEmailInvoice}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold transition-colors shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  Send Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
