import { useState, useEffect } from 'react';
import { FileText, Printer, Download, Loader2 } from 'lucide-react';
import DOMPurify from 'dompurify';
import { useAppStore } from '../store/appStore';

export function CustomerStatementPage() {
  const { showNotification } = useAppStore();
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<number>(0);
  const [statementData, setStatementData] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => { loadCustomers(); }, []);

  const loadCustomers = async () => {
    const api = window.electronSecureAPI;
    if (!api?.contacts) { setCustomers([]); return; }
    try {
      const result = await api.contacts.getAll('customer');
      if (result?.success) setCustomers(result.data || []);
      else setCustomers([]);
    } catch { setCustomers([]); }
  };

  const generateStatement = async () => {
    if (!selectedCustomer) {
      showNotification('Select a customer', 'error');
      return;
    }

    const api = window.electronSecureAPI;
    if (!api?.contacts) {
      showNotification('Backend not available', 'error');
      return;
    }

    setIsGenerating(true);
    setStatementData(null);

    try {
      // 1. Get the full ledger for the contact
      const ledgerResult = await api.contacts.getLedger(selectedCustomer);

      if (!ledgerResult?.success || !ledgerResult.data) {
        showNotification(ledgerResult?.message || 'Failed to fetch ledger data', 'error');
        setIsGenerating(false);
        return;
      }

      const ledger = ledgerResult.data;
      const contact = ledger.contact;
      const allEntries = Array.isArray(ledger.entries) ? ledger.entries : [];

      // 2. Filter transactions for the selected period
      const filteredTx = allEntries.filter((t: any) => t.date >= startDate && t.date <= endDate);

      // 3. Calculate Opening Balance for the PERIOD
      // Period Opening Balance = Start-of-Time Opening Balance + Sum(Net of all transactions BEFORE startDate)
      const balanceBeforePeriod = allEntries
        .filter((t: any) => t.date < startDate)
        .reduce((sum: number, t: any) => sum + (Number(t.debit) - Number(t.credit)), 0);

      const periodOpeningBalance = Number(ledger.openingBalance || 0) + balanceBeforePeriod;

      // 4. Calculate Closing Balance for the PERIOD
      const periodNetChange = filteredTx.reduce((sum: number, t: any) => sum + (Number(t.debit) - Number(t.credit)), 0);
      const periodClosingBalance = periodOpeningBalance + periodNetChange;

      setStatementData({
        customer: contact,
        period: { startDate, endDate },
        openingBalance: periodOpeningBalance,
        transactions: filteredTx,
        closingBalance: periodClosingBalance,
      });
    } catch (error) {
      console.error('Statement generation error:', error);
      showNotification('Failed to generate statement', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return 'Nu. ' + new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Escape HTML for safe use in print templates
  const escapeHtml = (unsafe: string): string => {
    if (!unsafe) return '';
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const printStatement = () => {
    if (!statementData) return;
    const rawPrintContent = document.getElementById('statement-content')?.innerHTML;
    if (!rawPrintContent) return;

    // SECURITY: Sanitize HTML before printing to prevent XSS
    const printContent = DOMPurify.sanitize(rawPrintContent, {
      ALLOWED_TAGS: [
        'div', 'span', 'p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'caption',
        'strong', 'b', 'em', 'i', 'u', 'strike', 'sup', 'sub',
        'ul', 'ol', 'li', 'dl', 'dt', 'dd',
        'a', 'img', 'svg', 'path', 'g', 'circle', 'rect', 'line', 'polyline', 'polygon',
        'style', 'defs', 'use', 'text', 'tspan',
        'header', 'footer', 'main', 'section', 'article', 'aside', 'nav'
      ],
      ALLOWED_ATTR: [
        'class', 'id', 'style', 'title', 'dir', 'lang', 'xml:lang',
        'data-*', 'role', 'aria-*',
        'colspan', 'rowspan', 'scope', 'headers', 'border', 'cellpadding', 'cellspacing',
        'href', 'target', 'rel', 'src', 'alt', 'width', 'height', 'title',
        'viewBox', 'd', 'fill', 'stroke', 'stroke-width', 'cx', 'cy', 'r',
        'x', 'y', 'x1', 'y1', 'x2', 'y2', 'points', 'transform',
        'xmlns', 'xmlns:xlink'
      ],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout', 'onfocus', 'onblur'],
    });

    // Create a hidden iframe for printing to avoid pop-up blockers and maintain styling
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.write(`
        <html>
          <head>
            <title>Customer Statement - ${escapeHtml(statementData.customer.name)}</title>
            <style>
              body { font-family: 'Inter', system-ui, sans-serif; padding: 40px; color: #1e293b; }
              .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; }
              .header h2 { margin: 0; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; }
              .summary { display: grid; grid-template-cols: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
              .summary-box { background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; }
              .summary-label { font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
              .summary-value { font-size: 18px; font-weight: 700; color: #0f172a; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th { text-align: left; padding: 12px; background: #f1f5f9; font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase; border: 1px solid #e2e8f0; }
              td { padding: 12px; border: 1px solid #e2e8f0; font-size: 12px; color: #334155; }
              .text-right { text-align: right; }
              .font-bold { font-weight: 700; }
              .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #94a3b8; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>Account Statement</h2>
              <p style="margin: 5px 0; font-weight: 600;">${escapeHtml(statementData.customer.name)}</p>
              <p style="font-size: 12px; color: #64748b;">Period: ${escapeHtml(statementData.period.startDate)} to ${escapeHtml(statementData.period.endDate)}</p>
            </div>
            <div class="summary">
              <div class="summary-box">
                <div class="summary-label">Opening Balance</div>
                <div class="summary-value">${formatCurrency(statementData.openingBalance)}</div>
              </div>
              <div class="summary-box">
                <div class="summary-label">Closing Balance</div>
                <div class="summary-value">${formatCurrency(statementData.closingBalance)}</div>
              </div>
            </div>
            ${printContent.includes('table') ? printContent : '<p style="text-align:center">No transactions in this period</p>'}
            <div class="footer">
              Generated on ${new Date().toLocaleString()} | powered by Phojaa95
            </div>
          </body>
        </html>
      `);
      doc.close();

      // Wait for resources to load if any, then print
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 500);
    }
  };

  return (
    <div className="space-y-8 pb-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Customer Statements</h1>
          <p className="text-slate-500 font-medium">Generate precise account statements for any period</p>
        </div>
        {statementData && (
          <div className="flex gap-3">
            <button
              onClick={printStatement}
              className="flex items-center gap-2 px-5 py-3 bg-white border-2 border-slate-100 rounded-2xl hover:border-bhutan-maroon/20 hover:bg-slate-50 text-sm font-black text-slate-600 transition-all active:scale-95"
            >
              <Printer className="w-4 h-4" /> Print Statement
            </button>
            <button className="flex items-center gap-2 px-5 py-3 bg-slate-900 text-white rounded-2xl hover:bg-bhutan-maroon text-sm font-black shadow-lg shadow-slate-900/10 transition-all active:scale-95">
              <Download className="w-4 h-4" /> Export PDF
            </button>
          </div>
        )}
      </div>

      {/* Filter Card */}
      <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 p-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Select Customer</label>
            <select
              value={selectedCustomer || ''}
              onChange={(e) => setSelectedCustomer(Number(e.target.value))}
              className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold text-slate-800 focus:bg-white focus:border-bhutan-maroon/20 focus:ring-4 focus:ring-bhutan-maroon/5 transition-all outline-none"
            >
              <option value={0}>Choose a customer...</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold text-slate-800 focus:bg-white focus:border-bhutan-maroon/20 focus:ring-4 focus:ring-bhutan-maroon/5 transition-all outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold text-slate-800 focus:bg-white focus:border-bhutan-maroon/20 focus:ring-4 focus:ring-bhutan-maroon/5 transition-all outline-none"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={generateStatement}
              disabled={isGenerating}
              className="w-full py-4 bg-bhutan-maroon text-white rounded-2xl hover:bg-bhutan-maroon-dark font-black text-sm shadow-xl shadow-bhutan-maroon/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Generate Statement'}
            </button>
          </div>
        </div>
      </div>

      {/* Results Section */}
      {statementData && (
        <div className="bg-white rounded-[40px] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-8 duration-700">
          <div id="statement-content" className="p-10">
            <div className="flex flex-col items-center mb-10">
              <div className="w-16 h-16 bg-bhutan-maroon/5 rounded-3xl flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-bhutan-maroon" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Statement of Account</h2>
              <div className="h-1 w-12 bg-bhutan-maroon rounded-full mt-2 mb-4"></div>
              <p className="text-slate-500 font-bold text-sm tracking-wide">
                {statementData.customer.name} • {statementData.period.startDate} to {statementData.period.endDate}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
              <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-100 p-8 rounded-[32px] group hover:shadow-lg transition-all duration-500">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Opening Balance</p>
                <p className="text-3xl font-black text-slate-900">{formatCurrency(statementData.openingBalance)}</p>
                <div className="h-0.5 w-8 bg-slate-200 mt-4 group-hover:w-16 transition-all"></div>
              </div>
              <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-100 p-8 rounded-[32px] group hover:shadow-lg transition-all duration-500">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Closing Balance</p>
                <p className={`text-3xl font-black ${statementData.closingBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(statementData.closingBalance)}
                </p>
                <div className={`h-0.5 w-8 mt-4 group-hover:w-16 transition-all ${statementData.closingBalance >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
              </div>
            </div>

            {statementData.transactions.length === 0 ? (
              <div className="text-center py-20 bg-slate-50/50 rounded-[32px] border-2 border-dashed border-slate-200">
                <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No transactions recorded in this period</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-slate-100">
                      <th className="text-left py-5 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Date</th>
                      <th className="text-left py-5 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Ref #</th>
                      <th className="text-left py-5 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Description</th>
                      <th className="text-right py-5 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Debit (+)</th>
                      <th className="text-right py-5 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Credit (-)</th>
                      <th className="text-right py-5 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Running Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {statementData.transactions.map((t: any, idx: number) => {
                      const prevBalance = statementData.openingBalance + statementData.transactions.slice(0, idx).reduce((s: number, tx: any) => s + (Number(tx.debit) - Number(tx.credit)), 0);
                      const balance = prevBalance + (Number(t.debit) - Number(t.credit));
                      return (
                        <tr key={t.id} className="group hover:bg-slate-50/80 transition-colors">
                          <td className="py-5 px-4 text-sm font-bold text-slate-500">{t.date}</td>
                          <td className="py-5 px-4 text-sm font-mono font-black text-slate-800">{t.transaction_no || t.transactionNo}</td>
                          <td className="py-5 px-4 text-sm font-bold text-slate-600 max-w-xs truncate">
                            {t.description || t.type}
                            {t.paymentMode && (
                              <span className="ml-2 px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-[10px] font-bold uppercase">
                                {t.paymentMode}
                              </span>
                            )}
                          </td>
                          <td className="py-5 px-4 text-sm text-right font-black text-emerald-600">
                            {Number(t.debit) > 0 ? formatCurrency(Number(t.debit)) : <span className="text-slate-300 opacity-50">—</span>}
                          </td>
                          <td className="py-5 px-4 text-sm text-right font-black text-red-600">
                            {Number(t.credit) > 0 ? formatCurrency(Number(t.credit)) : <span className="text-slate-300 opacity-50">—</span>}
                          </td>
                          <td className={`py-5 px-4 text-sm font-black text-right ${balance >= 0 ? 'text-slate-900 bg-slate-50/50' : 'text-red-700 bg-red-50/30'}`}>
                            {formatCurrency(balance)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
