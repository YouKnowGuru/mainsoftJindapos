import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { UserCheck, Search, UserPlus, Trash2, Download, Mail, X, CreditCard, History, CheckCircle, AlertCircle, Pencil } from 'lucide-react';
import { useAppStore } from '../store/appStore';

export function EmployeePage() {
  const { showNotification } = useAppStore();
  const [employees, setEmployees] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEmailPayslip, setShowEmailPayslip] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [payslipData, setPayslipData] = useState({ employeeEmail: '', month: '', year: '', notes: '', businessName: '' });
  const [formData, setFormData] = useState({
    id: null as number | null,
    name: '',
    position: '',
    department: '',
    phone: '',
    email: '',
    salary: 0,
    joinDate: '',
    pf_rate: 0,
    gis_amount: 0,
    tds_rate: 0,
    hc_rate: 0
  });
  const [activeTab, setActiveTab] = useState<'employees' | 'payroll' | 'history'>('employees');
  const [payrollHistory, setPayrollHistory] = useState<any[]>([]);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [payrollForm, setPayrollForm] = useState({
    month: format(new Date(), 'MM'),
    year: new Date().getFullYear().toString(),
    paymentMode: 'cash' as any
  });
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadEmployees();
    if (activeTab === 'history') loadPayrollHistory();
  }, [activeTab]);

  const loadEmployees = async () => {
    const api = window.electronSecureAPI;
    if (!api?.employees) { setEmployees([]); return; }
    try { const result = await api.employees.getAll(false); if (result?.success) setEmployees(result.data || []); else setEmployees([]); } catch { setEmployees([]); }
  };

  const loadPayrollHistory = async () => {
    try {
      const result = await window.electronSecureAPI.payroll?.getHistory();
      if (result?.success) setPayrollHistory(result.data || []);
    } catch {
      showNotification('Failed to load payroll history', 'error');
    }
  };

  const handleProcessPayroll = async () => {
    setIsProcessing(true);
    try {
      const api = window.electronSecureAPI;
      const currentUser = await api.auth?.getCurrentUser();

      const result = await api.payroll?.process({
        ...payrollForm,
        userId: currentUser?.id || 1
      });

      if (result?.success) {
        showNotification(result.message, 'success');
        setShowProcessModal(false);
        setActiveTab('history');
      } else {
        showNotification(result?.message || 'Failed to process payroll', 'error');
      }
    } catch (error: any) {
      showNotification(error.message || 'Error processing payroll', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) { showNotification('Employee name is required', 'error'); return; }
    try {
      const api = window.electronSecureAPI.employees;
      let result;

      if (formData.id) {
        result = await api?.update(formData.id, formData);
      } else {
        result = await api?.create(formData);
      }

      if (result?.success) {
        showNotification(formData.id ? 'Employee updated' : 'Employee added', 'success');
        setShowAddModal(false);
        loadEmployees();
        setFormData({
          id: null, name: '', position: '', department: '', phone: '', email: '',
          salary: 0, joinDate: '', pf_rate: 0, gis_amount: 0, tds_rate: 0, hc_rate: 0
        });
      }
    } catch { showNotification('Failed to save employee', 'error'); }
  };

  const handleExport = async () => {
    try {
      const result = await window.electronSecureAPI.employees?.export();
      if (result?.success) {
        showNotification(result.message, 'success');
      } else {
        showNotification(result?.message || 'Failed to export employees', 'error');
      }
    } catch {
      showNotification('Failed to export employees', 'error');
    }
  };

  const formatCurrency = (amount: number) => 'Nu. ' + amount.toFixed(2);

  const handleEmailPayslip = async () => {
    if (!payslipData.employeeEmail.trim()) {
      showNotification('Please enter an email address', 'error');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payslipData.employeeEmail)) {
      showNotification('Please enter a valid email address', 'error');
      return;
    }
    if (!selectedEmployee) {
      showNotification('No employee selected', 'error');
      return;
    }
    try {
      const gross = selectedEmployee.salary || 0;
      const pfAmt = gross * (selectedEmployee.pf_rate || 0) / 100;
      const tdsAmt = gross * (selectedEmployee.tds_rate || 0) / 100;
      const hcAmt = gross * (selectedEmployee.hc_rate || 0) / 100;
      const gisAmt = selectedEmployee.gis_amount || 0;
      const net = gross - pfAmt - tdsAmt - hcAmt - gisAmt;
      const subject = encodeURIComponent(`Payslip - ${payslipData.month || 'Current Month'} ${payslipData.year || new Date().getFullYear()} from ${payslipData.businessName || 'Jinda'}`);
      const bodyText = `Dear ${selectedEmployee.name},\n\nPlease find your payslip details below:\n\n` +
        `Employee: ${selectedEmployee.name}\n` +
        `Position: ${selectedEmployee.position || '-'}\n` +
        `Department: ${selectedEmployee.department || 'General'}\n` +
        `Period: ${payslipData.month || 'Current Month'} ${payslipData.year || new Date().getFullYear()}\n\n` +
        `Gross Salary: ${formatCurrency(gross)}\n` +
        `Less PF (${selectedEmployee.pf_rate || 0}%): ${formatCurrency(pfAmt)}\n` +
        `Less TDS (${selectedEmployee.tds_rate || 0}%): ${formatCurrency(tdsAmt)}\n` +
        `Less GIS: ${formatCurrency(gisAmt)}\n` +
        `Less HC (${selectedEmployee.hc_rate || 0}%): ${formatCurrency(hcAmt)}\n` +
        `Net Salary: ${formatCurrency(net)}\n\n` +
        (payslipData.notes ? `Notes: ${payslipData.notes}\n\n` : '') +
        `Regards,\n${payslipData.businessName || 'Jinda'}`;
      const body = encodeURIComponent(bodyText);
      const mailtoUrl = `mailto:${payslipData.employeeEmail}?subject=${subject}&body=${body}`;

      const api = window.electronSecureAPI;
      if (api?.platform === 'win32' || api?.platform === 'darwin') {
        // Use electron shell for desktop
        const result = await api.emailInvoice?.send({
          customerEmail: payslipData.employeeEmail,
          invoiceNo: `PAYSLIP-${selectedEmployee.employee_no}-${payslipData.month || 'Current'}-${payslipData.year || new Date().getFullYear()}`,
          totalAmount: selectedEmployee.salary,
          businessName: payslipData.businessName || 'Jinda'
        });
        if (!result?.success) {
          window.open(mailtoUrl, '_blank');
        }
      } else {
        window.open(mailtoUrl, '_blank');
      }

      showNotification('Payslip email opened successfully', 'success');
      setShowEmailPayslip(false);
      setPayslipData({ employeeEmail: '', month: '', year: '', notes: '', businessName: '' });
      setSelectedEmployee(null);
    } catch {
      showNotification('Failed to open email client', 'error');
    }
  };

  const filteredEmployees = employees.filter(emp => emp.name?.toLowerCase().includes(searchQuery.toLowerCase()) || emp.position?.toLowerCase().includes(searchQuery.toLowerCase()) || emp.department?.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-6 pb-8 px-2 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Employees</h1>
          <p className="text-slate-500 text-sm">Manage staff and payroll information</p>
        </div>
        <div className="flex gap-2 sm:gap-3 flex-wrap">
          <button
            onClick={() => setActiveTab('employees')}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${activeTab === 'employees' ? 'bg-bhutan-maroon text-white shadow-lg shadow-bhutan-maroon/20' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
          >
            Staff List
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${activeTab === 'history' ? 'bg-bhutan-maroon text-white shadow-lg shadow-bhutan-maroon/20' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
          >
            Payment History
          </button>
        </div>
      </div>

      {activeTab === 'employees' && (
        <>
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-bhutan-maroon/10 focus:border-bhutan-maroon transition-all"
                placeholder="Search employees..."
              />
            </div>
            <div className="flex gap-2 flex-wrap sm:flex-nowrap">
              <button
                onClick={handleExport}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-100 rounded-xl hover:bg-slate-200 text-xs sm:text-sm font-bold text-slate-600"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export</span>
              </button>
              <button
                onClick={() => setShowProcessModal(true)}
                className="flex items-center justify-center gap-1.5 px-3 sm:px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 text-xs sm:text-sm font-bold shadow-lg shadow-emerald-600/20"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Process</span>
                <span className="sm:hidden">Payroll</span>
              </button>
              <button
                onClick={() => {
                  setFormData({
                    id: null, name: '', position: '', department: '', phone: '', email: '',
                    salary: 0, joinDate: '', pf_rate: 0, gis_amount: 0, tds_rate: 0, hc_rate: 0
                  });
                  setShowAddModal(true);
                }}
                className="flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 bg-bhutan-maroon text-white rounded-xl hover:bg-bhutan-maroon-dark text-xs sm:text-sm font-bold shadow-lg shadow-bhutan-maroon/20"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Add</span>
                <span className="sm:hidden">New</span>
              </button>
            </div>
          </div>

          {/* Employee Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {filteredEmployees.length === 0 ? (
              <div className="text-center py-16 sm:py-24 bg-slate-50/30">
                <UserCheck className="w-10 h-10 sm:w-12 sm:h-12 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-xs sm:text-sm">No employees registered</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-px">
                <table className="w-full min-w-[900px]">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left py-3 px-3 sm:py-4 sm:px-6 text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Emp No</th>
                      <th className="text-left py-3 px-3 sm:py-4 sm:px-6 text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Name</th>
                      <th className="text-left py-3 px-3 sm:py-4 sm:px-6 text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Position</th>
                      <th className="text-left py-3 px-3 sm:py-4 sm:px-6 text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Dept</th>
                      <th className="text-right py-3 px-2 sm:py-4 sm:px-4 text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Salary</th>
                      <th className="text-right py-3 px-2 sm:py-4 sm:px-4 text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">PF%</th>
                      <th className="text-right py-3 px-2 sm:py-4 sm:px-4 text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">TDS%</th>
                      <th className="text-right py-3 px-2 sm:py-4 sm:px-4 text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">GIS</th>
                      <th className="text-right py-3 px-2 sm:py-4 sm:px-4 text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">HC%</th>
                      <th className="text-center py-3 px-2 sm:py-4 sm:px-6 text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Status</th>
                      <th className="text-center py-3 px-2 sm:py-4 sm:px-6 text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredEmployees.map((emp: any) => (
                      <tr key={emp.id} className={`hover:bg-slate-50/50 transition-colors ${emp.is_active === 0 ? 'opacity-50 bg-slate-50' : ''}`}>
                        <td className="py-3 px-3 sm:py-4 sm:px-6 text-xs sm:text-sm font-mono font-bold text-slate-800 whitespace-nowrap">{emp.employee_no}</td>
                        <td className="py-3 px-3 sm:py-4 sm:px-6 text-xs sm:text-sm font-bold text-slate-800 whitespace-nowrap">{emp.name}</td>
                        <td className="py-3 px-3 sm:py-4 sm:px-6 text-xs sm:text-sm text-slate-600 whitespace-nowrap">{emp.position || '-'}</td>
                        <td className="py-3 px-3 sm:py-4 sm:px-6 whitespace-nowrap">
                          <span className="inline-flex px-2 py-0.5 sm:px-3 sm:py-1 bg-blue-50 text-blue-700 rounded-full text-[10px] sm:text-xs font-bold">
                            {emp.department || 'General'}
                          </span>
                        </td>
                        <td className="py-3 px-2 sm:py-4 sm:px-4 text-xs sm:text-sm font-bold text-slate-800 text-right whitespace-nowrap">{formatCurrency(emp.salary)}</td>
                        <td className="py-3 px-2 sm:py-4 sm:px-4 text-xs sm:text-sm font-bold text-amber-600 text-right whitespace-nowrap">{emp.pf_rate || 0}%</td>
                        <td className="py-3 px-2 sm:py-4 sm:px-4 text-xs sm:text-sm font-bold text-purple-600 text-right whitespace-nowrap">{emp.tds_rate || 0}%</td>
                        <td className="py-3 px-2 sm:py-4 sm:px-4 text-xs sm:text-sm font-bold text-blue-600 text-right whitespace-nowrap">{formatCurrency(emp.gis_amount || 0)}</td>
                        <td className="py-3 px-2 sm:py-4 sm:px-4 text-xs sm:text-sm font-bold text-emerald-600 text-right whitespace-nowrap">{emp.hc_rate || 0}%</td>
                        <td className="py-3 px-2 sm:py-4 sm:px-6 text-center whitespace-nowrap">
                          <span className={`inline-flex px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase ${emp.is_active === 1 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                            {emp.is_active === 1 ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3 px-2 sm:py-4 sm:px-6 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-0.5 sm:gap-1">
                            <button
                              onClick={() => {
                                setSelectedEmployee(emp);
                                setPayslipData({
                                  employeeEmail: emp.email || '',
                                  month: '',
                                  year: new Date().getFullYear().toString(),
                                  notes: '',
                                  businessName: ''
                                });
                                setShowEmailPayslip(true);
                              }}
                              className="p-1.5 sm:p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                              title="Email Payslip"
                            >
                              <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setFormData({
                                  id: emp.id,
                                  name: emp.name,
                                  position: emp.position || '',
                                  department: emp.department || '',
                                  phone: emp.phone || '',
                                  email: emp.email || '',
                                  salary: emp.salary || 0,
                                  joinDate: emp.join_date || '',
                                  pf_rate: emp.pf_rate || 0,
                                  gis_amount: emp.gis_amount || 0,
                                  tds_rate: emp.tds_rate || 0,
                                  hc_rate: emp.hc_rate || 0
                                });
                                setShowAddModal(true);
                              }}
                              className="p-1.5 sm:p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                              title="Edit Employee"
                            >
                              <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm('Delete employee?')) {
                                  const res = await window.electronSecureAPI.employees?.delete(emp.id);
                                  if (res?.success) loadEmployees();
                                }
                              }}
                              className="p-1.5 sm:p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {payrollHistory.length === 0 ? (
            <div className="text-center py-16 sm:py-24 bg-slate-50/30">
              <History className="w-10 h-10 sm:w-12 sm:h-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-xs sm:text-sm">No payroll history found</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-px">
              <table className="w-full min-w-[900px]">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left py-3 px-3 sm:py-4 sm:px-6 text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Date</th>
                    <th className="text-left py-3 px-3 sm:py-4 sm:px-6 text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Employee</th>
                    <th className="text-left py-3 px-2 sm:py-4 sm:px-4 text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Period</th>
                    <th className="text-left py-3 px-2 sm:py-4 sm:px-4 text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Txn No</th>
                    <th className="text-center py-3 px-2 sm:py-4 sm:px-4 text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Mode</th>
                    <th className="text-right py-3 px-2 sm:py-4 sm:px-4 text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Gross</th>
                    <th className="text-right py-3 px-2 sm:py-4 sm:px-4 text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">PF</th>
                    <th className="text-right py-3 px-2 sm:py-4 sm:px-4 text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">TDS</th>
                    <th className="text-right py-3 px-2 sm:py-4 sm:px-4 text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">GIS</th>
                    <th className="text-right py-3 px-2 sm:py-4 sm:px-4 text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">HC</th>
                    <th className="text-right py-3 px-3 sm:py-4 sm:px-6 text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Net Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payrollHistory.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-3 sm:py-4 sm:px-6 text-xs sm:text-sm text-slate-600 whitespace-nowrap">{new Date(record.date).toLocaleDateString()}</td>
                      <td className="py-3 px-3 sm:py-4 sm:px-6">
                        <div className="flex flex-col">
                          <span className="text-xs sm:text-sm font-bold text-slate-800">{record.employee_name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{record.employee_no}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2 sm:py-4 sm:px-4 text-xs sm:text-sm text-slate-800 font-medium whitespace-nowrap">{record.month} {record.year}</td>
                      <td className="py-3 px-2 sm:py-4 sm:px-4 text-xs sm:text-sm font-mono text-blue-600 font-bold whitespace-nowrap">{record.transaction_no}</td>
                      <td className="py-3 px-2 sm:py-4 sm:px-4 text-center whitespace-nowrap">
                        <span className="inline-flex px-2 py-0.5 sm:px-3 sm:py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] sm:text-xs font-bold uppercase">
                          {record.payment_mode}
                        </span>
                      </td>
                      <td className="py-3 px-2 sm:py-4 sm:px-4 text-xs sm:text-sm font-bold text-slate-600 text-right whitespace-nowrap">{formatCurrency(record.gross_salary || 0)}</td>
                      <td className="py-3 px-2 sm:py-4 sm:px-4 text-xs sm:text-sm font-bold text-amber-600 text-right whitespace-nowrap">{formatCurrency(record.pf_amount || 0)}</td>
                      <td className="py-3 px-2 sm:py-4 sm:px-4 text-xs sm:text-sm font-bold text-purple-600 text-right whitespace-nowrap">{formatCurrency(record.tds_amount || 0)}</td>
                      <td className="py-3 px-2 sm:py-4 sm:px-4 text-xs sm:text-sm font-bold text-blue-600 text-right whitespace-nowrap">{formatCurrency(record.gis_amount || 0)}</td>
                      <td className="py-3 px-2 sm:py-4 sm:px-4 text-xs sm:text-sm font-bold text-emerald-600 text-right whitespace-nowrap">{formatCurrency(record.hc_amount || 0)}</td>
                      <td className="py-3 px-3 sm:py-4 sm:px-6 text-xs sm:text-sm font-black text-slate-900 text-right whitespace-nowrap">{formatCurrency(record.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 pb-0 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-bhutan-maroon/10 text-bhutan-maroon rounded-lg">
                  <UserCheck className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-800">{formData.id ? 'Edit Employee' : 'Add Employee'}</h3>
                  <p className="text-xs sm:text-sm text-slate-500">{formData.id ? 'Update staff information' : 'Register new staff member'}</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Modal Body - Scrollable */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 pt-4 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Full Name *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium" required placeholder="Employee name" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Position</label>
                  <input type="text" value={formData.position} onChange={(e) => setFormData({ ...formData, position: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium" placeholder="Cashier" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Department</label>
                  <input type="text" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium" placeholder="Sales" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Phone</label>
                  <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium" placeholder="+975..." />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Email</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium" placeholder="employee@email.com" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Monthly Gross Salary</label>
                  <input type="number" value={formData.salary} onChange={(e) => setFormData({ ...formData, salary: Number(e.target.value) })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-bhutan-maroon" min={0} step={0.01} placeholder="0.00" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Join Date</label>
                  <input type="date" value={formData.joinDate} onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium" />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Deductions & Benefits</h4>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">PF Rate (%)</label>
                    <input type="number" value={formData.pf_rate} onChange={(e) => setFormData({ ...formData, pf_rate: Number(e.target.value) })} className="w-full px-3 sm:px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold" min={0} max={100} step={0.1} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">TDS Rate (%)</label>
                    <input type="number" value={formData.tds_rate} onChange={(e) => setFormData({ ...formData, tds_rate: Number(e.target.value) })} className="w-full px-3 sm:px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold" min={0} max={100} step={0.1} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-3">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">GIS Amount (Flat)</label>
                    <input type="number" value={formData.gis_amount} onChange={(e) => setFormData({ ...formData, gis_amount: Number(e.target.value) })} className="w-full px-3 sm:px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold" min={0} step={1} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Health Cont. (%)</label>
                    <input type="number" value={formData.hc_rate} onChange={(e) => setFormData({ ...formData, hc_rate: Number(e.target.value) })} className="w-full px-3 sm:px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold" min={0} max={100} step={0.1} />
                  </div>
                </div>
              </div>

              <div className="bg-emerald-50 rounded-xl p-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-emerald-700">Estimated Net Pay:</span>
                  <span className="text-sm font-black text-emerald-700">
                    Nu. {(formData.salary - (formData.salary * (formData.pf_rate + formData.tds_rate + formData.hc_rate) / 100) - formData.gis_amount).toFixed(2)}
                  </span>
                </div>
              </div>
            </form>
            {/* Modal Footer - Sticky */}
            <div className="flex gap-3 p-4 sm:p-6 pt-0 shrink-0">
              <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 sm:py-3 border-2 border-slate-200 rounded-xl hover:bg-slate-50 font-bold text-slate-600 text-sm">Cancel</button>
              <button type="button" onClick={handleSubmit} className="flex-1 py-2.5 sm:py-3 bg-bhutan-maroon text-white rounded-xl hover:bg-bhutan-maroon-dark font-bold shadow-lg shadow-bhutan-maroon/20 text-sm">
                {formData.id ? 'Update Employee' : 'Add Employee'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Payslip Modal */}
      {showEmailPayslip && selectedEmployee && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 pb-0 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 text-blue-600 rounded-lg">
                  <Mail className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-800">Email Payslip</h3>
                  <p className="text-xs sm:text-sm text-slate-500">{selectedEmployee.name}</p>
                </div>
              </div>
              <button
                onClick={() => { setShowEmailPayslip(false); setSelectedEmployee(null); setPayslipData({ employeeEmail: '', month: '', year: '', notes: '', businessName: '' }); }}
                className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 pt-4 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Employee Email *</label>
                <input
                  type="email"
                  value={payslipData.employeeEmail}
                  onChange={(e) => setPayslipData({ ...payslipData, employeeEmail: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all text-sm font-medium text-slate-800"
                  placeholder="employee@email.com"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Month</label>
                  <select
                    value={payslipData.month}
                    onChange={(e) => setPayslipData({ ...payslipData, month: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all text-sm font-medium text-slate-800"
                  >
                    <option value="">Select</option>
                    <option value="January">January</option>
                    <option value="February">February</option>
                    <option value="March">March</option>
                    <option value="April">April</option>
                    <option value="May">May</option>
                    <option value="June">June</option>
                    <option value="July">July</option>
                    <option value="August">August</option>
                    <option value="September">September</option>
                    <option value="October">October</option>
                    <option value="November">November</option>
                    <option value="December">December</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Year</label>
                  <input
                    type="text"
                    value={payslipData.year}
                    onChange={(e) => setPayslipData({ ...payslipData, year: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all text-sm font-medium text-slate-800"
                    placeholder="2026"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Notes (Optional)</label>
                <textarea
                  value={payslipData.notes}
                  onChange={(e) => setPayslipData({ ...payslipData, notes: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all text-sm font-medium text-slate-800 resize-none"
                  rows={2}
                  placeholder="Bonus, deductions, etc."
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Business Name</label>
                <input
                  type="text"
                  value={payslipData.businessName}
                  onChange={(e) => setPayslipData({ ...payslipData, businessName: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all text-sm font-medium text-slate-800"
                  placeholder="Your Business Name"
                />
              </div>

              <div className="bg-slate-50 rounded-xl p-3 sm:p-4 space-y-2">
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-slate-500">Employee:</span>
                  <span className="font-bold text-slate-800">{selectedEmployee.name}</span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-slate-500">Position:</span>
                  <span className="font-bold text-slate-800">{selectedEmployee.position || '-'}</span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-slate-500">Monthly Salary:</span>
                  <span className="font-bold text-bhutan-maroon">{formatCurrency(selectedEmployee.salary)}</span>
                </div>
              </div>
            </div>
            {/* Modal Footer */}
            <div className="flex gap-3 p-4 sm:p-6 pt-0 shrink-0">
              <button
                type="button"
                onClick={() => { setShowEmailPayslip(false); setSelectedEmployee(null); setPayslipData({ employeeEmail: '', month: '', year: '', notes: '', businessName: '' }); }}
                className="flex-1 py-2.5 sm:py-3 border-2 border-slate-200 rounded-xl hover:bg-slate-50 font-bold text-slate-600 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleEmailPayslip}
                className="flex-1 py-2.5 sm:py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 text-sm"
              >
                <Mail className="w-4 h-4" />
                Send Payslip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Process Payroll Modal */}
      {showProcessModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 pb-0 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg">
                  <CreditCard className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-800">Process Monthly Payroll</h3>
                  <p className="text-xs sm:text-sm text-slate-500">Record salary payments in ledger</p>
                </div>
              </div>
              <button
                onClick={() => setShowProcessModal(false)}
                className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 pt-4 space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Select Month</label>
                  <select
                    value={payrollForm.month}
                    onChange={(e) => setPayrollForm({ ...payrollForm, month: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all text-sm font-medium text-slate-800"
                  >
                    {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map(m => (
                      <option key={m} value={m}>{new Date(2026, parseInt(m) - 1).toLocaleString('default', { month: 'long' })}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Select Year</label>
                  <input
                    type="text"
                    value={payrollForm.year}
                    onChange={(e) => setPayrollForm({ ...payrollForm, year: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all text-sm font-medium text-slate-800"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Payment From</label>
                <select
                  value={payrollForm.paymentMode}
                  onChange={(e) => setPayrollForm({ ...payrollForm, paymentMode: e.target.value as any })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all text-sm font-medium text-slate-800"
                >
                  <option value="cash">Cash on Hand</option>
                  <option value="bank">Bank Account (BNB/BOB)</option>
                  <option value="mBOB">mBOB (Mobile)</option>
                  <option value="TPay">T-Pay</option>
                </select>
              </div>

              <div className="p-3 sm:p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-xs sm:text-sm text-emerald-800">
                    <p className="font-bold mb-1">Accounting Action</p>
                    <p className="opacity-80">This will generate a formal payment transaction in your ledger for all active employees. This action cannot be easily undone.</p>
                  </div>
                </div>
              </div>

              {(() => {
                const activeEmps = employees.filter(e => e.is_active);
                const totalGross = activeEmps.reduce((sum, e) => sum + (e.salary || 0), 0);
                const totalPF = activeEmps.reduce((sum, e) => sum + (e.salary || 0) * (e.pf_rate || 0) / 100, 0);
                const totalTDS = activeEmps.reduce((sum, e) => sum + (e.salary || 0) * (e.tds_rate || 0) / 100, 0);
                const totalHC = activeEmps.reduce((sum, e) => sum + (e.salary || 0) * (e.hc_rate || 0) / 100, 0);
                const totalGIS = activeEmps.reduce((sum, e) => sum + (e.gis_amount || 0), 0);
                const totalNet = totalGross - totalPF - totalTDS - totalHC - totalGIS;
                return (
                  <div className="bg-slate-50 rounded-xl p-3 sm:p-4 space-y-2">
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-slate-500">Active Staff:</span>
                      <span className="font-bold text-slate-800">{activeEmps.length}</span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm pt-2 border-t border-slate-200">
                      <span className="text-slate-500">Total Gross Salary:</span>
                      <span className="font-bold text-slate-800">{formatCurrency(totalGross)}</span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-slate-500">Less PF:</span>
                      <span className="font-bold text-amber-600">-{formatCurrency(totalPF)}</span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-slate-500">Less TDS:</span>
                      <span className="font-bold text-purple-600">-{formatCurrency(totalTDS)}</span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-slate-500">Less GIS:</span>
                      <span className="font-bold text-blue-600">-{formatCurrency(totalGIS)}</span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-slate-500">Less HC:</span>
                      <span className="font-bold text-emerald-600">-{formatCurrency(totalHC)}</span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm pt-2 border-t border-slate-200">
                      <span className="text-slate-500">Net Disbursement:</span>
                      <span className="font-bold text-emerald-600 text-base sm:text-lg">{formatCurrency(totalNet)}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
            {/* Modal Footer */}
            <div className="flex gap-3 p-4 sm:p-6 pt-0 shrink-0">
              <button
                type="button"
                onClick={() => setShowProcessModal(false)}
                disabled={isProcessing}
                className="flex-1 py-2.5 sm:py-3 border-2 border-slate-200 rounded-xl hover:bg-slate-50 font-bold text-slate-600 disabled:opacity-50 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleProcessPayroll}
                disabled={isProcessing}
                className="flex-1 py-2.5 sm:py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-bold shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
              >
                {isProcessing ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Confirm & Pay
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
