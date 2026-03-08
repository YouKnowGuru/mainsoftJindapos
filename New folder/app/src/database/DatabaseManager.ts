import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

/**
 * DatabaseManager - Handles all database operations for Dhisum Tseyig
 * Uses SQLite with better-sqlite3 for synchronous, high-performance operations
 */
export class DatabaseManager {
  private db: Database.Database;

  constructor(dbPath: string) {
    // Ensure directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Open database with WAL mode for better performance
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');

    // Initialize schema and seed data
    this.initializeSchema();
    this.seedDefaultData();
    this.runMigrations(); // IMPORTANT: Run migrations after base schema is initialized
  }

  /**
   * Get the database instance for direct queries
   */
  getDatabase(): Database.Database {
    return this.db;
  }

  /**
   * Close the database connection
   */
  close(): void {
    this.db.close();
  }

  /**
   * Initialize all database tables
   */
  private initializeSchema(): void {
    // Users table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Companies table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS companies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        trade_license_no TEXT,
        tax_no TEXT,
        address TEXT,
        phone TEXT,
        email TEXT,
        default_gst_rate REAL DEFAULT 5.0,
        invoice_prefix TEXT DEFAULT 'DT',
        financial_year_start INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Accounts table (Chart of Accounts)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('asset', 'liability', 'equity', 'income', 'expense')),
        subtype TEXT NOT NULL CHECK (subtype IN ('current_asset', 'fixed_asset', 'current_liability', 'long_term_liability', 'equity', 'revenue', 'cogs', 'operating_expense', 'other_income', 'other_expense')),
        parent_id INTEGER,
        is_system INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES accounts(id)
      )
    `);

    // Contacts table (Customers & Suppliers)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL CHECK (type IN ('customer', 'supplier')),
        name TEXT NOT NULL,
        contact_person TEXT,
        phone TEXT,
        email TEXT,
        address TEXT,
        credit_limit REAL DEFAULT 0,
        credit_days INTEGER DEFAULT 0,
        opening_balance REAL DEFAULT 0,
        current_balance REAL DEFAULT 0,
        gst_number TEXT,
        is_active INTEGER DEFAULT 1,
        account_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (account_id) REFERENCES accounts(id)
      )
    `);

    // Items table (Products/Inventory)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT,
        unit TEXT DEFAULT 'pcs',
        purchase_price REAL DEFAULT 0,
        selling_price REAL DEFAULT 0,
        average_cost REAL DEFAULT 0,
        quantity_in_stock REAL DEFAULT 0,
        reorder_level REAL DEFAULT 10,
        gst_applicable INTEGER DEFAULT 1,
        gst_rate REAL DEFAULT 5.0,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Transactions table - Base schema (fallback/new installations)
    // Note: Included 'upi' in CHECK constraint for historical data compatibility
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_no TEXT UNIQUE NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('sale', 'purchase', 'receipt', 'payment', 'transfer', 'adjustment', 'journal')),
        date DATE NOT NULL,
        reference TEXT,
        contact_id INTEGER,
        description TEXT,
        total_amount REAL NOT NULL DEFAULT 0,
        gst_amount REAL DEFAULT 0,
        discount_amount REAL DEFAULT 0,
        net_amount REAL NOT NULL DEFAULT 0,
        payment_mode TEXT CHECK (payment_mode IN ('cash', 'bank', 'credit', 'card', 'upi', 'mBOB', 'BNB', 'TPay', 'DrukPNB', 'BDBL', 'DKBank')),
        status TEXT DEFAULT 'completed' CHECK (status IN ('draft', 'completed', 'void')),
        is_void INTEGER DEFAULT 0,
        void_reason TEXT,
        voided_at DATETIME,
        voided_by INTEGER,
        invoice_id INTEGER,
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (contact_id) REFERENCES contacts(id),
        FOREIGN KEY (created_by) REFERENCES users(id),
        FOREIGN KEY (voided_by) REFERENCES users(id)
      )
    `);

    // Transaction Lines table (Double Entry)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS transaction_lines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id INTEGER NOT NULL,
        account_id INTEGER NOT NULL,
        contact_id INTEGER,
        item_id INTEGER,
        description TEXT,
        debit_amount REAL DEFAULT 0,
        credit_amount REAL DEFAULT 0,
        gst_amount REAL DEFAULT 0,
        gst_type TEXT CHECK (gst_type IN ('input', 'output')),
        FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
        FOREIGN KEY (account_id) REFERENCES accounts(id),
        FOREIGN KEY (contact_id) REFERENCES contacts(id),
        FOREIGN KEY (item_id) REFERENCES items(id)
      )
    `);

    // Stock Movements table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS stock_movements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id INTEGER NOT NULL,
        transaction_id INTEGER,
        type TEXT NOT NULL CHECK (type IN ('in', 'out', 'adjustment')),
        quantity REAL NOT NULL,
        unit_cost REAL,
        total_cost REAL,
        reference TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (item_id) REFERENCES items(id),
        FOREIGN KEY (transaction_id) REFERENCES transactions(id)
      )
    `);

    // Invoices table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_no TEXT UNIQUE NOT NULL,
        transaction_id INTEGER,
        contact_id INTEGER,
        date DATE NOT NULL,
        due_date DATE,
        subtotal REAL DEFAULT 0,
        gst_amount REAL DEFAULT 0,
        discount_amount REAL DEFAULT 0,
        total_amount REAL DEFAULT 0,
        amount_paid REAL DEFAULT 0,
        balance_due REAL DEFAULT 0,
        payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid', 'overdue')),
        is_printed INTEGER DEFAULT 0,
        print_count INTEGER DEFAULT 0,
        is_void INTEGER DEFAULT 0,
        notes TEXT,
        terms TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (transaction_id) REFERENCES transactions(id),
        FOREIGN KEY (contact_id) REFERENCES contacts(id)
      )
    `);

    // Invoice Items table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS invoice_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_id INTEGER NOT NULL,
        item_id INTEGER,
        description TEXT NOT NULL,
        quantity REAL NOT NULL,
        unit_price REAL NOT NULL,
        gst_rate REAL DEFAULT 5.0,
        gst_amount REAL DEFAULT 0,
        total_amount REAL NOT NULL,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
        FOREIGN KEY (item_id) REFERENCES items(id)
      )
    `);

    // GST Entries table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS gst_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id INTEGER NOT NULL,
        transaction_line_id INTEGER,
        type TEXT NOT NULL CHECK (type IN ('input', 'output')),
        amount REAL NOT NULL,
        rate REAL DEFAULT 5.0,
        month INTEGER NOT NULL,
        year INTEGER NOT NULL,
        is_filed INTEGER DEFAULT 0,
        filed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (transaction_id) REFERENCES transactions(id),
        FOREIGN KEY (transaction_line_id) REFERENCES transaction_lines(id)
      )
    `);

    // Audit Logs table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        action TEXT NOT NULL,
        entity_type TEXT,
        entity_id INTEGER,
        old_values TEXT,
        new_values TEXT,
        ip_address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Item Categories table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS item_categories(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Item Units table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS item_units(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Settings table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Period Locks table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS period_locks(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        year INTEGER NOT NULL,
        month INTEGER NOT NULL,
        is_locked INTEGER DEFAULT 1,
        locked_by INTEGER,
        locked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(year, month)
      )
    `);

    // Create indexes for performance
    this.createIndexes();
  }

  /**
   * Create database indexes for better query performance
   */
  private createIndexes(): void {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date)',
      'CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type)',
      'CREATE INDEX IF NOT EXISTS idx_transactions_contact ON transactions(contact_id)',
      'CREATE INDEX IF NOT EXISTS idx_transaction_lines_account ON transaction_lines(account_id)',
      'CREATE INDEX IF NOT EXISTS idx_transaction_lines_transaction ON transaction_lines(transaction_id)',
      'CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON stock_movements(item_id)',
      'CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(date)',
      'CREATE INDEX IF NOT EXISTS idx_invoices_contact ON invoices(contact_id)',
      'CREATE INDEX IF NOT EXISTS idx_gst_entries_month_year ON gst_entries(month, year)',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_contacts_type ON contacts(type)',
      'CREATE INDEX IF NOT EXISTS idx_items_code ON items(code)',
    ];

    for (const index of indexes) {
      try {
        this.db.exec(index);
      } catch (error) {
        console.warn('Index creation warning:', error);
      }
    }
  }

  /**
   * Seed default data on first run
   */
  private seedDefaultData(): void {
    // Account seeding is now handled by the onboarding flow in the UI.
    // Default admin user is no longer automatically created here for security.

    // Check if company exists
    const companyExists = this.db.prepare('SELECT 1 FROM companies LIMIT 1').get();

    if (!companyExists) {
      this.db.prepare(`
        INSERT INTO companies(name, trade_license_no, tax_no, address, phone)
        VALUES(?, ?, ?, ?, ?)
      `).run('My Business', 'TL-001', 'TAX-001', 'Bhutan', '+975-XXXXXXX');
      console.log('Default company created');
    }

    // Check if accounts exist
    const accountsExist = this.db.prepare('SELECT 1 FROM accounts LIMIT 1').get();
    if (!accountsExist) {
      this.seedChartOfAccounts();
    }

    // Check if settings exist
    const settingsExist = this.db.prepare('SELECT 1 FROM settings LIMIT 1').get();
    if (!settingsExist) {
      this.seedDefaultSettings();
    }

    // Check if categories exist
    const categoriesExist = this.db.prepare('SELECT 1 FROM item_categories LIMIT 1').get();
    if (!categoriesExist) {
      this.seedDefaultCategories();
    }

    // Check if units exist
    const unitsExist = this.db.prepare('SELECT 1 FROM item_units LIMIT 1').get();
    if (!unitsExist) {
      this.seedDefaultUnits();
    }
  }

  /**
   * Seed the Chart of Accounts
   */
  private seedChartOfAccounts(): void {
    const accounts = [
      { code: '1000', name: 'Assets', type: 'asset', subtype: 'current_asset', is_system: 1 },
      { code: '1100', name: 'Cash on Hand', type: 'asset', subtype: 'current_asset', is_system: 1 },
      { code: '1200', name: 'Bank Accounts', type: 'asset', subtype: 'current_asset', is_system: 1 },
      { code: '1300', name: 'Debtors', type: 'asset', subtype: 'current_asset', is_system: 1 },
      { code: '1400', name: 'Inventory', type: 'asset', subtype: 'current_asset', is_system: 1 },
      { code: '1500', name: 'GST Input', type: 'asset', subtype: 'current_asset', is_system: 1 },
      { code: '2000', name: 'Liabilities', type: 'liability', subtype: 'current_liability', is_system: 1 },
      { code: '2100', name: 'Creditors', type: 'liability', subtype: 'current_liability', is_system: 1 },
      { code: '2200', name: 'GST Output', type: 'liability', subtype: 'current_liability', is_system: 1 },
      { code: '2300', name: 'GST Payable', type: 'liability', subtype: 'current_liability', is_system: 1 },
      { code: '3000', name: 'Capital', type: 'equity', subtype: 'equity', is_system: 1 },
      { code: '3100', name: 'Retained Earnings', type: 'equity', subtype: 'equity', is_system: 1 },
      { code: '3200', name: 'Drawings', type: 'equity', subtype: 'equity', is_system: 1 },
      { code: '4000', name: 'Sales Revenue', type: 'income', subtype: 'revenue', is_system: 1 },
      { code: '4100', name: 'Other Income', type: 'income', subtype: 'other_income', is_system: 1 },
      { code: '5000', name: 'Cost of Goods Sold', type: 'expense', subtype: 'cogs', is_system: 1 },
      { code: '6000', name: 'Operating Expenses', type: 'expense', subtype: 'operating_expense', is_system: 1 },
      { code: '6100', name: 'Rent Expense', type: 'expense', subtype: 'operating_expense', is_system: 1 },
      { code: '6200', name: 'Salary Expense', type: 'expense', subtype: 'operating_expense', is_system: 1 },
      { code: '6300', name: 'Utilities Expense', type: 'expense', subtype: 'operating_expense', is_system: 1 },
      { code: '6400', name: 'Other Expenses', type: 'expense', subtype: 'operating_expense', is_system: 1 },
    ];

    const insertAccount = this.db.prepare(`
      INSERT INTO accounts(code, name, type, subtype, is_system)
      VALUES(?, ?, ?, ?, ?)
    `);

    for (const account of accounts) {
      try {
        insertAccount.run(account.code, account.name, account.type, account.subtype, account.is_system);
      } catch (error) {
        console.warn(`Failed to insert account ${account.code}: `, error);
      }
    }
  }

  /**
   * Seed default settings
   */
  private seedDefaultSettings(): void {
    const defaultSettings = [
      { key: 'gst_rate', value: '5.0' },
      { key: 'invoice_prefix', value: 'DT' },
      { key: 'last_invoice_number', value: '0' },
      { key: 'default_payment_mode', value: 'cash' },
      { key: 'low_stock_threshold', value: '10' },
      { key: 'default_credit_limit', value: '50000' },
      { key: 'default_credit_days', value: '30' },
      { key: 'auto_backup_enabled', value: '1' },
      { key: 'auto_backup_time', value: '23:00' },
      { key: 'company_name', value: 'My Business' },
    ];

    const insertSetting = this.db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
    for (const setting of defaultSettings) {
      try {
        insertSetting.run(setting.key, setting.value);
      } catch (error) {
        console.warn(`Failed to insert setting ${setting.key}: `, error);
      }
    }
  }

  private seedDefaultCategories(): void {
    const categories = ['General', 'Electronics', 'Food & Beverage', 'Apparel', 'Services'];
    const insert = this.db.prepare('INSERT INTO item_categories (name) VALUES (?)');
    for (const cat of categories) {
      try { insert.run(cat); } catch (e) { }
    }
  }

  private seedDefaultUnits(): void {
    const units = ['pcs', 'kg', 'g', 'ltr', 'ml', 'box', 'packet', 'set'];
    const insert = this.db.prepare('INSERT INTO item_units (name) VALUES (?)');
    for (const unit of units) {
      try { insert.run(unit); } catch (e) { }
    }
  }

  /**
   * Run one-time migrations for database updates
   */
  private runMigrations(): void {
    // 1. Migration for Bhutanese Payment Modes in transactions table
    const transactionsSchema = this.db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='transactions'").get() as any;

    // Check if migration is needed (missing any of the new bank modes)
    if (transactionsSchema && transactionsSchema.sql && !transactionsSchema.sql.includes('mBOB')) {
      console.log('Running migration: Update payment_mode CHECK constraint...');

      try {
        this.db.transaction(() => {
          // Temporarily disable foreign keys for table restructuring
          this.db.pragma('foreign_keys = OFF');

          this.db.exec('ALTER TABLE transactions RENAME TO transactions_old');

          // Create new table with updated CHECK constraint (Including 'upi' for historical compatibility)
          this.db.exec(`
            CREATE TABLE transactions (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              transaction_no TEXT UNIQUE NOT NULL,
              type TEXT NOT NULL CHECK (type IN ('sale', 'purchase', 'receipt', 'payment', 'transfer', 'adjustment', 'journal')),
              date DATE NOT NULL,
              reference TEXT,
              contact_id INTEGER,
              description TEXT,
              total_amount REAL NOT NULL DEFAULT 0,
              gst_amount REAL DEFAULT 0,
              discount_amount REAL DEFAULT 0,
              net_amount REAL NOT NULL DEFAULT 0,
              payment_mode TEXT CHECK (payment_mode IN ('cash', 'bank', 'credit', 'card', 'upi', 'mBOB', 'BNB', 'TPay', 'DrukPNB', 'BDBL', 'DKBank')),
              status TEXT DEFAULT 'completed' CHECK (status IN ('draft', 'completed', 'void')),
              is_void INTEGER DEFAULT 0,
              void_reason TEXT,
              voided_at DATETIME,
              voided_by INTEGER,
              invoice_id INTEGER,
              created_by INTEGER,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (contact_id) REFERENCES contacts(id),
              FOREIGN KEY (created_by) REFERENCES users(id),
              FOREIGN KEY (voided_by) REFERENCES users(id)
            )
          `);

          // Transfer data
          this.db.exec('INSERT INTO transactions SELECT * FROM transactions_old');

          // Cleanup
          this.db.exec('DROP TABLE transactions_old');

          // Re-enable foreign keys
          this.db.pragma('foreign_keys = ON');

          // Re-create indexes which were lost during RENAME/DROP
          this.createIndexes();

          console.log('Migration completed successfully: transactions table updated.');
        })();
      } catch (error) {
        console.error('Migration failed:', error);
        // Rollback attempt if possible (though transaction usually handles it, manual renaming might be needed)
        try {
          const tableExists = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='transactions_old'").get();
          if (tableExists) {
            this.db.exec('DROP TABLE IF EXISTS transactions');
            this.db.exec('ALTER TABLE transactions_old RENAME TO transactions');
          }
          this.db.pragma('foreign_keys = ON');
        } catch (e) {
          console.error('Failed to restore from failed migration:', e);
        }
      }
    }

    // 2. Data fix for zero purchase prices (Fix for user reporting zero purchase in UI)
    try {
      this.db.prepare(`
        UPDATE items 
        SET purchase_price = average_cost 
        WHERE (purchase_price = 0 OR purchase_price IS NULL) 
        AND average_cost > 0
      `).run();
      console.log('Data fix applied: Updated items with zero purchase_price where average_cost exists.');
    } catch (error) {
      console.warn('Data fix warning (non-critical):', error);
    }

    // 3. Data fix for contact balances
    try {
      // Update Customers (Assets: debits increase balance)
      this.db.prepare(`
        UPDATE contacts 
        SET current_balance = opening_balance + (
          SELECT COALESCE(SUM(tl.debit_amount - tl.credit_amount), 0) 
          FROM transaction_lines tl
          JOIN transactions t ON t.id = tl.transaction_id
          WHERE t.is_void = 0 
          AND (
            tl.contact_id = contacts.id 
            OR tl.account_id = contacts.account_id
            OR (t.contact_id = contacts.id AND tl.account_id IN (SELECT id FROM accounts WHERE code = '1300'))
          )
        )
        WHERE type = 'customer'
      `).run();

      // Update Suppliers (Liabilities: credits increase balance)
      this.db.prepare(`
        UPDATE contacts 
        SET current_balance = opening_balance + (
          SELECT COALESCE(SUM(tl.credit_amount - tl.debit_amount), 0) 
          FROM transaction_lines tl
          JOIN transactions t ON t.id = tl.transaction_id
          WHERE t.is_void = 0 
          AND (
            tl.contact_id = contacts.id 
            OR tl.account_id = contacts.account_id
            OR (t.contact_id = contacts.id AND tl.account_id IN (SELECT id FROM accounts WHERE code = '2100'))
          )
        )
        WHERE type = 'supplier'
      `).run();

      console.log('Data fix applied: Updated all contact balances from transaction history.');
    } catch (error) {
      console.warn('Contact balance fix warning (non-critical):', error);
    }
  }
}
