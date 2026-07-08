import { useState } from 'react';
import { Upload, Download, FileSpreadsheet, Users, Package, AlertCircle, CheckCircle } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import * as XLSX from 'xlsx';

export function ImportExportPage() {
  const { showNotification } = useAppStore();
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('export');
  const [importType, setImportType] = useState<'contacts' | 'items'>('contacts');
  const [contactType, setContactType] = useState<'customer' | 'supplier'>('customer');
  const [importResult, setImportResult] = useState<any>(null);
  const [fileName, setFileName] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(sheet);

        if (importType === 'contacts') {
          const result = await window.electronSecureAPI.csvImport?.contacts(jsonData, contactType);
          setImportResult(result);
          showNotification(result?.message || 'Import done', result?.success ? 'success' : 'error');
        } else {
          const result = await window.electronSecureAPI.csvImport?.items(jsonData);
          setImportResult(result);
          showNotification(result?.message || 'Import done', result?.success ? 'success' : 'error');
        }
      } catch (error: any) {
        showNotification('Failed to parse file: ' + error.message, 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const downloadTemplate = (type: string) => {
    let headers: string[];
    if (type === 'customers') headers = ['name', 'contactPerson', 'phone', 'email', 'address', 'gstNumber', 'creditLimit', 'creditDays', 'openingBalance'];
    else if (type === 'suppliers') headers = ['name', 'contactPerson', 'phone', 'email', 'address', 'gstNumber', 'creditLimit', 'creditDays', 'openingBalance'];
    else headers = ['code', 'name', 'description', 'category', 'unit', 'purchasePrice', 'sellingPrice', 'quantityInStock', 'reorderLevel', 'gstRate', 'gstApplicable'];

    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, `${type}_template.xlsx`);
  };

  const exportData = async (type: string) => {
    try {
      let data: any[];
      let wsName: string;

      if (type === 'customers') {
        const result = await window.electronSecureAPI.contacts?.getAll('customer');
        data = Array.isArray(result?.data) ? result.data.map((c: any) => ({ name: c.name, contactPerson: c.contactPerson, phone: c.phone, email: c.email, creditLimit: c.creditLimit, currentBalance: c.currentBalance, gstNumber: c.gstNumber })) : [];
        wsName = 'Customers';
      } else if (type === 'suppliers') {
        const result = await window.electronSecureAPI.contacts?.getAll('supplier');
        data = Array.isArray(result?.data) ? result.data.map((c: any) => ({ name: c.name, contactPerson: c.contactPerson, phone: c.phone, email: c.email, creditLimit: c.creditLimit, currentBalance: c.currentBalance, gstNumber: c.gstNumber })) : [];
        wsName = 'Suppliers';
      } else if (type === 'items') {
        const result = await window.electronSecureAPI.inventory?.getItems();
        data = Array.isArray(result?.data) ? result.data.map((i: any) => ({ code: i.code, name: i.name, category: i.category, unit: i.unit, purchasePrice: i.purchasePrice, sellingPrice: i.sellingPrice, quantityInStock: i.quantityInStock, reorderLevel: i.reorderLevel, gstRate: i.gstRate })) : [];
        wsName = 'Items';
      } else if (type === 'transactions') {
        const result = await window.electronSecureAPI.transactions?.getAll();
        data = Array.isArray(result?.data) ? result.data.map((t: any) => ({ transactionNo: t.transactionNo, date: t.date, type: t.type, contactName: t.contactName, netAmount: t.netAmount, paymentMode: t.paymentMode, status: t.status })) : [];
        wsName = 'Transactions';
      } else {
        const result = await window.electronSecureAPI.contacts?.getAll();
        data = Array.isArray(result?.data) ? result.data.map((c: any) => ({ name: c.name, type: c.type, phone: c.phone, email: c.email, currentBalance: c.currentBalance })) : [];
        wsName = 'All Contacts';
      }

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, wsName);
      XLSX.writeFile(wb, `${wsName}_${new Date().toISOString().split('T')[0]}.xlsx`);
      showNotification(`${wsName} exported successfully`, 'success');
    } catch (error: any) {
      showNotification('Export failed: ' + error.message, 'error');
    }
  };

  return (
    <div className="space-y-8 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Import / Export</h1>
        <p className="text-slate-500">Bulk data management with Excel/CSV</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-slate-100 p-1 rounded-xl w-fit">
        <button onClick={() => { setActiveTab('export'); setImportResult(null); }} className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-colors ${activeTab === 'export' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Export Data</button>
        <button onClick={() => { setActiveTab('import'); setImportResult(null); }} className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-colors ${activeTab === 'import' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Import Data</button>
      </div>

      {activeTab === 'export' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { label: 'Customers', icon: Users, type: 'customers', desc: 'Export all customer records' },
            { label: 'Suppliers', icon: Users, type: 'suppliers', desc: 'Export all supplier records' },
            { label: 'Items', icon: Package, type: 'items', desc: 'Export inventory items' },
            { label: 'Transactions', icon: FileSpreadsheet, type: 'transactions', desc: 'Export all transactions' },
            { label: 'All Contacts', icon: Users, type: 'contacts', desc: 'Export customers + suppliers' },
          ].map((item) => (
            <button key={item.type} onClick={() => exportData(item.type)} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 hover:shadow-md hover:border-bhutan-maroon/20 transition-all text-left group">
              <div className="flex items-center gap-3 mb-3"><div className="p-2 bg-bhutan-maroon/10 rounded-lg group-hover:bg-bhutan-maroon/20 transition-colors"><item.icon className="w-5 h-5 text-bhutan-maroon" /></div></div>
              <h3 className="text-base font-bold text-slate-800 mb-1">{item.label}</h3>
              <p className="text-sm text-slate-500">{item.desc}</p>
              <div className="mt-4 flex items-center gap-2 text-bhutan-maroon font-bold text-sm"><Download className="w-4 h-4" /> Export Excel</div>
            </button>
          ))}
        </div>
      ) : (
        <div className="max-w-2xl">
          {/* Import Type Selection */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
            <h3 className="text-base font-bold text-slate-800 mb-4">Import Settings</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="space-y-1.5"><label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Import Type</label><select value={importType} onChange={(e) => setImportType(e.target.value as any)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"><option value="contacts">Contacts</option><option value="items">Items</option></select></div>
              {importType === 'contacts' && (<div className="space-y-1.5"><label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Contact Type</label><select value={contactType} onChange={(e) => setContactType(e.target.value as any)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"><option value="customer">Customers</option><option value="supplier">Suppliers</option></select></div>)}
            </div>
            <div className="flex gap-3">
              <button onClick={() => downloadTemplate(importType === 'contacts' ? contactType + 's' : 'items')} className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 rounded-xl hover:bg-slate-200 text-sm font-bold text-slate-600"><Download className="w-4 h-4" /> Download Template</button>
            </div>
          </div>

          {/* File Upload */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h3 className="text-base font-bold text-slate-800 mb-4">Upload File</h3>
            <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-bhutan-maroon/50 hover:bg-slate-50/50 transition-colors">
              <Upload className="w-10 h-10 text-slate-400 mb-3" />
              <p className="text-sm font-bold text-slate-600">{fileName || 'Click to select Excel/CSV file'}</p>
              <p className="text-xs text-slate-400 mt-1">.xlsx, .xls, .csv supported</p>
              <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} />
            </label>

            {importResult && (
              <div className={`mt-4 p-4 rounded-xl ${importResult.success ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {importResult.success ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
                  <span className="font-bold text-sm">{importResult.message}</span>
                </div>
                {importResult.data?.errors?.length > 0 && (
                  <div className="mt-2 text-xs text-red-600 space-y-1">
                    {importResult.data.errors.slice(0, 5).map((err: string, i: number) => <div key={i}>{err}</div>)}
                    {importResult.data.errors.length > 5 && <div>+{importResult.data.errors.length - 5} more errors</div>}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
