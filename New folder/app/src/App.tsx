import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from './store/appStore';
import { LoginPage } from './pages/LoginPage';
import { WelcomePage } from './pages/WelcomePage';
import { SetupAccountPage } from './pages/SetupAccountPage';
import { LicenseActivationPage } from './pages/LicenseActivationPage';
import { CheckEmailPage } from './pages/CheckEmailPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { DeviceVerificationPage } from './pages/DeviceVerificationPage';
import { TrialBanner } from './components/TrialBanner';
import { UpdateBanner } from './components/UpdateBanner';
import { DashboardPage } from './pages/DashboardPage';
import { POSPage } from './pages/POSPage';
import { InventoryPage } from './pages/InventoryPage';
import { ContactsPage } from './pages/ContactsPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { GSTPage } from './pages/GSTPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { PurchaseOrderPage } from './pages/PurchaseOrderPage';
import { QuotationPage } from './pages/QuotationPage';
import { ExpenseTrackerPage } from './pages/ExpenseTrackerPage';
import { AuditLogViewer } from './pages/AuditLogViewer';
import { AgedReportsPage } from './pages/AgedReportsPage';
import { BarcodePage } from './pages/BarcodePage';
import { RefundPage } from './pages/RefundPage';
import { RecurringPage } from './pages/RecurringPage';
import { EmployeePage } from './pages/EmployeePage';
import { ImportExportPage } from './pages/ImportExportPage';
import { BranchPage } from './pages/BranchPage';
import { CustomerStatementPage } from './pages/CustomerStatementPage';
import { TieredPricingPage } from './pages/TieredPricingPage';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Notification } from './components/Notification';
import { Loader } from './components/Loader';
import { AgreementOverlay } from './components/auth/AgreementOverlay';
import { getDeviceId, initializeDeviceId } from './utils/deviceId';

/**
 * Main App Component
 * Handles routing, authentication, and layout
 * 
 * ROUTING STATE MACHINE:
 * 1. NO license AND NO trial → Welcome Screen
 * 2. Trial exists, no user → Create Account → Check Email
 * 3. Trial exists, user exists → Dashboard (with trial banner)
 * 4. License exists, no user → Create Account → Check Email
 * 5. License exists, user exists → Login Screen
 * 6. Trial/License expired → License Activation
 */
