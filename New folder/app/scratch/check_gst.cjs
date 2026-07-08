const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

// Path to the database
const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'dhisum-tseyig', 'dhisum_tseyig.db');
console.log('Checking database at:', dbPath);

try {
  const db = new Database(dbPath, { readonly: true });

  console.log('\n--- Latest Purchase Transactions ---');
  const txs = db.prepare(`
    SELECT t.id, t.transaction_no, t.date, t.gst_amount, t.net_amount, i.tax_type
    FROM transactions t
    LEFT JOIN invoices i ON i.transaction_id = t.id
    WHERE t.type = 'purchase'
    ORDER BY t.id DESC
    LIMIT 5
  `).all();
  console.table(txs);

  console.log('\n--- Latest GST Entries ---');
  const gst = db.prepare(`
    SELECT * FROM gst_entries
    ORDER BY id DESC
    LIMIT 5
  `).all();
  console.table(gst);

  db.close();
} catch (err) {
  console.error('Error:', err.message);
}
