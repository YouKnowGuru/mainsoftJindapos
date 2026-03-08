import { useState, useEffect } from 'react';
import {
  FileText,
  Printer,
  Calendar,
  TrendingUp,
  Scale,
  Package,
  Users
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
  ];

  useEffect(() => {
    loadReport();
  }, [activeReport, startDate, endDate]);

  const handlePrint = async () => {
    if (!reportData) return;

    try {
      const reportTitle = reports.find(r => r.id === activeReport)?.label || 'Report';
      const content = document.querySelector('.report-content-to-print')?.innerHTML;

      if (!content) {
        showNotification('No content to print', 'error');
        return;
      }

      const result = await window.electronAPI.print.report(reportTitle, content);
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
    try {
      setReportData(null); // Reset before loading to prevent stale state crashes
      let result;
      switch (activeReport) {
        case 'trial-balance':
          result = await window.electronAPI.reports.trialBalance(endDate);
          break;
        case 'profit-loss':
          result = await window.electronAPI.reports.profitLoss(startDate, endDate);
          break;
        case 'balance-sheet':
          result = await window.electronAPI.reports.balanceSheet(endDate);
          break;
        case 'outstanding':
          result = await window.electronAPI.reports.outstanding();
          break;
        case 'stock':
          result = await window.electronAPI.reports.stockReport();
          break;
        case 'sales':
          result = await window.electronAPI.reports.salesReport(startDate, endDate);
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
              {data.map((item: any, index: number) => (
                <tr key={index} className="group hover:bg-white transition-colors">
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
                <span className="text-lg font-black text-slate-900">{formatCurrency(revenue.sales)}</span>
              </div>
              <div className="flex justify-between items-center bg-white/50 p-4 rounded-2xl">
                <span className="text-sm font-bold text-slate-600">Other Income</span>
                <span className="text-lg font-black text-slate-900">{formatCurrency(revenue.otherIncome)}</span>
              </div>
              <div className="flex justify-between items-center p-4 pt-6 border-t border-emerald-200">
                <span className="text-xs font-black text-emerald-800 uppercase tracking-widest">Total Revenue</span>
                <span className="text-2xl font-black text-emerald-600">{formatCurrency(revenue.total)}</span>
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
                <span className="text-lg font-black text-slate-900">{formatCurrency(expenses.cogs)}</span>
              </div>
              <div className="flex justify-between items-center bg-white/50 p-4 rounded-2xl">
                <span className="text-sm font-bold text-slate-600">Operating Cost</span>
                <span className="text-lg font-black text-slate-900">{formatCurrency(expenses.operating)}</span>
              </div>
              <div className="flex justify-between items-center bg-white/50 p-4 rounded-2xl">
                <span className="text-sm font-bold text-slate-600">Other Expenses</span>
                <span className="text-lg font-black text-slate-900">{formatCurrency(expenses.other)}</span>
              </div>
              <div className="flex justify-between items-center p-4 pt-6 border-t border-red-200">
                <span className="text-xs font-black text-red-800 uppercase tracking-widest">Total Expenses</span>
                <span className="text-2xl font-black text-red-500">{formatCurrency(expenses.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Footer */}
        <div className="bg-slate-900 rounded-[32px] p-8 flex items-center justify-between shadow-2xl shadow-slate-900/20">
          <div>
            <p className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] mb-1">Business Performance</p>
            <p className="text-white font-bold opacity-60">Consolidated Net Profit for the selected period</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-4 justify-end mb-1">
              <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Gross Profit:</span>
              <span className="text-lg font-black text-white">{formatCurrency(grossProfit)}</span>
            </div>
            <div className="flex items-center gap-6 justify-end">
              <span className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Net Result:</span>
              <span className={`text-5xl font-black ${netProfit >= 0 ? 'text-bhutan-gold' : 'text-red-400'}`}>
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
                {data.assets.current?.map((item: any, index: number) => (
                  <div key={index} className="flex justify-between p-4 bg-white rounded-2xl shadow-sm">
                    <span className="text-sm font-bold text-slate-600">{item.name}</span>
                    <span className="text-sm font-black text-slate-900">{formatCurrency(item.balance)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Fixed Assets</p>
              <div className="space-y-2">
                {data.assets.fixed?.map((item: any, index: number) => (
                  <div key={index} className="flex justify-between p-4 bg-white rounded-2xl shadow-sm">
                    <span className="text-sm font-bold text-slate-600">{item.name}</span>
                    <span className="text-sm font-black text-slate-900">{formatCurrency(item.balance)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-between p-6 bg-slate-900 rounded-[28px] shadow-xl">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Assets</span>
              <span className="text-2xl font-black text-bhutan-gold">{formatCurrency(data.assets.total)}</span>
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
                {data.liabilities.current?.map((item: any, index: number) => (
                  <div key={index} className="flex justify-between p-4 bg-white rounded-2xl shadow-sm">
                    <span className="text-sm font-bold text-slate-600">{item.name}</span>
                    <span className="text-sm font-black text-slate-900">{formatCurrency(item.balance)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Equity / Capital</p>
              <div className="space-y-2">
                {data.equity?.map((item: any, index: number) => (
                  <div key={index} className="flex justify-between p-4 bg-white rounded-2xl shadow-sm">
                    <span className="text-sm font-bold text-slate-600">{item.name}</span>
                    <span className="text-sm font-black text-slate-900">{formatCurrency(item.balance)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-between p-6 bg-bhutan-maroon rounded-[28px] shadow-xl">
              <span className="text-xs font-black text-white/50 uppercase tracking-widest">Total Balance</span>
              <span className="text-2xl font-black text-white">{formatCurrency(data.totalEquity)}</span>
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
        <div className="flex items-center justify-between bg-red-50 p-8 rounded-[40px] border border-red-100 shadow-xl shadow-red-500/5">
          <div>
            <p className="text-xs font-black text-red-600 uppercase tracking-[0.3em] mb-1">Money to Collect</p>
            <p className="text-sm font-bold text-slate-500">Uncollected dues from all trade partners</p>
          </div>
          <div className="text-right">
            <span className="text-4xl font-black text-red-600">{formatCurrency(totalOutstanding)}</span>
            <span className="block text-xs font-black text-red-300 uppercase tracking-widest mt-1">Net Exposure</span>
          </div>
        </div>

        <div className="overflow-hidden bg-slate-50 rounded-[32px] border border-slate-100">
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
              {data.map((item: any, index: number) => (
                <tr key={index} className="group hover:bg-white transition-colors">
                  <td className="py-5 px-6">
                    <span className="text-sm font-black text-slate-800">{item.name}</span>
                  </td>
                  <td className="py-5 px-4 text-sm font-medium text-slate-500">{item.phone}</td>
                  <td className="py-5 px-4 text-right text-sm font-bold text-slate-400">{formatCurrency(item.currentBalance)}</td>
                  <td className="py-5 px-4 text-right">
                    <span className="text-lg font-black text-red-500">{formatCurrency(item.totalDue)}</span>
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
        <div className="flex items-center justify-between bg-emerald-50 p-8 rounded-[40px] border border-emerald-100 shadow-xl shadow-emerald-500/5">
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
            <span className="text-4xl font-black text-emerald-600">{formatCurrency(totalValue)}</span>
            <span className="block text-xs font-black text-emerald-300 uppercase tracking-widest mt-1">Total Assets Value</span>
          </div>
        </div>

        <div className="overflow-hidden bg-slate-50 rounded-[32px] border border-slate-100">
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
              {data.map((item: any, index: number) => (
                <tr key={index} className="group hover:bg-white transition-colors">
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

    const totalSales = reportData.summary?.total_sales || 0;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between bg-slate-900 p-8 rounded-[40px] shadow-2xl shadow-slate-900/10">
          <div>
            <p className="text-xs font-black text-bhutan-gold uppercase tracking-[0.3em] mb-1">Total Sales Revenue</p>
            <p className="text-sm font-bold text-white/40">Gross sales for the current filtered date range</p>
          </div>
          <div className="text-right">
            <span className="text-4xl font-black text-white">{formatCurrency(totalSales)}</span>
            <span className="block text-xs font-black text-slate-500 uppercase tracking-widest mt-1">Settled & Pending</span>
          </div>
        </div>

        <div className="overflow-hidden bg-slate-50 rounded-[32px] border border-slate-100">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-100/50">
                <th className="text-left py-6 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Invoice</th>
                <th className="text-left py-6 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Customer Entity</th>
                <th className="text-right py-6 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Revenue</th>
                <th className="text-center py-6 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {salesList.map((item: any, index: number) => (
                <tr key={index} className="group hover:bg-white transition-colors">
                  <td className="py-5 px-6">
                    <span className="text-sm font-black text-slate-900 block">#{item.transactionNo}</span>
                    <span className="text-xs font-medium text-slate-400">{item.date}</span>
                  </td>
                  <td className="py-5 px-4 font-bold text-slate-600 text-sm">
                    {item.contactName || 'Cash Sale'}
                  </td>
                  <td className="py-5 px-4 text-right">
                    <span className="text-sm font-black text-slate-900">{formatCurrency(item.netAmount)}</span>
                  </td>
                  <td className="py-5 px-6 text-center">
                    <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${item.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
                      }`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
