import { useState, useEffect, useCallback } from 'react';
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
  CheckCircle,
  Laptop,
  KeyRound,
  Cloud,
  CloudUpload,
  CloudOff,
  HardDrive,
  Timer,
  RefreshCw,
  AlertTriangle,
  DownloadCloud,
  Clock,
  Zap,
  Stamp,
  PenTool,
  Download,
  RotateCcw,
  Rocket
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { AuthService } from '../services/AuthService';
import { bhutanLocations, getAllRegions } from '../data/bhutanLocations';

export function SettingsPage() {
  const { showNotification } = useAppStore();
  const [activeTab, setActiveTab] = useState<string>('company');
  const [backupStatus, setBackupStatus] = useState<any>({});
  const [usersList, setUsersList] = useState<any[]>([]);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [companySeal, setCompanySeal] = useState<string | null>(null);
  const [companySignature, setCompanySignature] = useState<string | null>(null);
  const [userLimit, setUserLimit] = useState<number>(1);

  // License states
  const [licenseInfo, setLicenseInfo] = useState<any>(null);
  const [showLicenseKey, setShowLicenseKey] = useState(false);
  const [licenseKey, setLicenseKey] = useState<string | null>(null);
  const [verifyPassword, setVerifyPassword] = useState('');
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Cloud Backup states
  const [cloudSettings, setCloudSettings] = useState<any>({
    enabled: false,
    frequency: 'daily',
    targets: { googleDrive: false, mega: false }
  });
  const [connectionStatus, setConnectionStatus] = useState<any>({
    drive: { connected: false, configured: false },
    mega: { connected: false, email: null }
  });
  const [backupLogs, setBackupLogs] = useState<any[]>([]);
  const [backupProgress, setBackupProgress] = useState<any>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [remoteBackups, setRemoteBackups] = useState<any[]>([]);
  const [isLoadingRemote, setIsLoadingRemote] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isConnectingDrive, setIsConnectingDrive] = useState(false);
  const [isConnectingMega, setIsConnectingMega] = useState(false);
  const [showMegaLoginModal, setShowMegaLoginModal] = useState(false);
  const [megaEmail, setMegaEmail] = useState('');
  const [megaPassword, setMegaPassword] = useState('');

  // Update checker states
  const [updateState, setUpdateState] = useState<any>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Form states
  const [companyForm, setCompanyForm] = useState({
    name: '',
    tradeLicenseNo: '',
    taxNo: '',
    address: '',
    addressStreet: '',
    addressGewog: '',
    addressDzongkhag: '',
    phone: '',
    email: '',
    website: '',
    tagline: '',
  });

  const [gstForm, setGstForm] = useState({
    gstRate: 5,
    domesticGstRate: 0,
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
  const [showPasswordReqs, setShowPasswordReqs] = useState(false);

  const passwordReqs = [
    { label: 'At least 8 characters', test: (pw: string) => pw.length >= 8 },
    { label: 'One uppercase letter', test: (pw: string) => /[A-Z]/.test(pw) },
    { label: 'One lowercase letter', test: (pw: string) => /[a-z]/.test(pw) },
    { label: 'One number', test: (pw: string) => /\d/.test(pw) },
    { label: 'One special character (!@#$%^&*(),.?":{}|<>)', test: (pw: string) => /[!@#$%^&*(),.?":{}|<>]/.test(pw) },
  ];

  const loadCloudBackupData = useCallback(async () => {
    try {
      if (window.electronSecureAPI.cloudBackup) {
        const [settings, status, logs] = await Promise.all([
          window.electronSecureAPI.cloudBackup.getSettings(),
          window.electronSecureAPI.cloudBackup.getConnectionStatus(),
          window.electronSecureAPI.cloudBackup.getLogs()
        ]);
        setCloudSettings(settings);
        setConnectionStatus(status);
        setBackupLogs(logs || []);

        setIsLoadingRemote(true);
        try {
          let combined: any[] = [];

          // Try to fetch from both providers regardless of connection status
          // The API calls will handle reconnection if needed
          try {
            if (status.drive.connected || status.drive.configured) {
              const driveItems = await window.electronSecureAPI.cloudBackup.getCloudBackups('drive');
              if (Array.isArray(driveItems)) {
                combined = [...combined, ...driveItems.map((i: any) => ({ ...i, provider: 'drive' }))];
              }
            }
          } catch (driveError) {
            console.error('[SettingsPage] Failed to fetch Drive backups:', driveError);
          }

          try {
            if (status.mega.connected || status.mega.email) {
              const megaItems = await window.electronSecureAPI.cloudBackup.getCloudBackups('mega');
              if (Array.isArray(megaItems) && megaItems.length > 0) {
                combined = [...combined, ...megaItems.map((i: any) => ({ ...i, provider: 'mega' }))];
              }
            }
          } catch (megaError) {
            console.error('[SettingsPage] Failed to fetch MEGA backups:', megaError);
          }

          combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setRemoteBackups(combined);
        } catch (e) {
          console.error('Failed to fetch remote items:', e);
        } finally {
          setIsLoadingRemote(false);
        }
      }
    } catch (error) {
      console.error('Failed to load cloud backup data:', error);
    }
  }, []);

  useEffect(() => {
    loadSettings();
    loadBackupStatus();
    loadUsers();
    loadLogo();
    loadSeal();
    loadSignature();
    loadUserLimit();
    loadLicenseStatus();
    loadCurrentUser();
    loadCloudBackupData();

    // Listen for backup progress events
    if (window.electronSecureAPI.cloudBackup) {
      window.electronSecureAPI.cloudBackup.onProgress((progress: any) => {
        setBackupProgress(progress);
        if (progress.stage === 'complete' || progress.stage === 'error') {
          setIsBackingUp(false);
          setIsRestoring(false);
          loadCloudBackupData();
        }
      });

      return () => {
        window.electronSecureAPI.cloudBackup.removeProgressListener();
      };
    }

  }, [loadCloudBackupData]);

  // Listen for auto-update events (separate effect to avoid re-registering)
  useEffect(() => {
    if (window.electronSecureAPI.update?.onUpdateEvent) {
      const unsubscribe = window.electronSecureAPI.update.onUpdateEvent((event: string, data: any) => {
        console.log('[Settings] Update event:', event, data);
        switch (event) {
          case 'update:available':
            setUpdateState((prev: any) => ({ ...prev, data: { ...prev?.data, available: true, version: data?.version, ...data } }));
            showNotification(`Update v${data?.version} available`, 'info');
            break;
          case 'update:progress':
            setUpdateState((prev: any) => ({ ...prev, data: { ...prev?.data, progress: data?.percent, ...data } }));
            break;
          case 'update:downloaded':
            setUpdateState((prev: any) => ({ ...prev, data: { ...prev?.data, downloaded: true, available: true, version: data?.version, ...data } }));
            showNotification(`Update v${data?.version} downloaded. Restart to install.`, 'success');
            break;
          case 'update:error':
            setUpdateError(data?.message || 'Update error');
            showNotification(data?.message || 'Update error', 'error');
            break;
        }
      });

      return () => {
        unsubscribe();
      };
    }
  }, []);

  const loadCurrentUser = async () => {
    try {
      const user = await window.electronSecureAPI.auth.getCurrentUser();
      if (user) setCurrentUser(user);
    } catch (error) {
      console.error('Failed to load current user:', error);
    }
  };

  const loadUserLimit = async () => {
    try {
      if (window.electronSecureAPI.license?.getUserLimit) {
        const res = await window.electronSecureAPI.license.getUserLimit();
        if (res?.success) setUserLimit(res.data || 1);
      }
    } catch (error) {
      console.error('Failed to load user limit:', error);
    }
  };

  const loadLicenseStatus = async () => {
    try {
      if (window.electronSecureAPI.license?.getStatus) {
        const res = await window.electronSecureAPI.license.getStatus();
        if (res?.success && res.data) {
          const status = res.data;
          setLicenseInfo(status);
          if (status.licenseKey) {
            setLicenseKey(status.licenseKey);
          }
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
      const currentUser = await window.electronSecureAPI.auth.getCurrentUser();
      if (!currentUser) {
        setPasswordError('User session expired.');
        setIsVerifyingPassword(false);
        return;
      }

      const result = await window.electronSecureAPI.auth.login({
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

    // Validate new password requirements
    if (passwordChangeModal.newPassword.length < 8) {
      showNotification('Password must be at least 8 characters', 'error');
      return;
    }
    if (!/[A-Z]/.test(passwordChangeModal.newPassword)) {
      showNotification('Password must contain at least one uppercase letter', 'error');
      return;
    }
    if (!/[a-z]/.test(passwordChangeModal.newPassword)) {
      showNotification('Password must contain at least one lowercase letter', 'error');
      return;
    }
    if (!/\d/.test(passwordChangeModal.newPassword)) {
      showNotification('Password must contain at least one number', 'error');
      return;
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(passwordChangeModal.newPassword)) {
      showNotification('Password must contain at least one special character', 'error');
      return;
    }

    try {
      // 1. Sync with SaaS if a session exists
      const session = await window.electronSecureAPI.posAuth.getSession();

      // If the user being changed is the current user AND they have a SaaS session
      if (session && currentUser && currentUser.id === passwordChangeModal.userId) {
        showNotification('Syncing with server...', 'info');
        // @ts-ignore - TODO: Implement changeSaaSPassword properly or define it in AuthService
        const saasResult = await AuthService.changeSaaSPassword(
          passwordChangeModal.oldPassword,
          passwordChangeModal.newPassword,
          session.token
        );

        if (!saasResult.success) {
          showNotification(saasResult.message || 'SaaS update failed. Password change aborted for security.', 'error');
          return;
        }
      }

      // 2. Proceed with local change
      const result = await window.electronSecureAPI.settings.changePassword({
        userId: passwordChangeModal.userId,
        newPassword: passwordChangeModal.newPassword,
        oldPassword: passwordChangeModal.oldPassword || undefined
      });

      if (result.success) {
        showNotification('Password updated successfully both locally and on server', 'success');
        setPasswordChangeModal({ isOpen: false, userId: null, username: '', newPassword: '', oldPassword: '' });
      } else {
        showNotification(result.message || 'Failed to update local password', 'error');
      }
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Error updating password', 'error');
    }
  };

  const loadSettings = async () => {
    try {
      const res = await window.electronSecureAPI.settings.get();
      if (res?.success && res.data) {
        const result = res.data;
        setGstForm({
          gstRate: parseFloat(result.gst_rate) || 5,
          domesticGstRate: parseFloat(result.gst_rate_domestic) || 0,
          invoicePrefix: result.invoice_prefix || 'DT',
        });
        setCompanyForm({
          name: result.company_name || '',
          tradeLicenseNo: result.trade_license_no || '',
          taxNo: result.tax_no || '',
          address: result.address || '',
          addressStreet: result.address_street || '',
          addressGewog: result.address_gewog || '',
          addressDzongkhag: result.address_dzongkhag || '',
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
      const result = await window.electronSecureAPI.backup.autoBackupStatus();
      if (result?.data) {
        setBackupStatus(result.data);
      }
    } catch (error) {
      console.error('Failed to load backup status:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const result = await window.electronSecureAPI.settings.getUsers();
      if (result?.success && result.data && Array.isArray(result.data)) {
        setUsersList(result.data);
      } else if (result?.success) {
        // If data is not an array, set empty array to prevent .filter() errors
        console.warn('Users data is not an array, defaulting to empty array:', result.data);
        setUsersList([]);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const validateCompanyForm = () => {
    const errors: Record<string, string> = {};
    if (!companyForm.name.trim()) errors.name = 'Company name is required';
    else if (companyForm.name.length > 200) errors.name = 'Company name must be under 200 characters';
    if (companyForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyForm.email)) {
      errors.email = 'Invalid email address';
    }
    if (companyForm.phone && !/^\+?[0-9\s-]{8,20}$/.test(companyForm.phone)) {
      errors.phone = 'Invalid phone number (8-20 digits)';
    }
    if (companyForm.website && !/^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/.test(companyForm.website)) {
      errors.website = 'Invalid website URL';
    }
    if (companyForm.addressStreet && companyForm.addressStreet.length > 300) {
      errors.addressStreet = 'Street address must be under 300 characters';
    }
    if (companyForm.tradeLicenseNo && companyForm.tradeLicenseNo.length > 100) {
      errors.tradeLicenseNo = 'License number must be under 100 characters';
    }
    if (companyForm.taxNo && companyForm.taxNo.length > 50) {
      errors.taxNo = 'GST/TPN/CID must be under 50 characters';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveCompanySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCompanyForm()) return;

    try {
      const result = await window.electronSecureAPI.settings.update({
        company_name: companyForm.name.trim(),
        trade_license_no: companyForm.tradeLicenseNo.trim() || null,
        tax_no: companyForm.taxNo.trim() || null,
        address: companyForm.address.trim() || null,
        address_street: companyForm.addressStreet.trim() || null,
        address_gewog: companyForm.addressGewog || null,
        address_dzongkhag: companyForm.addressDzongkhag || null,
        phone: companyForm.phone.trim() || null,
        email: companyForm.email.trim() || null,
        website: companyForm.website.trim() || null,
        tagline: companyForm.tagline.trim() || null,
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
      const result = await window.electronSecureAPI.settings.getLogo();
      if (result?.success && result.data) {
        setCompanyLogo(result.data);
      }
    } catch (error) {
      console.error('Failed to load logo:', error);
    }
  };

  const uploadLogo = async () => {
    try {
      const result = await window.electronSecureAPI.settings.uploadLogo();
      if (result.success && result.data) {
        setCompanyLogo(result.data);
        showNotification('Logo uploaded successfully', 'success');
      } else if (result.message !== 'No file selected') {
        showNotification(result.message || 'Failed to upload logo', 'error');
      }
    } catch (error) {
      showNotification('Failed to upload logo', 'error');
    }
  };

  const loadSeal = async () => {
    try {
      const result = await window.electronSecureAPI.settings.getSeal();
      if (result?.success && result.data) {
        setCompanySeal(result.data);
      }
    } catch (error) {
      console.error('Failed to load seal:', error);
    }
  };

  const uploadSeal = async () => {
    try {
      const result = await window.electronSecureAPI.settings.uploadSeal();
      if (result.success && result.data) {
        setCompanySeal(result.data);
        showNotification('Seal uploaded successfully', 'success');
      } else if (result.message !== 'No file selected') {
        showNotification(result.message || 'Failed to upload seal', 'error');
      }
    } catch (error) {
      showNotification('Failed to upload seal', 'error');
    }
  };

  const loadSignature = async () => {
    try {
      const result = await window.electronSecureAPI.settings.getSignature();
      if (result?.success && result.data) {
        setCompanySignature(result.data);
      }
    } catch (error) {
      console.error('Failed to load signature:', error);
    }
  };

  const uploadSignature = async () => {
    try {
      const result = await window.electronSecureAPI.settings.uploadSignature();
      if (result.success && result.data) {
        setCompanySignature(result.data);
        showNotification('Signature uploaded successfully', 'success');
      } else if (result.message !== 'No file selected') {
        showNotification(result.message || 'Failed to upload signature', 'error');
      }
    } catch (error) {
      showNotification('Failed to upload signature', 'error');
    }
  };

  const saveGSTSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await window.electronSecureAPI.settings.update({
        gst_rate: gstForm.gstRate.toString(),
        gst_rate_domestic: gstForm.domesticGstRate.toString(),
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
      const result = await window.electronSecureAPI.backup.create();
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
      const result = await window.electronSecureAPI.backup.restore();
      if (result.success) {
        showNotification('Backup restored. Please restart the application.', 'success');
      } else {
        showNotification(result.message || 'Restore failed', 'error');
      }
    } catch (error) {
      showNotification('Restore failed', 'error');
    }
  };

  const handleRestoreFromCloud = async (provider: string, backupId: string, backupName: string) => {
    if (window.confirm(`WARNING: Restoring will overwrite all current system data and restart the application. Are you sure you want to restore from ${backupName}?`)) {
      setIsRestoring(true);
      setBackupProgress({ stage: 'starting', percent: 0, message: 'Downloading backup...' });
      try {
        const res = await window.electronSecureAPI.cloudBackup.restoreFromCloud(provider, backupId, backupName);
        if (!res.success) {
          showNotification(res.message || 'Restoration failed', 'error');
          setIsRestoring(false);
        }
      } catch (err) {
        showNotification('Fatal error during restoration', 'error');
        setIsRestoring(false);
      }
    }
  };

  const tabs = [
    { id: 'company', label: 'Company', icon: Building2 },
    { id: 'gst', label: 'GST Settings', icon: Percent },
    { id: 'backup', label: 'Backup & Restore', icon: Database },
    { id: 'cloudBackup', label: 'Cloud Backup', icon: Cloud },
    { id: 'users', label: 'Users', icon: Users },
    ...(currentUser?.role === 'admin' ? [{ id: 'security', label: 'Security', icon: Shield }] : []),
    { id: 'license', label: 'License', icon: Key },
    { id: 'updates', label: 'Updates', icon: Rocket },
  ];

  const handleCheckForUpdates = async () => {
    setIsCheckingUpdate(true);
    setUpdateError(null);
    try {
      const result = await window.electronSecureAPI.update.checkForUpdates();
      setUpdateState(result);
      if (result?.data?.available) {
        showNotification(`Update v${result.data.version} available!`, 'success');
      } else if (result?.data?.error) {
        setUpdateError(result.data.error);
        showNotification(result.data.error, 'error');
      } else {
        showNotification('No updates available. You are on the latest version.', 'info');
      }
    } catch (err: any) {
      setUpdateError(err.message || 'Failed to check for updates');
      showNotification('Failed to check for updates', 'error');
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleInstallUpdate = async () => {
    try {
      const result = await window.electronSecureAPI.update.installUpdate();
      if (!result?.success) {
        showNotification(result?.message || 'Failed to install update', 'error');
      }
    } catch (err: any) {
      showNotification('Failed to install update', 'error');
    }
  };

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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-slate-50 border border-slate-100 rounded-[32px] p-6 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-500">
                  <div className="flex items-center gap-3 mb-6">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Active Plan</span>
                  </div>
                  <div className="space-y-1">
                    <p className="truncate text-3xl font-black text-slate-900 capitalize tracking-tight" title={licenseInfo.plan || (licenseInfo.type === 'trial' ? 'Free Trial' : 'Unknown')}>
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

            {/* Brand Assets Section: Logo, Seal, Signature */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Logo */}
              <div className="bg-white border border-slate-200 rounded-[32px] p-6 group hover:shadow-xl transition-all duration-500">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Company Logo</label>
                <div className="flex flex-col items-center gap-4">
                  <div className="w-full h-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex items-center justify-center overflow-hidden group-hover:border-bhutan-maroon/30">
                    {companyLogo ? (
                      <img src={companyLogo} alt="Logo" className="max-w-full max-h-full object-contain p-2" />
                    ) : (
                      <Building2 className="w-8 h-8 text-slate-200" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={uploadLogo}
                    className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-2xl hover:bg-bhutan-maroon transition-all font-black uppercase tracking-widest text-[10px]"
                  >
                    <Plus className="w-3 h-3" /> {companyLogo ? 'Update' : 'Upload'} Logo
                  </button>
                </div>
              </div>

              {/* Seal */}
              <div className="bg-white border border-slate-200 rounded-[32px] p-6 group hover:shadow-xl transition-all duration-500">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Official Seal</label>
                <div className="flex flex-col items-center gap-4">
                  <div className="w-full h-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex items-center justify-center overflow-hidden group-hover:border-bhutan-maroon/30">
                    {companySeal ? (
                      <img src={companySeal} alt="Seal" className="max-w-full max-h-full object-contain p-2" />
                    ) : (
                      <Stamp className="w-8 h-8 text-slate-200" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={uploadSeal}
                    className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-2xl hover:bg-bhutan-maroon transition-all font-black uppercase tracking-widest text-[10px]"
                  >
                    <Plus className="w-3 h-3" /> {companySeal ? 'Update' : 'Upload'} Seal
                  </button>
                </div>
              </div>

              {/* Signature */}
              <div className="bg-white border border-slate-200 rounded-[32px] p-6 group hover:shadow-xl transition-all duration-500">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Authorized Signature</label>
                <div className="flex flex-col items-center gap-4">
                  <div className="w-full h-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex items-center justify-center overflow-hidden group-hover:border-bhutan-maroon/30">
                    {companySignature ? (
                      <img src={companySignature} alt="Signature" className="max-w-full max-h-full object-contain p-2" />
                    ) : (
                      <PenTool className="w-8 h-8 text-slate-200" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={uploadSignature}
                    className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-2xl hover:bg-bhutan-maroon transition-all font-black uppercase tracking-widest text-[10px]"
                  >
                    <Plus className="w-3 h-3" /> {companySignature ? 'Update' : 'Upload'} Signature
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
                  onChange={(e) => { setCompanyForm({ ...companyForm, tradeLicenseNo: e.target.value }); if (formErrors.tradeLicenseNo) setFormErrors({ ...formErrors, tradeLicenseNo: '' }) }}
                  className={`w-full px-5 py-4 bg-slate-50 border-2 rounded-2xl focus:ring-2 focus:ring-bhutan-maroon/10 focus:bg-white transition-all font-bold text-slate-800 ${formErrors.tradeLicenseNo ? 'border-red-500 bg-red-50' : 'border-transparent'}`}
                  placeholder="Official license number"
                />
                {formErrors.tradeLicenseNo && <p className="text-red-500 text-[10px] font-bold mt-1 ml-1 uppercase tracking-wider">{formErrors.tradeLicenseNo}</p>}
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">GST/TPN/CID</label>
                <input
                  type="text"
                  value={companyForm.taxNo}
                  onChange={(e) => { setCompanyForm({ ...companyForm, taxNo: e.target.value }); if (formErrors.taxNo) setFormErrors({ ...formErrors, taxNo: '' }) }}
                  className={`w-full px-5 py-4 bg-slate-50 border-2 rounded-2xl focus:ring-2 focus:ring-bhutan-maroon/10 focus:bg-white transition-all font-bold text-slate-800 ${formErrors.taxNo ? 'border-red-500 bg-red-50' : 'border-transparent'}`}
                  placeholder="GST/TPN/CID"
                />
                {formErrors.taxNo && <p className="text-red-500 text-[10px] font-bold mt-1 ml-1 uppercase tracking-wider">{formErrors.taxNo}</p>}
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Office Address</label>
                <textarea
                  value={companyForm.address}
                  onChange={(e) => { setCompanyForm({ ...companyForm, address: e.target.value }); if (formErrors.addressStreet) setFormErrors({ ...formErrors, addressStreet: '' }) }}
                  className={`w-full px-5 py-4 bg-slate-50 border-2 rounded-2xl focus:ring-2 focus:ring-bhutan-maroon/10 focus:bg-white transition-all font-bold text-slate-800 min-h-[60px] ${formErrors.addressStreet ? 'border-red-500 bg-red-50' : 'border-transparent'}`}
                  placeholder="Street, Building..."
                />
                {formErrors.addressStreet && <p className="text-red-500 text-[10px] font-bold mt-1 ml-1 uppercase tracking-wider">{formErrors.addressStreet}</p>}
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Dzongkhag</label>
                <select
                  value={companyForm.addressDzongkhag}
                  onChange={(e) => { setCompanyForm({ ...companyForm, addressDzongkhag: e.target.value, addressGewog: '' }); if (formErrors.addressDzongkhag) setFormErrors({ ...formErrors, addressDzongkhag: '' }) }}
                  className={`w-full px-5 py-4 bg-slate-50 border-2 rounded-2xl focus:ring-2 focus:ring-bhutan-maroon/10 focus:bg-white transition-all font-bold text-slate-800 ${formErrors.addressDzongkhag ? 'border-red-500 bg-red-50' : 'border-transparent'}`}
                >
                  <option value="">Select Dzongkhag</option>
                  {getAllRegions().map((region) => (
                    <optgroup key={region} label={region}>
                      {bhutanLocations
                        .filter((dz) => dz.region === region)
                        .map((dz) => (
                          <option key={dz.id} value={dz.id}>{dz.name}</option>
                        ))}
                    </optgroup>
                  ))}
                </select>
                {formErrors.addressDzongkhag && <p className="text-red-500 text-[10px] font-bold mt-1 ml-1 uppercase tracking-wider">{formErrors.addressDzongkhag}</p>}
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Gewog</label>
                <select
                  value={companyForm.addressGewog}
                  onChange={(e) => setCompanyForm({ ...companyForm, addressGewog: e.target.value })}
                  disabled={!companyForm.addressDzongkhag}
                  className="w-full px-5 py-4 bg-slate-50 border-2 rounded-2xl focus:ring-2 focus:ring-bhutan-maroon/10 focus:bg-white transition-all font-bold text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed border-transparent"
                >
                  <option value="">Select Gewog</option>
                  {companyForm.addressDzongkhag &&
                    bhutanLocations
                      .find((dz) => dz.id === companyForm.addressDzongkhag)
                      ?.gewogs.map((gewog) => (
                        <option key={gewog.id} value={gewog.id}>{gewog.name}</option>
                      ))}
                </select>
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
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Standard GST Rate (%)</label>
                <input
                  type="number"
                  value={gstForm.gstRate}
                  onChange={(e) => setGstForm({ ...gstForm, gstRate: Number(e.target.value) })}
                  className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-bhutan-maroon/10 focus:bg-white transition-all font-black text-slate-900 text-2xl"
                  min={0}
                  max={100}
                  step={0.01}
                />
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest ml-1">Applied to standard/retail sales</p>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Domestic GST Rate (%)</label>
                <input
                  type="number"
                  value={gstForm.domesticGstRate}
                  onChange={(e) => setGstForm({ ...gstForm, domesticGstRate: Number(e.target.value) })}
                  className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-600/10 focus:bg-white transition-all font-black text-slate-900 text-2xl"
                  min={0}
                  max={100}
                  step={0.01}
                />
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest ml-1">Applied to domestic/exempt sales (usually 0%)</p>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
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
                  <span className="truncate block text-2xl font-black text-bhutan-maroon" title={String(backupStatus.backupCount || 0)}>{backupStatus.backupCount || 0}</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'cloudBackup':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Auto Backup Toggle & Frequency */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[32px] p-8 border border-slate-700/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-cyan-500/10 to-transparent rounded-bl-full" />
              <div className="relative">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl shadow-lg shadow-cyan-500/20">
                      <CloudUpload className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white uppercase tracking-widest">Auto Cloud Backup</h4>
                      <p className="text-xs text-slate-400 font-bold mt-1">Automatically backup POS data to the cloud</p>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      const newEnabled = !cloudSettings.enabled;
                      const newSettings = { ...cloudSettings, enabled: newEnabled };
                      setCloudSettings(newSettings);
                      await window.electronSecureAPI.cloudBackup.saveSettings(newSettings);
                      showNotification(newEnabled ? 'Auto backup enabled' : 'Auto backup disabled', 'success');
                    }}
                    className={`relative w-16 h-8 rounded-full transition-all duration-300 ${cloudSettings.enabled
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-500 shadow-lg shadow-cyan-500/30'
                      : 'bg-slate-600'
                      }`}
                  >
                    <span className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 ${cloudSettings.enabled ? 'left-9' : 'left-1'
                      }`} />
                  </button>
                </div>

                {cloudSettings.enabled && (
                  <div className="flex items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <Timer className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Frequency</span>
                    <select
                      value={cloudSettings.frequency}
                      onChange={async (e) => {
                        const newSettings = { ...cloudSettings, frequency: e.target.value };
                        setCloudSettings(newSettings);
                        await window.electronSecureAPI.cloudBackup.saveSettings(newSettings);
                        showNotification('Backup frequency updated', 'success');
                      }}
                      className="bg-slate-700 text-white border-none rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-widest focus:ring-2 focus:ring-cyan-500/30"
                    >
                      <option value="30min">Every 30 Minutes</option>
                      <option value="hourly">Hourly</option>
                      <option value="daily">Daily</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Cloud Storage Connections */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Google Drive Card */}
              <div className={`rounded-[32px] p-7 border-2 transition-all duration-500 hover:shadow-xl ${connectionStatus.drive?.connected
                ? 'bg-blue-50/80 border-blue-200 hover:shadow-blue-100/50'
                : 'bg-slate-50 border-slate-100 hover:shadow-slate-200/50'
                }`}>
                <div className="flex items-center gap-3 mb-6">
                  <div className={`p-2.5 rounded-xl ${connectionStatus.drive?.connected ? 'bg-blue-500 shadow-lg shadow-blue-500/20' : 'bg-slate-200'
                    }`}>
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M4.433 22l-3.2-5.54L9.1 2h6.4l-7.867 13.614L4.433 22zm4.2-5.54h14.134l-3.2 5.54H5.433l3.2-5.54zm7.667-2L8.433 2h6.4l7.867 12.46H16.3z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">Google Drive</h4>
                    <p className={`text-[10px] font-bold mt-0.5 ${connectionStatus.drive?.connected ? 'text-blue-600' : 'text-slate-400'
                      }`}>
                      {connectionStatus.drive?.connected ? '● Connected' : '○ Not Connected'}
                    </p>
                  </div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={cloudSettings.targets?.googleDrive || false}
                      onChange={async (e) => {
                        const newSettings = {
                          ...cloudSettings,
                          targets: { ...cloudSettings.targets, googleDrive: e.target.checked }
                        };
                        setCloudSettings(newSettings);
                        await window.electronSecureAPI.cloudBackup.saveSettings(newSettings);
                      }}
                      disabled={!connectionStatus.drive?.connected}
                      className="w-4 h-4 rounded accent-blue-500"
                    />
                  </label>
                </div>
                {connectionStatus.drive?.connected ? (
                  <button
                    onClick={async () => {
                      await window.electronSecureAPI.cloudBackup.disconnectDrive();
                      showNotification('Google Drive disconnected', 'success');
                      loadCloudBackupData();
                    }}
                    className="w-full py-3 bg-red-50 text-red-600 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-red-100 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <CloudOff className="w-3.5 h-3.5" /> Disconnect
                  </button>
                ) : (
                  <button
                    onClick={async () => {
                      setIsConnectingDrive(true);
                      try {
                        const result = await window.electronSecureAPI.cloudBackup.connectDrive();
                        if (result.success) {
                          showNotification(`Google Drive connected${result.email ? ` as ${result.email}` : ''}`, 'success');
                          loadCloudBackupData();
                        } else {
                          showNotification(result.message || 'Connection failed', 'error');
                        }
                      } catch (err: any) {
                        showNotification(err.message || 'Connection failed', 'error');
                      } finally {
                        setIsConnectingDrive(false);
                      }
                    }}
                    disabled={isConnectingDrive || !connectionStatus.drive?.configured}
                    className="w-full py-3 bg-blue-500 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isConnectingDrive ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Connecting...</>
                    ) : (
                      <><Cloud className="w-3.5 h-3.5" /> Connect Google Drive</>
                    )}
                  </button>
                )}
                {!connectionStatus.drive?.configured && (
                  <p className="text-[9px] text-amber-600 font-bold mt-2 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Add GOOGLE_CLIENT_ID & SECRET to .env
                  </p>
                )}
              </div>

              {/* MEGA Card */}
              <div className={`rounded-[32px] p-7 border-2 transition-all duration-500 hover:shadow-xl ${connectionStatus.mega?.connected
                ? 'bg-red-50/80 border-red-200 hover:shadow-red-100/50'
                : 'bg-slate-50 border-slate-100 hover:shadow-slate-200/50'
                }`}>
                <div className="flex items-center gap-3 mb-6">
                  <div className={`p-2.5 rounded-xl ${connectionStatus.mega?.connected ? 'bg-red-500 shadow-lg shadow-red-500/20' : 'bg-slate-200'
                    }`}>
                    <HardDrive className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">MEGA</h4>
                    <p className={`text-[10px] font-bold mt-0.5 ${connectionStatus.mega?.connected ? 'text-red-600' : 'text-slate-400'
                      }`}>
                      {connectionStatus.mega?.connected ? `● ${connectionStatus.mega.email || 'Connected'}` : '○ Not Connected'}
                    </p>
                  </div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={cloudSettings.targets?.mega || false}
                      onChange={async (e) => {
                        const newSettings = {
                          ...cloudSettings,
                          targets: { ...cloudSettings.targets, mega: e.target.checked }
                        };
                        setCloudSettings(newSettings);
                        await window.electronSecureAPI.cloudBackup.saveSettings(newSettings);
                      }}
                      disabled={!connectionStatus.mega?.connected}
                      className="w-4 h-4 rounded accent-red-500"
                    />
                  </label>
                </div>
                {connectionStatus.mega?.connected ? (
                  <button
                    onClick={async () => {
                      await window.electronSecureAPI.cloudBackup.disconnectMega();
                      showNotification('MEGA disconnected', 'success');
                      loadCloudBackupData();
                    }}
                    className="w-full py-3 bg-red-50 text-red-600 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-red-100 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <CloudOff className="w-3.5 h-3.5" /> Disconnect
                  </button>
                ) : (
                  <button
                    onClick={() => setShowMegaLoginModal(true)}
                    className="w-full py-3 bg-red-500 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-red-600 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <HardDrive className="w-3.5 h-3.5" /> Connect MEGA
                  </button>
                )}
              </div>
            </div>

            {/* Manual Backup & Progress */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-[32px] p-8 relative overflow-hidden">
              <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/5 rounded-full" />
              <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-white/5 rounded-full" />
              <div className="relative">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl shrink-0">
                      <Zap className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white uppercase tracking-widest">Manual Cloud Backup</h4>
                      <p className="text-xs text-white/60 font-bold mt-0.5">Trigger an instant backup to connected cloud storage</p>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      const targets: string[] = [];
                      if (connectionStatus.drive?.connected) targets.push('drive');
                      if (connectionStatus.mega?.connected) targets.push('mega');

                      if (targets.length === 0) {
                        showNotification('No cloud storage connected. Please connect MEGA or Google Drive first.', 'error');
                        return;
                      }
                      setIsBackingUp(true);
                      setBackupProgress({ stage: 'starting', percent: 0, message: 'Initializing...' });
                      const result = await window.electronSecureAPI.cloudBackup.runNow(targets);
                      if (!result.success && result.message !== 'Backup queued') {
                        showNotification(result.message || 'Backup failed', 'error');
                        setIsBackingUp(false);
                      }
                    }}
                    disabled={isBackingUp}
                    className="px-8 py-3.5 bg-white text-emerald-700 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-emerald-50 transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-emerald-900/20 flex items-center gap-2"
                  >
                    {isBackingUp ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Backing Up...</>
                    ) : (
                      <><CloudUpload className="w-4 h-4" /> Backup Now</>
                    )}
                  </button>
                </div>

                {/* Progress Bar */}
                {backupProgress && (backupProgress.stage !== 'complete' && backupProgress.stage !== 'error' || isBackingUp) && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-white/80">{backupProgress.message}</span>
                      <span className="text-xs font-black text-white">{backupProgress.percent}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
                      <div
                        className="h-full bg-gradient-to-r from-white to-emerald-200 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${backupProgress.percent}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Success/Error status message */}
                {backupProgress && backupProgress.stage === 'complete' && !isBackingUp && (
                  <div className="flex items-center gap-2 mt-2 animate-in fade-in duration-300">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span className="text-xs font-bold text-white/90">{backupProgress.message}</span>
                  </div>
                )}
                {backupProgress && backupProgress.stage === 'error' && !isBackingUp && (
                  <div className="flex items-center gap-2 mt-2 animate-in fade-in duration-300">
                    <AlertTriangle className="w-4 h-4 text-yellow-300" />
                    <span className="text-xs font-bold text-yellow-100">{backupProgress.message}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Backup Status Dashboard */}
            <div className="bg-slate-50 rounded-[32px] p-8 border border-slate-100">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                <RefreshCw className="w-4 h-4" /> Cloud Sync Status
              </h4>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-1">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest block">Auto Backup</span>
                  <span className={`text-lg font-black uppercase tracking-widest ${cloudSettings.enabled ? 'text-emerald-500' : 'text-slate-300'}`}>
                    {cloudSettings.enabled ? 'ACTIVE' : 'OFF'}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest block">Frequency</span>
                  <span className="text-sm font-black text-slate-700">
                    {cloudSettings.frequency === '30min' ? 'Every 30 min' : cloudSettings.frequency === 'hourly' ? 'Hourly' : 'Daily'}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest block">Last Cloud Backup</span>
                  <span className="text-sm font-black text-slate-700">
                    {backupLogs.length > 0 && backupLogs[0].status === 'success'
                      ? new Date(backupLogs[0].date).toLocaleString()
                      : '---'}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest block">Total Backups</span>
                  <span className="truncate block text-2xl font-black text-bhutan-maroon" title={String(backupLogs.filter(l => l.status === 'success').length)}>
                    {backupLogs.filter(l => l.status === 'success').length}
                  </span>
                </div>
              </div>
            </div>

            {/* Cloud Restorations */}
            <div className="bg-white rounded-[32px] border border-slate-100 overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-8 py-5 bg-gradient-to-r from-bhutan-maroon to-slate-900">
                <h4 className="text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                  <DownloadCloud className="w-4 h-4" /> Cloud Restorations
                </h4>
                <div className="flex items-center gap-3">
                  {isRestoring && <div className="text-[10px] text-white/80 uppercase font-bold animate-pulse">Restoring... App will restart automatically!</div>}
                  <button
                    onClick={loadCloudBackupData}
                    disabled={isLoadingRemote || isRestoring}
                    className="text-[9px] font-black text-white/50 uppercase tracking-widest hover:text-white transition-colors flex items-center gap-1 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingRemote ? 'animate-spin text-white' : ''}`} /> Refresh
                  </button>
                </div>
              </div>
              <div className="max-h-[300px] overflow-y-auto overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 sticky top-0">
                      <th className="text-left py-3 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date / Time</th>
                      <th className="text-left py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Source</th>
                      <th className="text-left py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Archive Size</th>
                      <th className="text-right py-3 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {remoteBackups.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-12">
                          <DownloadCloud className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                          <p className="text-xs font-black text-slate-300 uppercase tracking-widest">
                            {connectionStatus.drive.connected || connectionStatus.mega.connected
                              ? `No restorable backups found. Last backup: ${backupLogs.length > 0 ? new Date(backupLogs[0].date).toLocaleString() : 'Never'}`
                              : connectionStatus.drive.configured || connectionStatus.mega.email
                                ? 'Reconnect your cloud account and refresh to see backups'
                                : 'Connect Drive or MEGA and create a backup to see available restorations'}
                          </p>
                          {(connectionStatus.drive.connected || connectionStatus.mega.connected) && (
                            <button
                              onClick={() => {
                                const targets = [];
                                if (connectionStatus.drive.connected) targets.push('drive');
                                if (connectionStatus.mega.connected) targets.push('mega');
                                window.electronSecureAPI?.cloudBackup?.runNow(targets);
                              }}
                              className="mt-4 px-4 py-2 bg-bhutan-maroon text-white text-xs font-bold rounded-lg hover:bg-bhutan-maroon-dark transition-colors"
                            >
                              Create Backup Now
                            </button>
                          )}
                        </td>
                      </tr>
                    ) : (
                      remoteBackups.map((bkp, i) => (
                        <tr key={`${bkp.id}-${i}`} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-6 text-xs text-slate-600 font-bold">
                            {new Date(bkp.createdAt).toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${bkp.provider === 'drive' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                              {bkp.provider === 'drive' ? 'Google Drive' : 'MEGA'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-500 font-bold whitespace-nowrap">
                            {(bkp.size / 1024).toFixed(1)} KB
                          </td>
                          <td className="py-3 px-6 text-right">
                            <button
                              disabled={isRestoring || isBackingUp}
                              onClick={() => handleRestoreFromCloud(bkp.provider, bkp.id, bkp.name)}
                              className="px-4 py-1.5 bg-bhutan-maroon text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-slate-900 transition-colors shadow-sm disabled:opacity-50"
                            >
                              Restore System
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Backup History/Logs */}
            <div className="bg-white rounded-[32px] border border-slate-100 overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-8 py-5 bg-slate-900">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Backup History
                </h4>
                <button
                  onClick={loadCloudBackupData}
                  className="text-[9px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-colors flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Refresh
                </button>
              </div>
              <div className="max-h-[300px] overflow-y-auto overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 sticky top-0">
                      <th className="text-left py-3 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                      <th className="text-left py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                      <th className="text-left py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Storage</th>
                      <th className="text-left py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Size</th>
                      <th className="text-left py-3 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {backupLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-12">
                          <CloudOff className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                          <p className="text-xs font-black text-slate-300 uppercase tracking-widest">No backup history yet</p>
                        </td>
                      </tr>
                    ) : backupLogs.slice(0, 20).map((log: any) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-6 text-xs font-bold text-slate-600">
                          {new Date(log.date).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${log.status === 'success' ? 'bg-emerald-50 text-emerald-600' :
                            log.status === 'in_progress' ? 'bg-amber-50 text-amber-600' :
                              'bg-red-50 text-red-600'
                            }`}>
                            {log.status === 'in_progress' ? 'Running' : log.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-1">
                            {log.storage?.map((s: string) => (
                              <span key={s} className="text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
                                {s}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs font-bold text-slate-500">
                          {log.fileSize ? `${(log.fileSize / 1024).toFixed(1)} KB` : '—'}
                        </td>
                        <td className="py-3 px-6 text-xs text-slate-400 font-bold max-w-[200px] truncate">
                          {log.error || (log.duration ? `${(log.duration / 1000).toFixed(1)}s` : '—')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* MEGA Login Modal */}
            {showMegaLoginModal && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-[40px] w-full max-w-md p-10 shadow-2xl border border-white/20 animate-in zoom-in-95 duration-300">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight">Connect MEGA</h3>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">Login with your MEGA account</p>
                    </div>
                    <button
                      onClick={() => setShowMegaLoginModal(false)}
                      className="w-10 h-10 flex items-center justify-center bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition-all active:scale-90"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setIsConnectingMega(true);
                      try {
                        const result = await window.electronSecureAPI.cloudBackup.connectMega(megaEmail, megaPassword);
                        if (result.success) {
                          showNotification('MEGA connected successfully', 'success');
                          setShowMegaLoginModal(false);
                          setMegaEmail('');
                          setMegaPassword('');
                          loadCloudBackupData();
                        } else {
                          showNotification(result.message || 'MEGA login failed', 'error');
                        }
                      } catch (err: any) {
                        showNotification(err.message || 'MEGA login failed', 'error');
                      } finally {
                        setIsConnectingMega(false);
                      }
                    }}
                    className="space-y-5"
                  >
                    <div className="space-y-2">
                      <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Email</label>
                      <input
                        type="email"
                        value={megaEmail}
                        onChange={(e) => setMegaEmail(e.target.value)}
                        className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-red-500/20 focus:bg-white transition-all font-bold text-slate-800"
                        placeholder="your@email.com"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Password</label>
                      <input
                        type="password"
                        value={megaPassword}
                        onChange={(e) => setMegaPassword(e.target.value)}
                        className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-red-500/20 focus:bg-white transition-all font-bold text-slate-800"
                        placeholder="MEGA password"
                        required
                      />
                    </div>
                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                      <p className="text-[10px] text-amber-700 font-bold flex items-center gap-2">
                        <Shield className="w-3.5 h-3.5 flex-shrink-0" />
                        Credentials are encrypted and stored locally on your machine.
                      </p>
                    </div>
                    <div className="flex gap-4 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowMegaLoginModal(false)}
                        className="flex-1 py-4 text-slate-400 font-bold uppercase tracking-widest text-xs hover:text-slate-600 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isConnectingMega}
                        className="flex-[2] py-4 bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-red-600 shadow-xl shadow-red-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isConnectingMega ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Connecting...</>
                        ) : (
                          <><HardDrive className="w-4 h-4" /> Connect MEGA</>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        );

      case 'users':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-slate-50 p-6 rounded-[32px] border border-slate-100">
              <div>
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Access Protocol</h4>
                <p className="text-sm font-bold text-slate-500">Manage authenticated operators</p>
              </div>
              <button
                onClick={() => setShowAddUserModal(true)}
                className="shrink-0 flex items-center gap-3 bg-bhutan-maroon text-white px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-bhutan-maroon-dark transition-all shadow-xl shadow-bhutan-maroon/20 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                Enroll New Operator
              </button>
            </div>

            <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg shrink-0">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-black text-blue-900 uppercase tracking-widest">Plan Utilization</p>
                  <p className="text-[10px] text-blue-700 font-bold">Your plan allows up to <span className="text-blue-900">{Array.isArray(usersList) ? usersList.filter(u => u.is_active).length : 0} / {userLimit}</span> active operators.</p>
                </div>
              </div>
              <button
                onClick={() => window.electronSecureAPI.shell.openExternal('https://jinda.com/pricing')}
                className="shrink-0 text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline"
              >
                Upgrade Plan
              </button>
            </div>

            <div className="overflow-x-auto bg-white rounded-[32px] border border-slate-50 shadow-sm">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="bg-slate-900">
                    <th className="text-left py-5 px-5 text-xs font-black text-slate-400 uppercase tracking-widest">Full Name</th>
                    <th className="text-left py-5 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Username</th>
                    <th className="text-left py-5 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Role</th>
                    <th className="text-center py-5 px-5 text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
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
                      <td className="py-4 px-5">
                        <span className="text-sm font-black text-slate-800 truncate block max-w-[150px]" title={user.full_name}>{user.full_name}</span>
                      </td>
                      <td className="py-4 px-4 font-bold text-slate-500 text-sm truncate max-w-[120px]" title={user.username}>{user.username}</td>
                      <td className="py-4 px-4">
                        <span className={`text-xs font-black uppercase tracking-widest px-2.5 py-1 rounded-full whitespace-nowrap ${user.role === 'admin' ? 'bg-bhutan-gold/10 text-bhutan-gold' : 'bg-slate-100 text-slate-500'
                          }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-center">
                        <span className={`text-xs font-black uppercase tracking-widest px-2.5 py-1 rounded-full whitespace-nowrap ${user.is_active ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'
                          }`}>
                          {user.is_active ? 'Active' : 'Inactive'}
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
                        const result = await window.electronSecureAPI.settings.createUser({
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
                        onChange={(e) => {
                          setPasswordChangeModal(prev => ({ ...prev, newPassword: e.target.value as '' }));
                          if (e.target.value.length > 0) setShowPasswordReqs(true);
                        }}
                        onFocus={() => passwordChangeModal.newPassword.length > 0 && setShowPasswordReqs(true)}
                        className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-bhutan-maroon/20 focus:bg-white transition-all font-bold text-slate-800"
                        placeholder="Minimum 8 characters with uppercase, number & special char"
                        required
                      />
                      {/* Password Requirements */}
                      {showPasswordReqs && (
                        <div className="bg-slate-100/50 border border-slate-200 rounded-xl p-3 space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Password Requirements</p>
                          {passwordReqs.map((req, idx) => {
                            const isMet = req.test(passwordChangeModal.newPassword);
                            return (
                              <div key={idx} className="flex items-center gap-2">
                                <div className={`w-4 h-4 rounded-full flex items-center justify-center ${isMet ? 'bg-emerald-500/20 text-emerald-500' : 'bg-slate-300/50 text-slate-400'}`}>
                                  {isMet ? (
                                    <CheckCircle className="w-3 h-3" />
                                  ) : (
                                    <div className="w-1.5 h-1.5 rounded-full bg-current" />
                                  )}
                                </div>
                                <span className={`text-xs ${isMet ? 'text-emerald-600 font-medium' : 'text-slate-500'}`}>
                                  {req.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
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

      case 'updates':
        return (
          <div className="space-y-8 max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-bhutan-maroon/5 border border-bhutan-maroon/10 rounded-[28px] p-6">
              <div className="flex items-center gap-4 mb-2">
                <div className="p-3 bg-bhutan-maroon text-white rounded-2xl shadow-lg shadow-bhutan-maroon/20">
                  <Rocket className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 tracking-widest uppercase mb-1">Software Updates</h3>
                  <p className="text-xs font-bold text-slate-400">Check for and install the latest version</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-[28px] p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h4 className="text-lg font-black text-slate-900">Current Version</h4>
                  <p className="text-sm font-bold text-slate-400 mt-1">v1.0.0</p>
                </div>
                <button
                  onClick={handleCheckForUpdates}
                  disabled={isCheckingUpdate}
                  className="flex items-center gap-2 px-6 py-3 bg-bhutan-maroon text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-bhutan-maroon-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-bhutan-maroon/20"
                >
                  {isCheckingUpdate ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Check for Updates
                    </>
                  )}
                </button>
              </div>

              {updateError && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-4">
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="w-4 h-4" />
                    <p className="text-sm font-bold">{updateError}</p>
                  </div>
                </div>
              )}

              {updateState?.data?.available && !updateState?.data?.downloaded && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <h5 className="text-sm font-black text-emerald-800">Update Available!</h5>
                  </div>
                  <p className="text-sm font-bold text-emerald-600 mb-4">
                    Version {updateState.data.version} is ready to download.
                  </p>
                  {updateState.data.progress !== undefined && updateState.data.progress < 100 && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs font-bold text-emerald-600 mb-1">
                        <span>Downloading...</span>
                        <span>{updateState.data.progress.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-emerald-200 rounded-full h-2">
                        <div
                          className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${updateState.data.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {updateState.data.progress === 100 && (
                    <p className="text-xs font-bold text-emerald-500">Download complete! Finalizing...</p>
                  )}
                  {updateState.data.notes && (
                    <p className="text-xs font-bold text-emerald-500 mt-3">{updateState.data.notes}</p>
                  )}
                </div>
              )}

              {updateState?.data?.downloaded && (
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 mt-4">
                  <div className="flex items-center gap-3 mb-3">
                    <RotateCcw className="w-5 h-5 text-blue-600" />
                    <h5 className="text-sm font-black text-blue-800">Update Downloaded!</h5>
                  </div>
                  <p className="text-sm font-bold text-blue-600 mb-4">
                    Version {updateState.data.version} is ready to install.
                  </p>
                  <button
                    onClick={handleInstallUpdate}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Restart & Install
                  </button>
                </div>
              )}

              {!updateState?.data?.available && !updateState?.data?.downloaded && !updateError && !isCheckingUpdate && (
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 text-center">
                  <p className="text-sm font-bold text-slate-400">Click "Check for Updates" to see if a new version is available.</p>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row gap-6 xl:gap-10">
        {/* Sidebar Tabs */}
        <div className="w-full xl:w-72 shrink-0 space-y-2">
          <div className="bg-white/50 backdrop-blur-md p-4 rounded-[40px] border border-white shadow-sm flex flex-row xl:flex-col flex-wrap gap-2">
            <p className="w-full px-4 pb-2 text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Application Control</p>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-[18px] text-left transition-all duration-300 font-black uppercase tracking-widest text-xs xl:w-full ${activeTab === tab.id
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
