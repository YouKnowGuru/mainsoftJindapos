import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

/**
 * DatabaseManager - Handles all database operations for Jinda
 * Uses SQLite with better-sqlite3 for synchronous, high-performance operations
 * SECURITY: Added table name validation to prevent SQL injection
 */

// Whitelist of allowed table names
const ALLOWED_TABLES = [
  'users', 'companies', 'accounts', 'contacts', 'items',
  'transactions', 'transaction_lines', 'stock_movements',
  'invoices', 'invoice_items', 'gst_entries', 'audit_logs',
  'item_categories', 'item_units', 'settings', 'period_locks',
  'purchase_orders', 'purchase_order_items', 'quotations', 'quotation_items',
  'held_carts', 'held_cart_items', 'refunds', 'refund_items',
  'expenses', 'recurring_transactions', 'recurring_execution_log', 'branches', 'employees',
  'payroll_payments', 'barcode_mappings', 'price_lists', 'price_list_items'
];

/**
 * Validate table name against whitelist
 * SECURITY: Prevents SQL injection via table names
 */
function validateTableName(tableName: string): boolean {
  return typeof tableName === 'string' &&
    tableName.length > 0 &&
    tableName.length < 100 &&
    ALLOWED_TABLES.includes(tableName) &&
    !tableName.startsWith('sqlite_');
}

/**
 * Sanitize column name to prevent injection
 */
function sanitizeColumnName(columnName: string): string {
  // Only allow alphanumeric and underscore
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(columnName)) {
    throw new Error('Invalid column name: ' + columnName);
  }
  return columnName;
}

export class DatabaseManager {
  private db: Database.Database;
  private dbPath: string;
  private inTransaction: boolean = false;

  constructor(dbPath: string) {
    this.dbPath = dbPath;

    // Ensure directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 }); // Secure permissions
    }

    // Open database with WAL mode for better performance
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('secure_delete = ON'); // Overwrite deleted data

