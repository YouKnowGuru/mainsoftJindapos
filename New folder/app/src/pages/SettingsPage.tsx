import { useState, useEffect } from 'react';
import {
  Building2,
  Percent,
  Database,
  Users,
  Plus,
  X,
  Shield,
  Key,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  Laptop,
  KeyRound
} from 'lucide-react';
import { useAppStore } from '../store/appStore';

export function SettingsPage() {
  const { showNotification } = useAppStore();
  const [activeTab, setActiveTab] = useState<string>('company');
  const [backupStatus, setBackupStatus] = useState<any>({});
  const [usersList, setUsersList] = useState<any[]>([]);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [userLimit, setUserLimit] = useState<number>(1);

  // License states
  const [licenseInfo, setLicenseInfo] = useState<any>(null);
  const [showLicenseKey, setShowLicenseKey] = useState(false);
  const [licenseKey, setLicenseKey] = useState<string | null>(null);
  const [verifyPassword, setVerifyPassword] = useState('');
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  // Form states
  const [companyForm, setCompanyForm] = useState({
    name: '',
    tradeLicenseNo: '',
    taxNo: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    tagline: '',
  });

  const [gstForm, setGstForm] = useState({
    gstRate: 5,
    invoicePrefix: 'DT',
  });

  const [newUserForm, setNewUserForm] = useState({
    username: '',
    password: '',
    fullName: '',
    role: 'staff' as 'admin' | 'staff',
  });

  const [passwordChangeModal, setPasswordChangeModal] = useState<{
    isOpen: boolean;
    userId: number | null;
    username: string;
    newPassword: '';
    oldPassword: '';
  }>({
    isOpen: false,
    userId: null,
    username: '',
    newPassword: '',
    oldPassword: ''
  });

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadSettings();
    loadBackupStatus();
    loadUsers();
    loadLogo();
    loadUserLimit();
    loadLicenseStatus();
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const user = await window.electronAPI.auth.getCurrentUser();
      if (user) setCurrentUser(user);
    } catch (error) {
      console.error('Failed to load current user:', error);
    }
  };

  const loadUserLimit = async () => {
    try {
      if (window.electronAPI.license?.getUserLimit) {
        const limit = await window.electronAPI.license.getUserLimit();
        setUserLimit(limit || 1);
      }
    } catch (error) {
      console.error('Failed to load user limit:', error);
    }
  };

  const loadLicenseStatus = async () => {
    try {
      if (window.electronAPI.license?.getStatus) {
        const status = await window.electronAPI.license.getStatus();
        setLicenseInfo(status);
        if (status.licenseKey) {
          setLicenseKey(status.licenseKey);
        }
      }
    } catch (error) {
      console.error('Failed to load license status:', error);
    }
  };

  const handleRevealKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyPassword) {
      setPasswordError('Password is required');
      return;
    }

    setIsVerifyingPassword(true);
    setPasswordError('');

    try {
      const currentUser = await window.electronAPI.auth.getCurrentUser();
      if (!currentUser) {
        setPasswordError('User session expired.');
        setIsVerifyingPassword(false);
        return;
      }

      const result = await window.electronAPI.auth.login({
        username: currentUser.username,
        password: verifyPassword
      });

      if (result.success) {
        setShowLicenseKey(true);
        setVerifyPassword('');
      } else {
        setPasswordError('Incorrect password');
      }
    } catch (error) {
      setPasswordError('Failed to verify password');
    } finally {
      setIsVerifyingPassword(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordChangeModal.userId) return;

    try {
      const result = await window.electronAPI.settings.changePassword({
        userId: passwordChangeModal.userId,
        newPassword: passwordChangeModal.newPassword,
        oldPassword: passwordChangeModal.oldPassword || undefined
      });

      if (result.success) {
        showNotification('Password updated successfully', 'success');
        setPasswordChangeModal({ isOpen: false, userId: null, username: '', newPassword: '', oldPassword: '' });
      } else {
        showNotification(result.message || 'Failed to update password', 'error');
      }
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Error updating password', 'error');
    }
  };

  const loadSettings = async () => {
    try {
      const result = await window.electronAPI.settings.get();
      if (result) {
        setGstForm({
          gstRate: parseFloat(result.gst_rate) || 5,
          invoicePrefix: result.invoice_prefix || 'DT',
        });
        setCompanyForm({
          name: result.company_name || '',
          tradeLicenseNo: result.trade_license_no || '',
          taxNo: result.tax_no || '',
          address: result.address || '',
          phone: result.phone || '',
          email: result.email || '',
          website: result.website || '',
          tagline: result.tagline || '',
        });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const loadBackupStatus = async () => {
    try {
      const result = await window.electronAPI.backup.autoBackupStatus();
      if (result?.data) {
        setBackupStatus(result.data);
      }
    } catch (error) {
      console.error('Failed to load backup status:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const result = await window.electronAPI.settings.getUsers();
      if (result?.success && result.data) {
        setUsersList(result.data);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const validateCompanyForm = () => {
    const errors: Record<string, string> = {};
    if (!companyForm.name.trim()) errors.name = 'Company name is required';
    if (companyForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyForm.email)) {
      errors.email = 'Invalid email address';
    }
    if (companyForm.phone && !/^\+?[0-9\s-]{8,}$/.test(companyForm.phone)) {
      errors.phone = 'Invalid phone number';
    }
    if (companyForm.website && !/^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/.test(companyForm.website)) {
      errors.website = 'Invalid website URL';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveCompanySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCompanyForm()) return;

    try {
      const result = await window.electronAPI.settings.update({
        company_name: companyForm.name,
        trade_license_no: companyForm.tradeLicenseNo,
        tax_no: companyForm.taxNo,
        address: companyForm.address,
        phone: companyForm.phone,
        email: companyForm.email,
        website: companyForm.website,
        tagline: companyForm.tagline,
      });
      if (result.success) {
        showNotification('Company settings saved successfully', 'success');
      } else {
        showNotification(result.message || 'Failed to save settings', 'error');
      }
    } catch (error) {
      showNotification('Failed to save settings', 'error');
    }
  };

  const loadLogo = async () => {
    try {
      const result = await window.electronAPI.settings.getLogo();
      if (result?.success && result.data) {
        setCompanyLogo(result.data);
      }
    } catch (error) {
      console.error('Failed to load logo:', error);
    }
  };

  const uploadLogo = async () => {
    try {
      const result = await window.electronAPI.settings.uploadLogo();
      if (result?.success && result.data) {
        setCompanyLogo(result.data);
        showNotification('Logo uploaded successfully!', 'success');
      } else if (result?.message && result.message !== 'No file selected') {
        showNotification(result.message, 'error');
      }
    } catch (error) {
      showNotification('Failed to upload logo', 'error');
    }
  };

  const saveGSTSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await window.electronAPI.settings.update({
        gst_rate: gstForm.gstRate.toString(),
        invoice_prefix: gstForm.invoicePrefix,
      });
      if (result.success) {
        showNotification('GST settings saved', 'success');
      }
    } catch (error) {
      showNotification('Failed to save settings', 'error');
    }
  };

  const createBackup = async () => {
    try {
      const result = await window.electronAPI.backup.create();
      if (result.success) {
        showNotification('Backup created successfully', 'success');
        loadBackupStatus();
      } else {
        showNotification(result.message || 'Backup failed', 'error');
      }
    } catch (error) {
      showNotification('Backup failed', 'error');
    }
  };

  const restoreBackup = async () => {
    if (!confirm('This will replace your current data. Are you sure?')) return;

    try {
      const result = await window.electronAPI.backup.restore();
      if (result.success) {
        showNotification('Backup restored. Please restart the application.', 'success');
      } else {
        showNotification(result.message || 'Restore failed', 'error');
      }
    } catch (error) {
      showNotification('Restore failed', 'error');
    }
  };

  const tabs = [
    { id: 'company', label: 'Company', icon: Building2 },
    { id: 'gst', label: 'GST Settings', icon: Percent },
    { id: 'backup', label: 'Backup & Restore', icon: Database },
    { id: 'users', label: 'Users', icon: Users },
    ...(currentUser?.role === 'admin' ? [{ id: 'security', label: 'Security', icon: Shield }] : []),
    { id: 'license', label: 'License', icon: Key },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'license':
        return (
          <div className="space-y-8 max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-bhutan-maroon/5 border border-bhutan-maroon/10 rounded-[28px] p-6">
              <div className="flex items-center gap-4 mb-2">
                <div className="p-3 bg-bhutan-maroon text-white rounded-2xl shadow-lg shadow-bhutan-maroon/20">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 tracking-widest uppercase mb-1">License Information</h3>
                  <p className="text-xs text-slate-500 font-bold tracking-wider">Manage your software plan and access key.</p>
                </div>
              </div>
            </div>

            {licenseInfo && (
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-slate-50 border border-slate-100 rounded-[32px] p-6 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-500">
                  <div className="flex items-center gap-3 mb-6">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Active Plan</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-3xl font-black text-slate-900 capitalize tracking-tight">
                      {licenseInfo.plan || (licenseInfo.type === 'trial' ? 'Free Trial' : 'Unknown')}
                    </p>
                    <p className="text-sm font-bold text-slate-500">
                      {licenseInfo.type === 'licensed' ?
                        (licenseInfo.daysRemaining ? `${licenseInfo.daysRemaining} Days Remaining` : 'Lifetime Validity') :
                        (licenseInfo.type === 'trial' ? `${licenseInfo.daysRemaining} Days Remaining` : 'Expired / None')}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-[32px] p-6 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-500">
                  <div className="flex items-center gap-3 mb-6">
                    <Laptop className="w-5 h-5 text-bhutan-blue" />
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Device Details</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-lg font-black text-slate-900 truncate" title={licenseInfo.deviceId || 'Unknown Device'}>
                      {licenseInfo.deviceId ? licenseInfo.deviceId.substring(0, 15) + '...' : 'Unknown'}
                    </p>
                    <p className="text-sm font-bold text-slate-500">Linked Computer</p>
                  </div>
                </div>
              </div>
            )}

            {/* License Key Reveal Section */}
            {licenseKey && (
              <div className="bg-white border border-slate-200 rounded-[32px] p-8 mt-8 shadow-sm">
                <h3 className="text-xs font-black text-slate-400 tracking-widest uppercase mb-6 flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  Product Key
                </h3>

                {showLicenseKey ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center space-y-4 animate-in fade-in zoom-in duration-300">
                    <p className="text-2xl font-mono font-bold tracking-[0.2em] text-slate-900 text-center select-all break-all bg-white py-4 px-6 rounded-xl border border-slate-200 w-full shadow-inner">
                      {licenseKey}
                    </p>
                    <button
                      type="button"
                      onClick={() => { setShowLicenseKey(false); setVerifyPassword(''); }}
                      className="text-xs font-black text-bhutan-maroon uppercase tracking-widest hover:text-black transition-colors flex items-center gap-2"
                    >
                      <EyeOff className="w-4 h-4" /> Hide License Key
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleRevealKey} className="space-y-4">
                    <div>
                      <label className="block text-xs font-black text-slate-600 uppercase tracking-widest mb-2">
                        Verify Admin Password to Reveal Key
                      </label>
                      <div className="relative">
                        <input
                          type="password"
                          value={verifyPassword}
                          onChange={(e) => setVerifyPassword(e.target.value)}
                          placeholder="Enter your login password"
                          className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 focus:outline-none focus:border-bhutan-maroon focus:ring-4 focus:ring-bhutan-maroon/10 transition-all font-mono"
                          disabled={isVerifyingPassword}
                        />
                      </div>
                      {passwordError && (
                        <p className="text-red-500 text-xs font-bold mt-2 ml-2">{passwordError}</p>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={isVerifyingPassword || !verifyPassword}
                      className="flex items-center justify-center gap-2 w-full bg-slate-900 text-white px-8 py-4 rounded-2xl hover:bg-bhutan-maroon disabled:opacity-50 disabled:cursor-not-allowed transition-all font-black uppercase tracking-widest text-xs shadow-lg shadow-slate-900/10 active:scale-95"
                    >
                      {isVerifyingPassword ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" /> Verifying...
                        </>
                      ) : (
                        <>
                          <Eye className="w-5 h-5" /> Reveal License Key
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        );
      case 'company':
        return (
          <form onSubmit={saveCompanySettings} className="space-y-8 max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-bhutan-maroon/5 border border-bhutan-maroon/10 rounded-[28px] p-6 mb-2">
              <p className="text-xs text-bhutan-maroon font-bold flex items-center gap-3">
                <span className="p-1.5 bg-bhutan-maroon text-white rounded-lg"><Plus className="w-3 h-3 rotate-45" /></span>
                Identity details will be prominently displayed on all digital and printed artifacts.
              </p>
            </div>

            {/* Logo Upload Section */}
            <div className="bg-slate-50 border border-slate-100 rounded-[32px] p-8 group hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-500">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Company Brand Assets</label>
              <div className="flex items-center gap-10">
                <div
                  className="w-40 h-28 bg-white border-2 border-dashed border-slate-200 rounded-3xl flex items-center justify-center overflow-hidden transition-all group-hover:border-bhutan-maroon/30 shadow-sm"
                >
                  {companyLogo ? (
                    <img src={companyLogo} alt="Logo" className="max-w-full max-h-full object-contain p-2" />
                  ) : (
                    <div className="text-center space-y-2">
                      <Building2 className="w-8 h-8 text-slate-200 mx-auto" />
                      <span className="text-slate-300 text-xs font-black uppercase tracking-widest">No Brand Asset</span>
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={uploadLogo}
                    className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3.5 rounded-2xl hover:bg-bhutan-maroon transition-all font-black uppercase tracking-widest text-xs shadow-lg shadow-slate-900/10 active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    {companyLogo ? 'Update Logo' : 'Initialize Brand Logo'}
                  </button>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest italic opacity-60">
                    Optimal: 400x400px • PNG/SVG • Transparent Background
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Company Name *</label>
                <input
                  type="text"
                  value={companyForm.name}
                  onChange={(e) => {
                    setCompanyForm({ ...companyForm, name: e.target.value });
                    if (formErrors.name) setFormErrors({ ...formErrors, name: '' });
                  }}
                  className={`w-full px-5 py-4 bg-slate-50 border-2 rounded-2xl focus:ring-2 focus:ring-bhutan-maroon/10 focus:bg-white transition-all font-bold text-slate-800 ${formErrors.name ? 'border-red-500 bg-red-50' : 'border-transparent'}`}
                  placeholder="Enter business name"
                />
                {formErrors.name && <p className="text-red-500 text-[10px] font-bold mt-1 ml-1 uppercase tracking-wider">{formErrors.name}</p>}
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Slogan / Tagline</label>
                <input
                  type="text"
                  value={companyForm.tagline}
                  onChange={(e) => setCompanyForm({ ...companyForm, tagline: e.target.value })}
                  className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-bhutan-maroon/10 focus:bg-white transition-all font-bold text-slate-800"
                  placeholder="e.g. Traditional Quality"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Trade License No.</label>
                <input
                  type="text"
                  value={companyForm.tradeLicenseNo}
                  onChange={(e) => setCompanyForm({ ...companyForm, tradeLicenseNo: e.target.value })}
                  className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-bhutan-maroon/10 focus:bg-white transition-all font-bold text-slate-800"
                  placeholder="Official license number"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">GST Number</label>
                <input
                  type="text"
                  value={companyForm.taxNo}
                  onChange={(e) => setCompanyForm({ ...companyForm, taxNo: e.target.value })}
                  className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-bhutan-maroon/10 focus:bg-white transition-all font-bold text-slate-800"
                  placeholder="TPN / GST number"
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Office Address</label>
                <textarea
                  value={companyForm.address}
                  onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                  className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-bhutan-maroon/10 focus:bg-white transition-all font-bold text-slate-800 min-h-[100px]"
                  placeholder="Street, Building, Dzongkhag..."
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Business Mobile</label>
                <input
                  type="tel"
                  value={companyForm.phone}
                  onChange={(e) => {
                    setCompanyForm({ ...companyForm, phone: e.target.value });
                    if (formErrors.phone) setFormErrors({ ...formErrors, phone: '' });
                  }}
                  className={`w-full px-5 py-4 bg-slate-50 border-2 rounded-2xl focus:ring-2 focus:ring-bhutan-maroon/10 focus:bg-white transition-all font-bold text-slate-800 ${formErrors.phone ? 'border-red-500 bg-red-50' : 'border-transparent'}`}
                  placeholder="+975 ..."
                />
                {formErrors.phone && <p className="text-red-500 text-[10px] font-bold mt-1 ml-1 uppercase tracking-wider">{formErrors.phone}</p>}
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Business Email</label>
                <input
                  type="email"
                  value={companyForm.email}
                  onChange={(e) => {
                    setCompanyForm({ ...companyForm, email: e.target.value });
                    if (formErrors.email) setFormErrors({ ...formErrors, email: '' });
                  }}
                  className={`w-full px-5 py-4 bg-slate-50 border-2 rounded-2xl focus:ring-2 focus:ring-bhutan-maroon/10 focus:bg-white transition-all font-bold text-slate-800 ${formErrors.email ? 'border-red-500 bg-red-50' : 'border-transparent'}`}
                  placeholder="official@brand.bt"
                />
                {formErrors.email && <p className="text-red-500 text-[10px] font-bold mt-1 ml-1 uppercase tracking-wider">{formErrors.email}</p>}
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Business Website</label>
                <input
                  type="url"
                  value={companyForm.website}
                  onChange={(e) => {
                    setCompanyForm({ ...companyForm, website: e.target.value });
                    if (formErrors.website) setFormErrors({ ...formErrors, website: '' });
                  }}
                  className={`w-full px-5 py-4 bg-slate-50 border-2 rounded-2xl focus:ring-2 focus:ring-bhutan-maroon/10 focus:bg-white transition-all font-bold text-slate-800 ${formErrors.website ? 'border-red-500 bg-red-50' : 'border-transparent'}`}
                  placeholder="https://..."
                />
                {formErrors.website && <p className="text-red-500 text-[10px] font-bold mt-1 ml-1 uppercase tracking-wider">{formErrors.website}</p>}
              </div>
            </div>

            <div className="flex pt-4">
              <button
                type="submit"
                className="px-12 py-4 bg-bhutan-maroon text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-bhutan-maroon-dark transition-all shadow-xl shadow-bhutan-maroon/20 active:scale-95"
              >
                Commit Business Identity
              </button>
            </div>
          </form>
        );

      case 'gst':
        return (
          <form onSubmit={saveGSTSettings} className="space-y-8 max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Universal GST Ratio (%)</label>
                <input
                  type="number"
                  value={gstForm.gstRate}
                  onChange={(e) => setGstForm({ ...gstForm, gstRate: Number(e.target.value) })}
                  className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-bhutan-maroon/10 focus:bg-white transition-all font-black text-slate-900 text-2xl"
                  min={0}
                  max={100}
                  step={0.01}
                />
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest ml-1">Standardized tax percentage</p>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Serial Index Prefix</label>
                <input
                  type="text"
                  value={gstForm.invoicePrefix}
                  onChange={(e) => setGstForm({ ...gstForm, invoicePrefix: e.target.value })}
                  className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-bhutan-maroon/10 focus:bg-white transition-all font-black text-slate-900 text-2xl uppercase"
                  maxLength={5}
                />
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest ml-1">Digital ledger identification</p>
              </div>
            </div>
            <div className="bg-bhutan-orange/5 border border-bhutan-orange/20 rounded-[28px] p-6">
              <p className="text-sm text-bhutan-orange-dark font-bold flex items-center gap-3">
                <span className="p-1.5 bg-bhutan-orange text-white rounded-lg"><Percent className="w-3 h-3" /></span>
                Bhutanese GST Compliance: 5% Rate effective from 2026.
              </p>
            </div>
            <button
              type="submit"
              className="px-12 py-4 bg-bhutan-maroon text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-bhutan-maroon-dark transition-all shadow-xl shadow-bhutan-maroon/20 active:scale-95"
            >
              Update Tax Parameters
            </button>
          </form>
        );

      case 'backup':
        return (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-emerald-50 border border-emerald-100 rounded-[40px] p-8 group hover:bg-white hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-500">
                <div className="flex items-center gap-4 mb-8">
                  <div className="bg-emerald-500 p-3 rounded-2xl shadow-lg shadow-emerald-500/20">
                    <Database className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-emerald-600 uppercase tracking-widest">Backup Data</h4>
                    <p className="text-sm font-bold text-slate-500">Secure your current ledger data</p>
                  </div>
                </div>
                <button
                  onClick={createBackup}
                  className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-emerald-600 shadow-xl shadow-emerald-500/10 active:scale-95 transition-all"
                >
                  Create Instant Backup
                </button>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-[40px] p-8 group hover:shadow-2xl hover:shadow-slate-900/40 transition-all duration-500">
                <div className="flex items-center gap-4 mb-8">
                  <div className="bg-bhutan-maroon p-3 rounded-2xl shadow-lg shadow-bhutan-maroon/20">
                    <Database className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Restore Data</h4>
                    <p className="text-sm font-bold text-white/40">Import data from a previous state</p>
                  </div>
                </div>
                <button
                  onClick={restoreBackup}
                  className="w-full bg-white/10 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-bhutan-maroon transition-all active:scale-95"
                >
                  Initiate Restore Process
                </button>
              </div>
            </div>

            <div className="bg-slate-50 rounded-[32px] p-8 border border-slate-100">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Archive Continuity Status</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-1">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest block">Auto-Sync Protocol</span>
                  <span className={`text-lg font-black uppercase tracking-widest ${backupStatus.enabled ? 'text-emerald-500' : 'text-slate-300'}`}>
                    {backupStatus.enabled ? 'ACTIVE' : 'DEACTIVATED'}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest block">Last Successful Entry</span>
                  <span className="text-sm font-black text-slate-700">
                    {backupStatus.lastBackup ? new Date(backupStatus.lastBackup).toLocaleString() : '---'}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest block">Consolidated Archives</span>
                  <span className="text-2xl font-black text-bhutan-maroon">{backupStatus.backupCount || 0}</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'users':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center bg-slate-50 p-6 rounded-[32px] border border-slate-100">
              <div>
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Access Protocol</h4>
                <p className="text-sm font-bold text-slate-500">Manage authenticated operators</p>
              </div>
              <button
                onClick={() => setShowAddUserModal(true)}
                className="flex items-center gap-3 bg-bhutan-maroon text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-bhutan-maroon-dark transition-all shadow-xl shadow-bhutan-maroon/20 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                Enroll New Operator
              </button>
            </div>

            <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-black text-blue-900 uppercase tracking-widest">Plan Utilization</p>
                  <p className="text-[10px] text-blue-700 font-bold">Your plan allows up to <span className="text-blue-900">{usersList.filter(u => u.is_active).length} / {userLimit}</span> active operators.</p>
                </div>
              </div>
              <button
                onClick={() => window.electronAPI.shell.openExternal('https://dhisumtseyig.com/pricing')}
                className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline"
              >
                Upgrade Plan
              </button>
            </div>

            <div className="overflow-hidden bg-white rounded-[32px] border border-slate-50 shadow-sm">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-900">
                    <th className="text-left py-6 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Authenticated Name</th>
                    <th className="text-left py-6 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">System Identifier</th>
                    <th className="text-left py-6 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Authorization</th>
                    <th className="text-center py-6 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Connectivity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {usersList.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-20">
                        <Users className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                        <p className="text-xs font-black text-slate-300 uppercase tracking-widest">No operators synchronized</p>
                      </td>
                    </tr>
                  ) : usersList.map((user: any) => (
                    <tr key={user.id} className="group hover:bg-slate-50/80 transition-all">
                      <td className="py-5 px-6">
                        <span className="text-sm font-black text-slate-800">{user.full_name}</span>
                      </td>
                      <td className="py-5 px-4 font-bold text-slate-500 text-sm">{user.username}</td>
                      <td className="py-5 px-4">
                        <span className={`text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${user.role === 'admin' ? 'bg-bhutan-gold/10 text-bhutan-gold' : 'bg-slate-100 text-slate-500'
                          }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-5 px-6 text-center">
                        <span className={`text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${user.is_active ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'
                          }`}>
                          {user.is_active ? 'Linked' : 'Offline'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add User Modal */}
            {showAddUserModal && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-[40px] w-full max-w-md p-10 shadow-2xl border border-white/20 animate-in zoom-in-95 duration-300">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight">Access Provision</h3>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">Enrollment of new system operator</p>
                    </div>
                    <button
                      onClick={() => setShowAddUserModal(false)}
                      className="w-10 h-10 flex items-center justify-center bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition-all active:scale-90"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      try {
                        const result = await window.electronAPI.settings.createUser({
                          username: newUserForm.username,
                          password: newUserForm.password,
                          fullName: newUserForm.fullName,
                          role: newUserForm.role,
                        });
                        if (result?.success) {
                          showNotification('User created successfully', 'success');
                          setShowAddUserModal(false);
                          setNewUserForm({ username: '', password: '', fullName: '', role: 'staff' });
                          loadUsers();
                        } else {
                          showNotification(result?.message || 'Failed to create user', 'error');
                        }
                      } catch (error: any) {
                        showNotification(error.message || 'Failed to create user', 'error');
                      }
                    }}
                    className="space-y-6"
                  >
                    <div className="space-y-2">
                      <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Legal Full Name</label>
                      <input
                        type="text"
                        value={newUserForm.fullName}
                        onChange={(e) => setNewUserForm({ ...newUserForm, fullName: e.target.value })}
                        className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-bhutan-maroon/20 focus:bg-white transition-all font-bold text-slate-800"
                        placeholder="Operator's full name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Unique Identifier</label>
                      <input
                        type="text"
                        value={newUserForm.username}
                        onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value })}
                        className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-bhutan-maroon/20 focus:bg-white transition-all font-bold text-slate-800"
                        placeholder="Login username"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Cryptographic Key</label>
                      <input
                        type="password"
                        value={newUserForm.password}
                        onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                        className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-bhutan-maroon/20 focus:bg-white transition-all font-bold text-slate-800"
                        placeholder="Minimum 6 characters"
                        required
                        minLength={6}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Privilege Level</label>
                      <select
                        value={newUserForm.role}
                        onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value as any })}
                        className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-bhutan-maroon/20 focus:bg-white transition-all font-black text-slate-800 appearance-none cursor-default opacity-60"
                        disabled
                      >
                        <option value="staff">Operational Staff</option>
                      </select>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider ml-1">Only 1 Administrative Master account is permitted.</p>
                    </div>
                    <div className="flex gap-4 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowAddUserModal(false)}
                        className="flex-1 py-4 text-slate-400 font-bold uppercase tracking-widest text-xs hover:text-slate-600 transition-colors"
                      >
                        Discard
                      </button>
                      <button
                        type="submit"
                        className="flex-[2] py-4 bg-bhutan-maroon text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-bhutan-maroon-dark shadow-xl shadow-bhutan-maroon/20 transition-all active:scale-95"
                      >
                        Authorize Profile
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

          </div>
        );

      case 'security':
        return (
          <div className="space-y-8 max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-bhutan-maroon/5 border border-bhutan-maroon/10 rounded-[28px] p-6">
              <div className="flex items-center gap-4 mb-2">
                <div className="p-3 bg-bhutan-maroon text-white rounded-2xl shadow-lg shadow-bhutan-maroon/20">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 tracking-widest uppercase mb-1">Access Control</h3>
                  <p className="text-xs text-slate-500 font-bold tracking-wider">Manage system security and operator passwords.</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-[32px] p-8 mt-8 shadow-sm">
              <h3 className="text-xs font-black text-slate-400 tracking-widest uppercase mb-8 flex items-center gap-2">
                <KeyRound className="w-4 h-4" />
                Password Management
              </h3>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Select Operator</label>
                  <select
                    value={passwordChangeModal.userId || ''}
                    onChange={(e) => {
                      const id = e.target.value ? parseInt(e.target.value) : null;
                      const user = usersList.find(u => u.id === id);
                      setPasswordChangeModal(prev => ({
                        ...prev,
                        userId: id,
                        username: user ? user.username : ''
                      }));
                    }}
                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-bhutan-maroon/20 focus:bg-white transition-all font-bold text-slate-800"
                  >
                    <option value="" disabled>Choose a user to update...</option>
                    {usersList.map((user: any) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name} ({user.username}) - {user.role.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                {passwordChangeModal.userId && (
                  <form onSubmit={handleChangePassword} className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="space-y-2">
                      <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Current Password</label>
                      <input
                        type="password"
                        value={passwordChangeModal.oldPassword}
                        onChange={(e) => setPasswordChangeModal(prev => ({ ...prev, oldPassword: e.target.value as '' }))}
                        className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-bhutan-maroon/20 focus:bg-white transition-all font-bold text-slate-800"
                        placeholder="Required if changing your own password"
                      />
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider ml-1 mt-1">
                        * Only required when changing your own password. Admins can bypass this for other users.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">New Password</label>
                      <input
                        type="password"
                        value={passwordChangeModal.newPassword}
                        onChange={(e) => setPasswordChangeModal(prev => ({ ...prev, newPassword: e.target.value as '' }))}
                        className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-bhutan-maroon/20 focus:bg-white transition-all font-bold text-slate-800"
                        placeholder="Minimum 6 characters"
                        required
                        minLength={6}
                      />
                    </div>

                    <div className="flex justify-end pt-4">
                      <button
                        type="submit"
                        className="py-4 px-8 bg-bhutan-maroon text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-bhutan-maroon-dark shadow-xl shadow-bhutan-maroon/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                        <Shield className="w-4 h-4" /> Secure Update
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-10">
        {/* Sidebar Tabs */}
        <div className="w-80 space-y-2">
          <div className="bg-white/50 backdrop-blur-md p-4 rounded-[40px] border border-white shadow-sm space-y-2">
            <p className="px-4 pb-2 text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Application Control</p>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-4 px-5 py-4 rounded-[22px] text-left transition-all duration-300 font-black uppercase tracking-widest text-xs ${activeTab === tab.id
                    ? 'bg-bhutan-maroon text-white shadow-xl shadow-bhutan-maroon/20 translate-x-1'
                    : 'text-slate-500 hover:bg-white hover:text-slate-700 hover:shadow-sm'
                    }`}
                >
                  <div className={`p-2 rounded-xl ${activeTab === tab.id ? 'bg-white/20' : 'bg-slate-100'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="p-8 bg-slate-900 rounded-[40px] border border-slate-800 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
              <Database className="w-16 h-16 text-white" />
            </div>
            <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">System Health</p>
            <p className="text-white font-bold text-xs">V 1.0.4 - GST Ready</p>
            <div className="mt-4 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-xs font-black text-emerald-500 uppercase tracking-widest">Database Online</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white rounded-[40px] shadow-2xl shadow-slate-200/50 border border-slate-50 overflow-hidden flex flex-col min-h-[600px]">
          <div className="p-8 bg-slate-900 border-b border-white/5">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-bhutan-maroon text-white rounded-2xl shadow-lg shadow-bhutan-maroon/20">
                {tabs.find(t => t.id === activeTab)?.icon && (() => {
                  const Icon = tabs.find(t => t.id === activeTab)!.icon;
                  return <Icon className="w-6 h-6" />;
                })()}
              </div>
              <div>
                <h3 className="text-2xl font-black text-white tracking-tight">
                  {tabs.find(t => t.id === activeTab)?.label}
                </h3>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">
                  Configure your business preferences and system parameters
                </p>
              </div>
            </div>
          </div>
          <div className="p-10 flex-1">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
