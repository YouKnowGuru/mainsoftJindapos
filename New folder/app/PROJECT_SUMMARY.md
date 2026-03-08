# Dhisum Tseyig - Project Summary

## Overview
**Dhisum Tseyig** is a complete offline-first desktop accounting and POS system designed specifically for Bhutanese small businesses. It enforces strict double-entry bookkeeping while providing a simple, intuitive interface for non-accountants.

## Project Structure

```
dhisum-tseyig/
├── electron/                    # Electron main process
│   ├── main.ts                 # Main entry point - window creation, IPC handlers
│   └── preload.ts              # Preload script - secure API exposure
│
├── src/
│   ├── components/             # React components
│   │   ├── ui/                # shadcn/ui components (40+ pre-installed)
│   │   ├── Sidebar.tsx        # Navigation sidebar
│   │   ├── Header.tsx         # Top header with user info
│   │   ├── Notification.tsx   # Toast notifications
│   │   └── Loader.tsx         # Loading spinner
│   │
│   ├── database/               # Database layer
│   │   └── DatabaseManager.ts # SQLite schema & initialization
│   │
│   ├── pages/                  # Main application pages
│   │   ├── LoginPage.tsx      # Authentication
│   │   ├── DashboardPage.tsx  # Overview with metrics
│   │   ├── POSPage.tsx        # Point of Sale interface
│   │   ├── InventoryPage.tsx  # Stock management
│   │   ├── ContactsPage.tsx   # Customers & Suppliers
│   │   ├── TransactionsPage.tsx # Money in/out/transfer
│   │   ├── GSTPage.tsx        # GST management (5%)
│   │   ├── ReportsPage.tsx    # Financial reports
│   │   └── SettingsPage.tsx   # System configuration
│   │
│   ├── services/               # Business logic layer
│   │   ├── AccountingService.ts   # Double-entry transactions
│   │   ├── InventoryService.ts    # Stock & COGS
│   │   ├── GSTService.ts          # GST calculations
│   │   ├── ReportService.ts       # Financial reports
│   │   ├── PrintingService.ts     # Invoice/receipt printing
│   │   └── BackupService.ts       # Backup & restore
│   │
│   ├── store/                  # State management
│   │   └── appStore.ts        # Zustand store
│   │
│   ├── types/                  # TypeScript definitions
│   │   └── index.ts           # All type definitions
│   │
│   ├── App.tsx                 # Main App component with routing
│   ├── main.tsx                # React entry point
│   └── index.css               # Global styles + Tailwind
│
├── build/                      # Build resources
├── dist/                       # Built React app (generated)
├── dist-electron/              # Compiled Electron code (generated)
├── release/                    # Packaged application (generated)
│
├── package.json                # Dependencies & build config
├── vite.config.ts              # Vite configuration
├── tsconfig.json               # TypeScript config
├── tsconfig.electron.json      # Electron TypeScript config
├── tailwind.config.js          # Tailwind CSS config
├── build.sh                    # Build script
└── README.md                   # Documentation
```

## Key Features Implemented

### 1. Authentication System
- Password hashing with bcrypt
- Role-based access (Admin/Staff)
- Session management
- Default login: admin/admin123

### 2. Double-Entry Accounting Engine
- **Strict validation**: Debits must equal Credits
- **Auto ledger creation**: For customers and suppliers
- **Transaction types**: Sales, Purchases, Receipts, Payments, Transfers
- **Void support**: With automatic reversal entries
- **Period locking**: Prevent changes to closed periods

### 3. POS System
- Quick product search
- Barcode-ready interface
- Cart management with quantity controls
- Multiple payment modes (Cash, Bank, UPI, Card, Credit)
- **Credit limit checking**: Automatic validation
- **GST auto-calculation**: 5% Bhutan GST
- Thermal receipt printing support

### 4. Inventory Management
- **Average cost method**: Automatic COGS calculation
- Stock level tracking
- Low stock alerts
- Purchase order integration
- Stock adjustments

### 5. GST Management (Bhutan 5%)
- Auto GST Input/Output tracking
- Monthly GST summary
- GST return reports
- Tax invoice generation

### 6. Financial Reports
- **Trial Balance**: Real-time account balances
- **Profit & Loss**: Revenue and expense analysis
- **Balance Sheet**: Assets, liabilities, equity
- **Outstanding Report**: Receivables and payables with aging
- **Stock Report**: Inventory valuation
- **Sales Report**: Daily/monthly breakdown

