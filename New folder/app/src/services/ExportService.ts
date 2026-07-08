import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type {
  TrialBalanceItem,
  ProfitLossData,
  BalanceSheetData,
  OutstandingItem,
  StockReportItem,
  Transaction,
  Contact,
  Item,
  Expense,
  Refund,
  PurchaseOrder,
  Quotation,
  Employee,
  AgedReport,
} from '../types';


export class ExportService {
  /**
   * Export Trial Balance to Excel
   */
  exportTrialBalance(data: TrialBalanceItem[], asOfDate: string): void {
    const wsData = [
      ['Trial Balance', `As of ${asOfDate}`],
      [],
      ['Code', 'Account Name', 'Debit', 'Credit'],
      ...data.map(item => [item.code, item.name, item.debit, item.credit]),
      [],
      ['Total', '', data.reduce((s, i) => s + i.debit, 0), data.reduce((s, i) => s + i.credit, 0)],
    ];
    this.exportToExcel(wsData, 'Trial_Balance');
  }

  /**
   * Export Profit & Loss to Excel
   */
  exportProfitLoss(data: ProfitLossData): void {
    const wsData = [
      ['Profit & Loss Statement'],
      [],
      ['Revenue'],
      ['Sales', data.revenue.sales],
      ['Other Income', data.revenue.otherIncome],
      ['Total Revenue', data.revenue.total],
      [],
      ['Expenses'],
      ['Cost of Goods Sold', data.expenses.cogs],
      ['Operating Expenses', data.expenses.operating],
      ['Other Expenses', data.expenses.other],
      ['Total Expenses', data.expenses.total],
      [],
      ['Gross Profit', data.grossProfit],
      ['Net Profit', data.netProfit],
    ];
    this.exportToExcel(wsData, 'Profit_Loss');
  }

  /**
   * Export Balance Sheet to Excel
   */
  exportBalanceSheet(data: BalanceSheetData): void {
    const wsData = [
      ['Balance Sheet'],
      [],
      ['Assets'],
      ['Current Assets', ...data.assets.current.map(a => a.balance)],
      ['Fixed Assets', ...data.assets.fixed.map(a => a.balance)],
      ['Total Assets', data.assets.total],
      [],
      ['Liabilities'],
      ['Current Liabilities', ...data.liabilities.current.map(l => l.balance)],
      ['Long Term Liabilities', ...data.liabilities.longTerm.map(l => l.balance)],
      ['Total Liabilities', data.liabilities.total],
      [],
      ['Equity'],
      ...data.equity.map(e => [e.name, e.balance]),
      ['Total Equity + Liabilities', data.totalEquity],
    ];
    this.exportToExcel(wsData, 'Balance_Sheet');
  }

  /**
   * Export Outstanding Report to Excel
   */
  exportOutstanding(data: OutstandingItem[]): void {
    const wsData = [
      ['Outstanding Report'],
      [],
      ['Name', 'Type', 'Current Balance', 'Total Due', 'Days Overdue'],
      ...data.map(item => [item.name, item.type, item.currentBalance, item.totalDue, item.daysOverdue]),
    ];
    this.exportToExcel(wsData, 'Outstanding');
  }

  /**
   * Export Stock Report to Excel
   */
  exportStockReport(data: StockReportItem[]): void {
    const wsData = [
      ['Stock Report'],
      [],
      ['Item Name', 'Category', 'Stock', 'Value', 'Reorder Level', 'Status'],
      ...data.map(item => [item.name, item.category || '', item.quantityInStock, item.stockValue, item.reorderLevel, item.stockStatus]),
    ];
    this.exportToExcel(wsData, 'Stock_Report');
  }

  /**
   * Export Sales Report to Excel
   */
  exportSalesReport(sales: Transaction[], summary: any): void {
    const wsData = [
      ['Sales Report'],
      ['Total Sales', summary.total_sales],
      ['Total Transactions', summary.total_transactions],
      [],
      ['#', 'Date', 'Type', 'Contact', 'Amount', 'Payment Mode', 'Status'],
      ...sales.map(s => [s.transactionNo, s.date, s.type, s.contactName || '', s.netAmount, s.paymentMode, s.status]),
    ];
    this.exportToExcel(wsData, 'Sales_Report');
  }