    // Initialize schema and seed data
    this.initializeSchema();
    this.seedDefaultData();
    this.runMigrations();
  }

  /**
   * Get the database instance for direct queries
   */
  getDatabase(): Database.Database {
    return this.db;
  }

  /**
   * Safe transaction wrapper that prevents nested transaction errors.
   * If already in a transaction, executes the function directly.
   * Otherwise, wraps it in a new transaction.
   */
  safeTransaction(fn: () => any): any {
    if (this.inTransaction) {
      // Already in a transaction, execute directly
      return fn();
    }

    // Not in a transaction, create a new one.
    // Set flag BEFORE calling db.transaction() so that even if it throws,
    // the finally block resets it correctly.
    this.inTransaction = true;
    try {
      return this.db.transaction(fn)();
    } finally {
      this.inTransaction = false;
    }
  }

  /**
   * Close the database connection
   */
  close(): void {
    this.db.close();
  }

  /**
   * Reopen the database connection after it has been closed.
   */
  reopen(): void {
    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('secure_delete = ON');
    // BUG-04 FIX: Run migrations after reopening so restored backups are
    // always migrated to the current schema before any service touches them.
    this.runMigrations();
  }

  /**
   * Safely import data from a JSON object.
   * SECURITY: Validates table names against whitelist
   */
  importDatabaseFromJSON(data: any): boolean {
    if (!data || !data.tables || typeof data.tables !== 'object') {
      throw new Error('Invalid import data format');
    }

    const exportedTables = Object.keys(data.tables);

    // Validate all table names before any operations
    for (const tableName of exportedTables) {
      if (!validateTableName(tableName)) {
        throw new Error(`Invalid or unauthorized table name: ${tableName}`);
      }
    }

    // SECURITY: SQLite ignores "PRAGMA foreign_keys = OFF" if invoked inside a transaction
    this.db.pragma('foreign_keys = OFF');

    try {
      const importFn = () => {
        // Wipe all existing tables that exist in the payload
        for (const tableName of exportedTables) {
          try {
            // Table name is now validated, safe to use in template
            this.db.prepare(`DELETE FROM "${tableName}"`).run();
          } catch (err: any) {
            if (err.message.includes('no such table')) {
              console.warn(`[DatabaseManager] Skipping DELETE for missing table: ${tableName}`);
            } else {
              throw err;
            }
          }
        }

        // Re-hydrate tables row-by-row
        for (const tableName of exportedTables) {
          const rows = data.tables[tableName];
          if (!Array.isArray(rows) || rows.length === 0) continue;

          try {
            // Build parameterized insert for the first row's schema
            const columns = Object.keys(rows[0]);

            // Validate all column names
            columns.forEach(col => sanitizeColumnName(col));

            const placeholders = columns.map(() => '?').join(', ');
            const colNames = columns.map(c => `"${c}"`).join(', ');

            const insertStmt = this.db.prepare(
              `INSERT INTO "${tableName}" (${colNames}) VALUES (${placeholders})`
            );

            for (const row of rows) {
              const values = columns.map(col => {
                const val = row[col];
                // Basic type validation
                if (val === null || val === undefined) return null;
                if (typeof val === 'string' && val.length > 1000000) {
                  throw new Error(`Value too long for column ${col} (max 1MB)`);
                }
                return val;
              });
              insertStmt.run(values);
            }
            console.log(`[DatabaseManager] Restored ${rows.length} rows into ${tableName}`);
          } catch (err: any) {
            if (err.message.includes('no such table')) {
              console.warn(`[DatabaseManager] Skipping INSERT for missing table: ${tableName}`);
            } else {
              throw err;
            }
          }
        }

        // Check if DB is consistent after restore
        const fkCheck = this.db.pragma('foreign_key_check') as any[];
        if (fkCheck && fkCheck.length > 0) {
          console.error('[DatabaseManager] Foreign key violations post-restore:', fkCheck);
          throw new Error('Database restoration resulted in foreign key constraint violations.');
        }
      };

      // Use safeTransaction to prevent nested transaction errors
      this.safeTransaction(importFn);

      return true;
    } catch (err: any) {
      console.error('[DatabaseManager] Critical error importing JSON data:', err);
      throw err;
    } finally {
      // ALWAYS ensure foreign keys are turned back on
      try { this.db.pragma('foreign_keys = ON'); } catch (e) { }
    }
  }

  /**
   * Export database to JSON
   * SECURITY: Validates table names
   */
  exportDatabaseToJSON(): any {
    const data: any = { tables: {} };

    // Get all user tables (not system tables)
    const tables = this.db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    ).all() as Array<{ name: string }>;

    for (const { name } of tables) {
      if (!validateTableName(name)) {
        console.warn(`[DatabaseManager] Skipping unauthorized table: ${name}`);
        continue;
      }

      try {
        // Safe to use validated table name
        const rows = this.db.prepare(`SELECT * FROM "${name}"`).all();
        data.tables[name] = rows;
      } catch (error: any) {
        console.warn(`[DatabaseManager] Failed to export table ${name}:`, error.message);
      }
    }

    return data;
  }

  /**
   * Streaming export — writes JSON to file table-by-table in batches.
   * Memory usage stays ~10-20MB regardless of database size.
   */
  async exportDatabaseToJSONStream(
    outputPath: string,
    onProgress?: (tableName: string, rowsWritten: number, totalTables: number, tableIndex: number) => void
  ): Promise<void> {
    const BATCH_SIZE = 5000;

    const tables = this.db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    ).all() as Array<{ name: string }>;

    const validTables = tables.filter(t => validateTableName(t.name)).map(t => t.name);
    const totalTables = validTables.length;

    const stream = fs.createWriteStream(outputPath, { encoding: 'utf-8' });

    const write = (chunk: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        const canContinue = stream.write(chunk);
        if (canContinue) {
          resolve();
        } else {
          stream.once('drain', resolve);
          stream.once('error', reject);
        }
      });
    };

    try {
      await write('{"tables":{');

      for (let tableIdx = 0; tableIdx < totalTables; tableIdx++) {
        const tableName = validTables[tableIdx];

        if (tableIdx > 0) await write(',');
        await write(`${JSON.stringify(tableName)}:[`);

        const countResult = this.db.prepare(`SELECT COUNT(*) as cnt FROM "${tableName}"`).get() as { cnt: number };
        const totalRows = countResult.cnt;

        let offset = 0;
        let firstRow = true;

        while (offset < totalRows) {
          const rows = this.db.prepare(
            `SELECT * FROM "${tableName}" LIMIT ${BATCH_SIZE} OFFSET ${offset}`
          ).all();

          for (const row of rows) {
            if (!firstRow) await write(',');
            await write(JSON.stringify(row));
            firstRow = false;
          }

          offset += rows.length;

          if (onProgress) {
            onProgress(tableName, offset, totalTables, tableIdx);
          }

          // Yield to event loop so UI stays responsive
          await new Promise(resolve => setImmediate(resolve));
        }

        await write(']');
      }

      await write('}}');

      await new Promise<void>((resolve, reject) => {
        stream.end(() => resolve());
        stream.once('error', reject);
      });
    } catch (err) {
      stream.destroy();
      throw err;
    }
  }

  /**
   * Streaming import — parses JSON from file and inserts in batched transactions.
   * Memory usage stays ~5-10MB regardless of backup size.
   */
  async importDatabaseFromJSONStream(
    inputPath: string,
    onProgress?: (tableName: string, rowsInserted: number) => void
  ): Promise<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { parser } = require('stream-json');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { streamArray } = require('stream-json/streamers/StreamArray');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { pick } = require('stream-json/filters/Pick');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { chain } = require('stream-chain');

    const BATCH_SIZE = 1000;

    // First pass: get table names from the JSON
    const tableNames = await this.extractTableNames(inputPath, parser, pick, chain);

    // Validate all table names
    for (const tableName of tableNames) {
      if (!validateTableName(tableName)) {
        throw new Error(`Invalid or unauthorized table name: ${tableName}`);
      }
    }

    this.db.pragma('foreign_keys = OFF');

    try {
      // Delete existing data table by table (each in its own transaction)
      for (const tableName of tableNames) {
        try {
          this.db.prepare(`DELETE FROM "${tableName}"`).run();
        } catch (err: any) {
          if (!err.message.includes('no such table')) throw err;
        }
      }

      // Import each table by streaming its rows
      for (const tableName of tableNames) {
        await this.streamImportTable(inputPath, tableName, BATCH_SIZE, onProgress, parser, pick, chain, streamArray);
      }

      // Verify foreign key integrity
      const fkCheck = this.db.pragma('foreign_key_check') as any[];
      if (fkCheck && fkCheck.length > 0) {
        throw new Error('Database restoration resulted in foreign key constraint violations.');
      }

      return true;
    } catch (err: any) {
      console.error('[DatabaseManager] Critical error in streaming import:', err);
      throw err;
    } finally {
      try { this.db.pragma('foreign_keys = ON'); } catch (e) { }
    }
  }

  private async extractTableNames(
    inputPath: string,
    parserFn: any,
    pickFn: any,
    chainFn: any
  ): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const tableNames: string[] = [];
      const readStream = fs.createReadStream(inputPath, { encoding: 'utf-8' });

      let depth = 0;
      let inTables = false;
      let currentKey: string | null = null;

      const jsonParser = parserFn();

      jsonParser.on('data', (token: any) => {
        if (token.name === 'startObject' && depth === 1 && currentKey === 'tables') {
          inTables = true;
        }
        if (token.name === 'keyValue' && inTables && depth === 2) {
          tableNames.push(token.value);
        }
        if (token.name === 'keyValue') {
          currentKey = token.value;
        }
        if (token.name === 'startObject' || token.name === 'startArray') depth++;
        if (token.name === 'endObject' || token.name === 'endArray') depth--;
      });

      readStream.pipe(jsonParser);

      jsonParser.on('end', () => resolve(tableNames));
      jsonParser.on('error', reject);
      readStream.on('error', reject);
    });
  }

  private async streamImportTable(
    inputPath: string,
    tableName: string,
    batchSize: number,
    onProgress: ((tableName: string, rowsInserted: number) => void) | undefined,
    parserFn: any,
    pickFn: any,
    chainFn: any,
    streamArrayFn: any
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const pipeline = chainFn([
        fs.createReadStream(inputPath, { encoding: 'utf-8' }),
        parserFn(),
        pickFn({ filter: `tables.${tableName}` }),
        streamArrayFn()
      ]);

      let batch: any[] = [];
      let totalInserted = 0;
      let insertStmt: any = null;
      let columns: string[] | null = null;

      pipeline.on('data', (item: any) => {
        const row = item.value;

        if (!columns) {
          columns = Object.keys(row);
          columns.forEach(col => sanitizeColumnName(col));
          const placeholders = columns.map(() => '?').join(', ');
          const colNames = columns.map(c => `"${c}"`).join(', ');
          insertStmt = this.db.prepare(
            `INSERT INTO "${tableName}" (${colNames}) VALUES (${placeholders})`
          );
        }

        batch.push(row);

        if (batch.length >= batchSize) {
          this.insertBatch(insertStmt, columns!, batch);
          totalInserted += batch.length;
          batch = [];
          if (onProgress) onProgress(tableName, totalInserted);
        }
      });

      pipeline.on('end', () => {
        if (batch.length > 0 && insertStmt && columns) {
          this.insertBatch(insertStmt, columns, batch);
          totalInserted += batch.length;
          if (onProgress) onProgress(tableName, totalInserted);
        }
        if (totalInserted > 0) {
          console.log(`[DatabaseManager] Restored ${totalInserted} rows into ${tableName}`);
        }
        resolve();
      });

      pipeline.on('error', reject);
    });
  }

  private insertBatch(stmt: any, columns: string[], rows: any[]): void {
    const insertMany = this.db.transaction((batch: any[]) => {
      for (const row of batch) {
        const values = columns.map(col => {
          const val = row[col];
          if (val === null || val === undefined) return null;
          return val;
        });
        stmt.run(values);
      }
    });
    insertMany(rows);
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
        email TEXT UNIQUE,
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
        address_street TEXT,
        address_gewog TEXT,
        address_dzongkhag TEXT,
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

    // Add new columns if they don't exist (for existing databases)
    try {
      this.db.exec(`ALTER TABLE contacts ADD COLUMN address_street TEXT;`);
    } catch { /* Column already exists, ignore */ }
    try {
      this.db.exec(`ALTER TABLE contacts ADD COLUMN address_gewog TEXT;`);
    } catch { /* Column already exists, ignore */ }
    try {
      this.db.exec(`ALTER TABLE contacts ADD COLUMN address_dzongkhag TEXT;`);
    } catch { /* Column already exists, ignore */ }

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

    // Transactions table
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
        tax_type TEXT DEFAULT 'standard',
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

    // Migration: Ensure description column exists in invoice_items
    try {
      this.db.exec("ALTER TABLE invoice_items ADD COLUMN description TEXT");
    } catch (e) {
      // Column already exists, ignore
    }

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

    // ============================================
    // NEW FEATURE TABLES
    // ============================================

    // Purchase Orders
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        po_no TEXT UNIQUE NOT NULL,
        supplier_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        expected_date TEXT,
        status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'received', 'cancelled')),
        subtotal REAL DEFAULT 0,
        gst_amount REAL DEFAULT 0,
        total_amount REAL DEFAULT 0,
        tax_type TEXT DEFAULT 'standard',
        notes TEXT,
        transaction_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (supplier_id) REFERENCES contacts(id)
      )
    `);

    // Migration for purchase_orders table
    try {
      this.db.prepare("ALTER TABLE purchase_orders ADD COLUMN transaction_id INTEGER").run();
    } catch (e) { }
    try {
      this.db.prepare("ALTER TABLE purchase_orders ADD COLUMN tax_type TEXT DEFAULT 'standard'").run();
    } catch (e) { }

    // Purchase Order Items
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS purchase_order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        po_id INTEGER NOT NULL,
        item_id INTEGER NOT NULL,
        quantity REAL NOT NULL,
        unit_price REAL NOT NULL,
        gst_rate REAL DEFAULT 0,
        gst_amount REAL DEFAULT 0,
        total_amount REAL NOT NULL,
        selling_price REAL DEFAULT 0,
        FOREIGN KEY (po_id) REFERENCES purchase_orders(id),
        FOREIGN KEY (item_id) REFERENCES items(id)
      )
    `);

    // Migration for purchase_order_items table
    try {
      this.db.prepare("ALTER TABLE purchase_order_items ADD COLUMN selling_price REAL DEFAULT 0").run();
    } catch (e) { }

    // Quotations
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS quotations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        quote_no TEXT UNIQUE NOT NULL,
        customer_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        expiry_date TEXT,
        status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'converted', 'expired', 'cancelled')),
        subtotal REAL DEFAULT 0,
        gst_amount REAL DEFAULT 0,
        discount_amount REAL DEFAULT 0,
        total_amount REAL DEFAULT 0,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES contacts(id)
      )
    `);

    // Quotation Items
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS quotation_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        quote_id INTEGER NOT NULL,
        item_id INTEGER NOT NULL,
        quantity REAL NOT NULL,
        unit_price REAL NOT NULL,
        gst_rate REAL DEFAULT 0,
        gst_amount REAL DEFAULT 0,
        total_amount REAL NOT NULL,
        FOREIGN KEY (quote_id) REFERENCES quotations(id),
        FOREIGN KEY (item_id) REFERENCES items(id)
      )
    `);

    // Held Carts (POS Parked Sales)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS held_carts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cart_name TEXT NOT NULL,
        customer_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES contacts(id)
      )
    `);

    // Held Cart Items
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS held_cart_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cart_id INTEGER NOT NULL,
        item_id INTEGER NOT NULL,
        quantity REAL NOT NULL,
        unit_price REAL NOT NULL,
        gst_rate REAL DEFAULT 0,
        FOREIGN KEY (cart_id) REFERENCES held_carts(id),
        FOREIGN KEY (item_id) REFERENCES items(id)
      )
    `);

    // Refunds
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS refunds (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        refund_no TEXT UNIQUE NOT NULL,
        original_transaction_id INTEGER NOT NULL,
        transaction_id INTEGER,
        customer_id INTEGER,
        date TEXT NOT NULL,
        reason TEXT NOT NULL,
        refund_mode TEXT NOT NULL,
        subtotal REAL DEFAULT 0,
        gst_amount REAL DEFAULT 0,
        total_amount REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending')),
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (original_transaction_id) REFERENCES transactions(id),
        FOREIGN KEY (transaction_id) REFERENCES transactions(id),
        FOREIGN KEY (customer_id) REFERENCES contacts(id)
      )
    `);

    // Migration for refunds (tracking account transaction)
    try {
      this.db.exec(`ALTER TABLE refunds ADD COLUMN transaction_id INTEGER;`);
    } catch { /* Column already exists */ }

    // Refund Items
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS refund_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        refund_id INTEGER NOT NULL,
        item_id INTEGER NOT NULL,
        quantity REAL NOT NULL,
        unit_price REAL NOT NULL,
        gst_rate REAL DEFAULT 0,
        total_amount REAL NOT NULL,
        FOREIGN KEY (refund_id) REFERENCES refunds(id),
        FOREIGN KEY (item_id) REFERENCES items(id)
      )
    `);

    // Expenses (dedicated module)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        expense_no TEXT UNIQUE NOT NULL,
        date TEXT NOT NULL,
        category TEXT NOT NULL,
        amount REAL NOT NULL,
        payment_mode TEXT,
        vendor TEXT,
        description TEXT,
        receipt_path TEXT,
        transaction_id INTEGER,
        account_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Migration for expenses table
    try {
      this.db.prepare("ALTER TABLE expenses ADD COLUMN transaction_id INTEGER").run();
      console.log("[DatabaseManager] Added transaction_id to expenses table");
    } catch (e) { }
    try {
      this.db.prepare("ALTER TABLE expenses ADD COLUMN account_id INTEGER").run();
      console.log("[DatabaseManager] Added account_id to expenses table");
    } catch (e) { }

    // Recurring Transactions
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS recurring_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('payment', 'receipt')),
        amount REAL NOT NULL CHECK (amount > 0),
        frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
        next_due_date TEXT NOT NULL,
        end_date TEXT,
        max_occurrences INTEGER,
        occurrence_count INTEGER DEFAULT 0,
        account_id INTEGER NOT NULL,
        contact_id INTEGER,
        payment_mode TEXT DEFAULT 'cash',
        description TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (account_id) REFERENCES accounts(id),
        FOREIGN KEY (contact_id) REFERENCES contacts(id)
      )
    `);

    // Migration for recurring (adding payment mode)
    try {
      this.db.exec(`ALTER TABLE recurring_transactions ADD COLUMN payment_mode TEXT DEFAULT 'cash';`);
    } catch { /* Column already exists */ }

    // Migration for recurring (adding end_date, max_occurrences, occurrence_count)
    try {
      this.db.exec(`ALTER TABLE recurring_transactions ADD COLUMN end_date TEXT;`);
      console.log("[DatabaseManager] Added end_date to recurring_transactions table");
    } catch { /* Column already exists */ }
    try {
      this.db.exec(`ALTER TABLE recurring_transactions ADD COLUMN max_occurrences INTEGER;`);
      console.log("[DatabaseManager] Added max_occurrences to recurring_transactions table");
    } catch { /* Column already exists */ }
    try {
      this.db.exec(`ALTER TABLE recurring_transactions ADD COLUMN occurrence_count INTEGER DEFAULT 0;`);
      console.log("[DatabaseManager] Added occurrence_count to recurring_transactions table");
    } catch { /* Column already exists */ }

    // Recurring Execution Log (Audit Trail)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS recurring_execution_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recurring_transaction_id INTEGER NOT NULL,
        generated_transaction_id INTEGER,
        execution_date TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (recurring_transaction_id) REFERENCES recurring_transactions(id),
        FOREIGN KEY (generated_transaction_id) REFERENCES transactions(id)
      )
    `);

    // Create index for faster recurring queries
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_recurring_next_due_date 
      ON recurring_transactions(next_due_date, is_active)
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_recurring_execution_log 
      ON recurring_execution_log(recurring_transaction_id, execution_date)
    `);

    // Branches
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS branches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL,
        address TEXT,
        phone TEXT,
        email TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Employees
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_no TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        position TEXT,
        department TEXT,
        phone TEXT,
        email TEXT,
        salary REAL DEFAULT 0,
        join_date TEXT,
        is_active INTEGER DEFAULT 1,
        pf_rate REAL DEFAULT 0,
        gis_amount REAL DEFAULT 0,
        tds_rate REAL DEFAULT 0,
        hc_rate REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Payroll Payments
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS payroll_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER NOT NULL,
        transaction_id INTEGER NOT NULL,
        month TEXT NOT NULL,
        year TEXT NOT NULL,
        amount REAL NOT NULL,
        gross_salary REAL DEFAULT 0,
        pf_amount REAL DEFAULT 0,
        tds_amount REAL DEFAULT 0,
        gis_amount REAL DEFAULT 0,
        hc_amount REAL DEFAULT 0,
        net_salary REAL DEFAULT 0,
        payment_mode TEXT NOT NULL,
        date TEXT NOT NULL,
        status TEXT DEFAULT 'completed',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id),
        FOREIGN KEY (transaction_id) REFERENCES transactions(id)
      )
    `);

    // Barcode Mappings
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS barcode_mappings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        barcode TEXT UNIQUE NOT NULL,
        item_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (item_id) REFERENCES items(id)
      )
    `);

    // Price Lists
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS price_lists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        customer_type TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Price List Items
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS price_list_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        price_list_id INTEGER NOT NULL,
        item_id INTEGER NOT NULL,
        price REAL NOT NULL,
        FOREIGN KEY (price_list_id) REFERENCES price_lists(id),
        FOREIGN KEY (item_id) REFERENCES items(id)
      )
    `);

    // Create indexes for price list lookups
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_price_list_items_lookup 
      ON price_list_items(price_list_id, item_id)
    `);

    // Migration: Add price_list_id to contacts table
    try {
      this.db.exec(`ALTER TABLE contacts ADD COLUMN price_list_id INTEGER REFERENCES price_lists(id);`);
      console.log("[DatabaseManager] Added price_list_id to contacts table");
    } catch { /* Column already exists */ }

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
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id)',
      'CREATE INDEX IF NOT EXISTS idx_contacts_type ON contacts(type)',
      'CREATE INDEX IF NOT EXISTS idx_items_code ON items(code)',
      'CREATE INDEX IF NOT EXISTS idx_items_name ON items(name)',
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

    // Migration: ensure gst_rate_domestic exists for existing databases
    const domesticGstExists = this.db.prepare("SELECT 1 FROM settings WHERE key = 'gst_rate_domestic'").get();
    if (!domesticGstExists) {
      try {
        this.db.prepare("INSERT INTO settings (key, value) VALUES ('gst_rate_domestic', '0.0')").run();
        console.log('[DatabaseManager] Migration: added gst_rate_domestic setting');
      } catch (e) {
        console.warn('[DatabaseManager] Migration: failed to add gst_rate_domestic', e);
      }
    }

    // Migration: ensure tax_type exists on invoices table
    try {
      const invoiceCols = this.db.pragma('table_info(invoices)') as any[];
      if (invoiceCols.length > 0 && !invoiceCols.some(c => c.name === 'tax_type')) {
        this.db.prepare("ALTER TABLE invoices ADD COLUMN tax_type TEXT DEFAULT 'standard'").run();
        console.log('[DatabaseManager] Migration: added tax_type to invoices table');
      }
    } catch (e) {
      console.warn('[DatabaseManager] Migration: failed to add tax_type to invoices', e);
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
      { code: '1500', name: 'GST Input', type: 'liability', subtype: 'current_liability', is_system: 1 },
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
      // Payroll Liability Accounts
      { code: '2400', name: 'PF Payable', type: 'liability', subtype: 'current_liability', is_system: 1 },
      { code: '2500', name: 'TDS Payable', type: 'liability', subtype: 'current_liability', is_system: 1 },
      { code: '2600', name: 'GIS Payable', type: 'liability', subtype: 'current_liability', is_system: 1 },
      { code: '2700', name: 'Health Contribution Payable', type: 'liability', subtype: 'current_liability', is_system: 1 },
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
      { key: 'gst_rate_domestic', value: '0.0' },
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
    // Migration for Bhutanese Payment Modes
    const transactionsSchema = this.db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='transactions'").get() as any;

    // 1. Payroll Automation Migrations
    const tablesToUpdate = [
      {
        table: 'employees',
        cols: [
          'pf_rate REAL DEFAULT 0',
          'gis_amount REAL DEFAULT 0',
          'tds_rate REAL DEFAULT 0',
          'hc_rate REAL DEFAULT 0'
        ]
      },
      {
        table: 'payroll_payments',
        cols: [
          'gross_salary REAL DEFAULT 0',
          'pf_amount REAL DEFAULT 0',
          'tds_amount REAL DEFAULT 0',
          'gis_amount REAL DEFAULT 0',
          'hc_amount REAL DEFAULT 0',
          'net_salary REAL DEFAULT 0'
        ]
      }
    ];

    for (const item of tablesToUpdate) {
      for (const col of item.cols) {
        try {
          this.db.exec(`ALTER TABLE ${item.table} ADD COLUMN ${col}`);
          console.log(`[DatabaseManager] Added column ${col} to ${item.table}`);
        } catch (e) { /* Column already exists */ }
      }
    }

    // 2. Ensure Payroll Liability Accounts exist
    const payrollAccounts = [
      { code: '2400', name: 'PF Payable', type: 'liability', subtype: 'current_liability' },
      { code: '2500', name: 'TDS Payable', type: 'liability', subtype: 'current_liability' },
      { code: '2600', name: 'GIS Payable', type: 'liability', subtype: 'current_liability' },
      { code: '2700', name: 'Health Contribution Payable', type: 'liability', subtype: 'current_liability' }
    ];

    for (const acc of payrollAccounts) {
      try {
        const exists = this.db.prepare('SELECT 1 FROM accounts WHERE code = ?').get(acc.code);
        if (!exists) {
          this.db.prepare(`
            INSERT INTO accounts (code, name, type, subtype, is_system)
            VALUES (?, ?, ?, ?, 1)
          `).run(acc.code, acc.name, acc.type, acc.subtype);
          console.log(`[DatabaseManager] Created account ${acc.code}: ${acc.name}`);
        }
      } catch (e) {
        console.warn(`[DatabaseManager] Failed to ensure account ${acc.code}:`, e);
      }
    }


    if (transactionsSchema && transactionsSchema.sql && !transactionsSchema.sql.includes('mBOB')) {
      console.log('Running migration: Update payment_mode CHECK constraint...');

      try {
        this.db.transaction(() => {
          this.db.pragma('foreign_keys = OFF');
          this.db.exec('ALTER TABLE transactions RENAME TO transactions_old');

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

          this.db.exec('INSERT INTO transactions SELECT * FROM transactions_old');
          this.db.exec('DROP TABLE transactions_old');
          this.db.pragma('foreign_keys = ON');
          this.createIndexes();

          console.log('Migration completed successfully');
        })();
      } catch (error) {
        console.error('Migration failed:', error);
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

    // Other migrations...
    try {
      this.db.prepare(`
        UPDATE items
        SET purchase_price = average_cost
        WHERE (purchase_price = 0 OR purchase_price IS NULL)
        AND average_cost > 0
      `).run();
    } catch (error) {
      console.warn('Data fix warning (non-critical):', error);
    }

    // Migration: Add email column if missing
    const usersSchema = this.db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get() as any;
    if (usersSchema && usersSchema.sql && !usersSchema.sql.includes('email')) {
      console.log('Running migration: Add email column to users table...');
      try {
        this.db.exec('ALTER TABLE users ADD COLUMN email TEXT');
        this.db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)');
      } catch (error) {
        console.error('Failed to add email column:', error);
      }
    }

    // Migration: Add is_verified column if missing
    if (usersSchema && usersSchema.sql && !usersSchema.sql.includes('is_verified')) {
      console.log('Running migration: Add is_verified column to users table...');
      try {
        this.db.exec('ALTER TABLE users ADD COLUMN is_verified INTEGER DEFAULT 0');
      } catch (error) {
        console.error('Failed to add is_verified column:', error);
      }
    }
  }
}
