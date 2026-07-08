
import os

file_path = 'src/database/DatabaseManager.ts'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

changes = 0

# 1. Add tax_type to invoices table definition
old_table = "        notes TEXT,\n        terms TEXT,\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        FOREIGN KEY (transaction_id) REFERENCES transactions(id),"
new_table = "        notes TEXT,\n        terms TEXT,\n        tax_type TEXT DEFAULT 'standard',\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        FOREIGN KEY (transaction_id) REFERENCES transactions(id),"

if old_table in content:
    content = content.replace(old_table, new_table)
    changes += 1
    print("1. Invoices table updated")
else:
    print("1. FAIL - Invoices table definition not found")

# 2. Add migration for tax_type column
old_migration = "    // Check if categories exist\n    const categoriesExist = this.db.prepare('SELECT 1 FROM item_categories LIMIT 1').get();"
new_migration = """    // Migration: ensure tax_type exists on invoices table
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
    const categoriesExist = this.db.prepare('SELECT 1 FROM item_categories LIMIT 1').get();"""

if old_migration in content:
    content = content.replace(old_migration, new_migration)
    changes += 1
    print("2. Migration added")
else:
    print("2. FAIL - Migration hook not found")

if changes > 0:
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
print(f"Done: {changes}/2 changes")
