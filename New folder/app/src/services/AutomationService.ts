import { DatabaseManager } from '../database/DatabaseManager';
import Database from 'better-sqlite3';
import type { PaymentMode, ContactType } from '../types';

export class AutomationService {
    private db: Database.Database;

    constructor(dbManager: DatabaseManager) {
        this.db = dbManager.getDatabase();
    }

    // ==========================================
    // 1. ACCOUNT AUTO-MAPPING LOGIC
    // ==========================================

    public mapAccounts(eventType: string, paymentMode: PaymentMode | 'none'): { debitAccount: number, creditAccount: number } {
        const predefinedMapping: Record<string, Record<string, { debit: string, credit: string }>> = {
            'sale': {
                'cash': { debit: '1100', credit: '4000' },
                'bank': { debit: '1200', credit: '4000' },
                'mBOB': { debit: '1200', credit: '4000' },
                'BNB': { debit: '1200', credit: '4000' },
                'TPay': { debit: '1200', credit: '4000' },
                'DrukPNB': { debit: '1200', credit: '4000' },
                'BDBL': { debit: '1200', credit: '4000' },
                'DKBank': { debit: '1200', credit: '4000' },
                'card': { debit: '1200', credit: '4000' },
                'credit': { debit: '1300', credit: '4000' }
            },
            'purchase': {
                'cash': { debit: '1400', credit: '1100' },
                'bank': { debit: '1400', credit: '1200' },
                'mBOB': { debit: '1400', credit: '1200' },
                'BNB': { debit: '1400', credit: '1200' },
                'TPay': { debit: '1400', credit: '1200' },
                'DrukPNB': { debit: '1400', credit: '1200' },
                'BDBL': { debit: '1400', credit: '1200' },
                'DKBank': { debit: '1400', credit: '1200' },
                'card': { debit: '1400', credit: '1200' },
                'credit': { debit: '1400', credit: '2100' }
            },
            'receipt': {
                'cash': { debit: '1100', credit: '1300' },
                'bank': { debit: '1200', credit: '1300' },
                'mBOB': { debit: '1200', credit: '1300' },
                'BNB': { debit: '1200', credit: '1300' },
                'TPay': { debit: '1200', credit: '1300' },
                'DrukPNB': { debit: '1200', credit: '1300' },
                'BDBL': { debit: '1200', credit: '1300' },
                'DKBank': { debit: '1200', credit: '1300' },
                'card': { debit: '1200', credit: '1300' },
            },
            'payment': {
                'cash': { debit: '2100', credit: '1100' },
                'bank': { debit: '2100', credit: '1200' },
                'mBOB': { debit: '2100', credit: '1200' },
                'BNB': { debit: '2100', credit: '1200' },
                'TPay': { debit: '2100', credit: '1200' },
                'DrukPNB': { debit: '2100', credit: '1200' },
                'BDBL': { debit: '2100', credit: '1200' },
                'DKBank': { debit: '2100', credit: '1200' },
                'card': { debit: '2100', credit: '1200' },
            }
        };

        const mapping = predefinedMapping[eventType]?.[paymentMode];
        if (!mapping) {
            throw new Error(`Automation Rule Error: Missing account mapping for event type '${eventType}' and mode '${paymentMode}'`);
        }

        const debitAcc = this.db.prepare('SELECT id FROM accounts WHERE code = ?').get(mapping.debit) as any;
        const creditAcc = this.db.prepare('SELECT id FROM accounts WHERE code = ?').get(mapping.credit) as any;

        if (!debitAcc || !creditAcc) {
            throw new Error(`Automation Rule Error: Missing account codes in Chart of Accounts(${mapping.debit} or ${mapping.credit})`);
        }

        return {
            debitAccount: debitAcc.id,
            creditAccount: creditAcc.id
        };
    }

    // ==========================================
    // 2. AUTO LEDGER CREATION LOGIC
    // ==========================================

