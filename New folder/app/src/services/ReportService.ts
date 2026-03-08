import { DatabaseManager } from '../database/DatabaseManager';
import Database from 'better-sqlite3';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import type {
  DashboardData,
  TrialBalanceItem,
  ProfitLossData,
  BalanceSheetData,
  OutstandingItem,
  StockReportItem,
  ApiResponse
} from '../types';

/**
 * ReportService - Generates financial and operational reports
 */
export class ReportService {
  private db: Database.Database;

  constructor(dbManager: DatabaseManager) {
    this.db = dbManager.getDatabase();
  }

  // ============================================
  // DASHBOARD DATA
  // ============================================

  getDashboardData(): ApiResponse<DashboardData> {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');

      // Today's sales
      const todaySales = this.db.prepare(`
        SELECT COALESCE(SUM(net_amount), 0) as total
        FROM transactions
        WHERE type = 'sale' AND date = ? AND is_void = 0
      `).get(today);

      // Today's expenses (payments)
      const todayExpenses = this.db.prepare(`
        SELECT COALESCE(SUM(net_amount), 0) as total
        FROM transactions
        WHERE type = 'payment' AND date = ? AND is_void = 0
      `).get(today);

      // Cash balance
      const cashBalance = this.getAccountBalance('1100');

      // Bank balance
      const bankBalance = this.getAccountBalance('1200');

      // Profit today (simplified) - use fallback to 0 to prevent NaN when no data
      const profitToday = Number((todaySales as any)?.total || 0) - Number((todayExpenses as any)?.total || 0);

      // Low stock items
      const lowStockItems = this.db.prepare(`
        SELECT * FROM items
        WHERE is_active = 1 AND quantity_in_stock <= reorder_level
        ORDER BY quantity_in_stock ASC
        LIMIT 5
      `).all();

      // Overdue customers
      const overdueCustomers = this.db.prepare(`
        SELECT 
          c.id,
          c.name,
          c.current_balance,
          COUNT(i.id) as pending_invoices,
          SUM(i.balance_due) as total_due,
          MAX(i.due_date) as last_due_date,
          julianday('now') - julianday(MAX(i.due_date)) as days_overdue
        FROM contacts c
        JOIN invoices i ON c.id = i.contact_id
        WHERE c.type = 'customer'
        AND i.payment_status IN ('unpaid', 'partial')
        AND i.due_date < ?
        AND i.is_void = 0
        GROUP BY c.id
        ORDER BY total_due DESC
        LIMIT 5
      `).all(today);

      // Recent transactions
      const recentTransactions = this.db.prepare(`
        SELECT 
          t.*,
          c.name as contact_name
        FROM transactions t
        LEFT JOIN contacts c ON t.contact_id = c.id
        WHERE t.is_void = 0
        ORDER BY t.created_at DESC
        LIMIT 10
      `).all();

      // Monthly sales
      const monthlySales = this.db.prepare(`
        SELECT COALESCE(SUM(net_amount), 0) as total
        FROM transactions
        WHERE type = 'sale' AND date BETWEEN ? AND ? AND is_void = 0
      `).get(monthStart, monthEnd);

      // Monthly purchases
      const monthlyPurchases = this.db.prepare(`
        SELECT COALESCE(SUM(net_amount), 0) as total
        FROM transactions
        WHERE type = 'purchase' AND date BETWEEN ? AND ? AND is_void = 0
      `).get(monthStart, monthEnd);

      const data: DashboardData = {
        todaySales: Number((todaySales as any)?.total || 0),
        todayExpenses: Number((todayExpenses as any)?.total || 0),
        cashBalance: Number(cashBalance || 0),
        bankBalance: Number(bankBalance || 0),
        profitToday: Number(profitToday || 0),
        lowStockItems: lowStockItems.map((i: any) => this.mapItemFromDb(i)),
        overdueCustomers: (overdueCustomers as any[]).map(c => ({
          id: c.id,
          name: c.name,
          currentBalance: Number(c.current_balance || 0),
          totalDue: Number(c.total_due || 0),
          daysOverdue: Math.round(Number(c.days_overdue || 0)),
        })),
        recentTransactions: recentTransactions.map((t: any) => this.mapTransactionFromDb(t)),
        monthlySales: Number((monthlySales as any)?.total || 0),
        monthlyPurchases: Number((monthlyPurchases as any)?.total || 0),
      };

      return { success: true, data };
    } catch (error: any) {
      console.error('Get dashboard data error:', error);
      return { success: false, message: 'Failed to get dashboard data: ' + error.message };
    }
  }

  // ============================================
  // NOTIFICATIONS (HEADER ALERT BELL)
  // ============================================

  getNotifications(): ApiResponse<any[]> {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const notifications: any[] = [];
      console.log('Fetching notifications for date:', today);

      // Look for low stock items
      const lowStockItems = this.db.prepare(`
        SELECT name, quantity_in_stock, reorder_level
        FROM items
        WHERE is_active = 1 AND quantity_in_stock <= reorder_level
        ORDER BY quantity_in_stock ASC
      `).all() as any[];

      console.log('Low stock items found:', lowStockItems.length);

      // Create a single grouped notification for low stock to avoid spamming the UI
      if (lowStockItems.length > 0) {
        let details = lowStockItems.length + ' items are low on stock';
        if (lowStockItems.length <= 3) {
          details = lowStockItems.map(i => i.name + ' (' + i.quantity_in_stock + ' left)').join(', ');
        }

        notifications.push({
          id: 'low-stock-' + Date.now(),
          type: 'warning',
          title: 'Low Stock Alert',
          description: details,
          targetUrl: 'inventory',
          timestamp: new Date().toISOString()
        });
      }

      // Look for overdue customers
      const overdueCustomers = this.db.prepare(`
        SELECT 
          c.name,
          SUM(i.balance_due) as total_due
        FROM contacts c
        JOIN invoices i ON c.id = i.contact_id
        WHERE c.type = 'customer'
        AND i.payment_status IN ('unpaid', 'partial')
        AND i.due_date < ?
        AND i.is_void = 0
        GROUP BY c.id
      `).all(today) as any[];

      console.log('Overdue customers found:', overdueCustomers.length);

      if (overdueCustomers.length > 0) {
        let details = overdueCustomers.length + ' customers have overdue payments';
        if (overdueCustomers.length <= 3) {
          details = overdueCustomers.map(c => c.name + ' (Due: Nu.' + c.total_due + ')').join(', ');
        }

        notifications.push({
          id: 'overdue-' + Date.now(),
          type: 'error',
          title: 'Overdue Payments',
          description: details,
          targetUrl: 'dashboard',
          timestamp: new Date().toISOString()
        });
      }

      console.log('Total notifications prepared:', notifications.length);
      return { success: true, data: notifications };
    } catch (error: any) {
      console.error('Get notifications error:', error);
      return { success: false, message: 'Failed to fetch notifications' };
    }
  }


  // ============================================
  // TRIAL BALANCE
  // ============================================

  getTrialBalance(asOfDate?: string): ApiResponse<{ data: TrialBalanceItem[]; totals: { debit: number; credit: number } }> {
    try {
      const date = asOfDate || format(new Date(), 'yyyy-MM-dd');

      const accounts = this.db.prepare(`
        SELECT
        a.id,
          a.code,
          a.name,
          a.type,
          COALESCE(SUM(tl.debit_amount), 0) as total_debits,
          COALESCE(SUM(tl.credit_amount), 0) as total_credits
        FROM accounts a
        LEFT JOIN transaction_lines tl ON a.id = tl.account_id
        LEFT JOIN transactions t ON tl.transaction_id = t.id AND t.date <= ? AND t.is_void = 0
        WHERE a.is_active = 1
        GROUP BY a.id
        HAVING total_debits > 0 OR total_credits > 0
        ORDER BY a.code
          `).all(date);

      let totalDebit = 0;
      let totalCredit = 0;

      const formattedData = (accounts as any[]).map((acc: any) => {
        const balance = acc.total_debits - acc.total_credits;
        let debit = 0;
        let credit = 0;

        // Determine normal balance based on account type
        const normalDebitAccounts = ['asset', 'expense'];

        if (normalDebitAccounts.includes(acc.type)) {
          if (balance > 0) {
            debit = balance;
            totalDebit += balance;
          } else {
            credit = Math.abs(balance);
            totalCredit += Math.abs(balance);
          }
        } else {
          if (balance < 0) {
            debit = Math.abs(balance);
            totalDebit += Math.abs(balance);
          } else {
            credit = balance;
            totalCredit += balance;
          }
        }

        return {
          code: acc.code,
          name: acc.name,
          type: acc.type,
          debit,
          credit
        };
      });

      return {
        success: true,
        data: {
          data: formattedData,
          totals: { debit: totalDebit, credit: totalCredit }
        }
      };
    } catch (error: any) {
      console.error('Get trial balance error:', error);
      return { success: false, message: 'Failed to get trial balance: ' + error.message };
    }
  }

  // ============================================
  // PROFIT & LOSS
  // ============================================

  getProfitLoss(startDate: string, endDate: string): ApiResponse<ProfitLossData> {
    try {
      // Sales Revenue
      const sales = this.db.prepare(`
        SELECT COALESCE(SUM(net_amount - gst_amount), 0) as total
        FROM transactions
        WHERE type = 'sale' AND date BETWEEN ? AND ? AND is_void = 0
          `).get(startDate, endDate);

      // Other Income
      const otherIncome = this.db.prepare(`
        SELECT COALESCE(SUM(tl.credit_amount - tl.debit_amount), 0) as total
        FROM transaction_lines tl
        JOIN accounts a ON tl.account_id = a.id
        JOIN transactions t ON tl.transaction_id = t.id
        WHERE a.subtype = 'other_income' AND t.date BETWEEN ? AND ? AND t.is_void = 0
          `).get(startDate, endDate);

      // COGS
      const cogs = this.db.prepare(`
        SELECT COALESCE(SUM(tl.debit_amount), 0) as total
        FROM transaction_lines tl
        JOIN accounts a ON tl.account_id = a.id
        JOIN transactions t ON tl.transaction_id = t.id
        WHERE a.subtype = 'cogs' AND t.date BETWEEN ? AND ? AND t.is_void = 0
          `).get(startDate, endDate);

      // Operating Expenses (Operating + Other)
      const operatingExpenses = this.db.prepare(`
        SELECT COALESCE(SUM(tl.debit_amount), 0) as total
        FROM transaction_lines tl
        JOIN accounts a ON tl.account_id = a.id
        JOIN transactions t ON tl.transaction_id = t.id
        WHERE(a.subtype = 'operating_expense' OR a.subtype = 'other_expense') 
        AND t.date BETWEEN ? AND ? AND t.is_void = 0
          `).get(startDate, endDate);

      // Other Expenses (Redundant but kept for structure)
      const otherExpenses = { total: 0 };

      const salesTotal = (sales as any)?.total || 0;
      const otherIncomeTotal = (otherIncome as any)?.total || 0;
      const cogsTotal = (cogs as any)?.total || 0;
      const operatingTotal = (operatingExpenses as any)?.total || 0;
      const otherExpensesTotal = (otherExpenses as any)?.total || 0;

      const totalRevenue = salesTotal + otherIncomeTotal;
      const totalExpenses = cogsTotal + operatingTotal + otherExpensesTotal;

      const data: ProfitLossData = {
        revenue: {
          sales: salesTotal,
          otherIncome: otherIncomeTotal,
          total: totalRevenue
        },
        expenses: {
          cogs: cogsTotal,
          operating: operatingTotal,
          other: otherExpensesTotal,
          total: totalExpenses
        },
        grossProfit: totalRevenue - cogsTotal,
        netProfit: totalRevenue - totalExpenses
      };

      return { success: true, data };
    } catch (error: any) {
      console.error('Get profit loss error:', error);
      return { success: false, message: 'Failed to get profit & loss: ' + error.message };
    }
  }

  // ============================================
  // BALANCE SHEET
  // ============================================

  getBalanceSheet(asOfDate?: string): ApiResponse<BalanceSheetData> {
    try {
      const date = asOfDate || format(new Date(), 'yyyy-MM-dd');

      // Get all asset accounts with balances
      const assets = this.db.prepare(`
        SELECT
        a.id,
          a.code,
          a.name,
          a.subtype,
          COALESCE(SUM(tl.debit_amount - tl.credit_amount), 0) as balance
        FROM accounts a
        LEFT JOIN transaction_lines tl ON a.id = tl.account_id
        LEFT JOIN transactions t ON tl.transaction_id = t.id AND t.date <= ? AND t.is_void = 0
        WHERE a.type = 'asset' AND a.is_active = 1
        GROUP BY a.id
        HAVING balance != 0
        ORDER BY a.code
          `).all(date);

      // Get all liability accounts with balances
      const liabilities = this.db.prepare(`
        SELECT
        a.id,
          a.code,
          a.name,
          a.subtype,
          COALESCE(SUM(tl.credit_amount - tl.debit_amount), 0) as balance
        FROM accounts a
        LEFT JOIN transaction_lines tl ON a.id = tl.account_id
        LEFT JOIN transactions t ON tl.transaction_id = t.id AND t.date <= ? AND t.is_void = 0
        WHERE a.type = 'liability' AND a.is_active = 1
        GROUP BY a.id
        HAVING balance != 0
        ORDER BY a.code
          `).all(date);

      // Get all equity accounts with balances
      const equity = this.db.prepare(`
        SELECT
        a.id,
          a.code,
          a.name,
          COALESCE(SUM(tl.credit_amount - tl.debit_amount), 0) as balance
        FROM accounts a
        LEFT JOIN transaction_lines tl ON a.id = tl.account_id
        LEFT JOIN transactions t ON tl.transaction_id = t.id AND t.date <= ? AND t.is_void = 0
        WHERE a.type = 'equity' AND a.is_active = 1
        GROUP BY a.id
        HAVING balance != 0
        ORDER BY a.code
          `).all(date);

      const currentAssets = (assets as any[]).filter((a: any) => a.subtype === 'current_asset');
      const fixedAssets = (assets as any[]).filter((a: any) => a.subtype === 'fixed_asset');
      const currentLiabilities = (liabilities as any[]).filter((l: any) => l.subtype === 'current_liability');
      const longTermLiabilities = (liabilities as any[]).filter((l: any) => l.subtype === 'long_term_liability');

      const totalAssets = (assets as any[]).reduce((sum: number, a: any) => sum + a.balance, 0);
      const totalLiabilities = (liabilities as any[]).reduce((sum: number, l: any) => sum + l.balance, 0);
      const totalEquity = (equity as any[]).reduce((sum: number, e: any) => sum + e.balance, 0);

      const data: BalanceSheetData = {
        assets: {
          current: currentAssets.map(a => ({ name: a.name, balance: a.balance })),
          fixed: fixedAssets.map(a => ({ name: a.name, balance: a.balance })),
          total: totalAssets
        },
        liabilities: {
          current: currentLiabilities.map(l => ({ name: l.name, balance: l.balance })),
          longTerm: longTermLiabilities.map(l => ({ name: l.name, balance: l.balance })),
          total: totalLiabilities
        },
        equity: equity.map((e: any) => ({ name: e.name, balance: e.balance })),
        totalEquity: totalEquity + totalLiabilities
      };

      return { success: true, data };
    } catch (error: any) {
      console.error('Get balance sheet error:', error);
      return { success: false, message: 'Failed to get balance sheet: ' + error.message };
    }
  }

  // ============================================
  // OUTSTANDING REPORT
  // ============================================

  getOutstandingReport(type?: 'customer' | 'supplier'): ApiResponse<{ data: OutstandingItem[]; total: number }> {
    try {
      let query = `
        SELECT
        c.id,
          c.name,
          c.type,
          c.credit_limit,
          c.current_balance,
          COUNT(i.id) as pending_invoices,
          SUM(i.balance_due) as total_due,
          MAX(i.due_date) as oldest_due_date,
          julianday('now') - julianday(MAX(i.due_date)) as days_overdue
        FROM contacts c
        LEFT JOIN invoices i ON c.id = i.contact_id AND i.payment_status IN('unpaid', 'partial') AND i.is_void = 0
        WHERE c.current_balance != 0
          `;

      const params: any[] = [];

      if (type) {
        query += ' AND c.type = ?';
        params.push(type);
      }

      query += ' GROUP BY c.id ORDER BY ABS(c.current_balance) DESC';

      const results = this.db.prepare(query).all(...params);

      const total = (results as any[]).reduce((sum: number, r: any) => sum + (r.total_due || 0), 0);

      const data: OutstandingItem[] = (results as any[]).map(r => ({
        id: r.id,
        name: r.name,
        type: r.type,
        creditLimit: r.credit_limit,
        currentBalance: r.current_balance,
        pendingInvoices: r.pending_invoices,
        totalDue: r.total_due || 0,
        oldestDueDate: r.oldest_due_date,
        daysOverdue: Math.round(r.days_overdue || 0),
      }));

      return { success: true, data: { data, total } };
    } catch (error: any) {
      console.error('Get outstanding report error:', error);
      return { success: false, message: 'Failed to get outstanding report: ' + error.message };
    }
  }

  // ============================================
  // STOCK REPORT
  // ============================================

  getStockReport(): ApiResponse<{ data: StockReportItem[]; summary: { totalValue: number; totalItems: number } }> {
    try {
      const items = this.db.prepare(`
        SELECT
        id,
          code,
          name,
          category,
          quantity_in_stock,
          average_cost,
          selling_price,
          (quantity_in_stock * average_cost) as stock_value,
          (quantity_in_stock * selling_price) as potential_revenue,
          reorder_level,
          CASE 
            WHEN quantity_in_stock <= 0 THEN 'Out of Stock'
            WHEN quantity_in_stock <= reorder_level THEN 'Low Stock'
            ELSE 'In Stock'
        END as stock_status
        FROM items
        WHERE is_active = 1
        ORDER BY name
          `).all();

      const summary = this.db.prepare(`
        SELECT
        COALESCE(SUM(quantity_in_stock * average_cost), 0) as total_value,
          COUNT(*) as total_items
        FROM items
        WHERE is_active = 1
          `).get();

      const data: StockReportItem[] = (items as any[]).map(i => ({
        id: i.id,
        code: i.code,
        name: i.name,
        category: i.category,
        quantityInStock: i.quantity_in_stock,
        averageCost: i.average_cost,
        sellingPrice: i.selling_price,
        stockValue: i.stock_value,
        potentialRevenue: i.potential_revenue,
        reorderLevel: i.reorder_level,
        stockStatus: i.stock_status,
      }));

      return {
        success: true,
        data: {
          data,
          summary: {
            totalValue: (summary as any)?.total_value || 0,
            totalItems: (summary as any)?.total_items || 0
          }
        }
      };
    } catch (error: any) {
      console.error('Get stock report error:', error);
      return { success: false, message: 'Failed to get stock report: ' + error.message };
    }
  }

  // ============================================
  // SALES REPORT
  // ============================================

  getSalesReport(startDate: string, endDate: string): ApiResponse<any> {
    try {
      // Summary
      const summary = this.db.prepare(`
        SELECT
        COUNT(*) as total_transactions,
          COALESCE(SUM(net_amount), 0) as total_sales,
          COALESCE(SUM(gst_amount), 0) as total_gst,
          COALESCE(AVG(net_amount), 0) as average_sale
        FROM transactions
        WHERE type = 'sale' AND date BETWEEN ? AND ? AND is_void = 0
          `).get(startDate, endDate);

      // Daily breakdown
      const dailyBreakdown = this.db.prepare(`
        SELECT
        date,
          COUNT(*) as transactions,
          COALESCE(SUM(net_amount), 0) as total_sales,
          COALESCE(SUM(gst_amount), 0) as total_gst
        FROM transactions
        WHERE type = 'sale' AND date BETWEEN ? AND ? AND is_void = 0
        GROUP BY date
        ORDER BY date
          `).all(startDate, endDate);

      // Top items
      const topItems = this.db.prepare(`
        SELECT
        i.id,
          i.name,
          SUM(ii.quantity) as total_quantity,
          SUM(ii.total_amount) as total_revenue
        FROM invoice_items ii
        JOIN items i ON ii.item_id = i.id
        JOIN invoices inv ON ii.invoice_id = inv.id
        WHERE inv.date BETWEEN ? AND ? AND inv.is_void = 0
        GROUP BY i.id
        ORDER BY total_revenue DESC
        LIMIT 10
          `).all(startDate, endDate);

      // Top customers
      const topCustomers = this.db.prepare(`
        SELECT
        c.id,
          c.name,
          COUNT(t.id) as total_transactions,
          SUM(t.net_amount) as total_purchases
        FROM transactions t
        JOIN contacts c ON t.contact_id = c.id
        WHERE t.type = 'sale' AND t.date BETWEEN ? AND ? AND t.is_void = 0
        GROUP BY c.id
        ORDER BY total_purchases DESC
        LIMIT 10
          `).all(startDate, endDate);

      // Raw transactions list for details table
      const transactions = this.db.prepare(`
        SELECT
        t.*,
          c.name as contact_name
        FROM transactions t
        LEFT JOIN contacts c ON t.contact_id = c.id
        WHERE t.type = 'sale' AND t.date BETWEEN ? AND ? AND t.is_void = 0
        ORDER BY t.date DESC
          `).all(startDate, endDate);

      return {
        success: true,
        data: {
          summary: summary as any,
          dailyBreakdown: dailyBreakdown as any[],
          topItems: topItems as any[],
          topCustomers: topCustomers as any[],
          transactions: transactions.map(t => this.mapTransactionFromDb(t))
        }
      };
    } catch (error: any) {
      console.error('Get sales report error:', error);
      return { success: false, message: 'Failed to get sales report: ' + error.message };
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private getAccountBalance(accountCode: string): number {
    try {
      const result = this.db.prepare(`
        SELECT COALESCE(SUM(tl.debit_amount - tl.credit_amount), 0) as balance
        FROM transaction_lines tl
        JOIN accounts a ON tl.account_id = a.id
        JOIN transactions t ON tl.transaction_id = t.id AND t.is_void = 0
        WHERE a.code = ?
          `).get(accountCode);

      return (result as any)?.balance || 0;
    } catch (error) {
      console.error('Get account balance error:', error);
      return 0;
    }
  }

  private mapItemFromDb(row: any): any {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      category: row.category,
      unit: row.unit,
      purchasePrice: row.purchase_price,
      sellingPrice: row.selling_price,
      averageCost: row.average_cost,
      quantityInStock: row.quantity_in_stock,
      reorderLevel: row.reorder_level,
      gstApplicable: row.gst_applicable === 1,
      gstRate: row.gst_rate,
      isActive: row.is_active === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapTransactionFromDb(row: any): any {
    return {
      id: row.id,
      transactionNo: row.transaction_no,
      type: row.type,
      date: row.date,
      reference: row.reference,
      contactId: row.contact_id,
      contactName: row.contact_name,
      description: row.description,
      totalAmount: row.total_amount,
      gstAmount: row.gst_amount,
      discountAmount: row.discount_amount,
      netAmount: row.net_amount,
      paymentMode: row.payment_mode,
      status: row.status,
      isVoid: row.is_void === 1,
      createdAt: row.created_at,
    };
  }
}