### 7. Backup & Security
- Daily automatic backups
- Manual backup/restore
- Audit logging
- Data encryption

## Database Schema

### Core Tables
1. **users** - Authentication
2. **companies** - Business information
3. **accounts** - Chart of accounts (pre-configured)
4. **contacts** - Customers & suppliers
5. **items** - Products with stock tracking
6. **transactions** - Financial transactions header
7. **transaction_lines** - Double-entry lines (source of truth)
8. **stock_movements** - Inventory changes
9. **invoices** - Sales invoices
10. **invoice_items** - Invoice line items
11. **gst_entries** - GST tracking
12. **audit_logs** - Activity tracking
13. **settings** - System configuration
14. **period_locks** - Month-end closing

### Pre-configured Chart of Accounts
```
1000 - Assets
  1100 - Cash on Hand
  1200 - Bank Accounts
  1300 - Debtors
  1400 - Inventory
  1500 - GST Input
2000 - Liabilities
  2100 - Creditors
  2200 - GST Output
  2300 - GST Payable
3000 - Capital
  3100 - Retained Earnings
  3200 - Drawings
4000 - Sales Revenue
4100 - Other Income
5000 - Cost of Goods Sold
6000 - Operating Expenses
```

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + TypeScript |
| Styling | Tailwind CSS 3.4 |
| UI Components | shadcn/ui (40+ components) |
| State | Zustand |
| Desktop | Electron 40 |
| Database | SQLite (better-sqlite3) |
| Build | Vite |
| Packaging | electron-builder |

## Build Instructions

### Development
```bash
# Install dependencies
npm install

# Run React dev server
npm run dev

# In another terminal, run Electron
npm run electron:dev
```

### Production Build
```bash
# Build Windows installer
npm run dist:win

# Or use the build script
./build.sh
```

### Output Files
- `release/Dhisum Tseyig Setup.exe` - Windows installer
- `release/DhisumTseyig-Portable.exe` - Portable version

## IPC Communication

The preload script exposes these APIs to the renderer:

### Authentication
- `auth.login(credentials)`
- `auth.logout()`
- `auth.getCurrentUser()`

### Dashboard
- `dashboard.getData()`

### POS
- `pos.createSale(saleData)`
- `pos.getItems()`
- `pos.searchItems(query)`
- `pos.getCustomers()`

### Inventory
- `inventory.addStock(stockData)`
- `inventory.getItems()`
- `inventory.getLowStock()`

### Contacts
- `contacts.getAll(type)`
- `contacts.create(data)`
- `contacts.getLedger(contactId)`

### Transactions
- `transactions.receiveMoney(data)`
- `transactions.payMoney(data)`
- `transactions.transfer(data)`
- `transactions.void(id, reason)`

### GST
- `gst.getSummary(month, year)`
- `gst.getReturns()`

### Reports
- `reports.trialBalance(date)`
- `reports.profitLoss(startDate, endDate)`
- `reports.balanceSheet(date)`
- `reports.outstanding(type)`
- `reports.stockReport()`
- `reports.salesReport(startDate, endDate)`

### Printing
- `print.invoice(invoiceData)`
- `print.thermalReceipt(receiptData)`

### Backup
- `backup.create()`
- `backup.restore()`

## Success Criteria Met

✅ **100% Offline-first** - SQLite database, no internet required
✅ **Hide accounting complexity** - Simple event-based UI
✅ **Strict double-entry** - Enforced at database level
✅ **Auto ledger creation** - Customers/suppliers auto-mapped
✅ **Auto GST 5%** - Bhutan GST compliance
✅ **Thermal printing** - Receipt printing support
✅ **Windows installer** - electron-builder configured
✅ **Credit control** - Limit checking with warnings
✅ **Dashboard** - Auto-calculated metrics
✅ **Backup system** - Daily auto + manual backup

## Next Steps for Production

1. **Add application icon** - Create icon.ico in build folder
2. **Test on Windows** - Run the installer on target machines
3. **Configure printers** - Set up thermal printer drivers
4. **Train users** - Document workflows for staff
5. **Data migration** - Import existing business data
6. **Customize branding** - Update company info in settings

## Support

For issues or feature requests:
- Review README.md for troubleshooting
- Check logs in `%APPDATA%/Dhisum Tseyig/logs`
- Contact support team

---

**Built for Bhutanese Businesses** 🇧🇹