    public createLedgerIfMissing(contactId: number, name: string, type: ContactType) {
        const contact = this.db.prepare('SELECT account_id FROM contacts WHERE id = ?').get(contactId) as any;
        if (contact && contact.account_id) {
            return contact.account_id;
        }

        // Determine parent account code
        const parentCode = type === 'customer' ? '1300' : '2100';
        const parentAccount = this.db.prepare('SELECT id FROM accounts WHERE code = ?').get(parentCode) as any;

        if (!parentAccount) {
            throw new Error(`Automation Rule Error: Missing parent account code ${parentCode} `);
        }

        // Generate next sequence
        const lastAccount = this.db.prepare(`
      SELECT code FROM accounts 
      WHERE code LIKE ? AND code != ?
    ORDER BY code DESC LIMIT 1
    `).get(`${parentCode} -% `, parentCode) as any;

        let sequence = 1;
        if (lastAccount) {
            const parts = lastAccount.code.split('-');
            if (parts.length > 1) {
                sequence = parseInt(parts[1]) + 1;
            }
        }
        const newCode = `${parentCode} -${sequence.toString().padStart(3, '0')} `;

        const newAccountResult = this.db.prepare(`
      INSERT INTO accounts(code, name, type, subtype, parent_id, is_system)
VALUES(?, ?, ?, ?, ?, 0)
    `).run(
            newCode,
            `${name} (${type})`,
            type === 'customer' ? 'asset' : 'liability',
            type === 'customer' ? 'current_asset' : 'current_liability',
            parentAccount.id
        );

        const newAccountId = newAccountResult.lastInsertRowid as number;

        // Link back to contact
        this.db.prepare('UPDATE contacts SET account_id = ? WHERE id = ?').run(newAccountId, contactId);

        return newAccountId;
    }

    // ==========================================
    // 3. SMART DEFAULTS LOGIC
    // ==========================================