  /**
   * Export any data to Excel
   */
  exportToExcel(data: any[][], filename: string): void {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, `${filename}.xlsx`);
  }

  /**
   * Export Transactions to Excel
   */
  exportTransactions(transactions: Transaction[], filename: string = 'Transactions'): void {
    const wsData = [
      ['Transaction Register'],
      [],
      ['#', 'Date', 'Type', 'Contact', 'Amount', 'Payment', 'Status'],
      ...transactions.map((t) => [t.transactionNo, t.date, t.type, t.contactName || '-', t.netAmount, t.paymentMode || '', t.status]),
    ];
    this.exportToExcel(wsData, filename);
  }

  /**
   * Export Contacts to Excel
   */
  exportContacts(contacts: Contact[], filename: string = 'Contacts'): void {
    const wsData = [
      ['Contacts'],
      [],
      ['Name', 'Type', 'Phone', 'Email', 'Credit Limit', 'Balance', 'GST/TPN/CID'],
      ...contacts.map(c => [c.name, c.type, c.phone || '', c.email || '', c.creditLimit, c.currentBalance, c.gstNumber || '']),
    ];
    this.exportToExcel(wsData, filename);
  }

  /**
   * Export Items to Excel
   */
  exportItems(items: Item[], filename: string = 'Items'): void {
    const wsData = [
      ['Items Inventory'],
      [],
      ['Code', 'Name', 'Category', 'Purchase Price', 'Selling Price', 'Stock', 'Reorder'],
      ...items.map(i => [i.code, i.name, i.category || '', i.purchasePrice, i.sellingPrice, i.quantityInStock, i.reorderLevel]),
    ];
    this.exportToExcel(wsData, filename);
  }

  /**
   * Export Expenses to Excel
   */
  exportExpenses(expenses: Expense[], filename: string = 'Expenses'): void {
    const wsData = [
      ['Expense Register'],
      [],
      ['#', 'Date', 'Category', 'Amount', 'Payment Mode', 'Vendor', 'Description'],
      ...expenses.map((e) => [e.expenseNo, e.date, e.category, e.amount, e.paymentMode || '', e.vendor || '', e.description || '']),
    ];
    this.exportToExcel(wsData, filename);
  }

  /**
   * Export Purchase Orders to Excel
   */
  exportPurchaseOrders(orders: PurchaseOrder[], filename: string = 'Purchase_Orders'): void {
    const wsData = [
      ['Purchase Orders'],
      [],
      ['PO No', 'Supplier', 'Date', 'Status', 'Total'],
      ...orders.map(o => [o.poNo, o.supplierName || '', o.date, o.status, o.totalAmount]),
    ];
    this.exportToExcel(wsData, filename);
  }

  /**
   * Export Quotations to Excel
   */
  exportQuotations(quotes: Quotation[], filename: string = 'Quotations'): void {
    const wsData = [
      ['Quotations'],
      [],
      ['Quote No', 'Customer', 'Date', 'Expiry', 'Status', 'Total'],
      ...quotes.map(q => [q.quoteNo, q.customerName || '', q.date, q.expiryDate || '', q.status, q.totalAmount]),
    ];
    this.exportToExcel(wsData, filename);
  }

  /**
   * Export Refunds to Excel
   */
  exportRefunds(refunds: Refund[], filename: string = 'Refunds'): void {
    const wsData = [
      ['Refund Register'],
      [],
      ['Refund No', 'Date', 'Customer', 'Reason', 'Mode', 'Amount'],
      ...refunds.map(r => [r.refundNo, r.date, r.customerName || '', r.reason, r.refundMode, r.totalAmount]),
    ];
    this.exportToExcel(wsData, filename);
  }

  /**
   * Export Employees to Excel
   */
  exportEmployees(employees: any[], filename: string = 'Employees'): void {
    const wsData = [
      ['Employee Register'],
      [],
      ['Emp No', 'Name', 'Position', 'Department', 'Phone', 'Email', 'Salary', 'PF Rate', 'TDS Rate', 'GIS Amount', 'HC Rate', 'Join Date', 'Status'],
      ...employees.map(e => [
        e.employee_no || e.employeeNo || '',
        e.name || '',
        e.position || '',
        e.department || '',
        e.phone || '',
        e.email || '',
        e.salary || 0,
        e.pf_rate || 0,
        e.tds_rate || 0,
        e.gis_amount || 0,
        e.hc_rate || 0,
        e.join_date || e.joinDate || '',
        e.is_active === 1 ? 'Active' : 'Inactive'
      ]),
    ];
    this.exportToExcel(wsData, filename);
  }

  /**
   * Export Aged Receivables to Excel
   */
  exportAgedReceivables(report: AgedReport): void {
    const wsData = [
      ['Aged Receivables', `As of ${report.asOfDate}`],
      [],
      ['Customer', 'Current', '31-60 Days', '61-90 Days', 'Over 90', 'Total'],
      ...report.entries.map(e => [e.name, e.current, e.days31_60, e.days61_90, e.over90, e.total]),
      [],
      ['Total', report.totalCurrent, report.total31_60, report.total61_90, report.totalOver90, report.grandTotal],
    ];
    this.exportToExcel(wsData, 'Aged_Receivables');
  }

  /**
   * Export Aged Payables to Excel
   */
  exportAgedPayables(report: AgedReport): void {
    const wsData = [
      ['Aged Payables', `As of ${report.asOfDate}`],
      [],
      ['Supplier', 'Current', '31-60 Days', '61-90 Days', 'Over 90', 'Total'],
      ...report.entries.map(e => [e.name, e.current, e.days31_60, e.days61_90, e.over90, e.total]),
      [],
      ['Total', report.totalCurrent, report.total31_60, report.total61_90, report.totalOver90, report.grandTotal],
    ];
    this.exportToExcel(wsData, 'Aged_Payables');
  }

  /**
   * Export any report to PDF using jsPDF
   */
  exportToPDF(title: string, headers: string[], rows: string[][], filename: string): void {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text(title, 14, 20);
    doc.setFontSize(10);
    doc.text('Jinda POS', 14, 27);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 33);

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 40,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [155, 35, 53] },
    });

    doc.save(`${filename}.pdf`);
  }
}

export const exportService = new ExportService();
