const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'Dhisum Tseyig', 'dhisum_tseyig.db');
const db = new Database(dbPath);

console.log('Running balance fix on:', dbPath);

try {
  // Customers
  let result = db.prepare(`
    UPDATE contacts 
    SET current_balance = opening_balance + (
      SELECT COALESCE(SUM(tl.debit_amount - tl.credit_amount), 0) 
      FROM transaction_lines tl
      JOIN transactions t ON t.id = tl.transaction_id
      WHERE t.is_void = 0 
      AND t.transaction_no NOT LIKE 'OB-%'
      AND (
        tl.account_id = contacts.account_id 
        OR (
          (tl.contact_id = contacts.id OR t.contact_id = contacts.id) 
          AND tl.account_id IN (
            SELECT id FROM accounts 
            WHERE code = '1300' 
               OR parent_id = (SELECT id FROM accounts WHERE code = '1300')
          )
        )
      )
    )
    WHERE type = 'customer'
  `).run();
  console.log('Customers updated:', result.changes);

  // Suppliers
  result = db.prepare(`
    UPDATE contacts 
    SET current_balance = opening_balance + (
      SELECT COALESCE(SUM(tl.credit_amount - tl.debit_amount), 0) 
      FROM transaction_lines tl
      JOIN transactions t ON t.id = tl.transaction_id
      WHERE t.is_void = 0 
      AND (
        tl.account_id = contacts.account_id 
        OR (
          (tl.contact_id = contacts.id OR t.contact_id = contacts.id) 
          AND tl.account_id IN (
            SELECT id FROM accounts 
            WHERE code = '2100' 
               OR parent_id = (SELECT id FROM accounts WHERE code = '2100')
          )
        )
      )
    )
    WHERE type = 'supplier'
  `).run();
  console.log('Suppliers updated:', result.changes);

  const customers = db.prepare("SELECT name, opening_balance, current_balance FROM contacts WHERE type = 'customer'").all();
  console.log('Customer Balances:', customers);
} catch (e) {
  console.error(e);
} finally {
  db.close();
}
console.log('Done.');
