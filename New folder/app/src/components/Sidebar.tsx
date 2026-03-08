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
}

const menuItems: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'pos', label: 'POS Sales', icon: ShoppingCart },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'suppliers', label: 'Suppliers', icon: Truck },
  { id: 'transactions', label: 'Transactions', icon: Receipt },
  { id: 'gst', label: 'GST', icon: Calculator },
  { id: 'reports', label: 'Reports', icon: FileText },
];

const adminItems: MenuItem[] = [
  { id: 'settings', label: 'Settings', icon: Settings },
];

/**
 * Sidebar Component - Navigation menu
 */
export function Sidebar({ currentPage, onPageChange, userRole }: SidebarProps) {
  const allMenuItems = userRole === 'admin'
    ? [...menuItems, ...adminItems]
    : menuItems;

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
            <span className="text-bhutan-gold">Dhisum</span> Tseyig
          </h1>
          <p className="text-[10px] uppercase tracking-[0.2em] text-bhutan-gold/60 font-semibold mt-1">
            Accounting & POS
          </p>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 py-6 overflow-y-auto custom-scrollbar">
          <ul className="px-3 space-y-1.5">
            {allMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;

              return (
                <li key={item.id}>
                  <button
                    onClick={() => onPageChange(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 ${isActive
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
