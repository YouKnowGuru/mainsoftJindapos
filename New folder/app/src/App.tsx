import { useEffect, useState } from 'react';
import { useAppStore } from './store/appStore';
import { LoginPage } from './pages/LoginPage';
import { WelcomePage } from './pages/WelcomePage';
import { SetupAccountPage } from './pages/SetupAccountPage';
import { LicenseActivationPage } from './pages/LicenseActivationPage';
import { TrialBanner } from './components/TrialBanner';
import { DashboardPage } from './pages/DashboardPage';
import { POSPage } from './pages/POSPage';
import { InventoryPage } from './pages/InventoryPage';
import { ContactsPage } from './pages/ContactsPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { GSTPage } from './pages/GSTPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Notification } from './components/Notification';
import { Loader } from './components/Loader';

/**
 * Main App Component
 * Handles routing, authentication, and layout
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

  // Check initial state on mount
  useEffect(() => {
    initializeApp();

    // Diagnostic keyboard shortcut: Ctrl+Shift+F12
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'F12') {
        const state = useAppStore.getState();
        console.log('--- DIAGNOSTIC RESET ---');
        console.log('Current Page:', state.currentPage);
        console.log('User:', state.currentUser);
        console.log('Is Authenticated:', state.isAuthenticated);
        console.log('License Status:', licenseStatus);
        console.log('Has Admin User:', hasAdminUser);

        // Force reset
        setIsInitializing(false);
        state.setIsLoading(false);
        alert('Diagnostic reset performed. Check console for details.');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initializeApp = async () => {
    try {
      if (window.electronAPI) {
        // 1. Check license status
        const status = await window.electronAPI.license.getStatus();
        setLicenseStatus(status);

        // 2. Check if any admin users exist
        const hasUsers = await window.electronAPI.settings.hasUsers();
        setHasAdminUser(hasUsers);

        // 3. Check for existing session
        const user = await window.electronAPI.auth.getCurrentUser();
        if (user) {
          setUser(user);
        }
      }
    } catch (error) {
      console.error('App initialization failed:', error);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleLogin = async (username: string, password: string) => {
    try {
      const result = await window.electronAPI.auth.login({ username, password });
      if (result.success && result.user) {
        setUser(result.user);
        return { success: true };
      }
      return { success: false, message: result.message };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  };

  const handleLogout = async () => {
    try {
      await window.electronAPI.auth.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleTrialStarted = async () => {
    try {
      await window.electronAPI.license.startTrial();
      const status = await window.electronAPI.license.getStatus();
      setLicenseStatus(status);

      // Also re-check admin user status to ensure correct routing
      if (window.electronAPI) {
        const hasUsers = await window.electronAPI.settings.hasUsers();
        setHasAdminUser(hasUsers);
      }
    } catch (error) {
      console.error('Failed to start trial:', error);
      showNotification('Failed to start trial. Please try again.', 'error');
    }
  };

  const handleLicenseActivated = async () => {
    const status = await window.electronAPI.license.getStatus();
    setLicenseStatus(status);
    setShowActivation(false);
  };

  const handleAccountCreated = async (username: string, password: string) => {
    setHasAdminUser(true);
    await handleLogin(username, password);
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
  if (isInitializing) {
    return <Loader message="Initializing System..." />;
  }

  // 2. License/Trial Check (Onboarding Phase 1)
  if (licenseStatus?.type === 'none' && !showActivation) {
    return (
      <WelcomePage
        onTrialStarted={handleTrialStarted}
        onShowActivation={() => setShowActivation(true)}
        hasAdminUser={hasAdminUser}
        onShowLogin={() => {
          // If they have users, we still need a trial/license to log in.
          // But we can let them see the login screen or tell them they need a license.
          // For now, we'll keep them on Welcome but show a message if they try to log in.
          // Actually, let's just allow them to go to activation first.
        }}
      />
    );
  }

  // 3. License Activation Page (Explicitly requested or required)
  if (showActivation || licenseStatus?.type === 'license_expired' || licenseStatus?.type === 'trial_expired' || licenseStatus?.type === 'verification_required') {
    return <LicenseActivationPage
      onActivated={handleLicenseActivated}
      onBack={() => setShowActivation(false)}
      onShowLogin={() => setShowActivation(false)}
      isTrialExpired={licenseStatus?.type === 'trial_expired'}
      licenseStatus={licenseStatus?.type}
    />;
  }

  // 4. Admin Account Check (Onboarding Phase 2)
  if (!hasAdminUser) {
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

  // 5. Authentication Check (Normal Operation)
  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // 6. Main application layout
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
