import { useEffect, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  Package,
  Users,
  AlertTriangle,
  ShoppingCart,
  BarChart3
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import type { Item } from '../types';
import { BhutaneseLoader } from '../components/ui/BhutaneseLoader';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const PAYMENT_COLORS = ['#9B2335', '#E8A020', '#1B3A5C', '#2E6DA4', '#14532D', '#7C3AED', '#059669', '#DC2626', '#F59E0B'];
const INCOME_COLOR = '#14532D';
const EXPENSE_COLOR = '#9B2335';
const SALES_COLOR = '#E8A020';

/**
 * Format currency with Bhutanese Ngultrum
 */
const formatCurrency = (amount: number) => {
  if (amount === 0) return 'Nu. 0';
  return 'Nu. ' + new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatCompactCurrency = (amount: number) => {
  if (Math.abs(amount) >= 100000) return 'Nu. ' + (amount / 100000).toFixed(1) + 'L';
  if (Math.abs(amount) >= 1000) return 'Nu. ' + (amount / 1000).toFixed(1) + 'K';
  return formatCurrency(amount);
};

/**
 * DashboardPage Component - Main dashboard with key metrics and charts
 */
export function DashboardPage() {
  const { dashboardData, setDashboardData, showNotification } = useAppStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const minLoadTime = new Promise(resolve => setTimeout(resolve, 1500));
      const dataPromise = window.electronSecureAPI.dashboard.getData();
      const realtimePromise = window.electronSecureAPI.dashboard.getRealtimeMetrics();

      const [result, realtimeResult] = await Promise.all([
        dataPromise,
        realtimePromise,
        minLoadTime
      ]);

      if (result.success && result.data) {
        // Ensure all array fields are actually arrays to prevent .filter()/.map() errors
        const safeData = {
          ...result.data,
          ...(realtimeResult?.success ? realtimeResult.data : {}),
          lowStockItems: Array.isArray(result.data.lowStockItems) ? result.data.lowStockItems : [],
          overdueCustomers: Array.isArray(result.data.overdueCustomers) ? result.data.overdueCustomers : [],
          recentTransactions: Array.isArray(result.data.recentTransactions) ? result.data.recentTransactions : [],
          salesTrend: Array.isArray(result.data.salesTrend) ? result.data.salesTrend : [],
          paymentModes: Array.isArray(result.data.paymentModes) ? result.data.paymentModes : [],
          topItems: Array.isArray(result.data.topItems) ? result.data.topItems : [],
          incomeVsExpense: Array.isArray(result.data.incomeVsExpense) ? result.data.incomeVsExpense : [],
        };
        setDashboardData(safeData);
      } else {
        showNotification(result.message || 'Failed to load dashboard', 'error');
      }
    } catch (error) {
      showNotification('Failed to load dashboard data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <BhutaneseLoader size="lg" text="Loading Dashboard..." />
      </div>
    );
  }

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
    salesTrend: [],
    paymentModes: [],
    topItems: [],
    incomeVsExpense: [],
  };

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

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const formatMonthLabel = (monthStr: string) => {
    const [, month] = monthStr.split('-');
    return monthNames[parseInt(month) - 1];
  };

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
                  <p className="truncate text-3xl font-bold text-slate-800 tracking-tight" title={stat.value}>{stat.value}</p>
                </div>
                <div className={`${stat.color} p-4 rounded-xl shadow-lg transition-transform group-hover:scale-110 duration-300`}>
                  <Icon className={`w-6 h-6 ${stat.iconColor || 'text-white'}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend (30 days) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-bhutan-maroon/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-bhutan-maroon" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Sales Trend (30 Days)</h3>
          </div>
          {data.salesTrend.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">No sales data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={data.salesTrend}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E8A020" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#E8A020" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v: number) => formatCompactCurrency(v)} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} labelFormatter={(label: string) => label} />
                <Area type="monotone" dataKey="sales" stroke="#E8A020" fill="url(#salesGrad)" strokeWidth={2} name="Sales" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Income vs Expenses (6 months) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Income vs Expenses (6 Months)</h3>
          </div>
          {data.incomeVsExpense.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.incomeVsExpense}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={formatMonthLabel} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v: number) => formatCompactCurrency(v)} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="income" fill={INCOME_COLOR} radius={[4, 4, 0, 0]} name="Income" />
                <Bar dataKey="expenses" fill={EXPENSE_COLOR} radius={[4, 4, 0, 0]} name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Second row of charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Mode Breakdown */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Wallet className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Payment Modes (This Month)</h3>
          </div>
          {data.paymentModes.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">No payment data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.paymentModes.filter((m: any) => m.amount > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="amount"
                  nameKey="mode"
                  label={({ mode, percent }: { mode: string; percent: number }) => percent > 0.05 ? `${mode}` : ''}
                >
                  {data.paymentModes.map((_entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={PAYMENT_COLORS[index % PAYMENT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)} 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36} 
                  wrapperStyle={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Selling Items */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-bhutan-gold/10 rounded-lg">
              <Package className="w-5 h-5 text-bhutan-maroon" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Top Selling Items (This Month)</h3>
          </div>
          {data.topItems.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">No sales data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.topItems} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v: number) => formatCompactCurrency(v)} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#334155' }} width={100} />
                <Tooltip formatter={(value: number, name: string) => name === 'revenue' ? formatCurrency(value) : value} />
                <Bar dataKey="revenue" fill={SALES_COLOR} radius={[0, 4, 4, 0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
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
                  className="flex items-start justify-between gap-3 p-3 bg-amber-50 rounded-lg"
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
                  className="flex items-start justify-between gap-3 p-3 bg-red-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-800">{customer.name}</p>
                    <p className="text-sm text-gray-500">
                      Due: {formatCurrency(customer.totalDue)} | {customer.daysOverdue} days overdue
                    </p>
                  </div>
                  <span className="text-red-600 font-medium truncate text-sm" title={formatCurrency(customer.totalDue)}>{formatCurrency(customer.totalDue)}</span>
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
                    <td className="py-3 px-4 text-sm text-right font-medium whitespace-nowrap">{formatCurrency(transaction.netAmount)}</td>
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
