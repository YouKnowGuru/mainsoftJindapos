import { Logo } from './Logo';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Truck,
  Receipt,
  Calculator,
  FileText,
  Settings,
  ArrowUpRight,
  TrendingDown,
  Clock,
  UserCheck,
  QrCode,
  Mail,
  FileBadge,
  FilePlus,
  Shield,
  BarChart3,
  DollarSign,
  Building2,
} from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  userRole?: string;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
  group?: string;
}

const menuItems: MenuItem[] = [
  // Core
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'pos', label: 'Sales', icon: ShoppingCart },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'suppliers', label: 'Suppliers', icon: Truck },
  { id: 'transactions', label: 'Transactions', icon: Receipt },

  // New Features
  { id: 'purchase-orders', label: 'Purchase Orders', icon: FilePlus, group: 'Procurement' },
  { id: 'quotations', label: 'Quotations', icon: FileBadge, group: 'Sales' },
  { id: 'refunds', label: 'Refunds', icon: ArrowUpRight, group: 'Sales' },
  { id: 'customer-statements', label: 'Statements', icon: Mail, group: 'Sales' },
  { id: 'expense-tracker', label: 'Expenses', icon: TrendingDown, group: 'Finance' },
  { id: 'recurring', label: 'Recurring', icon: Clock, group: 'Finance' },
  { id: 'aged-reports', label: 'Aged Reports', icon: BarChart3, group: 'Finance' },
  { id: 'tiered-pricing', label: 'Pricing', icon: DollarSign, group: 'Finance' },
  { id: 'employees', label: 'Employees', icon: UserCheck, group: 'HR' },
  { id: 'branches', label: 'Branches', icon: Building2, group: 'HR' },
  { id: 'import-export', label: 'Import/Export', icon: FileText, group: 'Tools' },
  { id: 'audit-log', label: 'Audit Log', icon: Shield, group: 'Security' },
  { id: 'barcode', label: 'Barcodes', icon: QrCode, group: 'Tools' },

  // Compliance
  { id: 'gst', label: 'GST', icon: Calculator },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const adminItems: MenuItem[] = [
  // Admin-only items can go here
];

/**
 * Sidebar Component - Navigation menu
 */
export function Sidebar({ currentPage, onPageChange, userRole }: SidebarProps) {
  const allMenuItems = userRole === 'admin'
    ? [...menuItems, ...adminItems]
    : menuItems; // Settings is now in menuItems, visible to all

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col flex-shrink-0 relative overflow-hidden">
      {/* Decorative Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-bhutan-maroon to-slate-950 opacity-95"></div>
      <div className="absolute top-0 right-0 w-32 h-32 bg-bhutan-orange opacity-10 blur-3xl -mr-16 -mt-16"></div>

      <div className="relative z-10 flex flex-col h-full">
        {/* Logo Section */}
        <div className="p-8 border-b border-white/10 flex flex-col items-center text-center">
          <Logo size="lg" className="mb-4" />
          <h1 className="text-xl font-bold tracking-tight">
            <span className="text-bhutan-gold">Jinda</span>
          </h1>
          <p className="text-[10px] uppercase tracking-[0.2em] text-bhutan-gold/60 font-semibold mt-1">
            Accounting & POS
          </p>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 py-6 overflow-y-auto custom-scrollbar">
          <ul className="px-3 space-y-1">
            {allMenuItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              const showGroup = item.group && (!allMenuItems[index - 1] || allMenuItems[index - 1].group !== item.group);

              return (
                <li key={item.id}>
                  {showGroup && item.group && (
                    <div className="px-4 pt-4 pb-1 text-[10px] font-bold uppercase tracking-widest text-white/30">{item.group}</div>
                  )}
                  <button
                    onClick={() => onPageChange(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-300 ${isActive
                      ? 'bg-bhutan-gold text-bhutan-maroon shadow-lg shadow-bhutan-gold/20 scale-[1.02]'
                      : 'text-white/70 hover:bg-white/5 hover:text-white'
                      }`}
                  >
                    <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110' : ''}`} />
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-6 border-t border-white/10">
          <div className="text-xs text-white/40 font-medium tracking-tight">
            <p className="flex justify-between items-center">
              <span>SYSTEM VERSION</span>
              <span className="text-white/60">1.0.0</span>
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
