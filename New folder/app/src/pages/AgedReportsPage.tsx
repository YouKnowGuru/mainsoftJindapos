import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';


export function AgedReportsPage() {

  const [activeTab, setActiveTab] = useState<'receivables' | 'payables'>('receivables');
  const [report, setReport] = useState<any>(null);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => { loadReport(); }, [activeTab, asOfDate]);

  const loadReport = async () => {
    const api = window.electronSecureAPI;
    if (!api?.agedReports) { setReport(null); return; }
    try {
      const method = activeTab === 'receivables' ? 'getReceivables' : 'getPayables';
      const result = await api.agedReports[method](asOfDate);
      if (result?.success) setReport(result.data);
      else setReport(null);
    } catch { setReport(null); }
  };

  const formatCurrency = (amount: number) => 'Nu. ' + amount.toFixed(2);

  const handleExport = () => {
    if (!report) return;
    const { ExportService } = require('../services/ExportService');
    const exportService = new ExportService();
    
    if (activeTab === 'receivables') {
      exportService.exportAgedReceivables({ ...report, asOfDate });
    } else {
      exportService.exportAgedPayables({ ...report, asOfDate });
    }
  };

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-3xl font-bold text-slate-800">Aged Reports</h1><p className="text-slate-500">Outstanding receivables and payables analysis</p></div>
        <div className="flex items-center gap-3">
          <input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium" />
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 rounded-xl hover:bg-slate-200 text-sm font-bold text-slate-600"><Download className="w-4 h-4" /> Export</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-slate-100 p-1 rounded-xl w-fit">
        <button onClick={() => setActiveTab('receivables')} className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-colors ${activeTab === 'receivables' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Receivables (Customers)</button>
        <button onClick={() => setActiveTab('payables')} className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-colors ${activeTab === 'payables' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Payables (Suppliers)</button>
      </div>

      {report && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: 'Current', value: report.totalCurrent, color: 'bg-emerald-500/10 text-emerald-700' },
              { label: '31-60 Days', value: report.total31_60, color: 'bg-amber-500/10 text-amber-700' },
              { label: '61-90 Days', value: report.total61_90, color: 'bg-orange-500/10 text-orange-700' },
              { label: 'Over 90 Days', value: report.totalOver90, color: 'bg-red-500/10 text-red-700' },
              { label: 'Grand Total', value: report.grandTotal, color: 'bg-slate-800 text-white' },
            ].map((card) => (
              <div key={card.label} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{card.label}</p>
                <p className={`truncate text-2xl font-bold ${card.color.split(' ')[1]}`} title={formatCurrency(card.value)}>{formatCurrency(card.value)}</p>
              </div>
            ))}
          </div>

          {/* Detail Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <div className="overflow-x-auto w-full">
<table className="w-full"><thead className="bg-slate-50"><tr>
                <th className="text-left py-4 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Name</th>
                <th className="text-right py-4 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Current</th>
                <th className="text-right py-4 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">31-60 Days</th>
                <th className="text-right py-4 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">61-90 Days</th>
                <th className="text-right py-4 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Over 90</th>
                <th className="text-right py-4 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Total</th>
              </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {report.entries.map((entry: any) => (
                    <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6 text-sm font-bold text-slate-800">{entry.name}</td>
                      <td className={`py-4 px-6 text-sm font-bold text-right ${entry.current > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>{formatCurrency(entry.current)}</td>
                      <td className={`py-4 px-6 text-sm font-bold text-right ${entry.days31_60 > 0 ? 'text-amber-600' : 'text-slate-400'}`}>{formatCurrency(entry.days31_60)}</td>
                      <td className={`py-4 px-6 text-sm font-bold text-right ${entry.days61_90 > 0 ? 'text-orange-600' : 'text-slate-400'}`}>{formatCurrency(entry.days61_90)}</td>
                      <td className={`py-4 px-6 text-sm font-bold text-right ${entry.over90 > 0 ? 'text-red-600' : 'text-slate-400'}`}>{formatCurrency(entry.over90)}</td>
                      <td className="py-4 px-6 text-sm font-black text-right text-slate-800">{formatCurrency(entry.total)}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-black">
                    <td className="py-4 px-6 text-sm text-slate-800">TOTAL</td>
                    <td className="py-4 px-6 text-sm text-right text-emerald-700">{formatCurrency(report.totalCurrent)}</td>
                    <td className="py-4 px-6 text-sm text-right text-amber-700">{formatCurrency(report.total31_60)}</td>
                    <td className="py-4 px-6 text-sm text-right text-orange-700">{formatCurrency(report.total61_90)}</td>
                    <td className="py-4 px-6 text-sm text-right text-red-700">{formatCurrency(report.totalOver90)}</td>
                    <td className="py-4 px-6 text-sm text-right text-slate-800">{formatCurrency(report.grandTotal)}</td>
                  </tr>
                </tbody></table>
</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
