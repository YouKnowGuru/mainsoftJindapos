import { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import {
  FileText,
  Printer,
  Calendar,
  TrendingUp,
  Scale,
  Package,
  Users,
  ShoppingCart,
  Wallet
} from 'lucide-react';
import { useAppStore } from '../store/appStore';

export function ReportsPage() {
  const { showNotification } = useAppStore();
  const [activeReport, setActiveReport] = useState<string>('trial-balance');
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(1);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState<any>(null);

  const reports = [
    { id: 'trial-balance', label: 'Trial Balance', icon: Scale },
    { id: 'profit-loss', label: 'Profit & Loss', icon: TrendingUp },
    { id: 'balance-sheet', label: 'Balance Sheet', icon: FileText },
    { id: 'outstanding', label: 'Outstanding', icon: Users },
    { id: 'stock', label: 'Stock Report', icon: Package },
    { id: 'sales', label: 'Sales Report', icon: TrendingUp },
    { id: 'purchases', label: 'Purchase Report', icon: ShoppingCart },
    { id: 'payroll', label: 'Payroll Report', icon: Wallet },
  ];

  useEffect(() => {
    loadReport();
  }, [activeReport, startDate, endDate]);

  const handlePrint = async () => {
    if (!reportData) return;

    try {
      const reportTitle = reports.find(r => r.id === activeReport)?.label || 'Report';

      // Use dedicated payroll print template for payroll reports
      if (activeReport === 'payroll') {
        const result = await window.electronSecureAPI.print.payrollReport(reportTitle, reportData);
        if (result.success) {
          showNotification('Payroll report sent to printer', 'success');
        } else {
          showNotification(result.message || 'Failed to print', 'error');
        }
        return;
      }

      const content = document.querySelector('.report-content-to-print')?.innerHTML;

      if (!content) {
        showNotification('No content to print', 'error');
        return;
      }

      // SECURITY: Sanitize HTML before sending to print service
      const sanitizedContent = DOMPurify.sanitize(content, {
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
          // Table attributes
          'colspan', 'rowspan', 'scope', 'headers', 'border', 'cellpadding', 'cellspacing',
          // Link/image attributes
          'href', 'target', 'rel', 'src', 'alt', 'width', 'height', 'title',
          // SVG attributes
          'viewBox', 'd', 'fill', 'stroke', 'stroke-width', 'cx', 'cy', 'r',
          'x', 'y', 'x1', 'y1', 'x2', 'y2', 'points', 'transform',
          'xmlns', 'xmlns:xlink'
        ],
        FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout', 'onfocus', 'onblur'],
      });

      const result = await window.electronSecureAPI.print.report(reportTitle, sanitizedContent);
      if (result.success) {
        showNotification('Report sent to printer', 'success');
      } else {
        showNotification(result.message || 'Failed to print', 'error');
      }
    } catch (error) {
      showNotification('Failed to process print request', 'error');
    }
  };

  const loadReport = async () => {
    // Validate date range
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      setReportData(null);
      return;
    }

    try {
      setReportData(null); // Reset before loading to prevent stale state crashes
      let result;
      switch (activeReport) {
        case 'trial-balance':
          result = await window.electronSecureAPI.reports.trialBalance(endDate);
          break;
        case 'profit-loss':
          result = await window.electronSecureAPI.reports.profitLoss(startDate, endDate);
          break;
        case 'balance-sheet':
          result = await window.electronSecureAPI.reports.balanceSheet(endDate);
          break;
        case 'outstanding':
          result = await window.electronSecureAPI.reports.outstanding();
          break;
        case 'stock':
          result = await window.electronSecureAPI.reports.stockReport();
          break;
        case 'sales':
          result = await window.electronSecureAPI.reports.salesReport(startDate, endDate);
          break;
        case 'purchases':
          result = await (window as any).electronSecureAPI.reports.purchaseReport(startDate, endDate);
          break;
        case 'payroll':
          result = await (window as any).electronSecureAPI.reports.payrollReport(startDate, endDate);
          break;

        default:
          return;
      }

      if (result?.success) {
        setReportData(result.data);
      }
    } catch (error) {
      showNotification('Failed to load report', 'error');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'BTN',
      minimumFractionDigits: 2,
    }).format(amount).replace('BTN', 'Nu.');
  };

  /**
   * Render the selected report
   */
  const renderReport = () => {
    if (!reportData) return null;

    switch (activeReport) {
      case 'trial-balance':
        return renderTrialBalance();
      case 'profit-loss':
        return renderProfitLoss();
      case 'balance-sheet':
        return renderBalanceSheet();
      case 'outstanding':
        return renderOutstanding();
      case 'stock':
        return renderStockReport();
      case 'sales':
        return renderSalesReport();
      case 'purchases':
        return renderPurchaseReport();
      case 'payroll':
        return renderPayrollReport();
      default:
        return null;
    }
  };

  /**
   * Render Trial Balance Report
   */
  const renderTrialBalance = () => {
    if (!reportData || !reportData.totals) return null;
    const { data, totals } = reportData;

    if (!data || data.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          No records found for this period.
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="overflow-hidden bg-slate-50 rounded-[32px] border border-slate-100">
          <div className="overflow-x-auto w-full">
<table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-100/50">
                <th className="text-left py-6 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Account Code</th>
                <th className="text-left py-6 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Ledger Name</th>
                <th className="text-right py-6 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Debit Balance</th>
                <th className="text-right py-6 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Credit Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((item: any) => (
                <tr key={item.code} className="group hover:bg-white transition-colors">
                  <td className="py-4 px-6">
                    <span className="text-xs font-black text-slate-400 tracking-widest">{item.code}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-sm font-bold text-slate-700">{item.name}</span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className="text-sm font-black text-slate-900">{item.debit > 0 ? formatCurrency(item.debit) : '--'}</span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <span className="text-sm font-black text-bhutan-maroon">{item.credit > 0 ? formatCurrency(item.credit) : '--'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-900">
                <td colSpan={2} className="py-6 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Consolidated Totals</td>
                <td className="py-6 px-4 text-right text-lg font-black text-bhutan-gold">{formatCurrency(totals.debit)}</td>
                <td className="py-6 px-6 text-right text-lg font-black text-bhutan-gold">{formatCurrency(totals.credit)}</td>
              </tr>
            </tfoot>
          </table>
</div>
        </div>
      </div>
    );
  };

  /**
   * Render Profit & Loss Report
   */
  const renderProfitLoss = () => {
    if (!reportData || !reportData.revenue) return null;
    const data = reportData;
    const { revenue, expenses, netProfit, grossProfit } = data;

    return (
      <div className="space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Revenue */}
          <div className="p-8 bg-emerald-50 rounded-[40px] border border-emerald-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-24 h-24 text-emerald-900" />
            </div>
            <h4 className="text-xs font-black text-emerald-600 uppercase tracking-[0.2em] mb-6">Revenue & Income</h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-white/50 p-4 rounded-2xl">
                <span className="text-sm font-bold text-slate-600">Product Sales</span>
                <span className="truncate text-lg font-black text-slate-900" title={formatCurrency(revenue.sales)}>{formatCurrency(revenue.sales)}</span>
              </div>
              <div className="flex justify-between items-center bg-white/50 p-4 rounded-2xl">
                <span className="text-sm font-bold text-slate-600">Other Income</span>
                <span className="truncate text-lg font-black text-slate-900" title={formatCurrency(revenue.otherIncome)}>{formatCurrency(revenue.otherIncome)}</span>
              </div>
              <div className="flex justify-between items-center p-4 pt-6 border-t border-emerald-200">
                <span className="text-xs font-black text-emerald-800 uppercase tracking-widest">Total Revenue</span>
                <span className="truncate text-2xl font-black text-emerald-600" title={formatCurrency(revenue.total)}>{formatCurrency(revenue.total)}</span>
              </div>
            </div>
          </div>

          {/* Expenses */}
          <div className="p-8 bg-red-50 rounded-[40px] border border-red-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-24 h-24 text-red-900 rotate-180" />
            </div>
            <h4 className="text-xs font-black text-red-600 uppercase tracking-[0.2em] mb-6">Operational Expenditures</h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-white/50 p-4 rounded-2xl">
                <span className="text-sm font-bold text-slate-600">COGS</span>
                <span className="truncate text-lg font-black text-slate-900" title={formatCurrency(expenses.cogs)}>{formatCurrency(expenses.cogs)}</span>
              </div>
              <div className="flex justify-between items-center bg-white/50 p-4 rounded-2xl">
                <span className="text-sm font-bold text-slate-600">Operating Cost</span>
                <span className="truncate text-lg font-black text-slate-900" title={formatCurrency(expenses.operating)}>{formatCurrency(expenses.operating)}</span>
              </div>
              <div className="flex justify-between items-center bg-white/50 p-4 rounded-2xl">
                <span className="text-sm font-bold text-slate-600">Other Expenses</span>
                <span className="truncate text-lg font-black text-slate-900" title={formatCurrency(expenses.other)}>{formatCurrency(expenses.other)}</span>
              </div>
              <div className="flex justify-between items-center p-4 pt-6 border-t border-red-200">
                <span className="text-xs font-black text-red-800 uppercase tracking-widest">Total Expenses</span>
                <span className="truncate text-2xl font-black text-red-500" title={formatCurrency(expenses.total)}>{formatCurrency(expenses.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Footer */}
        <div className="bg-slate-900 rounded-[32px] p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-2xl shadow-slate-900/20">
          <div>
            <p className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] mb-1">Business Performance</p>
            <p className="text-white font-bold opacity-60">Consolidated Net Profit for the selected period</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-4 justify-end mb-1">
              <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Gross Profit:</span>
              <span className="truncate text-lg font-black text-white" title={formatCurrency(grossProfit)}>{formatCurrency(grossProfit)}</span>
            </div>
            <div className="flex items-center gap-6 justify-end">
              <span className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Net Result:</span>
              <span className={`truncate max-w-[200px] sm:max-w-xs md:max-w-sm text-5xl font-black ${netProfit >= 0 ? 'text-bhutan-gold' : 'text-red-400'}`} title={formatCurrency(netProfit)}>
                {formatCurrency(netProfit)}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  /**
   * Render Balance Sheet Report
   */
  const renderBalanceSheet = () => {
    const data = reportData;
    if (!data || !data.assets || !data.assets.current) {
      return (
        <div className="text-center py-12 text-gray-500">
          No records found for this period.
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Scale className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-black text-emerald-600 uppercase tracking-[0.3em]">Corporate Assets</h4>
          </div>
          <div className="space-y-8 bg-slate-50/50 p-8 rounded-[32px] border border-slate-100">
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Current Assets</p>
              <div className="space-y-2">
                {data.assets.current?.map((item: any) => (
                  <div key={`ca-${item.name}`} className="flex justify-between p-4 bg-white rounded-2xl shadow-sm">
                    <span className="text-sm font-bold text-slate-600">{item.name}</span>
                    <span className="text-sm font-black text-slate-900">{formatCurrency(item.balance)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Fixed Assets</p>
              <div className="space-y-2">
                {data.assets.fixed?.map((item: any) => (
                  <div key={`fa-${item.name}`} className="flex justify-between p-4 bg-white rounded-2xl shadow-sm">
                    <span className="text-sm font-bold text-slate-600">{item.name}</span>
                    <span className="text-sm font-black text-slate-900">{formatCurrency(item.balance)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-between p-6 bg-slate-900 rounded-[28px] shadow-xl">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Assets</span>
              <span className="truncate text-2xl font-black text-bhutan-gold" title={formatCurrency(data.assets.total)}>{formatCurrency(data.assets.total)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-bhutan-maroon/5 text-bhutan-maroon rounded-xl">
              <Scale className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-black text-bhutan-maroon uppercase tracking-[0.3em]">Liabilities & Capital</h4>
          </div>
          <div className="space-y-8 bg-slate-50/50 p-8 rounded-[32px] border border-slate-100">
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Current Liabilities</p>
              <div className="space-y-2">
                {data.liabilities.current?.map((item: any) => (
                  <div key={`cl-${item.name}`} className="flex justify-between p-4 bg-white rounded-2xl shadow-sm">
                    <span className="text-sm font-bold text-slate-600">{item.name}</span>
                    <span className="text-sm font-black text-slate-900">{formatCurrency(item.balance)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Equity / Capital</p>
              <div className="space-y-2">
                {data.equity?.map((item: any) => (
                  <div key={`eq-${item.name}`} className="flex justify-between p-4 bg-white rounded-2xl shadow-sm">
                    <span className="text-sm font-bold text-slate-600">{item.name}</span>
                    <span className="text-sm font-black text-slate-900">{formatCurrency(item.balance)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-between p-6 bg-bhutan-maroon rounded-[28px] shadow-xl">
              <span className="text-xs font-black text-white/50 uppercase tracking-widest">Total Balance</span>
              <span className="truncate text-2xl font-black text-white" title={formatCurrency(data.totalEquity)}>{formatCurrency(data.totalEquity)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  /**
   * Render Outstanding Report
   */
  const renderOutstanding = () => {
    const data = reportData?.data;

    if (!data || data.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          No outstanding items found.
        </div>
      );
    }

    const totalOutstanding = reportData.total || 0;

    return (
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-red-50 p-8 rounded-[40px] border border-red-100 shadow-xl shadow-red-500/5">
          <div>
            <p className="text-xs font-black text-red-600 uppercase tracking-[0.3em] mb-1">Money to Collect</p>
            <p className="text-sm font-bold text-slate-500">Uncollected dues from all trade partners</p>
          </div>
          <div className="text-right">
            <span className="truncate text-4xl font-black text-red-600" title={formatCurrency(totalOutstanding)}>{formatCurrency(totalOutstanding)}</span>
            <span className="block text-xs font-black text-red-300 uppercase tracking-widest mt-1">Net Exposure</span>
          </div>
        </div>

        <div className="overflow-hidden bg-slate-50 rounded-[32px] border border-slate-100">
          <div className="overflow-x-auto w-full">
<table className="w-full">
            <thead>
              <tr className="bg-slate-100/50">
                <th className="text-left py-6 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Trade Partner</th>
                <th className="text-left py-6 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Contact</th>
                <th className="text-right py-6 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Live Balance</th>
                <th className="text-right py-6 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Due Amount</th>
                <th className="text-center py-6 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Aging</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((item: any) => (
                <tr key={item.id} className="group hover:bg-white transition-colors">
                  <td className="py-5 px-6">
                    <span className="text-sm font-black text-slate-800">{item.name}</span>
                  </td>
                  <td className="py-5 px-4 text-sm font-medium text-slate-500">{item.phone}</td>
                  <td className="py-5 px-4 text-right text-sm font-bold text-slate-400">{formatCurrency(item.currentBalance)}</td>
                  <td className="py-5 px-4 text-right">
                    <span className="truncate text-lg font-black text-red-500" title={formatCurrency(item.totalDue)}>{formatCurrency(item.totalDue)}</span>
                  </td>
                  <td className="py-5 px-6 text-center">
                    <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${(item.daysOverdue || 0) > 30 ? 'bg-red-50 text-red-500' : 'bg-bhutan-orange/10 text-bhutan-orange'
                      }`}>
                      {Math.round(item.daysOverdue || 0)} Days Over
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
</div>
        </div>
      </div>
    );
  };

  /**
   * Render Stock Report
   */
  const renderStockReport = () => {
    const data = reportData?.data;

    if (!data || data.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          No stock items found.
        </div>
      );
    }

    const totalValue = reportData.summary?.totalValue || 0;

    return (
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-emerald-50 p-8 rounded-[40px] border border-emerald-100 shadow-xl shadow-emerald-500/5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-black text-emerald-600 uppercase tracking-[0.3em] mb-1">Inventory Valuation</p>
              <p className="text-sm font-bold text-slate-500">Net worth of current stock on hand</p>
            </div>
          </div>
          <div className="text-right">
            <span className="truncate text-4xl font-black text-emerald-600" title={formatCurrency(totalValue)}>{formatCurrency(totalValue)}</span>
            <span className="block text-xs font-black text-emerald-300 uppercase tracking-widest mt-1">Total Assets Value</span>
          </div>
        </div>

        <div className="overflow-hidden bg-slate-50 rounded-[32px] border border-slate-100">
          <div className="overflow-x-auto w-full">
<table className="w-full">
            <thead>
              <tr className="bg-slate-100/50">
                <th className="text-left py-6 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Inventory Item</th>
                <th className="text-center py-6 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Stock Level</th>
                <th className="text-right py-6 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Unit Cost</th>
                <th className="text-right py-6 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Asset Value</th>
                <th className="text-center py-6 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Risk Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((item: any) => (
                <tr key={item.id} className="group hover:bg-white transition-colors">
                  <td className="py-5 px-6">
                    <span className="text-sm font-black text-slate-800">{item.name}</span>
                  </td>
                  <td className="py-5 px-4 text-center">
                    <span className="text-sm font-black text-slate-900">{item.quantityInStock}</span>
                  </td>
                  <td className="py-5 px-4 text-right text-sm font-medium text-slate-400">{formatCurrency(item.averageCost)}</td>
                  <td className="py-5 px-4 text-right">
                    <span className="text-sm font-black text-slate-900">{formatCurrency(item.stockValue)}</span>
                  </td>
                  <td className="py-5 px-6 text-center">
                    <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${item.stockStatus === 'In Stock' ? 'bg-emerald-50 text-emerald-600' :
                      item.stockStatus === 'Low Stock' ? 'bg-bhutan-orange/10 text-bhutan-orange' :
                        'bg-red-50 text-red-500'
                      }`}>
                      {item.stockStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
</div>
        </div>
      </div>
    );
  };

  /**
   * Render Sales Report
   */
  const renderSalesReport = () => {
    if (!reportData || !reportData.transactions) return null;
    const salesList = reportData.transactions;

    if (!salesList || salesList.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          No sales records found for this period.
        </div>
      );
    }

    // Use totalRevenue (excl. GST) for the main display
    const totalRevenue = reportData.summary?.totalRevenue || 0;
    const totalGst = reportData.summary?.totalGst || 0;
    const totalTransactions = reportData.summary?.totalTransactions || 0;
    const avgSale = reportData.summary?.averageSale || 0;

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-slate-900 p-6 rounded-[32px] shadow-2xl shadow-slate-900/20">
            <p className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] mb-1">Total Revenue (excl. GST)</p>
            <p className="truncate text-2xl font-black text-white" title={formatCurrency(totalRevenue)}>{formatCurrency(totalRevenue)}</p>
          </div>
          <div className="bg-purple-50 p-6 rounded-[32px] border border-purple-100">
            <p className="text-xs font-black text-purple-600 uppercase tracking-[0.3em] mb-1">GST Collected</p>
            <p className="truncate text-2xl font-black text-purple-700" title={formatCurrency(totalGst)}>{formatCurrency(totalGst)}</p>
          </div>
          <div className="bg-blue-50 p-6 rounded-[32px] border border-blue-100">
            <p className="text-xs font-black text-blue-600 uppercase tracking-[0.3em] mb-1">Transactions</p>
            <p className="text-2xl font-black text-blue-700">{totalTransactions}</p>
          </div>
          <div className="bg-red-50 p-6 rounded-[32px] border border-red-100">
            <p className="text-xs font-black text-red-600 uppercase tracking-[0.3em] mb-1">Total Discounts</p>
            <p className="truncate text-2xl font-black text-red-700" title={formatCurrency(reportData.summary?.totalDiscount || 0)}>{formatCurrency(reportData.summary?.totalDiscount || 0)}</p>
          </div>
          <div className="bg-emerald-50 p-6 rounded-[32px] border border-emerald-100">
            <p className="text-xs font-black text-emerald-600 uppercase tracking-[0.3em] mb-1">Average Sale</p>
            <p className="truncate text-2xl font-black text-emerald-700" title={formatCurrency(avgSale)}>{formatCurrency(avgSale)}</p>
          </div>
        </div>

        <div className="overflow-hidden bg-slate-50 rounded-[32px] border border-slate-100">
          <div className="overflow-x-auto w-full">
<table className="w-full">
            <thead>
              <tr className="bg-slate-100/50">
                <th className="text-left py-6 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Invoice</th>
                <th className="text-left py-6 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Customer</th>
                <th className="text-right py-6 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Subtotal</th>
                <th className="text-right py-6 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Discount</th>
                <th className="text-right py-6 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">GST</th>
                <th className="text-right py-6 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Net Total</th>
                <th className="text-center py-6 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {salesList.map((item: any) => (
                <tr key={item.transactionNo} className="group hover:bg-white transition-colors">
                  <td className="py-5 px-6">
                    <span className="text-sm font-black text-slate-900 block">#{item.transactionNo}</span>
                    <span className="text-xs font-medium text-slate-400">{item.date}</span>
                  </td>
                  <td className="py-5 px-4 font-bold text-slate-600 text-sm">
                    {item.contactName || 'Walk-in Customer'}
                  </td>
                  <td className="py-5 px-4 text-right">
                    <span className="text-sm font-bold text-slate-500">{formatCurrency(item.totalAmount)}</span>
                  </td>
                  <td className="py-5 px-4 text-right">
                    <span className="text-sm font-bold text-red-500">{item.discountAmount > 0 ? `-${formatCurrency(item.discountAmount)}` : '--'}</span>
                  </td>
                  <td className="py-5 px-4 text-right">
                    <span className="text-sm font-bold text-purple-600">{formatCurrency(item.gstAmount)}</span>
                  </td>
                  <td className="py-5 px-4 text-right">
                    <span className="text-sm font-black text-slate-900">{formatCurrency(item.netAmount)}</span>
                  </td>
                  <td className="py-5 px-6 text-center">
                    <span className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-widest capitalize ${item.paymentMode === 'cash' ? 'bg-emerald-50 text-emerald-600' :
                      item.paymentMode === 'credit' ? 'bg-blue-50 text-blue-600' :
                        item.paymentMode === 'bank' ? 'bg-violet-50 text-violet-600' :
                          'bg-slate-100 text-slate-600'
                      }`}>
                      {item.paymentMode || 'cash'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
</div>
        </div>
      </div>
    );
  };

  /**
   * Render Purchase Report
   */
  const renderPurchaseReport = () => {
    if (!reportData || !reportData.transactions) {
      return (
        <div className="text-center py-12 text-gray-500">
          <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-bold mb-2">No Purchase Records Found</p>
          <p className="text-sm">
            {startDate || endDate
              ? 'No purchase transactions found for the selected date range.'
              : 'No purchase transactions have been recorded yet.'}
          </p>
        </div>
      );
    }

    const { summary, transactions } = reportData;
    const totalPurchases = summary.totalPurchases || 0;
    const totalGst = summary.totalGst || 0;
    const totalTransactions = summary.totalTransactions || 0;
    const avgPurchase = summary.averagePurchase || 0;

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-slate-900 p-6 rounded-[32px] shadow-2xl shadow-slate-900/20">
            <p className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] mb-1">Total Purchases (Net)</p>
            <p className="truncate text-2xl font-black text-white" title={formatCurrency(totalPurchases)}>{formatCurrency(totalPurchases)}</p>
          </div>
          <div className="bg-purple-50 p-6 rounded-[32px] border border-purple-100">
            <p className="text-xs font-black text-purple-600 uppercase tracking-[0.3em] mb-1">GST Input</p>
            <p className="truncate text-2xl font-black text-purple-700" title={formatCurrency(totalGst)}>{formatCurrency(totalGst)}</p>
          </div>
          <div className="bg-blue-50 p-6 rounded-[32px] border border-blue-100">
            <p className="text-xs font-black text-blue-600 uppercase tracking-[0.3em] mb-1">Transactions</p>
            <p className="text-2xl font-black text-blue-700">{totalTransactions}</p>
          </div>
          <div className="bg-emerald-50 p-6 rounded-[32px] border border-emerald-100">
            <p className="text-xs font-black text-emerald-600 uppercase tracking-[0.3em] mb-1">Average Value</p>
            <p className="truncate text-2xl font-black text-emerald-700" title={formatCurrency(avgPurchase)}>{formatCurrency(avgPurchase)}</p>
          </div>
        </div>

        <div className="overflow-hidden bg-slate-50 rounded-[32px] border border-slate-100">
          <div className="overflow-x-auto w-full">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-100/50">
                  <th className="text-left py-6 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Transaction</th>
                  <th className="text-left py-6 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Supplier</th>
                  <th className="text-right py-6 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Subtotal</th>
                  <th className="text-right py-6 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">GST</th>
                  <th className="text-right py-6 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Net Total</th>
                  <th className="text-center py-6 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((item: any) => (
                  <tr key={item.transactionNo} className="group hover:bg-white transition-colors">
                    <td className="py-5 px-6">
                      <span className="text-sm font-black text-slate-900 block">#{item.transactionNo}</span>
                      <span className="text-xs font-medium text-slate-400">{item.date}</span>
                    </td>
                    <td className="py-5 px-4 font-bold text-slate-600 text-sm">
                      {item.contactName || 'N/A'}
                    </td>
                    <td className="py-5 px-4 text-right">
                      <span className="text-sm font-bold text-slate-500">{formatCurrency(item.totalAmount - item.gstAmount)}</span>
                    </td>
                    <td className="py-5 px-4 text-right">
                      <span className="text-sm font-bold text-purple-600">{formatCurrency(item.gstAmount)}</span>
                    </td>
                    <td className="py-5 px-4 text-right">
                      <span className="text-sm font-black text-slate-900">{formatCurrency(item.netAmount)}</span>
                    </td>
                    <td className="py-5 px-6 text-center">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-widest capitalize ${
                        item.paymentMode === 'cash' ? 'bg-emerald-50 text-emerald-600' :
                        item.paymentMode === 'credit' ? 'bg-blue-50 text-blue-600' :
                        item.paymentMode === 'bank' ? 'bg-violet-50 text-violet-600' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {item.paymentMode || 'cash'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  /**
   * Render Payroll Report
   */
  const renderPayrollReport = () => {
    if (!reportData) return null;
    const payrollData = reportData;
    const records = payrollData.records || [];
    const summary = payrollData.summary || {};
    const byEmployee = payrollData.byEmployee || [];
    const byDepartment = payrollData.byDepartment || [];
    const byMode = payrollData.byMode || [];

    if (records.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          <Wallet className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-bold mb-2">No Payroll Records Found</p>
          <p className="text-sm">
            {startDate || endDate
              ? 'No payroll processed for the selected date range.'
              : 'No payroll has been processed yet.'}
          </p>
        </div>
      );
    }

    const totalPayroll = summary.totalPayroll || 0;
    const employeeCount = summary.employeeCount || 0;
    const paymentCount = summary.paymentCount || 0;
    const avgPayment = summary.averagePayment || 0;

    // Calculate total deductions from records
    const totalPf = records.reduce((sum: number, r: any) => sum + (r.pf_amount || 0), 0);
    const totalTds = records.reduce((sum: number, r: any) => sum + (r.tds_amount || 0), 0);
    const totalGis = records.reduce((sum: number, r: any) => sum + (r.gis_amount || 0), 0);
    const totalHc = records.reduce((sum: number, r: any) => sum + (r.hc_amount || 0), 0);
    const totalGross = records.reduce((sum: number, r: any) => sum + (r.gross_salary || 0), 0);

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-slate-900 p-6 rounded-[32px] shadow-2xl shadow-slate-900/20">
            <p className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] mb-1">Total Payroll</p>
            <p className="truncate text-2xl font-black text-white" title={formatCurrency(totalPayroll)}>{formatCurrency(totalPayroll)}</p>
          </div>
          <div className="bg-purple-50 p-6 rounded-[32px] border border-purple-100">
            <p className="text-xs font-black text-purple-600 uppercase tracking-[0.3em] mb-1">Employees Paid</p>
            <p className="text-2xl font-black text-purple-700">{employeeCount}</p>
          </div>
          <div className="bg-blue-50 p-6 rounded-[32px] border border-blue-100">
            <p className="text-xs font-black text-blue-600 uppercase tracking-[0.3em] mb-1">Payments</p>
            <p className="text-2xl font-black text-blue-700">{paymentCount}</p>
          </div>
          <div className="bg-emerald-50 p-6 rounded-[32px] border border-emerald-100">
            <p className="text-xs font-black text-emerald-600 uppercase tracking-[0.3em] mb-1">Avg Payment</p>
            <p className="truncate text-2xl font-black text-emerald-700" title={formatCurrency(avgPayment)}>{formatCurrency(avgPayment)}</p>
          </div>
        </div>

        {/* Deductions Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-amber-50 p-4 rounded-[24px] border border-amber-100">
            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Total Gross</p>
            <p className="truncate text-lg font-black text-amber-700" title={formatCurrency(totalGross)}>{formatCurrency(totalGross)}</p>
          </div>
          <div className="bg-orange-50 p-4 rounded-[24px] border border-orange-100">
            <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">Total PF</p>
            <p className="truncate text-lg font-black text-orange-700" title={formatCurrency(totalPf)}>{formatCurrency(totalPf)}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-[24px] border border-purple-100">
            <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-1">Total TDS</p>
            <p className="truncate text-lg font-black text-purple-700" title={formatCurrency(totalTds)}>{formatCurrency(totalTds)}</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-[24px] border border-blue-100">
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Total GIS</p>
            <p className="truncate text-lg font-black text-blue-700" title={formatCurrency(totalGis)}>{formatCurrency(totalGis)}</p>
          </div>
          <div className="bg-emerald-50 p-4 rounded-[24px] border border-emerald-100">
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Total HC</p>
            <p className="truncate text-lg font-black text-emerald-700" title={formatCurrency(totalHc)}>{formatCurrency(totalHc)}</p>
          </div>
        </div>

        {/* By Payment Mode */}
        {byMode.length > 0 && (
          <div className="bg-slate-50 rounded-[32px] border border-slate-100 p-6">
            <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-wider">By Payment Mode</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {byMode.map((mode: any) => (
                <div key={mode.payment_mode} className="bg-white rounded-xl p-4 border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{mode.payment_mode}</p>
                  <p className="truncate text-lg font-black text-slate-800" title={formatCurrency(mode.total)}>{formatCurrency(mode.total)}</p>
                  <p className="text-[10px] text-slate-500 font-medium">{mode.count} payment{mode.count > 1 ? 's' : ''}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* By Department */}
        {byDepartment.length > 0 && (
          <div className="bg-slate-50 rounded-[32px] border border-slate-100 p-6">
            <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-wider">By Department</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {byDepartment.map((dept: any) => (
                <div key={dept.department} className="bg-white rounded-xl p-4 border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{dept.department}</p>
                  <p className="truncate text-lg font-black text-slate-800" title={formatCurrency(dept.total_paid)}>{formatCurrency(dept.total_paid)}</p>
                  <p className="text-[10px] text-slate-500 font-medium">{dept.employee_count} employee{dept.employee_count > 1 ? 's' : ''}, {dept.payment_count} payment{dept.payment_count > 1 ? 's' : ''}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* By Employee */}
        {byEmployee.length > 0 && (
          <div className="bg-slate-50 rounded-[32px] border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto w-full">
<table className="w-full">
              <thead>
                <tr className="bg-slate-100/50">
                  <th className="text-left py-5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee</th>
                  <th className="text-left py-5 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Position</th>
                  <th className="text-right py-5 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Gross</th>
                  <th className="text-right py-5 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">PF</th>
                  <th className="text-right py-5 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">TDS</th>
                  <th className="text-right py-5 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">GIS</th>
                  <th className="text-right py-5 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">HC</th>
                  <th className="text-right py-5 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Payments</th>
                  <th className="text-right py-5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Net Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {byEmployee.map((emp: any) => (
                  <tr key={emp.employee_name} className="group hover:bg-white transition-colors">
                    <td className="py-4 px-6">
                      <span className="text-sm font-black text-slate-900 block">{emp.employee_name}</span>
                      {emp.department && <span className="text-[10px] font-medium text-slate-400">{emp.department}</span>}
                    </td>
                    <td className="py-4 px-4 text-sm text-slate-600 font-medium">{emp.position || '—'}</td>
                    <td className="py-4 px-4 text-right">
                      <span className="text-sm font-bold text-slate-600">{formatCurrency(emp.total_gross)}</span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="text-sm font-bold text-amber-600">{formatCurrency(emp.total_pf)}</span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="text-sm font-bold text-purple-600">{formatCurrency(emp.total_tds)}</span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="text-sm font-bold text-blue-600">{formatCurrency(emp.total_gis)}</span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="text-sm font-bold text-emerald-600">{formatCurrency(emp.total_hc)}</span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="text-sm font-bold text-blue-600">{emp.payments_count}</span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="text-sm font-black text-slate-900">{formatCurrency(emp.total_paid)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
</div>
          </div>
        )}

        {/* Detailed Records */}
        <div className="bg-slate-50 rounded-[32px] border border-slate-100 overflow-hidden">
          <h3 className="text-sm font-black text-slate-800 p-6 pb-2 uppercase tracking-wider">Payment History</h3>
          <div className="overflow-x-auto w-full">
<table className="w-full">
            <thead>
              <tr className="bg-slate-100/50">
                <th className="text-left py-5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Transaction</th>
                <th className="text-left py-5 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee</th>
                <th className="text-left py-5 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Period</th>
                <th className="text-center py-5 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mode</th>
                <th className="text-right py-5 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Gross</th>
                <th className="text-right py-5 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">PF</th>
                <th className="text-right py-5 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">TDS</th>
                <th className="text-right py-5 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">GIS</th>
                <th className="text-right py-5 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">HC</th>
                <th className="text-right py-5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Net Paid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((rec: any) => (
                <tr key={rec.id} className="group hover:bg-white transition-colors">
                  <td className="py-4 px-6">
                    <span className="text-sm font-black text-slate-900 block">#{rec.transaction_no}</span>
                    <span className="text-[10px] font-medium text-slate-400">{rec.date}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-sm font-bold text-slate-700">{rec.employee_name}</span>
                  </td>
                  <td className="py-4 px-4 text-sm text-slate-600 font-medium">{rec.month} {rec.year}</td>
                  <td className="py-4 px-4 text-center">
                    <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${rec.payment_mode === 'cash' ? 'bg-emerald-50 text-emerald-600' :
                        rec.payment_mode === 'bank' ? 'bg-violet-50 text-violet-600' :
                          'bg-slate-100 text-slate-600'
                      }`}>
                      {rec.payment_mode}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className="text-sm font-bold text-slate-600">{formatCurrency(rec.gross_salary)}</span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className="text-sm font-bold text-amber-600">{formatCurrency(rec.pf_amount)}</span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className="text-sm font-bold text-purple-600">{formatCurrency(rec.tds_amount)}</span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className="text-sm font-bold text-blue-600">{formatCurrency(rec.gis_amount)}</span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className="text-sm font-bold text-emerald-600">{formatCurrency(rec.hc_amount)}</span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <span className="text-sm font-black text-slate-900">{formatCurrency(rec.amount)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
</div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Report Type Selector */}
      <div className="flex flex-wrap gap-3">
        {reports.map((report) => {
          const Icon = report.icon;
          return (
            <button
              key={report.id}
              onClick={() => setActiveReport(report.id)}
              className={`flex items-center gap-3 px-6 py-4 rounded-[22px] font-black uppercase tracking-widest text-[10px] transition-all duration-300 shadow-sm ${activeReport === report.id
                ? 'bg-bhutan-maroon text-white shadow-bhutan-maroon/20 hover:bg-bhutan-maroon-dark active:scale-95'
                : 'bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 border border-slate-100 active:scale-95'
                }`}
            >
              <div className={`p-2 rounded-xl ${activeReport === report.id ? 'bg-white/20' : 'bg-slate-100'}`}>
                <Icon className="w-4 h-4" />
              </div>
              {report.label}
            </button>
          );
        })}
      </div>

      {/* Date Range & Print */}
      <div className="flex items-center gap-6 bg-white/50 backdrop-blur-md p-4 rounded-[32px] border border-white shadow-sm">
        <div className="flex items-center gap-4 flex-1">
          <div className="p-3 bg-slate-900 text-bhutan-gold rounded-2xl">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="flex items-center gap-3">
            <div className="space-y-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-4 py-2.5 bg-white border-none rounded-xl focus:ring-2 focus:ring-bhutan-maroon/10 font-bold text-slate-700 text-sm appearance-none cursor-pointer"
              />
            </div>
            <div className="pt-5">
              <div className="w-4 h-px bg-slate-200"></div>
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-4 py-2.5 bg-white border-none rounded-xl focus:ring-2 focus:ring-bhutan-maroon/10 font-bold text-slate-700 text-sm appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>

        <button
          onClick={handlePrint}
          className="flex items-center gap-3 px-8 py-4 bg-bhutan-maroon text-white rounded-[20px] font-black uppercase tracking-widest text-xs hover:bg-bhutan-maroon-dark transition-all shadow-xl shadow-bhutan-maroon/10 active:scale-95"
        >
          <Printer className="w-4 h-4" />
          Generate Print
        </button>
      </div>

      {/* Report Content */}
      <div className="bg-white rounded-[40px] shadow-2xl shadow-slate-200/50 overflow-hidden border border-slate-50">
        <div className="p-8 bg-slate-900 border-b border-white/5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-bhutan-maroon text-white rounded-2xl shadow-lg shadow-bhutan-maroon/20">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white tracking-tight">
                {reports.find(r => r.id === activeReport)?.label}
              </h3>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">
                Official Business Statement & Financial Overview
              </p>
            </div>
          </div>
        </div>
        <div className="p-10 report-content-to-print">
          {renderReport()}
        </div>
      </div>
    </div>
  );
}
