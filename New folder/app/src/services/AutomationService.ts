import { DatabaseManager } from '../database/DatabaseManager';
import Database from 'better-sqlite3';
import type { PaymentMode, ContactType } from '../types';

export class AutomationService {
    private db: Database.Database;
    private dbManager: DatabaseManager;

    constructor(dbManager: DatabaseManager) {
        this.dbManager = dbManager;
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
            },
            'refund': {
                'cash': { debit: '4000', credit: '1100' },
                'bank': { debit: '4000', credit: '1200' },
                'mBOB': { debit: '4000', credit: '1200' },
                'BNB': { debit: '4000', credit: '1200' },
                'TPay': { debit: '4000', credit: '1200' },
                'DrukPNB': { debit: '4000', credit: '1200' },
                'BDBL': { debit: '4000', credit: '1200' },
                'DKBank': { debit: '4000', credit: '1200' },
                'card': { debit: '4000', credit: '1200' },
                'credit': { debit: '4000', credit: '1300' }
            },
            'payroll': {
                'cash': { debit: '6200', credit: '1100' },
                'bank': { debit: '6200', credit: '1200' },
                'mBOB': { debit: '6200', credit: '1200' },
                'BNB': { debit: '6200', credit: '1200' },
                'TPay': { debit: '6200', credit: '1200' },
                'DrukPNB': { debit: '6200', credit: '1200' },
                'BDBL': { debit: '6200', credit: '1200' },
                'DKBank': { debit: '6200', credit: '1200' },
                'card': { debit: '6200', credit: '1200' },
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
        `).get(`${parentCode}-%`, parentCode) as any;

        let sequence = 1;
        if (lastAccount) {
            const parts = lastAccount.code.trim().split('-');
            if (parts.length > 1) {
                sequence = parseInt(parts[1]) + 1;
            }
        }
        const newCode = `${parentCode}-${sequence.toString().padStart(3, '0')}`;

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
            defaultGstRate: Number(settings.gst_rate || settings.default_gst_rate || 5),
            domesticGstRate: Number(settings.gst_rate_domestic || 0),
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
        // System orchestration: We mark the original transaction as void (is_void = 1).
        // Since all reporting and ledger queries filter by `is_void = 0`, the transaction
        // will naturally disappear from the ledger and balances.
        // We only need to reverse physical stock movements and update the cached contact balance.

        return this.dbManager.safeTransaction(() => {
            // 1. Mark original as void
            const voidResult = this.db.prepare(`
        UPDATE transactions
        SET is_void = 1, void_reason = ?, voided_at = datetime('now'), voided_by = ?
    WHERE id = ? AND is_void = 0
        `).run(reason, userId, transactionId);

            if (voidResult.changes === 0) throw new Error("Transaction not found or already voided.");

            const tx = this.db.prepare('SELECT * FROM transactions WHERE id = ?').get(transactionId) as any;

            // 2. Reverse Stock
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
                        transactionId,
                        revType,
                        mov.quantity,
                        mov.unit_cost,
                        mov.total_cost,
                        `Void Reversal of ${tx.transaction_no} `
                    );

                    // Update actual quantity
                    const qtyChange = revType === 'in' ? mov.quantity : -mov.quantity;
                    this.db.prepare('UPDATE items SET quantity_in_stock = quantity_in_stock + ? WHERE id = ?').run(qtyChange, mov.item_id);
                }
            }

            // 3. Void Invoice
            if (tx.invoice_id) {
                this.db.prepare('UPDATE invoices SET is_void = 1, payment_status = "void" WHERE id = ?').run(tx.invoice_id);
            }

            // 4. Update Contact Balance Cache
            if (tx.contact_id) {
                const contact = this.db.prepare('SELECT account_id, type, opening_balance FROM contacts WHERE id = ?').get(tx.contact_id) as any;
                if (contact) {
                    const balanceResult = this.db.prepare(`
                        SELECT 
                            COALESCE(SUM(tl.debit_amount), 0) as total_debit, 
                            COALESCE(SUM(tl.credit_amount), 0) as total_credit 
                        FROM transaction_lines tl
                        JOIN transactions t ON t.id = tl.transaction_id
                        WHERE t.is_void = 0 
                        AND t.transaction_no NOT LIKE 'OB-%'
                        AND (
                            tl.account_id = ? 
                            OR (
                                (tl.contact_id = ? OR t.contact_id = ?) 
                                AND tl.account_id IN (
                                    SELECT id FROM accounts 
                                    WHERE code IN ('1300', '2100') 
                                    OR parent_id IN (SELECT id FROM accounts WHERE code IN ('1300', '2100'))
                                )
                            )
                        )
                    `).get(contact.account_id, tx.contact_id, tx.contact_id) as any;

                    const debit = Number(balanceResult.total_debit);
                    const credit = Number(balanceResult.total_credit);
                    const newBalance = contact.type === 'customer' 
                        ? contact.opening_balance + (debit - credit)
                        : contact.opening_balance + (credit - debit);

                    this.db.prepare('UPDATE contacts SET current_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newBalance, tx.contact_id);
                }
            }

            return { success: true, message: `Transaction ${tx.transaction_no} voided cleanly.` };
        });
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