function App() {
  const {
    currentUser,
    isAuthenticated,
    setUser,
    notification,
    showNotification,
    clearNotification,
    isLoading,
    currentPage,
    setCurrentPage
  } = useAppStore();

  const [isInitializing, setIsInitializing] = useState(true);
  const [licenseStatus, setLicenseStatus] = useState<any>(null);
  const [hasAdminUser, setHasAdminUser] = useState<boolean>(true);
  const [showActivation, setShowActivation] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [isAgreementAccepted, setIsAgreementAccepted] = useState<boolean | null>(null);

  // New states for SaaS auth flow
  const [showCheckEmail, setShowCheckEmail] = useState(false);
  const [showVerifyEmail, setShowVerifyEmail] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Device verification states
  const [showDeviceVerification, setShowDeviceVerification] = useState(false);
  const [deviceVerificationData, setDeviceVerificationData] = useState<{
    email: string;
    password: string;
    deviceId?: string;
    deviceInfo?: any;
  } | null>(null);
  const [verificationKey, setVerificationKey] = useState(0); // Force re-render

  // Device verification handler
  const handleDeviceVerificationNeeded = useCallback(async (email: string, password: string) => {
    try {
      let deviceId = 'unknown-browser-device';
      try {
        deviceId = getDeviceId();
      } catch (deviceError) {
        console.warn('[App] getDeviceId failed, using fallback:', deviceError);
      }

      // Use the SAME device fingerprint format as login for consistency
      const deviceInfo = {
        userAgent: navigator.userAgent,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        platform: navigator.platform,
        hardwareConcurrency: navigator.hardwareConcurrency,
        deviceMemory: (navigator as any).deviceMemory,
        hostname: window.location.hostname,
      };

      const data = {
        email,
        password,
        deviceId,
        deviceInfo,
      };

      setDeviceVerificationData(() => data);
      setShowDeviceVerification(() => true);
      setVerificationKey(prev => prev + 1);
    } catch (error) {
      console.error('[App] Device verification setup error:', error);
    }
  }, []);

  // Check initial state on mount
  useEffect(() => {
    initializeApp();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initializeApp = async () => {
    try {
      if (window.electronSecureAPI) {
        // 0. Initialize Device ID
        await initializeDeviceId();

        // 1. Check license status
        const statusRes = await window.electronSecureAPI.license.getStatus();
        if (statusRes?.success) setLicenseStatus(statusRes.data);
  
        // 1.5 Check EULA agreement status
        const agreementStatus = await window.electronSecureAPI.settings.getAgreementStatus();
        setIsAgreementAccepted(!!agreementStatus);

        // 2. Check if any admin users exist
        const usersRes = await window.electronSecureAPI.settings.hasUsers();
        const hasUsers = usersRes?.success ? usersRes.data : true; // Default to true if check fails to avoid lockouts
        setHasAdminUser(hasUsers);

        // 3. Check for existing session (local + server token)
        const userRes = await window.electronSecureAPI.auth.getCurrentUser();
        const user = userRes?.success ? userRes.data : null;

        // Critical: If session exists but local database is empty, force a fresh login
        // to trigger the auto-sync and recreate the local user record.
        if (user && !hasUsers) {
          console.warn('[App] Session restored but local DB is empty. Forcing login to sync.');
          await window.electronSecureAPI.auth.logout();
          setUser(null);
          // No session exists, just show login
          console.log('[App] No SaaS session found');
        } else if (user) {
          setUser(user);
        }
      }
    } catch (error) {
      console.error('[App] Failed to check session:', error);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleLogin = async (username: string, password: string) => {
    try {
      // Get device info for server-side verification
      let deviceId = 'unknown-browser-device';
      try {
        deviceId = getDeviceId();
      } catch (deviceError) {
        console.warn('[App] getDeviceId failed in renderer (expected), using fallback:', deviceError);
      }

      // Use the SAME device fingerprint format as AuthService.login for consistency
      const deviceInfo = {
        userAgent: navigator.userAgent,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        platform: navigator.platform,
        hardwareConcurrency: navigator.hardwareConcurrency,
        deviceMemory: (navigator as any).deviceMemory,
        hostname: window.location.hostname,
      };

      const result = await window.electronSecureAPI.auth.login({ username, password });

      // Check if server login needs device step-up verification
      if (result.needsStepUp && result.stepUpType === 'device_verification') {
        // Server sent OTP to email - show device verification page
        setDeviceVerificationData({
          email: username, // Email used for login
          password,
          deviceId,
          deviceInfo,
        });
        setShowDeviceVerification(true);
        return { success: false, needsDeviceVerification: true };
      }

      if (result.success && result.user) {
        setUser(result.user);
        setHasAdminUser(true); // Sync state after potential cloud recovery
        // Reset any auth-flow states
        setShowForgotPassword(false);
        setShowCheckEmail(false);
        setShowDeviceVerification(false);
        setDeviceVerificationData(null);
        return { success: true };
      }
      return { success: false, message: result.message };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  };

  const handleLogout = async () => {
    try {
      await window.electronSecureAPI.auth.logout();
      // Also clear server session if exists
      if (window.electronSecureAPI.posAuth?.clearSession) {
        await window.electronSecureAPI.posAuth.clearSession();
      }
      setUser(null);
      // Reset device verification states
      setShowDeviceVerification(false);
      setDeviceVerificationData(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  /**
   * Handle successful device verification
   */
  const handleDeviceVerified = async (tokens: any, user: any) => {
    try {
      console.log('[App] Device verified successfully for', user.email);

      // Store tokens securely
      if (window.electronSecureAPI?.secureStorage) {
        await window.electronSecureAPI.secureStorage.setTokens(tokens);
      }

      // Complete local login
      if (deviceVerificationData) {
        const loginResult = await window.electronSecureAPI.auth.login({
          username: deviceVerificationData.email,
          password: deviceVerificationData.password,
        });

        console.log('[App] Local login result after device verification:', loginResult);

        // Extract user from local login result (same pattern as handleLogin)
        if (loginResult?.success && loginResult.user) {
          setUser(loginResult.user);
        } else {
          console.warn('[App] Local login failed after device verification, using server user object');
          // Fallback: use the server user object
          setUser(user);
        }
      } else {
        // No deviceVerificationData - use server user object
        setUser(user);
      }

      setShowDeviceVerification(false);
      setDeviceVerificationData(null);

      showNotification('Device verified successfully!', 'success');
    } catch (error: any) {
      console.error('Device verification completion error:', error);
      showNotification('Device verified, but login completion failed. Please try logging in again.', 'error');
    }
  };

  const handleTrialStarted = async () => {
    try {
      await window.electronSecureAPI.license.startTrial();
      const status = await window.electronSecureAPI.license.getStatus();
      setLicenseStatus(status);

      // Also re-check admin user status to ensure correct routing
      if (window.electronSecureAPI) {
        const hasUsersResult = await window.electronSecureAPI.settings.hasUsers();
        const hasUsers = hasUsersResult?.success ? hasUsersResult.data : true;
        setHasAdminUser(hasUsers);
      }
    } catch (error) {
      console.error('Failed to start trial:', error);
      showNotification('Failed to start trial. Please try again.', 'error');
    }
  };

  const handleLicenseActivated = async (recovery: boolean = false) => {
    const status = await window.electronSecureAPI.license.getStatus();
    setLicenseStatus(status);
    setIsRecovery(recovery);
    setShowActivation(false);

    // Always re-check local user existence after activation so routing
    // correctly sends recovery users to Login, fresh users to SetupAccount.
    if (window.electronSecureAPI) {
      const hasUsersResult = await window.electronSecureAPI.settings.hasUsers();
      const hasUsers = hasUsersResult?.success ? hasUsersResult.data : true;
      setHasAdminUser(hasUsers);
    }
  };

  const handleAccountCreated = async (_username: string, _password: string, email: string) => {
    setHasAdminUser(true);

    // Show "Check your email" page before login
    setPendingEmail(email);
    setShowCheckEmail(true);
  };

  const handleAcceptAgreement = async () => {
    try {
      const res = await window.electronSecureAPI.settings.acceptAgreement();
      if (res.success) {
        setIsAgreementAccepted(true);
      }
    } catch (error) {
      console.error('Failed to accept agreement:', error);
    }
  };

  const handleDeclineAgreement = () => {
    if (window.electronSecureAPI?.app?.quit) {
      window.electronSecureAPI.app.quit();
    }
  };

  /**
   * Render the current page based on navigation
   */
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'pos':
        return <POSPage />;
      case 'inventory':
        return <InventoryPage />;
      case 'customers':
        return <ContactsPage type="customer" />;
      case 'suppliers':
        return <ContactsPage type="supplier" />;
      case 'transactions':
        return <TransactionsPage />;
      case 'purchase-orders':
        return <PurchaseOrderPage />;
      case 'quotations':
        return <QuotationPage />;
      case 'expense-tracker':
        return <ExpenseTrackerPage />;
      case 'aged-reports':
        return <AgedReportsPage />;
      case 'barcode':
        return <BarcodePage />;
      case 'refunds':
        return <RefundPage />;
      case 'recurring':
        return <RecurringPage />;
      case 'employees':
        return <EmployeePage />;
      case 'import-export':
        return <ImportExportPage />;
      case 'branches':
        return <BranchPage />;
      case 'customer-statements':
        return <CustomerStatementPage />;
      case 'tiered-pricing':
        return <TieredPricingPage />;
      case 'audit-log':
        return <AuditLogViewer />;
      case 'gst':
        return <GSTPage />;
      case 'reports':
        return <ReportsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

  // 1. Initial Loading State
  if (isInitializing || isAgreementAccepted === null) {
    return <Loader message="Initializing System..." />;
  }

  // 1.5 Agreement Enforcement
  if (isAgreementAccepted === false) {
    return (
      <AgreementOverlay 
        onAccept={handleAcceptAgreement} 
        onDecline={handleDeclineAgreement} 
      />
    );
  }

  // 2. Forgot Password Page (can be shown from login screen)
  if (showForgotPassword) {
    return (
      <ForgotPasswordPage
        onBack={() => setShowForgotPassword(false)}
        onGoToLogin={() => setShowForgotPassword(false)}
      />
    );
  }

  // 2.5 Device Verification Page (new device detected)
  if (showDeviceVerification && deviceVerificationData) {
    return (
      <DeviceVerificationPage
        key={verificationKey}
        email={deviceVerificationData.email}
        deviceId={deviceVerificationData.deviceId}
        deviceInfo={deviceVerificationData.deviceInfo}
        onVerified={handleDeviceVerified}
        onBack={() => {
          setShowDeviceVerification(false);
          setDeviceVerificationData(null);
        }}
      />
    );
  }

  // 3. Check Email Page (shown after account creation)
  if (showCheckEmail && pendingEmail) {
    return (
      <CheckEmailPage
        email={pendingEmail}
        onBack={() => {
          setShowCheckEmail(false);
          setPendingEmail('');
        }}
        onGoToLogin={() => {
          setShowCheckEmail(false);
          setPendingEmail('');
          // They'll land on the login screen naturally via the hasAdminUser check
        }}
      />
    );
  }

  // 4. Verification Status Page (shown when login blocked)
  if (showVerifyEmail && pendingEmail) {
    return (
      <VerifyEmailPage
        email={pendingEmail}
        onVerified={() => setShowVerifyEmail(false)}
        onBack={() => {
          setShowVerifyEmail(false);
          setPendingEmail('');
        }}
      />
    );
  }

  // 5. License/Trial Check (Onboarding Phase 1)
  if (licenseStatus?.type === 'none' && !showActivation) {
    return (
      <WelcomePage
        onTrialStarted={handleTrialStarted}
        onShowActivation={() => setShowActivation(true)}
        hasAdminUser={hasAdminUser}
        onShowLogin={() => setShowActivation(true)} // Force them to activation first, they can see login there
      />
    );
  }

  // 5. License Activation Page (Explicitly requested or required)
  if (showActivation || licenseStatus?.type === 'license_expired' || licenseStatus?.type === 'trial_expired' || licenseStatus?.type === 'verification_required' || licenseStatus?.type === 'license_device_mismatch') {
    return <LicenseActivationPage
      onActivated={handleLicenseActivated}
      onBack={() => setShowActivation(false)}
      onShowLogin={() => {
        setIsRecovery(true);
        setShowActivation(false);
      }}
      isTrialExpired={licenseStatus?.type === 'trial_expired'}
    />;
  }

  // 6. Admin Account Check (Onboarding Phase 2)
  // If NO admin user exists:
  // - Fresh activation (not recovery) → go to SetupAccount
  // - Recovery mode → go to Login (they already have an account)
  if (!hasAdminUser) {
    if (!isRecovery) {
      // Fresh license activation - no admin user yet
      return (
        <SetupAccountPage
          onAccountCreated={handleAccountCreated}
          onBack={() => {
            // Allow going back to Welcome if they want to reset/reactivate
            setShowActivation(true);
          }}
          onShowLogin={() => {
            // If they somehow think they have a user, let them try login
            setHasAdminUser(true);
          }}
        />
      );
    }
    // Recovery mode but no admin user found - fall through to login
    // (This shouldn't happen normally, but handle gracefully)
  }

  // 7. Authentication Check (Normal Operation)
  if (!isAuthenticated) {
    return (
      <LoginPage
        onLogin={handleLogin}
        onForgotPassword={() => setShowForgotPassword(true)}
        onResendVerification={(email) => {
          setPendingEmail(email);
          setShowCheckEmail(true);
        }}
        onVerificationNeeded={(email) => {
          setPendingEmail(email);
          setShowVerifyEmail(true);
        }}
        onDeviceVerificationNeeded={handleDeviceVerificationNeeded}
      />
    );
  }

  // 8. Main application layout
  return (
    <div className="flex h-screen bg-[#FDFDFC] bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:32px_32px]">
      <Sidebar
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        userRole={currentUser?.role}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          user={currentUser}
          onLogout={handleLogout}
          currentPage={currentPage}
          onNavigate={setCurrentPage}
        />
        <UpdateBanner />
        {licenseStatus?.type === 'trial' && (
          <TrialBanner
            daysRemaining={licenseStatus.daysRemaining || 0}
            onActivate={() => setShowActivation(true)}
          />
        )}
        <main className="flex-1 overflow-auto p-6">
          {renderPage()}
        </main>
      </div>
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={clearNotification}
        />
      )}
      {isLoading && <Loader />}
    </div>
  );
}

export default App;
