
const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'Jinda', 'dhisum_tseyig.db');
console.log('Checking database at:', dbPath);

try {
  const db = new Database(dbPath);
  
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('Tables:', tables.map(t => t.name).join(', '));
  
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  console.log('User count:', userCount);
  
  const contactCount = db.prepare('SELECT COUNT(*) as count FROM contacts').get().count;
  console.log('Contact count:', contactCount);
  
  const itemCount = db.prepare('SELECT COUNT(*) as count FROM items').get().count;
  console.log('Item count:', itemCount);
  
  const poCount = db.prepare('SELECT COUNT(*) as count FROM purchase_orders').get().count;
  console.log('Purchase Order count:', poCount);
  
  const quoteCount = db.prepare('SELECT COUNT(*) as count FROM quotations').get().count;
  console.log('Quotation count:', quoteCount);
  
  const auditCount = db.prepare('SELECT COUNT(*) as count FROM audit_logs').get().count;
  console.log('Audit Log count:', auditCount);

  db.close();
} catch (error) {
  console.error('Error checking database:', error.message);
}
