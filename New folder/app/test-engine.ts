import { DatabaseManager } from './src/database/DatabaseManager';
import { AccountingEngineService } from './src/services/AccountingEngineService';
import { AccountingService } from './src/services/AccountingService';
import { format, addDays } from 'date-fns';
import fs from 'fs';

// Setup fresh DB for testing
const testDbPath = './test-engine.db';
if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
}

const dbManager = new DatabaseManager(testDbPath);
const engine = new AccountingEngineService(dbManager);
const accountingService = new AccountingService(dbManager);

function runTests() {
    console.log('--- STARTING ENGINE TESTS ---');

    // 1. Create a Contact
    const contactRes = accountingService.createContact({
        type: 'customer',
        name: 'Test Customer',
        creditLimit: 1000,
        openingBalance: 0
    });
    const customerId = (contactRes.data as any).id;
    console.log('Customer created: ' + customerId);

    // 2. Add an Item to Inventory
    const db = dbManager.getDatabase();
    const insertItem = db.prepare(`
    INSERT INTO items (code, name, unit, purchase_price, selling_price, average_cost, quantity_in_stock, gst_applicable, gst_rate)
    VALUES ('T-01', 'Test Item', 'pcs', 10, 20, 10, 50, 1, 5)
  `).run();
    const itemId = insertItem.lastInsertRowid as number;
    console.log('Item created with 50 stock: ' + itemId);

    // --- RULE TEST 1: Double Entry Mismatch ---
    console.log('\n--- TEST: Double Entry Mismatch ---');
    const resMismatch = engine.executePipeline({
        type: 'journal',
        date: format(new Date(), 'yyyy-MM-dd'),
        description: 'Imbalanced entry',
        subtotal: 100,
        gstAmount: 0,
        discountAmount: 0,
        netAmount: 100,
        lines: [
            { accountId: 1, description: 'Debit', debitAmount: 100, creditAmount: 0 },
            { accountId: 2, description: 'Credit', debitAmount: 0, creditAmount: 90 } // Imbalance!
        ]
    });
    console.log('Expect FAILURE: ' + !resMismatch.success);
    console.log('Message: ' + resMismatch.message);

    // --- RULE TEST 2: Stock Consistency (Negative Stock) ---
    console.log('\n--- TEST: Stock Consitency ---');
    const resStockFail = accountingService.createSale({
        customerId,
        paymentMode: 'cash',
        items: [{ itemId, quantity: 60, unitPrice: 20, gstRate: 5 }] // Trying to sell 60, only 50 in stock
    });
    console.log('Expect FAILURE: ' + !resStockFail.success);
    console.log('Message: ' + resStockFail.message);

    // --- RULE TEST 3: Credit Limit Enforcement ---
    console.log('\n--- TEST: Credit Limit Enforcement ---');
    // Customer limit is 1000. Let's try to sell 1500 on credit. (Subtotal: 1500 + GST: 75 = 1575)
    const resCreditFail = accountingService.createSale({
        customerId,
        paymentMode: 'credit',
        items: [{ itemId, quantity: 15, unitPrice: 100, gstRate: 5 }] // qty 15 is within stock 50.
    });
    console.log('Expect FAILURE: ' + !resCreditFail.success);
    console.log('Message: ' + resCreditFail.message);

    // --- RULE TEST 4 & 5: Valid Sale & Dynamic Ledger ---
    console.log('\n--- TEST: Valid Sale & Ledger Calculation ---');
    const resValidSale = accountingService.createSale({
        customerId,
        paymentMode: 'credit',
        items: [{ itemId, quantity: 10, unitPrice: 50, gstRate: 5 }] // Subtotal 500 + GST 25 = 525 net
    });
    console.log('Expect SUCCESS: ' + resValidSale.success);

    const ledger = accountingService.getContactLedger(customerId);
    console.log('Ledger Current Balance (Expected 525): ' + ledger.data?.currentBalance);

    // Check stock decreased to 40
    const stockCheck = db.prepare('SELECT quantity_in_stock FROM items WHERE id = ?').get(itemId) as any;
    console.log('Stock Quantity (Expected 40): ' + stockCheck.quantity_in_stock);

    // --- RULE TEST 6: Period Lock Enforcement ---
    console.log('\n--- TEST: Period Lock Enforcement ---');
    // Lock the current month
    const now = new Date();
    db.prepare('INSERT INTO period_locks (year, month, is_locked) VALUES (?, ?, 1)').run(now.getFullYear(), now.getMonth() + 1);

    // Try to pay money in this month
    const resPeriodFail = accountingService.payMoney({
        date: format(now, 'yyyy-MM-dd'),
        accountId: 6000,
        amount: 100,
        paymentMode: 'cash'
    });
    console.log('Expect FAILURE: ' + !resPeriodFail.success);
    console.log('Message: ' + resPeriodFail.message);
}

runTests();
