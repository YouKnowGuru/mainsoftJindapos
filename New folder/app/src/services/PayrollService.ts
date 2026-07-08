import Database from 'better-sqlite3';
import { DatabaseManager } from '../database/DatabaseManager';
import { AccountingEngineService } from './AccountingEngineService';
import { AutomationService } from './AutomationService';
import { AuditService } from './AuditService';
import { format } from 'date-fns';
import type { ApiResponse, PaymentMode } from '../types';

export interface PayrollProcessingData {
  month: string;
  year: string;
  paymentMode: PaymentMode;
  userId: number;
}

export class PayrollService {
  private db: Database.Database;
  private dbManager: DatabaseManager;
  private accountingEngine: AccountingEngineService;
  private automationService: AutomationService;
  private audit: AuditService;

  constructor(dbManager: DatabaseManager) {
    this.dbManager = dbManager;
    this.db = dbManager.getDatabase();
    this.accountingEngine = new AccountingEngineService(dbManager);
    this.automationService = new AutomationService(dbManager);
    this.audit = new AuditService(dbManager);
  }

  /**
   * Process payroll for all active employees for a given month/year
   */
  async processMonthlyPayroll(data: PayrollProcessingData): Promise<ApiResponse> {
    const { month, year, paymentMode, userId } = data;

    return this.dbManager.safeTransaction(() => {
      try {
        // 1. Get all active employees
        const employees = this.db.prepare('SELECT * FROM employees WHERE is_active = 1').all() as any[];

        if (employees.length === 0) {
          return { success: false, message: 'No active employees found. Add employees first before processing payroll.' };
        }

        // Verify accounts exist
        // Verify accounts exist
        const salaryAccount = this.db.prepare("SELECT id FROM accounts WHERE code = '6200'").get() as any;
        const cashAccount = this.db.prepare("SELECT id FROM accounts WHERE code = '1100'").get() as any;
        const bankAccount = this.db.prepare("SELECT id FROM accounts WHERE code = '1200'").get() as any;
        
        // Liability accounts for deductions
        const pfAccount = this.db.prepare("SELECT id FROM accounts WHERE code = '2400'").get() as any;
        const tdsAccount = this.db.prepare("SELECT id FROM accounts WHERE code = '2500'").get() as any;
        const gisAccount = this.db.prepare("SELECT id FROM accounts WHERE code = '2600'").get() as any;
        const hcAccount = this.db.prepare("SELECT id FROM accounts WHERE code = '2700'").get() as any;

        if (!salaryAccount) {
          return { success: false, message: 'Account 6200 (Salary Expense) not found. Please set up your chart of accounts.' };
        }
        if (paymentMode === 'cash' && !cashAccount) {
          return { success: false, message: 'Account 1100 (Cash) not found. Please set up your chart of accounts.' };
        }
        if (paymentMode !== 'cash' && !bankAccount) {
          return { success: false, message: 'Account 1200 (Bank) not found. Please set up your chart of accounts.' };
        }

        let processedCount = 0;
        let totalAmount = 0;

        for (const employee of employees) {
          if (!employee.salary || employee.salary <= 0) {
            return { success: false, message: `Employee "${employee.name}" has no salary set. Please add a salary before processing payroll.` };
          }

          // Check if already paid for this month/year
          const existing = this.db.prepare(`
            SELECT id FROM payroll_payments
            WHERE employee_id = ? AND month = ? AND year = ? AND status != 'void'
          `).get(employee.id, month, year);

          if (existing) continue;

          // --- CALCULATE DEDUCTIONS ---
          const grossSalary = employee.salary;
          const pfAmount = Math.round((grossSalary * (employee.pf_rate || 0) / 100) * 100) / 100;
          const tdsAmount = Math.round((grossSalary * (employee.tds_rate || 0) / 100) * 100) / 100;
          const hcAmount = Math.round((grossSalary * (employee.hc_rate || 0) / 100) * 100) / 100;
          const gisAmount = employee.gis_amount || 0;
          
          const totalDeductions = pfAmount + tdsAmount + hcAmount + gisAmount;
          const netSalary = grossSalary - totalDeductions;

          // 2. Prepare Accounting Transaction
          let creditAccount: number;
          try {
            const mapping = this.automationService.mapAccounts('payroll', paymentMode);
            creditAccount = mapping.creditAccount;
          } catch (error: any) {
            return { success: false, message: `Payroll account configuration error: ${error.message}. Please check your payment mode or contact support.` };
          }

          const description = `Salary Payment: ${employee.name} (${month} ${year})`;

          // Prepare transaction lines
          const lines: any[] = [
            {
              accountId: salaryAccount.id,
              description: `Salary Expense - ${employee.name} (Gross)`,
              debitAmount: grossSalary,
              creditAmount: 0
            }
          ];

          // Add liability lines for deductions if they exist
          if (pfAmount > 0 && pfAccount) {
            lines.push({ accountId: pfAccount.id, description: `PF Deduction - ${employee.name}`, debitAmount: 0, creditAmount: pfAmount });
          }
          if (tdsAmount > 0 && tdsAccount) {
            lines.push({ accountId: tdsAccount.id, description: `TDS Deduction - ${employee.name}`, debitAmount: 0, creditAmount: tdsAmount });
          }
          if (gisAmount > 0 && gisAccount) {
            lines.push({ accountId: gisAccount.id, description: `GIS Deduction - ${employee.name}`, debitAmount: 0, creditAmount: gisAmount });
          }
          if (hcAmount > 0 && hcAccount) {
            lines.push({ accountId: hcAccount.id, description: `HC Deduction - ${employee.name}`, debitAmount: 0, creditAmount: hcAmount });
          }

          // Final credit to cash/bank (Net Salary)
          lines.push({
            accountId: creditAccount,
            description: `Salary Payment (Net) - ${employee.name}`,
            debitAmount: 0,
            creditAmount: netSalary
          });

          const result = this.accountingEngine.executePipeline({
            type: 'payment',
            date: format(new Date(), 'yyyy-MM-dd'),
            description,
            subtotal: grossSalary,
            gstAmount: 0,
            discountAmount: 0,
            netAmount: grossSalary, // Total transaction volume is Gross
            paymentMode: paymentMode,
            createdBy: userId,
            lines: lines
          });

          if (!result.success) {
            throw new Error(`Accounting failure for ${employee.name}: ${result.message}`);
          }

          // 3. Record Payroll Payment with breakdown
          this.db.prepare(`
            INSERT INTO payroll_payments (
              employee_id, transaction_id, month, year, amount, 
              gross_salary, pf_amount, tds_amount, gis_amount, hc_amount, net_salary,
              payment_mode, date
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            employee.id, result.data.transactionId, month, year, netSalary,
            grossSalary, pfAmount, tdsAmount, gisAmount, hcAmount, netSalary,
            paymentMode, format(new Date(), 'yyyy-MM-dd')
          );

          processedCount++;
          totalAmount += netSalary;

          this.audit.logAction({
            userId: data.userId,
            action: 'PAYROLL_PROCESSED',
            entityType: 'employees',
            entityId: employee.id,
            newValues: { month, year, gross: grossSalary, net: netSalary, deductions: totalDeductions, paymentMode }
          });
        }

        if (processedCount === 0) {
          return { success: true, message: 'Payroll already processed for all staff for this period' };
        }

        return {
          success: true,
          message: `Successfully processed payroll for ${processedCount} employees. Total: Nu. ${totalAmount.toFixed(2)}`
        };
      } catch (error: any) {
        console.error('[PayrollService] Process failed:', error);
        throw error; // safeTransaction will rollback
      }
    });
  }

  /**
   * Get payroll history
   */
  getHistory(): ApiResponse<any[]> {
    try {
      const history = this.db.prepare(`
        SELECT p.*, e.name as employee_name, e.employee_no, t.transaction_no
        FROM payroll_payments p
        JOIN employees e ON p.employee_id = e.id
        JOIN transactions t ON p.transaction_id = t.id
        ORDER BY p.date DESC
      `).all();
      return { success: true, data: history as any[] };
    } catch (error: any) {
      return { success: false, message: 'Failed to fetch history: ' + error.message };
    }
  }

  /**
   * Get employee payment history
   */
  getEmployeeHistory(employeeId: number): ApiResponse<any[]> {
    try {
      const history = this.db.prepare(`
        SELECT p.*, t.transaction_no
        FROM payroll_payments p
        JOIN transactions t ON p.transaction_id = t.id
        WHERE p.employee_id = ?
        ORDER BY p.date DESC
      `).all(employeeId);
      return { success: true, data: history as any[] };
    } catch (error: any) {
      return { success: false, message: 'Failed to fetch history: ' + error.message };
    }
  }
}
