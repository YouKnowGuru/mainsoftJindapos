import { useState, useEffect, useRef } from 'react';
import { Bell, User, LogOut, AlertTriangle, AlertCircle, Package, X } from 'lucide-react';
import type { User as UserType } from '../types';
import { useAppStore } from '../store/appStore';

interface HeaderProps {
  user: UserType | null;
  onLogout: () => void;
  currentPage: string;
  onNavigate?: (page: string) => void;
}

const pageTitles: Record<string, string> = {
  dashboard: 'Dashboard',
  pos: 'Point of Sale',
  inventory: 'Inventory Management',
  customers: 'Customer Management',
  suppliers: 'Supplier Management',
  transactions: 'Transactions',
  gst: 'GST Management',
  reports: 'Reports',
  settings: 'Settings',
};

/**
 * Header Component - Top navigation bar with live notifications
 */
export function Header({ user, onLogout, currentPage, onNavigate }: HeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const { headerAlerts, loadHeaderAlerts } = useAppStore();

  // Load notifications on mount and every 60 seconds
  useEffect(() => {
    loadHeaderAlerts();
    const interval = setInterval(loadHeaderAlerts, 60000);
    return () => clearInterval(interval);
  }, [loadHeaderAlerts]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const alertCount = headerAlerts.length;

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 px-8 py-5 sticky top-0 z-40">
      <div className="flex items-center justify-between">
        {/* Page Title */}
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
          {pageTitles[currentPage] || 'Dashboard'}
        </h2>

        {/* Right Side Actions */}
        <div className="flex items-center gap-4">
          {/* Notifications Bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowUserMenu(false);
              }}
              className="relative p-2 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <Bell className="w-5 h-5" />
              {alertCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-lg animate-pulse">
                  {alertCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-3 w-80 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-slate-900/15 border border-gray-100 z-50 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white">
                  <h3 className="text-sm font-bold text-slate-800">Alerts</h3>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>

                {/* Alert List */}
                <div className="max-h-80 overflow-y-auto">
                  {alertCount === 0 ? (
                    <div className="p-8 text-center">
                      <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-400 font-medium">No active alerts</p>
                      <p className="text-xs text-gray-300 mt-1">Everything looks good!</p>
                    </div>
                  ) : (
                    headerAlerts.map((alert: any) => (
                      <button
                        key={alert.id}
                        onClick={() => {
                          if (onNavigate && alert.targetUrl) {
                            onNavigate(alert.targetUrl);
                          }
                          setShowNotifications(false);
                        }}
                        className="w-full text-left px-5 py-3.5 hover:bg-gray-50/80 transition-colors border-b border-gray-50 last:border-b-0 group"
                      >
                        <div className="flex items-start gap-3">
                          {/* Icon */}
                          <div className={`mt-0.5 p-1.5 rounded-lg flex-shrink-0 ${alert.type === 'error'
                              ? 'bg-red-50 text-red-500'
                              : alert.type === 'warning'
                                ? 'bg-amber-50 text-amber-500'
                                : 'bg-blue-50 text-blue-500'
                            }`}>
                            {alert.type === 'error' ? (
                              <AlertCircle className="w-4 h-4" />
                            ) : alert.type === 'warning' ? (
                              <AlertTriangle className="w-4 h-4" />
                            ) : (
                              <Package className="w-4 h-4" />
                            )}
                          </div>
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-700 group-hover:text-slate-900">
                              {alert.title}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed truncate">
                              {alert.description}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>

                {/* Footer */}
                {alertCount > 0 && (
                  <div className="px-5 py-2.5 border-t border-gray-100 bg-gray-50/50">
                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider text-center">
                      {alertCount} active alert{alertCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => {
                setShowUserMenu(!showUserMenu);
                setShowNotifications(false);
              }}
              className="flex items-center gap-3 px-1 py-1 rounded-full hover:bg-gray-50 transition-all duration-200"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-bhutan-maroon to-bhutan-orange rounded-full flex items-center justify-center shadow-md">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="text-left hidden md:block pr-2">
                <p className="text-sm font-bold text-slate-700 leading-tight">{user?.fullName}</p>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{user?.role}</p>
              </div>
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-4 w-56 bg-white/90 backdrop-blur-xl rounded-[28px] shadow-2xl shadow-slate-900/10 border border-white p-2 z-50 animate-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-slate-50 mb-1">
                  <p className="text-xs font-black text-slate-900 tracking-tight">{user?.fullName}</p>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{user?.role}</p>
                </div>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-xs font-black uppercase tracking-widest text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  Logout Session
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