    public getSmartDefaults() {
        // Look up latest settings or derived history
        const settingsRaw = this.db.prepare('SELECT key, value FROM settings').all() as any[];
        const settings = settingsRaw.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});

        const latestTx = this.db.prepare(`
      SELECT payment_mode FROM transactions 
      WHERE payment_mode IS NOT NULL 
      ORDER BY id DESC LIMIT 1
    `).get() as any;

        return {
            defaultPaymentMode: latestTx?.payment_mode || settings.default_payment_mode || 'cash',
            defaultGstRate: Number(settings.default_gst_rate || 5),
        };
    }

    // ==========================================
    // 4. STOCK AUTOMATION LOGIC
    // ==========================================

    public calculateAverageCost(itemId: number, newQty: number, newPurchasePrice: number): number {
        const item = this.db.prepare('SELECT quantity_in_stock, average_cost FROM items WHERE id = ?').get(itemId) as any;
        if (!item) return newPurchasePrice;

        const oldQty = Math.max(0, item.quantity_in_stock); // Protect against negative stock messing up average
        const oldCost = item.average_cost;

        const totalQty = oldQty + newQty;

        if (totalQty === 0) return 0;

        const newAverage = ((oldQty * oldCost) + (newQty * newPurchasePrice)) / totalQty;
        return Number(newAverage.toFixed(2));
    }

    // ==========================================
    // 5. GST AUTOMATION LOGIC (5% Bhutan)
    // ==========================================

    public calculateGST(subtotal: number, isTaxable: boolean, overrideRate?: number): number {
        if (!isTaxable) return 0;

        // Default to 5% if not overridden
        const rate = overrideRate !== undefined ? overrideRate : 5;
        const gstAmount = subtotal * (rate / 100);
        return Number(gstAmount.toFixed(2));
    }

    public getGstAccount(): number {
        const account = this.db.prepare("SELECT id FROM accounts WHERE code = '2200'").get() as any;
        if (!account) throw new Error("Automation Error: GST Account (2200) not found.");
        return account.id;
    }

    // ==========================================
    // 9. VOID AUTOMATION LOGIC
    // ==========================================

    public handleVoid(transactionId: number, userId: number, reason: string) {
        // System orchestration: Instead of modifying original transaction, generate REVERSING entry

        return this.db.transaction(() => {
            // 1. Mark original as void
            this.db.prepare(`
        UPDATE transactions 
        SET is_void = 1, void_reason = ?, voided_at = datetime('now'), voided_by = ?
    WHERE id = ? AND is_void = 0
        `).run(reason, userId, transactionId);

            const tx = this.db.prepare('SELECT * FROM transactions WHERE id = ?').get(transactionId) as any;
            if (!tx) throw new Error("Transaction not found for voiding.");

            // 2. Load original lines
            const originalLines = this.db.prepare('SELECT * FROM transaction_lines WHERE transaction_id = ?').all(transactionId) as any[];

            // 3. Create reversing transaction header
            const revTxNo = `VOID - ${tx.transaction_no} `;
            const revResult = this.db.prepare(`
        INSERT INTO transactions(transaction_no, type, date, contact_id, description, total_amount, gst_amount, discount_amount, net_amount, payment_mode, reference, status, created_by)
VALUES(?, ?, date('now'), ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?)
      `).run(
                revTxNo,
                'adjustment', // Reversing adjustment
                tx.contact_id,
                `Reversal of ${tx.transaction_no} `,
                tx.total_amount,
                tx.gst_amount,
                tx.discount_amount,
                tx.net_amount,
                tx.payment_mode,
                `Ref: ${tx.transaction_no} `,
                userId
            );

            const revTxId = revResult.lastInsertRowid as number;

            // 4. Reverse lines (swap debit/credit amounts)
            const insertLine = this.db.prepare(`
        INSERT INTO transaction_lines(transaction_id, account_id, contact_id, item_id, description, debit_amount, credit_amount, gst_amount, gst_type)
VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

            for (const line of originalLines) {
                insertLine.run(
                    revTxId,
                    line.account_id,
                    line.contact_id,
                    line.item_id,
                    `Reversing: ${line.description} `,
                    line.credit_amount, // Swap credit to debit
                    line.debit_amount,  // Swap debit to credit
                    line.gst_amount,
                    line.gst_type === 'input' ? 'output' : (line.gst_type === 'output' ? 'input' : null) // Reverse GST
                );
            }

            // 5. Reverse Stock
            const stockMovements = this.db.prepare('SELECT * FROM stock_movements WHERE transaction_id = ?').all(transactionId) as any[];
            if (stockMovements.length > 0) {
                const insertStock = this.db.prepare(`
          INSERT INTO stock_movements(item_id, transaction_id, type, quantity, unit_cost, total_cost, reference)
VALUES(?, ?, ?, ?, ?, ?, ?)
        `);

                for (const mov of stockMovements) {
                    const revType = mov.type === 'in' ? 'out' : 'in';
                    insertStock.run(
                        mov.item_id,
                        revTxId,
                        revType,
                        mov.quantity,
                        mov.unit_cost,
                        mov.total_cost,
                        `Reversal of ${tx.transaction_no} `
                    );

                    // Update actual quantity
                    const qtyChange = revType === 'in' ? mov.quantity : -mov.quantity;
                    this.db.prepare('UPDATE items SET quantity_in_stock = quantity_in_stock + ? WHERE id = ?').run(qtyChange, mov.item_id);
                }
            }

            // 6. Void Invoice
            if (tx.invoice_id) {
                this.db.prepare('UPDATE invoices SET is_void = 1, payment_status = "void" WHERE id = ?').run(tx.invoice_id);
            }

            // Ensure ledger lines sum is 0
            const revLines = originalLines.map(line => ({
                accountId: line.account_id,
                description: `Reversing: ${line.description} `,
                debitAmount: line.credit_amount,
                creditAmount: line.debit_amount
            }));

            // Use engine to validate Double Entry rules on the reversing lines
            // Note: We access a private/protected member for validation or instantiate a manual check. Let's do a manual check.
            const totalDebit = Number(revLines.reduce((sum, line) => sum + (line.debitAmount || 0), 0).toFixed(2));
            const totalCredit = Number(revLines.reduce((sum, line) => sum + (line.creditAmount || 0), 0).toFixed(2));

            if (totalDebit !== totalCredit) {
                throw new Error('Automation Rule Error: Reversing transaction is imbalanced.');
            }

            return { success: true, message: `Transaction ${tx.transaction_no} voided cleanly.Reversing entry ${revTxNo} created.` };
        })();
    }

    // ==========================================
    // 10. ERROR PREVENTION LOGIC
    // ==========================================

    public preventInvalidDeletion(entityType: 'account' | 'contact' | 'item', id: number) {
        if (entityType === 'account') {
            const lines = this.db.prepare('SELECT count(*) as count FROM transaction_lines WHERE account_id = ?').get(id) as any;
            if (lines && lines.count > 0) {
                throw new Error("Cannot delete an account that has transactions. Consider deactivating it strictly.");
            }
        } else if (entityType === 'contact') {
            const lines = this.db.prepare('SELECT count(*) as count FROM transaction_lines WHERE contact_id = ?').get(id) as any;
            if (lines && lines.count > 0) {
                throw new Error("Cannot delete a contact that has transactions.");
            }
        } else if (entityType === 'item') {
            const txCount = this.db.prepare('SELECT count(*) as count FROM transaction_lines WHERE item_id = ?').get(id) as any;
            const stockCount = this.db.prepare('SELECT count(*) as count FROM stock_movements WHERE item_id = ?').get(id) as any;

            if ((txCount && txCount.count > 0) || (stockCount && stockCount.count > 0)) {
                throw new Error("Cannot delete an item that has transaction history or stock movements.");
            }
        }
    }

    public preventZeroAmount(amount: number) {
        if (amount <= 0) {
            throw new Error("Transaction amount must be strictly greater than zero.");
        }
    }

    // ==========================================
    // 11. DASHBOARD AUTOMATION
    // ==========================================

    public getRealtimeDashboardMetrics() {
        const today = new Date().toISOString().split('T')[0];

        // Total Sales Today
        const salesAcc = this.db.prepare("SELECT id FROM accounts WHERE code = '4000'").get() as any;
        const salesToday = this.db.prepare(`
      SELECT COALESCE(SUM(credit_amount - debit_amount), 0) as total 
      FROM transaction_lines tl
      JOIN transactions t ON t.id = tl.transaction_id
      WHERE tl.account_id = ? AND t.date = ? AND t.is_void = 0
    `).get(salesAcc?.id || 0, today) as any;

        // Cash Balance
        const cashAcc = this.db.prepare("SELECT id FROM accounts WHERE code = '1100'").get() as any;
        const cashBalance = this.db.prepare(`
      SELECT COALESCE(SUM(debit_amount - credit_amount), 0) as total 
      FROM transaction_lines tl
      JOIN transactions t ON t.id = tl.transaction_id
      WHERE tl.account_id = ? AND t.is_void = 0
    `).get(cashAcc?.id || 0) as any;

        // Bank Balance
        const bankAcc = this.db.prepare("SELECT id FROM accounts WHERE code = '1200'").get() as any;
        const bankBalance = this.db.prepare(`
      SELECT COALESCE(SUM(debit_amount - credit_amount), 0) as total 
      FROM transaction_lines tl
      JOIN transactions t ON t.id = tl.transaction_id
      WHERE tl.account_id = ? AND t.is_void = 0
    `).get(bankAcc?.id || 0) as any;

        return {
            todaySales: salesToday?.total || 0,
            cashBalance: cashBalance?.total || 0,
            bankBalance: bankBalance?.total || 0
        };
    }

}
