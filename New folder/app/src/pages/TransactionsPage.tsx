import { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Trash2,
  Printer
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

  const [receiveData, setReceiveData] = useState({
    contactId: undefined as number | undefined,
    amount: 0,
    paymentMode: 'cash' as PaymentMode,
    date: new Date().toISOString().split('T')[0],
    reference: '',
    description: '',
  });

  const [payData, setPayData] = useState({
    contactId: undefined as number | undefined,
    accountId: 0,
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

      const result = await window.electronAPI.transactions.getAll(filters);
      if (result) {
        setTransactions(result);
      }
    } catch (error) {
      showNotification('Failed to load transactions', 'error');
    }
  };

  const loadContacts = async () => {
    try {
      const result = await window.electronAPI.contacts.getAll();
      if (result) {
        setContacts(result);
      }
    } catch (error) {
      console.error('Failed to load contacts:', error);
    }
  };

  const loadAccounts = async () => {
    try {
      const result = await window.electronAPI.accounts.getAll();
      if (result.success && result.data) {
        // Filter for cash and bank accounts primarily for transfers
        setAccounts(result.data);
      }
    } catch (error) {
      console.error('Failed to load accounts:', error);
    }
  };

  const handleReceiveMoney = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await window.electronAPI.transactions.receiveMoney(receiveData);
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
    try {
      const result = await window.electronAPI.transactions.payMoney(payData);
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
      const result = await window.electronAPI.transactions.transfer(transferData);
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
      const result = await window.electronAPI.transactions.getInvoiceData(transaction.id);
      if (result.success && result.data) {
        const invoice = result.data;
        const settings = await window.electronAPI.settings.get();

        const mappedData: PrintInvoiceData = {
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
          customerName: invoice.customer_name,
          customerAddress: invoice.customer_address,
          customerPhone: invoice.customer_phone,
          customerGst: invoice.customer_gst,
          items: invoice.items,
          subtotal: invoice.subtotal,
          gstAmount: invoice.gst_amount,
          discountAmount: invoice.discount_amount,
          totalAmount: invoice.total_amount,
          paymentMode: transaction.paymentMode || transaction.payment_mode,
          amountPaid: invoice.total_amount - invoice.balance_due,
          balanceDue: invoice.balance_due,
          terms: invoice.terms || 'Goods once sold will not be taken back.',
          notes: invoice.notes || '',
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
      const result = await window.electronAPI.transactions.void(id, reason);
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
      <div className="flex gap-4">
        <button
          onClick={() => setShowReceiveModal(true)}
          className="flex-1 flex items-center justify-center gap-3 bg-emerald-500 text-white px-6 py-5 rounded-[24px] hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/10 active:scale-95 font-black uppercase tracking-widest text-xs"
        >
          <div className="p-2 bg-white/20 rounded-xl">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
          Receive Payment
        </button>
        <button
          onClick={() => setShowPayModal(true)}
          className="flex-1 flex items-center justify-center gap-3 bg-red-500 text-white px-6 py-5 rounded-[24px] hover:bg-red-600 transition-all shadow-lg shadow-red-500/10 active:scale-95 font-black uppercase tracking-widest text-xs"
        >
          <div className="p-2 bg-white/20 rounded-xl">
            <ArrowUpRight className="w-5 h-5" />
          </div>
          Make Payment
        </button>
        <button
          onClick={() => setShowTransferModal(true)}
          className="flex-1 flex items-center justify-center gap-3 bg-bhutan-orange text-white px-6 py-5 rounded-[24px] hover:bg-bhutan-orange-dark transition-all shadow-lg shadow-bhutan-orange/10 active:scale-95 font-black uppercase tracking-widest text-xs"
        >
          <div className="p-2 bg-white/20 rounded-xl">
            <RefreshCw className="w-5 h-5" />
          </div>
          Fund Transfer
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
                <td className="py-5 px-4 text-right">
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
                          <button
                            onClick={() => handlePrintPreview(transaction)}
                            className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 hover:text-bhutan-maroon hover:bg-bhutan-maroon/10 rounded-xl transition-all"
                            title="Print Invoice"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Receive Money</h3>
            <form onSubmit={handleReceiveMoney} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From (Optional)</label>
                <select
                  value={receiveData.contactId || ''}
                  onChange={(e) => setReceiveData({ ...receiveData, contactId: Number(e.target.value) || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Cash Sale / Other</option>
                  {contacts.filter(c => c.type === 'customer').map((contact) => (
                    <option key={contact.id} value={contact.id}>{contact.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                <input
                  type="number"
                  value={receiveData.amount}
                  onChange={(e) => setReceiveData({ ...receiveData, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  min={0}
                  step={0.01}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
                <select
                  value={receiveData.paymentMode}
                  onChange={(e) => setReceiveData({ ...receiveData, paymentMode: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="cash">Cash</option>
                  <option value="mBOB">mBOB</option>
                  <option value="BNB">BNB Pay</option>
                  <option value="TPay">T-Pay</option>
                  <option value="DrukPNB">Druk PNB</option>
                  <option value="BDBL">BDBL</option>
                  <option value="DKBank">DKid (Digital Kidu)</option>
                  <option value="card">Card Payment</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={receiveData.date}
                  onChange={(e) => setReceiveData({ ...receiveData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
                <input
                  type="text"
                  value={receiveData.reference}
                  onChange={(e) => setReceiveData({ ...receiveData, reference: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder="Cheque number, reference, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={receiveData.description}
                  onChange={(e) => setReceiveData({ ...receiveData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  rows={2}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowReceiveModal(false)}
                  className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  Receive
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Money Modal */}
      {showPayModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Pay Money</h3>
            <form onSubmit={handlePayMoney} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To (Optional)</label>
                <select
                  value={payData.contactId || ''}
                  onChange={(e) => setPayData({ ...payData, contactId: Number(e.target.value) || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Expense / Other</option>
                  {contacts.filter(c => c.type === 'supplier').map((contact) => (
                    <option key={contact.id} value={contact.id}>{contact.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                <input
                  type="number"
                  value={payData.amount}
                  onChange={(e) => setPayData({ ...payData, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  min={0}
                  step={0.01}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
                <select
                  value={payData.paymentMode}
                  onChange={(e) => setPayData({ ...payData, paymentMode: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="cash">Cash</option>
                  <option value="mBOB">mBOB</option>
                  <option value="BNB">BNB Pay</option>
                  <option value="TPay">T-Pay</option>
                  <option value="DrukPNB">Druk PNB</option>
                  <option value="BDBL">BDBL</option>
                  <option value="DKBank">DKid (Digital Kidu)</option>
                  <option value="card">Card Payment</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={payData.date}
                  onChange={(e) => setPayData({ ...payData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={payData.description}
                  onChange={(e) => setPayData({ ...payData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  rows={2}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Pay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Transfer Money</h3>
            <form onSubmit={handleTransfer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Account *</label>
                <select
                  value={transferData.fromAccountId}
                  onChange={(e) => setTransferData({ ...transferData, fromAccountId: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  <option value={0}>Select Account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>{account.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Account *</label>
                <select
                  value={transferData.toAccountId}
                  onChange={(e) => setTransferData({ ...transferData, toAccountId: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  <option value={0}>Select Account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>{account.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                <input
                  type="number"
                  value={transferData.amount}
                  onChange={(e) => setTransferData({ ...transferData, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  min={0}
                  step={0.01}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={transferData.date}
                  onChange={(e) => setTransferData({ ...transferData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
                <input
                  type="text"
                  value={transferData.reference}
                  onChange={(e) => setTransferData({ ...transferData, reference: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Transfer
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
    </div>
  );
}
