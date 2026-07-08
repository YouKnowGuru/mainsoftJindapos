import { useState, useEffect } from 'react';
import { Calculator, FileText, Printer, Calendar } from 'lucide-react';
import { useAppStore } from '../store/appStore';

export function GSTPage() {
  const { showNotification } = useAppStore();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [gstSummary, setGstSummary] = useState<any>(null);
  const [gstReturns, setGstReturns] = useState<any[]>([]);

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  const years = Array.from({ length: 5 }, (_, i) => selectedYear - 2 + i);

  useEffect(() => {
    loadGSTSummary();
    loadGSTReturns();
  }, [selectedMonth, selectedYear]);

  const loadGSTSummary = async () => {
    try {
      const result = await window.electronSecureAPI.gst.getSummary(selectedMonth, selectedYear);
      if (result.success && result.data) {
        setGstSummary(result.data);
      }
    } catch (error) {
      showNotification('Failed to load GST summary', 'error');
    }
  };

  const loadGSTReturns = async () => {
    try {
      const result = await window.electronSecureAPI.gst.getReturns();
      if (result.success && result.data) {
        setGstReturns(result.data);
      }
    } catch (error) {
      console.error('Failed to load GST returns:', error);
    }
  };

  const handlePrintGSTR = async () => {
    if (!gstSummary) return;

    try {
      const monthLabel = months.find(m => m.value === selectedMonth)?.label;
      const title = `GST Return - ${monthLabel} ${selectedYear}`;

      // Build a premium HTML for the GST report
      const content = `
        <div class="summary-grid">
          <div class="summary-card" style="border-left-color: #800000;">
            <div class="summary-label">GST Input (Purchases)</div>
            <div class="summary-value">${formatCurrency(gstSummary.gstInput)}</div>
          </div>
          <div class="summary-card" style="border-left-color: #FF8C00;">
            <div class="summary-label">GST Output (Sales)</div>
            <div class="summary-value">${formatCurrency(gstSummary.gstOutput)}</div>
          </div>
          <div class="summary-card" style="border-left-color: ${gstSummary.gstPayable > 0 ? '#ef4444' : '#FFD700'};">
            <div class="summary-label">GST Payable / Credit</div>
            <div class="summary-value">${formatCurrency(gstSummary.gstPayable)}</div>
          </div>
        </div>
        
        <h3 style="margin-bottom: 20px; font-size: 18px; color: #800000; font-weight: 800; border-bottom: 2px solid #800000; padding-bottom: 5px;">Detailed Breakdown</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          <thead>
            <tr>
              <th style="text-align: left;">Category</th>
              <th style="text-align: left;">Description</th>
              <th style="text-align: right;">Amount (Nu.)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td rowspan="6" style="font-weight: bold; background: #f8fafc;">Purchases</td>
              <td>Standard Taxable Purchases</td>
              <td style="text-align: right;">${formatCurrency(gstSummary.taxablePurchases)}</td>
            </tr>
            <tr>
              <td style="color: #475569; font-size: 0.9em;">- Standard GST Input Paid</td>
              <td style="text-align: right; color: #475569; font-size: 0.9em;">${formatCurrency(gstSummary.standardGstInput || 0)}</td>
            </tr>
            <tr>
              <td style="color: #047857; font-weight: bold;">Domestic Purchases</td>
              <td style="text-align: right; color: #047857; font-weight: bold;">${formatCurrency(gstSummary.domesticPurchases || 0)}</td>
            </tr>
            <tr>
              <td style="color: #059669; font-size: 0.9em;">- Domestic GST Input Paid</td>
              <td style="text-align: right; color: #059669; font-size: 0.9em;">${formatCurrency(gstSummary.domesticGstInput || 0)}</td>
            </tr>
            <tr>
              <td>Standard Exempt Purchases</td>
              <td style="text-align: right;">${formatCurrency(gstSummary.exemptPurchases)}</td>
            </tr>
            <tr style="background: #f8fafc;">
              <td style="font-weight: bold; color: #059669;">Total GST Input</td>
              <td style="text-align: right; font-weight: bold; color: #059669;">${formatCurrency(gstSummary.gstInput)}</td>
            </tr>
            <tr>
              <td rowspan="6" style="font-weight: bold; background: #f8fafc;">Sales</td>
              <td>Standard Taxable Sales</td>
              <td style="text-align: right;">${formatCurrency(gstSummary.taxableSales)}</td>
            </tr>
            <tr>
              <td>Standard Exempt Sales</td>
              <td style="text-align: right;">${formatCurrency(gstSummary.exemptSales)}</td>
            </tr>
            <tr>
              <td style="color: #475569; font-size: 0.9em;">- Standard GST Output Collected</td>
              <td style="text-align: right; color: #475569; font-size: 0.9em;">${formatCurrency(gstSummary.standardGstOutput || 0)}</td>
            </tr>
            <tr>
              <td style="color: #047857; font-weight: bold;">Domestic Sales</td>
              <td style="text-align: right; color: #047857; font-weight: bold;">${formatCurrency(gstSummary.domesticSales || 0)}</td>
            </tr>
            <tr>
              <td style="color: #059669; font-size: 0.9em;">- Domestic GST Output Collected</td>
              <td style="text-align: right; color: #059669; font-size: 0.9em;">${formatCurrency(gstSummary.domesticGstOutput || 0)}</td>
            </tr>
            <tr style="background: #f8fafc;">
              <td style="font-weight: bold; color: #1d4ed8;">Total GST Output</td>
              <td style="text-align: right; font-weight: bold; color: #1d4ed8;">${formatCurrency(gstSummary.gstOutput)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr style="background: #f1f5f9; font-weight: bold;">
              <td colspan="2" style="text-align: right;">Net GST Position</td>
              <td style="text-align: right; color: ${gstSummary.gstPayable > 0 ? '#ef4444' : '#10b981'};">
                ${formatCurrency(gstSummary.gstPayable)}
              </td>
            </tr>
          </tfoot>
        </table>

        <div style="margin-top: 40px; border: 1px dashed #cbd5e1; padding: 15px; border-radius: 8px; font-size: 10px; color: #64748b;">
          <strong>Declaration:</strong> I hereby declare that the information provided above is true and correct to the best of my knowledge and belief.
          <br><br><br>
          <div style="display: table; width: 100%;">
            <div style="display: table-cell; border-top: 1px solid #64748b; width: 40%; padding-top: 5px; text-align: center;">Authorized Signature</div>
            <div style="display: table-cell; width: 20%;"></div>
            <div style="display: table-cell; border-top: 1px solid #64748b; width: 40%; padding-top: 5px; text-align: center;">Date & Stamp</div>
          </div>
        </div>
      `;

      const result = await window.electronSecureAPI.print.report(title, content);
      if (result.success) {
        showNotification('GST report sent to printer', 'success');
      }
    } catch (error) {
      showNotification('Failed to print GST report', 'error');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'BTN',
      minimumFractionDigits: 2,
    }).format(amount).replace('BTN', 'Nu.');
  };

  return (
    <div className="space-y-6">
      {/* GST Rate Info */}
      <div className="bg-gradient-to-r from-bhutan-maroon to-bhutan-maroon-light border-none rounded-2xl p-6 shadow-lg shadow-bhutan-maroon/10 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-bhutan-gold opacity-10 blur-3xl -mr-32 -mt-32"></div>
        <div className="flex items-center gap-4 relative z-10">
          <div className="bg-white/20 backdrop-blur-md p-3 rounded-2xl">
            <Calculator className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-white text-lg tracking-tight">Bhutan BST/GST Compliance</h3>
            <p className="text-white/80 text-sm font-medium">Automatic 5% GST calculation applied to all taxable transactions as per Bhutanese regulation (Jan 2026).</p>
          </div>
        </div>
      </div>

      {/* Month/Year Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-2xl shadow-sm border border-slate-100">
            <Calendar className="w-4 h-4 text-bhutan-maroon" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent border-none focus:ring-0 text-sm font-bold text-slate-700 cursor-pointer"
            >
              {months.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-2xl shadow-sm border border-slate-100">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent border-none focus:ring-0 text-sm font-bold text-slate-700 cursor-pointer"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={handlePrintGSTR}
          className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl hover:bg-slate-800 transition-all shadow-lg active:scale-95 font-bold text-sm"
        >
          <Printer className="w-4 h-4" />
          Generate GSTR Report
        </button>
      </div>

      {/* GST Summary Cards */}
      {gstSummary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-50 p-6 group hover:shadow-md transition-shadow">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">GST Input</p>
            <p className="truncate text-2xl font-black text-bhutan-maroon" title={formatCurrency(gstSummary.gstInput)}>{formatCurrency(gstSummary.gstInput)}</p>
            <p className="text-xs text-slate-400 mt-2 font-bold uppercase">Paid on purchases</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-50 p-6 group hover:shadow-md transition-shadow">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">GST Output</p>
            <p className="truncate text-2xl font-black text-bhutan-orange" title={formatCurrency(gstSummary.gstOutput)}>{formatCurrency(gstSummary.gstOutput)}</p>
            <p className="text-xs text-slate-400 mt-2 font-bold uppercase">Collected on sales</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-50 p-6 group hover:shadow-md transition-shadow">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Tax to Pay (GST)</p>
            <p className={`truncate text-2xl font-black ${gstSummary.gstPayable > 0 ? 'text-red-500' : 'text-slate-600'}`} title={formatCurrency(gstSummary.gstPayable)}>
              {formatCurrency(gstSummary.gstPayable)}
            </p>
            <p className="text-xs text-slate-400 mt-2 font-bold uppercase">Current liability</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-50 p-6 group hover:shadow-md transition-shadow">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">GST Credit</p>
            <p className="truncate text-2xl font-black text-bhutan-gold/80" title={formatCurrency(gstSummary.gstCredit)}>{formatCurrency(gstSummary.gstCredit)}</p>
            <p className="text-xs text-slate-400 mt-2 font-bold uppercase">Carried forward</p>
          </div>
        </div>
      )}

      {/* Detailed Breakdown */}
      {gstSummary && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Purchase Details</h3>
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4 py-2 border-b border-gray-100">
                <span className="text-gray-600">Standard Taxable Purchases</span>
                <span className="font-medium shrink-0 whitespace-nowrap">{formatCurrency(gstSummary.taxablePurchases)}</span>
              </div>
              <div className="flex items-start justify-between gap-4 py-2 border-b border-gray-100">
                <span className="text-gray-600">Standard GST Input</span>
                <span className="font-medium text-emerald-600">{formatCurrency(gstSummary.standardGstInput || 0)}</span>
              </div>
              
              <div className="flex items-start justify-between gap-4 py-2 border-b border-gray-100 bg-emerald-50/30 px-2 rounded">
                <span className="text-emerald-700 font-bold italic underline decoration-dotted">Domestic Purchases</span>
                <span className="font-bold text-slate-800">{formatCurrency(gstSummary.domesticPurchases || 0)}</span>
              </div>
              <div className="flex items-start justify-between gap-4 py-2 border-b border-gray-100 bg-emerald-50/30 px-2 rounded">
                <span className="text-emerald-700 font-bold italic underline decoration-dotted">Domestic GST Input</span>
                <span className="font-bold text-emerald-600">{formatCurrency(gstSummary.domesticGstInput || 0)}</span>
              </div>

              <div className="flex items-start justify-between gap-4 py-2 border-b border-gray-100">
                <span className="text-gray-600">Standard Exempt Purchases</span>
                <span className="font-medium shrink-0 whitespace-nowrap">{formatCurrency(gstSummary.exemptPurchases)}</span>
              </div>
              <div className="flex items-start justify-between gap-4 py-2 mt-2 pt-4 border-t-2 border-gray-200">
                <span className="font-bold text-gray-800">Total GST Input</span>
                <span className="font-black text-emerald-600 text-lg">{formatCurrency(gstSummary.gstInput)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Sales Details</h3>
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4 py-2 border-b border-gray-100">
                <span className="text-gray-600">Standard Taxable Sales</span>
                <span className="font-medium shrink-0 whitespace-nowrap">{formatCurrency(gstSummary.taxableSales)}</span>
              </div>
              <div className="flex items-start justify-between gap-4 py-2 border-b border-gray-100">
                <span className="text-gray-600">Standard Exempt Sales</span>
                <span className="font-medium shrink-0 whitespace-nowrap">{formatCurrency(gstSummary.exemptSales)}</span>
              </div>
              <div className="flex items-start justify-between gap-4 py-2 border-b border-gray-100">
                <span className="text-gray-600">Standard GST Output</span>
                <span className="font-medium text-blue-600">{formatCurrency(gstSummary.standardGstOutput || 0)}</span>
              </div>
              
              <div className="flex items-start justify-between gap-4 py-2 border-b border-gray-100 mt-4">
                <span className="text-emerald-700 font-medium">Domestic Sales</span>
                <span className="font-medium shrink-0 whitespace-nowrap text-emerald-700">{formatCurrency(gstSummary.domesticSales || 0)}</span>
              </div>
              <div className="flex items-start justify-between gap-4 py-2 border-b border-gray-100">
                <span className="text-emerald-700 font-medium">Domestic GST Output</span>
                <span className="font-medium text-emerald-600">{formatCurrency(gstSummary.domesticGstOutput || 0)}</span>
              </div>

              <div className="flex items-start justify-between gap-4 py-2 border-b border-gray-100 bg-gray-50 -mx-6 px-6">
                <span className="font-bold text-gray-800">Total GST Output</span>
                <span className="font-bold text-blue-700">{formatCurrency(gstSummary.gstOutput)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GST Returns History */}
      <div className="bg-white rounded-xl shadow-sm p-6 overflow-x-auto">
        <h3 className="text-lg font-semibold mb-4">GST Returns History</h3>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Period</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">GST Input</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">GST Output</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Net GST</th>
              <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody>
            {gstReturns.map((returnData, index) => (
              <tr key={index} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4">
                  {months.find(m => m.value === returnData.month)?.label} {returnData.year}
                </td>
                <td className="py-3 px-4 text-right">{formatCurrency(returnData.gst_input)}</td>
                <td className="py-3 px-4 text-right">{formatCurrency(returnData.gst_output)}</td>
                <td className="py-3 px-4 text-right font-medium">
                  <span className={returnData.net_gst > 0 ? 'text-red-600' : 'text-emerald-600'}>
                    {formatCurrency(Math.abs(returnData.net_gst))}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  <button
                    onClick={async () => {
                      try {
                        const result = await window.electronSecureAPI.gst.updateStatus(returnData.month, returnData.year, !returnData.is_filed);
                        if (result.success) {
                          showNotification(result.message, 'success');
                          loadGSTReturns();
                        } else {
                          showNotification(result.message, 'error');
                        }
                      } catch (error) {
                        showNotification('Failed to update status', 'error');
                      }
                    }}
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium transition-colors hover:opacity-80 active:scale-95 ${returnData.is_filed
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700'
                      }`}
                    title={returnData.is_filed ? 'Mark as Pending' : 'Mark as Filed'}
                  >
                    {returnData.is_filed ? 'Filed' : 'Pending'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {gstReturns.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No GST returns found</p>
          </div>
        )}
      </div>
    </div>
  );
}
