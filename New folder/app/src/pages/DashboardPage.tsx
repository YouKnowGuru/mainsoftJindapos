import { useEffect, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  Package,
  Users,
  AlertTriangle,
  ShoppingCart
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import type { Item } from '../types';
import { BhutaneseLoader } from '../components/ui/BhutaneseLoader';

/**
 * DashboardPage Component - Main dashboard with key metrics
 */
export function DashboardPage() {
  const { dashboardData, setDashboardData, showNotification } = useAppStore();
  const [isLoading, setIsLoading] = useState(true);

  // Load dashboard data on mount
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Start a minimum loading timer (1.5 seconds)
      const minLoadTime = new Promise(resolve => setTimeout(resolve, 1500));

      // First get the static/heavy data like transaction lists and low stock items
      const dataPromise = window.electronAPI.dashboard.getData();

      // Then get the realtime 100% accurate financial metrics
      const realtimePromise = window.electronAPI.dashboard.getRealtimeMetrics();

      // Wait for all promises (data fetches AND minimum time)
      const [result, realtimeResult] = await Promise.all([
        dataPromise,
        realtimePromise,
        minLoadTime
      ]);

      if (result.success && result.data) {
        setDashboardData({
          ...result.data,
          ...realtimeResult // Overwrite financial metrics with realtime data
        });
      } else {
        showNotification(result.message || 'Failed to load dashboard', 'error');
      }
    } catch (error) {
      showNotification('Failed to load dashboard data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Format currency with Bhutanese Ngultrum
   */
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'BTN',
      minimumFractionDigits: 2,
    }).format(amount).replace('BTN', 'Nu.');
  };

  // Show loading spinner
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <BhutaneseLoader size="lg" text="Loading Dashboard..." />
      </div>
    );
  }

  // Default data if not loaded
  const data = dashboardData || {
    todaySales: 0,
    todayExpenses: 0,
    cashBalance: 0,
    bankBalance: 0,
    profitToday: 0,
    lowStockItems: [],
    overdueCustomers: [],
    recentTransactions: [],
    monthlySales: 0,
    monthlyPurchases: 0,
  };

  // Stats cards configuration
  const stats = [
    {
      title: "Today's Sales",
      value: formatCurrency(data.todaySales),
      icon: TrendingUp,
      color: 'bg-bhutan-maroon',
    },
    {
      title: "Today's Expenses",
      value: formatCurrency(data.todayExpenses),
      icon: TrendingDown,
      color: 'bg-bhutan-orange',
    },
    {
      title: 'Cash Balance',
      value: formatCurrency(data.cashBalance),
      icon: Wallet,
      color: 'bg-slate-800',
    },
    {
      title: 'Bank Balance',
      value: formatCurrency(data.bankBalance),
      icon: PiggyBank,
      color: 'bg-bhutan-maroon/80',
    },
    {
      title: "Today's Profit",
      value: formatCurrency(data.profitToday),
      icon: ShoppingCart,
      color: data.profitToday >= 0 ? 'bg-bhutan-gold' : 'bg-red-500',
      iconColor: data.profitToday >= 0 ? 'text-bhutan-maroon' : 'text-white',
    },
    {
      title: 'Monthly Sales',
      value: formatCurrency(data.monthlySales),
      icon: TrendingUp,
      color: 'bg-slate-700',
    },
  ];

  return (
    <div className="space-y-8 pb-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-all duration-300 group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.title}</p>
                  <p className="text-3xl font-bold text-slate-800 tracking-tight">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-4 rounded-xl shadow-lg transition-transform group-hover:scale-110 duration-300`}>
                  <Icon className={`w-6 h-6 ${stat.iconColor || 'text-white'}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Alerts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alerts */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-amber-100 p-2 rounded-lg">
              <Package className="w-5 h-5 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800">Low Stock Alerts</h3>
            {data.lowStockItems.length > 0 && (
              <span className="bg-red-100 text-red-600 text-xs font-medium px-2 py-1 rounded-full">
                {data.lowStockItems.length} items
              </span>
            )}
          </div>

          {data.lowStockItems.length === 0 ? (
            <p className="text-gray-500 text-center py-8">All stock levels are good!</p>
          ) : (
            <div className="space-y-3">
              {data.lowStockItems.slice(0, 5).map((item: Item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-amber-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-800">{item.name}</p>
                    <p className="text-sm text-gray-500">
                      Stock: {item.quantityInStock} / Reorder: {item.reorderLevel}
                    </p>
                  </div>
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Overdue Customers */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-red-100 p-2 rounded-lg">
              <Users className="w-5 h-5 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800">Overdue Payments</h3>
            {data.overdueCustomers.length > 0 && (
              <span className="bg-red-100 text-red-600 text-xs font-medium px-2 py-1 rounded-full">
                {data.overdueCustomers.length} customers
              </span>
            )}
          </div>

          {data.overdueCustomers.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No overdue payments!</p>
          ) : (
            <div className="space-y-3">
              {data.overdueCustomers.slice(0, 5).map((customer: any) => (
                <div
                  key={customer.id}
                  className="flex items-center justify-between p-3 bg-red-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-800">{customer.name}</p>
                    <p className="text-sm text-gray-500">
                      Due: {formatCurrency(customer.totalDue)} | {customer.daysOverdue} days overdue
                    </p>
                  </div>
                  <span className="text-red-600 font-medium">
                    {formatCurrency(customer.totalDue)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Transactions</h3>

        {data.recentTransactions.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No recent transactions</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Transaction #</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Type</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Contact</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Amount</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recentTransactions.slice(0, 10).map((transaction: any) => (
                  <tr key={transaction.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm">{transaction.transactionNo}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${transaction.type === 'sale' ? 'bg-emerald-100 text-emerald-700' :
                        transaction.type === 'purchase' ? 'bg-blue-100 text-blue-700' :
                          transaction.type === 'receipt' ? 'bg-green-100 text-green-700' :
                            transaction.type === 'payment' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                        }`}>
                        {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{transaction.date}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{transaction.contactName || '-'}</td>
                    <td className="py-3 px-4 text-sm text-right font-medium">
                      {formatCurrency(transaction.netAmount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${transaction.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                        transaction.status === 'void' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                        {transaction.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
