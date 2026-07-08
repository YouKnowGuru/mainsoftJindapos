import { DatabaseManager } from '../database/DatabaseManager';
import Database from 'better-sqlite3';
import { getDeviceId } from '../utils/deviceId';
import os from 'os';
import bcrypt from 'bcryptjs';
import { format } from 'date-fns';
import type {
  User,
  LoginCredentials,
  LoginResponse,
  Contact,
  CreateContactData,
  Transaction,
  SaleData,
  ReceiveMoneyData,
  PayMoneyData,
  TransferData,
  ApiResponse,
  LedgerData
} from '../types';

import { AccountingEngineService } from './AccountingEngineService';
import type { EngineEvent, EngineTransactionLine, EngineItem } from './AccountingEngineService';

import { AutomationService } from './AutomationService';
import { AuditService } from './AuditService';
import { API_BASE_URL } from '../config/api';

/**
 * AccountingService - Core accounting operations with strict double-entry validation
 */
export class AccountingService {
  private db: Database.Database;
  private dbManager: DatabaseManager;
  private currentUser: User | null = null;
  private engine: AccountingEngineService;
  private automation: AutomationService;
  private audit: AuditService;

  constructor(dbManager: DatabaseManager) {
    this.dbManager = dbManager;
    this.db = dbManager.getDatabase();
    this.engine = new AccountingEngineService(dbManager);
    this.automation = new AutomationService(dbManager);
    this.audit = new AuditService(dbManager);
  }

  // ============================================
  // AUTHENTICATION
  // ============================================

  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      // 1. Try Local Login First
      let user = this.db.prepare(`
        SELECT * FROM users 
        WHERE (username = ? OR email = ?) 
        AND is_active = 1
      `).get(credentials.username, credentials.username) as any;

      if (user) {
        const isVerified = user.is_verified === 1;

        if (isVerified) {
          // Standard login logic for verified users
          const validPassword = bcrypt.compareSync(credentials.password, user.password_hash);

          if (!validPassword) {
            // Local password failed, try cloud login to sync
            console.log('[Auth] Local password mismatch, attempting Cloud sync...');
            const cloudResult = await this.performCloudLogin(user.email || credentials.username, credentials.password);

            // Check if server requires device step-up verification
            if (cloudResult.needsStepUp && cloudResult.stepUpType) {
              return {
                success: false,
                message: cloudResult.message || 'New device detected. Please verify with email.',
                needsStepUp: true,
                stepUpType: cloudResult.stepUpType,
                email: cloudResult.email,
                maxAttempts: cloudResult.maxAttempts,
                lockoutMinutes: cloudResult.lockoutMinutes,
              } as any;
            }

            if (cloudResult.success && cloudResult.user) {
              // Cloud confirmed password, sync it locally
              const salt = bcrypt.genSaltSync(12);
              const passwordHash = bcrypt.hashSync(credentials.password, salt);
              this.db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
                .run(passwordHash, user.id);

              user.password_hash = passwordHash;
            } else {
              return { success: false, message: cloudResult.message || 'Invalid email or password' };
            }
          } else {
            // Local password is valid.
            // NOTE: We do NOT check server for device mismatch here.
            // The renderer (AuthService) handles server communication and device verification.
            // If we are here, the local password matched, so we allow local login.
            console.log('[Auth] Local password valid. Proceeding with local login.');
          }
        } else {
          // NOT VERIFIED - Force cloud login to check if status changed
          console.log('[Auth] User unverified locally. Forcing cloud check...');
          const cloudResult = await this.performCloudLogin(user.email || credentials.username, credentials.password);

          if (cloudResult.success && cloudResult.user && cloudResult.user.isVerified) {
            // User IS now verified on server - update local record
            this.db.prepare('UPDATE users SET is_verified = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
              .run(user.id);
            user.is_verified = 1;

            // Also sync password while we're at it
            const salt = bcrypt.genSaltSync(12);
            const passwordHash = bcrypt.hashSync(credentials.password, salt);
            this.db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
              .run(passwordHash, user.id);
          } else {
            return {
              success: false,
              message: cloudResult.message || 'Please verify your email address before logging in.',
              needsVerification: cloudResult.needsVerification || !cloudResult.success,
              email: user.email
            } as any;
          }
        }
      } else {
        // User not found locally - Attempt Cloud Registration Sync
        console.log('[Auth] User not found locally, attempting Cloud login...');
        const cloudResult = await this.performCloudLogin(credentials.username, credentials.password);

        // Check if server requires device step-up verification
        if (cloudResult.needsStepUp && cloudResult.stepUpType) {
          return {
            success: false,
            message: cloudResult.message || 'New device detected. Please verify with email.',
            needsStepUp: true,
            stepUpType: cloudResult.stepUpType,
            email: cloudResult.email,
            maxAttempts: cloudResult.maxAttempts,
            lockoutMinutes: cloudResult.lockoutMinutes,
          } as any;
        }

        if (cloudResult.success && cloudResult.user) {
          // Auto-Create Local User from Cloud Data
          const salt = bcrypt.genSaltSync(12);
          const passwordHash = bcrypt.hashSync(credentials.password, salt);

          const insertResult = this.db.prepare(`
            INSERT INTO users (username, email, password_hash, full_name, role, is_active, is_verified)
            VALUES (?, ?, ?, ?, ?, 1, ?)
          `).run(
            cloudResult.user.username,
            cloudResult.user.email,
            passwordHash,
            cloudResult.user.fullName || cloudResult.user.username,
            'admin',
            cloudResult.user.isVerified ? 1 : 0
          );

          user = this.db.prepare('SELECT * FROM users WHERE id = ?').get(insertResult.lastInsertRowid) as any;

          if (!cloudResult.user.isVerified) {
            return {
              success: false,
              message: 'Check your email to verify your account.',
              needsVerification: true,
              email: cloudResult.user.email
            } as any;
          }
        } else {
          return { success: false, message: cloudResult.message || 'Invalid username, email or password' };
        }
      }

      // Final mapping to currentUser
      this.currentUser = {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role,
        isVerified: user.is_verified === 1,
        isActive: user.is_active === 1,
        createdAt: user.created_at,
      };

      this.audit.logAction({
        userId: user.id,
        action: 'LOGIN',
        entityType: 'users',
        entityId: user.id,
        newValues: { username: user.username, role: user.role }
      });

      return {
        success: true,
        user: this.currentUser
      };
    } catch (error: any) {
      console.error('Login error:', error);
      return { success: false, message: 'Login failed: ' + error.message };
    }
  }

  /**
   * Helper to perform cloud login from Main process
   */
  private async performCloudLogin(email: string, password: string): Promise<any> {
    try {
      const deviceId = getDeviceId();
      const deviceInfo = {
        platform: os.platform(),
        hostname: os.hostname(),
        arch: os.arch(),
        type: 'desktop_sync'
      };

      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          deviceId,
          deviceInfo
        })
      });

      const data = await response.json() as any;
      return {
        success: response.ok && data.success,
        needsStepUp: data.needsStepUp,
        stepUpType: data.stepUpType,
        email: data.email,
        maxAttempts: data.maxAttempts,
        lockoutMinutes: data.lockoutMinutes,
        ...data
      };
    } catch (error: any) {
      return { success: false, message: 'Unable to reach the server. Please check your internet connection.' };
    }
  }

  logout(): void {
    if (this.currentUser) {
      this.audit.logAction({
        userId: this.currentUser.id,
        action: 'LOGOUT',
        entityType: 'users',
        entityId: this.currentUser.id
      });
    }
    this.currentUser = null;
  }

  syncLocalPassword(email: string, password: string): ApiResponse {
    try {
      const user = this.db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
      if (!user) return { success: false, message: 'User not found locally' };

      const newHash = bcrypt.hashSync(password, 12);
      this.db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(newHash, user.id);

      return { success: true };
    } catch (error: any) {
      console.error('Password sync error:', error);
      return { success: false, message: error.message };
    }
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  changePassword(data: { userId: number; newPassword: string; oldPassword?: string }): ApiResponse {
    try {
      if (!this.currentUser) {
        return { success: false, message: 'Not authenticated' };
      }

      if (!data.newPassword || data.newPassword.length < 6) {
        return { success: false, message: 'New password must be at least 6 characters long' };
      }

      const targetUser = this.db.prepare('SELECT * FROM users WHERE id = ?').get(data.userId) as any;

      if (!targetUser) {
        return { success: false, message: 'User not found' };
      }

      // Security Check: If it's the user changing their own password, OR if a non-admin is trying to change a password
      if (this.currentUser.id === data.userId || this.currentUser.role !== 'admin') {
        // Must provide old password
        if (!data.oldPassword) {
          return { success: false, message: 'Current password is required to change your own password' };
        }

        const validPassword = bcrypt.compareSync(data.oldPassword, targetUser.password_hash);
        if (!validPassword) {
          return { success: false, message: 'Incorrect current password' };
        }
      } else {
        // Admin changing someone else's password - just verify the current user is actually an admin
        if (this.currentUser.role !== 'admin') {
          return { success: false, message: 'Insufficient privileges' };
        }
      }

      const newPasswordHash = bcrypt.hashSync(data.newPassword, 12);

      this.db.prepare(
        'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).run(newPasswordHash, data.userId);

      this.audit.logAction({
        userId: this.currentUser.id,
        action: 'CHANGE_PASSWORD',
        entityType: 'users',
        entityId: data.userId
      });

      return { success: true, message: 'Password updated successfully' };
    } catch (error: any) {
      console.error('Change password error:', error);
      return { success: false, message: 'Failed to change password: ' + error.message };
    }
  }

  // ============================================
  // CONTACTS (CUSTOMERS & SUPPLIERS)
  // ============================================

  createContact(data: CreateContactData): ApiResponse<Contact> {
    try {
      // Validate required fields
      if (!data.name || !data.type) {
        return { success: false, message: 'Name and type are required' };
      }

      // Get the appropriate parent account
      const parentAccountCode = data.type === 'customer' ? '1300' : '2100';
      const parentAccount = this.db.prepare('SELECT id FROM accounts WHERE code = ?').get(parentAccountCode) as any;

      if (!parentAccount) {
        return { success: false, message: 'Parent account not found' };
      }

      // Create sub-account for this contact
      const accountCode = this.generateAccountCode(parentAccountCode);
      const accountName = `${data.name} (${data.type === 'customer' ? 'Customer' : 'Supplier'})`;

      const accountResult = this.db.prepare(`
        INSERT INTO accounts (code, name, type, subtype, parent_id)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        accountCode,
        accountName,
        data.type === 'customer' ? 'asset' : 'liability',
        data.type === 'customer' ? 'current_asset' : 'current_liability',
        parentAccount.id
      );

      const accountId = accountResult.lastInsertRowid as number;

      // Create contact
      const openingBalance = data.openingBalance || 0;
      const addrStreet = data.addressStructured?.street || data.address || null;
      const addrGewog = data.addressStructured?.gewog || null;
      const addrDzongkhag = data.addressStructured?.dzongkhag || null;

      const result = this.db.prepare(`
        INSERT INTO contacts
        (type, name, contact_person, phone, email, address, address_street, address_gewog, address_dzongkhag, credit_limit, credit_days, opening_balance, current_balance, gst_number, account_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.type,
        data.name,
        data.contactPerson || null,
        data.phone || null,
        data.email || null,
        data.address || null,
        addrStreet,
        addrGewog,
        addrDzongkhag,
        data.creditLimit || 50000,
        data.creditDays || 30,
        openingBalance,
        openingBalance,
        data.gstNumber || null,
        accountId
      );

      const contactId = result.lastInsertRowid as number;

      // If opening balance exists, create opening entry
      if (openingBalance !== 0) {
        this.createOpeningBalanceEntry(accountId, openingBalance, data.type);
      }

      this.audit.logAction({
        userId: this.currentUser?.id,
        action: 'CREATE_CONTACT',
        entityType: 'contacts',
        entityId: contactId,
        newValues: data
      });

      const contact = this.getContactById(contactId);
      if (!contact) {
        return { success: false, message: 'Failed to retrieve created contact' };
      }
      return {
        success: true,
        data: contact,
        message: `${data.type === 'customer' ? 'Customer' : 'Supplier'} created successfully`
      };
    } catch (error: any) {
      console.error('Create contact error:', error);
      return { success: false, message: 'Failed to create contact: ' + error.message };
    }
  }

  getContactById(id: number): Contact | null {
    try {
      const contact = this.db.prepare('SELECT * FROM contacts WHERE id = ?').get(id) as any;
      if (!contact) return null;

      return this.mapContactFromDb(contact);
    } catch (error) {
      console.error('Get contact error:', error);
      return null;
    }
  }

  getContacts(type?: 'customer' | 'supplier'): Contact[] {
    try {
      let query = 'SELECT * FROM contacts WHERE is_active = 1';
      const params: any[] = [];

      if (type) {
        query += ' AND type = ?';
        params.push(type);
      }

      query += ' ORDER BY name';

      const contacts = this.db.prepare(query).all(...params);
      return contacts.map((c: any) => this.mapContactFromDb(c));
    } catch (error) {
      console.error('Get contacts error:', error);
      return [];
    }
  }

  updateContact(id: number, data: Partial<CreateContactData>): ApiResponse {
    try {
      const sets: string[] = [];
      const values: any[] = [];

      // BUG-03 FIX: Use an explicit whitelist of allowed field mappings to prevent
      // SQL injection through arbitrary camelCase→snake_case key conversion.
      const CONTACT_FIELD_WHITELIST: Record<string, string> = {
        name:          'name',
        phone:         'phone',
        email:         'email',
        contactPerson: 'contact_person',
        address:       'address',
        creditLimit:   'credit_limit',
        creditDays:    'credit_days',
        gstNumber:     'gst_number',
        isActive:      'is_active',
        type:          'type',
      };

      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && key !== 'addressStructured') {
          const dbKey = CONTACT_FIELD_WHITELIST[key];
          if (dbKey) {
            sets.push(`${dbKey} = ?`);
            values.push(value);
          }
          // Silently skip unknown/unlisted keys — they are not updatable
        }
      });

      // Handle structured address fields
      if (data.addressStructured) {
        if (data.addressStructured.street !== undefined) {
          sets.push('address_street = ?');
          values.push(data.addressStructured.street);
        }
        if (data.addressStructured.gewog !== undefined) {
          sets.push('address_gewog = ?');
          values.push(data.addressStructured.gewog);
        }
        if (data.addressStructured.dzongkhag !== undefined) {
          sets.push('address_dzongkhag = ?');
          values.push(data.addressStructured.dzongkhag);
        }
      }

      if (sets.length === 0) {
        return { success: false, message: 'No fields to update' };
      }

      values.push(id);

      this.db.prepare(`UPDATE contacts SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values);

      this.audit.logAction({
        userId: this.currentUser?.id,
        action: 'UPDATE_CONTACT',
        entityType: 'contacts',
        entityId: id,
        newValues: data
      });

      return { success: true, message: 'Contact updated successfully' };
    } catch (error: any) {
      console.error('Update contact error:', error);
      return { success: false, message: 'Failed to update contact: ' + error.message };
    }
  }


  deleteContact(id: number): ApiResponse {
    try {
      // Prevent deletion if contact has transactions
      this.automation.preventInvalidDeletion('contact', id);

      const contact = this.db.prepare('SELECT account_id FROM contacts WHERE id = ?').get(id) as any;

      this.db.prepare('DELETE FROM contacts WHERE id = ?').run(id);

      if (contact) {
        this.db.prepare('DELETE FROM accounts WHERE id = ?').run(contact.account_id);
      }

      this.audit.logAction({
        userId: this.currentUser?.id,
        action: 'DELETE_CONTACT',
        entityType: 'contacts',
        entityId: id
      });

      return { success: true, message: 'Contact deleted successfully' };
    } catch (error: any) {
      console.error('Delete contact error:', error);
      return { success: false, message: 'Failed to delete contact: ' + error.message };
    }
  }

  getContactLedger(contactId: number): ApiResponse<LedgerData> {
    try {
      const contact = this.getContactById(contactId);

      if (!contact) {
        return { success: false, message: 'Contact not found' };
      }

      const transactions = this.db.prepare(`
        SELECT
          t.id,
          t.transaction_no,
          t.date,
          t.type,
          t.payment_mode,
          t.description,
          t.reference,
          COALESCE(SUM(CASE WHEN (
            tl.account_id = ? 
            OR (
              (tl.contact_id = ? OR t.contact_id = ?) 
              AND tl.account_id IN (
                SELECT id FROM accounts 
                WHERE code IN ('1300', '2100') 
                   OR parent_id IN (SELECT id FROM accounts WHERE code IN ('1300', '2100'))
              )
            )
          ) THEN tl.debit_amount ELSE 0 END), 0) as debit,
          COALESCE(SUM(CASE WHEN (
            tl.account_id = ? 
            OR (
              (tl.contact_id = ? OR t.contact_id = ?) 
              AND tl.account_id IN (
                SELECT id FROM accounts 
                WHERE code IN ('1300', '2100') 
                   OR parent_id IN (SELECT id FROM accounts WHERE code IN ('1300', '2100'))
              )
            )
          ) THEN tl.credit_amount ELSE 0 END), 0) as credit
        FROM transactions t
        LEFT JOIN transaction_lines tl ON t.id = tl.transaction_id
        WHERE t.contact_id = ? AND t.is_void = 0
        GROUP BY t.id
        ORDER BY t.date, t.created_at
      `).all(contact.accountId, contactId, contactId, contact.accountId, contactId, contactId, contactId);

      // Calculate running balance
      let balance = contact.openingBalance;
      const entries = transactions.map((t: any) => {
        const isCustomer = contact.type === 'customer';
        const debit = isCustomer ? Number(t.debit) : Number(t.credit);
        const credit = isCustomer ? Number(t.credit) : Number(t.debit);

        balance += (debit - credit);

        return {
          id: t.id,
          transactionNo: t.transaction_no,
          date: t.date,
          type: t.type,
          paymentMode: t.payment_mode,
          description: t.description,
          reference: t.reference,
          debit,
          credit,
          balance
        };
      });

      return {
        success: true,
        data: {
          contact,
          openingBalance: contact.openingBalance,
          entries,
          currentBalance: balance
        }
      };
    } catch (error: any) {
      console.error('Get ledger error:', error);
      return { success: false, message: 'Failed to get ledger: ' + error.message };
    }
  }

  // ============================================
  // TRANSACTIONS - DOUBLE ENTRY ACCOUNTING
  // ============================================

  createSale(data: SaleData): ApiResponse<any> {
    try {
      // Validate input
      if (!data.items || data.items.length === 0) {
        return { success: false, message: 'No items in sale' };
      }

      // Base validation
      this.automation.preventZeroAmount(data.items.length);

      const dateStr = format(new Date(), 'yyyy-MM-dd');
      const discountAmount = data.discountAmount || 0;
      const taxType = data.taxType || 'standard';

      // Fetch domestic GST rate from settings if needed
      let domesticGstRate = 0;
      if (taxType === 'domestic') {
        const domesticSetting = this.db.prepare("SELECT value FROM settings WHERE key = 'gst_rate_domestic'").get() as any;
        domesticGstRate = domesticSetting ? parseFloat(domesticSetting.value) || 0 : 0;
      }

      // Calculate subtotal first (pre-discount total of all items)
      let subtotal = 0;
      let totalGst = 0;
      const engineItems: EngineItem[] = [];

      for (const item of data.items) {
        subtotal += (item.quantity * item.unitPrice);
      }

      // Calculate discount factor: proportion of subtotal remaining after discount
      const discountFactor = subtotal > 0 ? (subtotal - discountAmount) / subtotal : 1;
      const discountedSubtotal = subtotal - discountAmount;

      for (const item of data.items) {
        const itemDetails = this.db.prepare('SELECT * FROM items WHERE id = ?').get(item.itemId) as any;
        if (!itemDetails) {
          return { success: false, message: `Item not found: ID ${item.itemId}` };
        }

        // For domestic tax type, use the domestic GST rate; otherwise, use the item's own GST rate
        const gstRate = taxType === 'domestic'
          ? domesticGstRate
          : (item.gstRate !== undefined ? item.gstRate : (itemDetails.gst_rate || 5.0));

        const itemTotal = item.quantity * item.unitPrice;

        // GST is calculated on the discounted amount (Bhutan GST practice)
        // Each item's GST is proportional to its share of the subtotal
        const itemDiscountedTotal = itemTotal * discountFactor;
        const gstAmount = itemDetails.gst_applicable ? Number((itemDiscountedTotal * gstRate / 100).toFixed(2)) : 0;

        totalGst += gstAmount;

        engineItems.push({
          itemId: item.itemId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          gstRate,
          gstAmount,
          totalAmount: Number((itemDiscountedTotal + gstAmount).toFixed(2)),
          isStockApplicable: true,
          name: itemDetails.name + (item.description && item.description !== itemDetails.name ? ` - ${item.description}` : (itemDetails.description ? ` - ${itemDetails.description}` : ''))
        });
      }

      // Round total GST to 2 decimals to prevent floating point drift
      totalGst = Number(totalGst.toFixed(2));

      const netAmount = discountedSubtotal + totalGst;

      // Validate sale has value
      if (subtotal <= 0) {
        return { success: false, message: 'Sale amount cannot be zero or negative. Please check item prices and quantities.' };
      }

      // Prevent excessive discounts making sale zero/negative
      if (netAmount <= 0) {
        return { success: false, message: 'Discount cannot equal or exceed subtotal plus tax.' };
      }

      // Defensive check for NaN
      if (isNaN(subtotal) || isNaN(netAmount)) {
        console.error('AccountingService: NaN detected in sale calculation', { subtotal, netAmount, items: data.items });
        return { success: false, message: 'Internal Error: Invalid calculation detected (NaN). Please check item prices.' };
      }

      // 1. Get Accounts via Automation mapping
      const mapping = this.automation.mapAccounts('sale', data.paymentMode);

      // 2. Prepare double entry lines
      const lines: EngineTransactionLine[] = [];

      // Debit Cash/Customer (net amount after discount)
      // Always link to customer for proper ledger tracking
      lines.push({
        accountId: mapping.debitAccount,
        contactId: data.customerId,
        description: data.notes || `Sale - ${data.paymentMode}`,
        debitAmount: netAmount,
        creditAmount: 0
      });

      // Handle discount - debit Discount Allowed expense account
      if (discountAmount > 0) {
        const discountAccount = this.db.prepare("SELECT id FROM accounts WHERE code = '6400' OR subtype = 'other_expense' LIMIT 1").get() as any;
        if (discountAccount) {
          lines.push({
            accountId: discountAccount.id,
            description: 'Discount Allowed',
            debitAmount: discountAmount,
            creditAmount: 0
          });
        }
      }

      // Credit Sales Revenue (discounted subtotal — revenue after discount)
      const revenueAfterDiscount = subtotal - discountAmount;
      lines.push({
        accountId: mapping.creditAccount,
        description: 'Sales Revenue',
        debitAmount: 0,
        creditAmount: revenueAfterDiscount
      });

      // Credit GST Output (if applicable)
      if (totalGst > 0) {
        const gstAccountId = this.automation.getGstAccount();
        // Use the actual GST rate from the first taxable item, or default to 5.0
        const effectiveGstRate = data.items[0]?.gstRate ?? 5.0;
        lines.push({
          accountId: gstAccountId,
          description: 'GST Output',
          debitAmount: 0,
          creditAmount: totalGst,
          gstAmount: totalGst,
          gstRate: taxType === 'domestic' ? domesticGstRate : effectiveGstRate,
          gstType: 'output'
        });
      }

      // Generate COGS entries
      const cogsAccount = this.db.prepare('SELECT id FROM accounts WHERE code = ?').get('5000') as any;
      const inventoryAccount = this.db.prepare('SELECT id FROM accounts WHERE code = ?').get('1400') as any;

      let totalCogs = 0;
      for (const item of data.items) {
        const itemDetails = this.db.prepare('SELECT average_cost FROM items WHERE id = ?').get(item.itemId) as any;
        // BUG-02 FIX: Guard against missing item or zero/null average_cost
        if (itemDetails && itemDetails.average_cost) {
          totalCogs += (itemDetails.average_cost * item.quantity);
        }
      }

      // BUG-02 FIX: Guard both accounts before pushing COGS lines
      if (totalCogs > 0 && cogsAccount && inventoryAccount) {
        lines.push({
          accountId: cogsAccount.id,
          description: 'Cost of Goods Sold',
          debitAmount: totalCogs,
          creditAmount: 0
        });
        lines.push({
          accountId: inventoryAccount.id,
          description: 'Inventory Value Deduction',
          debitAmount: 0,
          creditAmount: totalCogs
        });
      } else if (totalCogs > 0) {
        console.warn('[Sale] COGS accounts (5000/1400) not found in Chart of Accounts. COGS entry skipped.');
      }


      const event: EngineEvent = {
        type: 'sale',
        date: dateStr,
        contactId: data.customerId,
        description: data.notes || 'Sales Transaction',
        paymentMode: data.paymentMode,
        items: engineItems,
        subtotal,
        gstAmount: totalGst,
        discountAmount,
        netAmount,
        lines,
        taxType,
        createdBy: this.currentUser?.id,
        invoiceDetails: {
          paymentStatus: data.paymentMode === 'credit' ? 'unpaid' : 'paid',
          notes: data.notes
        }
      };

      const result = this.engine.executePipeline(event);

      if (!result.success) {
        return result;
      }

      const invoice = this.db.prepare('SELECT * FROM invoices WHERE id = ?').get(result.data.invoiceId);
      this.audit.logAction({
        userId: this.currentUser?.id,
        action: 'CREATE_SALE',
        entityType: 'transactions',
        entityId: result.data.transactionId,
        newValues: { amount: netAmount, invoiceNo: (invoice as any)?.invoice_no }
      });

      return {
        success: true,
        data: { invoice },
        message: 'Sale completed successfully'
      };
    } catch (error: any) {
      console.error('Create sale error:', error);
      return { success: false, message: 'Failed to create sale: ' + error.message };
    }
  }

  receiveMoney(data: ReceiveMoneyData): ApiResponse {
    try {
      if (data.amount <= 0) {
        return { success: false, message: 'Amount must be greater than zero' };
      }

      const dateStr = data.date || format(new Date(), 'yyyy-MM-dd');
      const lines: EngineTransactionLine[] = [];
      const mapping = this.automation.mapAccounts('receipt', data.paymentMode);

      // Debit Cash/Bank
      lines.push({
        accountId: mapping.debitAccount,
        description: data.description || 'Money Received',
        debitAmount: data.amount,
        creditAmount: 0
      });

      if (data.contactId) {
        lines.push({
          accountId: mapping.creditAccount,
          contactId: data.contactId,
          description: data.description || 'Payment Received',
          debitAmount: 0,
          creditAmount: data.amount
        });
      } else if (data.accountId) {
        // Validate account exists
        const account = this.db.prepare('SELECT id, name FROM accounts WHERE id = ?').get(data.accountId) as any;
        if (!account) {
          return { success: false, message: 'Selected account not found' };
        }
        lines.push({
          accountId: data.accountId,
          description: data.description || 'Income',
          debitAmount: 0,
          creditAmount: data.amount
        });
      } else {
        return { success: false, message: 'Either contactId or accountId must be provided' };
      }

      const event: EngineEvent = {
        type: 'receipt',
        date: dateStr,
        contactId: data.contactId,
        description: data.description || 'Money Received',
        reference: data.reference,
        paymentMode: data.paymentMode,
        subtotal: data.amount,
        gstAmount: 0,
        discountAmount: 0,
        netAmount: data.amount,
        lines,
        createdBy: this.currentUser?.id
      };

      const result = this.engine.executePipeline(event);

      if (!result.success) {
        return result;
      }

      this.audit.logAction({
        userId: this.currentUser?.id,
        action: 'RECEIVE_MONEY',
        entityType: 'transactions',
        entityId: result.data.transactionId,
        newValues: { amount: data.amount, paymentMode: data.paymentMode }
      });
      return { success: true, message: 'Payment received successfully' };
    } catch (error: any) {
      console.error('Receive money error:', error);
      return { success: false, message: 'Failed to receive payment: ' + error.message };
    }
  }

  payMoney(data: PayMoneyData): ApiResponse {
    try {
      if (data.amount <= 0) {
        return { success: false, message: 'Amount must be greater than zero' };
      }

      const dateStr = data.date || format(new Date(), 'yyyy-MM-dd');
      const lines: EngineTransactionLine[] = [];
      const mapping = this.automation.mapAccounts('payment', data.paymentMode);

      // Credit Cash/Bank
      lines.push({
        accountId: mapping.creditAccount,
        description: data.description || 'Money Paid',
        debitAmount: 0,
        creditAmount: data.amount
      });

      if (data.contactId) {
        lines.push({
          accountId: mapping.debitAccount,
          contactId: data.contactId,
          description: data.description || 'Payment Made',
          debitAmount: data.amount,
          creditAmount: 0
        });
      } else if (data.accountId) {
        // Validate account exists
        const account = this.db.prepare('SELECT id, name FROM accounts WHERE id = ?').get(data.accountId) as any;
        if (!account) {
          return { success: false, message: 'Selected account not found' };
        }
        lines.push({
          accountId: data.accountId,
          description: data.description || 'Expense',
          debitAmount: data.amount,
          creditAmount: 0
        });
      } else {
        return { success: false, message: 'Either contactId or accountId must be provided' };
      }

      const event: EngineEvent = {
        type: 'payment',
        date: dateStr,
        contactId: data.contactId,
        description: data.description || 'Money Paid',
        reference: data.reference,
        paymentMode: data.paymentMode,
        subtotal: data.amount,
        gstAmount: 0,
        discountAmount: 0,
        netAmount: data.amount,
        lines,
        createdBy: this.currentUser?.id
      };

      const result = this.engine.executePipeline(event);

      if (!result.success) {
        return result;
      }

      this.audit.logAction({
        userId: this.currentUser?.id,
        action: 'PAY_MONEY',
        entityType: 'transactions',
        entityId: result.data.transactionId,
        newValues: { amount: data.amount, paymentMode: data.paymentMode }
      });
      return { success: true, message: 'Payment made successfully' };
    } catch (error: any) {
      console.error('Pay money error:', error);
      return { success: false, message: 'Failed to make payment: ' + error.message };
    }
  }

  transferMoney(data: TransferData): ApiResponse {
    try {
      if (data.amount <= 0) {
        return { success: false, message: 'Amount must be greater than zero' };
      }

      if (data.fromAccountId === data.toAccountId) {
        return { success: false, message: 'Cannot transfer to the same account' };
      }

      // Validate both accounts exist and calculate current balance
      const fromAccount = this.db.prepare(`
        SELECT a.id, a.name, a.code, 
          COALESCE(SUM(tl.debit_amount - tl.credit_amount), 0) as balance
        FROM accounts a
        LEFT JOIN transaction_lines tl ON a.id = tl.account_id
        LEFT JOIN transactions t ON tl.transaction_id = t.id AND t.is_void = 0
        WHERE a.id = ?
        GROUP BY a.id
      `).get(data.fromAccountId) as any;

      if (!fromAccount) {
        return { success: false, message: 'Source account not found' };
      }

      const toAccount = this.db.prepare('SELECT id, name, code FROM accounts WHERE id = ?').get(data.toAccountId) as any;
      if (!toAccount) {
        return { success: false, message: 'Destination account not found' };
      }

      const dateStr = data.date || format(new Date(), 'yyyy-MM-dd');

      // Build the transfer event first — balance check will happen atomically inside the transaction
      const lines: EngineTransactionLine[] = [
        {
          accountId: data.toAccountId,
          description: data.description || 'Transfer In',
          debitAmount: data.amount,
          creditAmount: 0
        },
        {
          accountId: data.fromAccountId,
          description: data.description || 'Transfer Out',
          debitAmount: 0,
          creditAmount: data.amount
        }
      ];

      const event: EngineEvent = {
        type: 'transfer',
        date: dateStr,
        description: data.description || 'Fund Transfer',
        reference: data.reference,
        subtotal: data.amount,
        gstAmount: 0,
        discountAmount: 0,
        netAmount: data.amount,
        lines,
        createdBy: this.currentUser?.id
      };

      // The engine's executePipeline runs inside a database transaction.
      // We add a pre-flight balance check inside the transaction for atomicity.
      // Wrap the balance check into the event validation by temporarily extending the pipeline.
      const result = this.engine.executePipelineWithBalanceCheck(event, data.fromAccountId, data.amount);

      if (!result.success) {
        return result;
      }

      this.audit.logAction({
        userId: this.currentUser?.id,
        action: 'TRANSFER',
        entityType: 'transactions',
        entityId: result.data.transactionId,
        newValues: { amount: data.amount, from: data.fromAccountId, to: data.toAccountId }
      });
      return { success: true, message: 'Transfer completed successfully' };
    } catch (error: any) {
      console.error('Transfer error:', error);
      return { success: false, message: 'Failed to transfer: ' + error.message };
    }
  }

  voidTransaction(id: number, reason: string): ApiResponse {
    try {
      const transaction = this.db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as any;

      if (!transaction) {
        return { success: false, message: 'Transaction not found' };
      }

      if (transaction.is_void) {
        return { success: false, message: 'Transaction is already voided' };
      }

      // Check if period is locked
      const transactionDate = new Date(transaction.date);
      const isLocked = this.db.prepare(`
        SELECT 1 FROM period_locks WHERE year = ? AND month = ? AND is_locked = 1
      `).get(transactionDate.getFullYear(), transactionDate.getMonth() + 1) as any;

      if (isLocked) {
        return { success: false, message: 'Cannot void transaction in a locked period' };
      }

      // Execute void atomically using AutomationService
      this.automation.handleVoid(id, this.currentUser?.id || 1, reason);

      this.audit.logAction({
        userId: this.currentUser?.id,
        action: 'VOID_TRANSACTION',
        entityType: 'transactions',
        entityId: id,
        newValues: { reason }
      });

      return { success: true, message: 'Transaction voided successfully' };
    } catch (error: any) {
      console.error('Void transaction error:', error);
      return { success: false, message: 'Failed to void transaction: ' + error.message };
    }
  }

  getTransactions(filters?: { type?: string; startDate?: string; endDate?: string; contactId?: number; limit?: number }): Transaction[] {
    try {
      let query = `
        SELECT 
          t.*,
          c.name as contact_name
        FROM transactions t
        LEFT JOIN contacts c ON t.contact_id = c.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (filters?.type) {
        query += ' AND t.type = ?';
        params.push(filters.type);
      }

      if (filters?.startDate) {
        query += ' AND t.date >= ?';
        params.push(filters.startDate);
      }

      if (filters?.endDate) {
        query += ' AND t.date <= ?';
        params.push(filters.endDate);
      }

      if (filters?.contactId) {
        query += ' AND t.contact_id = ?';
        params.push(filters.contactId);
      }

      query += ' ORDER BY t.date DESC, t.created_at DESC';

      if (filters?.limit) {
        query += ' LIMIT ?';
        params.push(filters.limit);
      }

      const transactions = this.db.prepare(query).all(...params);
      return transactions.map((t: any) => this.mapTransactionFromDb(t));
    } catch (error) {
      console.error('Get transactions error:', error);
      return [];
    }
  }

  getInvoiceByTransactionId(transactionId: number): ApiResponse<any> {
    try {
      const invoice = this.db.prepare(`
        SELECT i.*, c.name as customer_name, c.address as customer_address, c.phone as customer_phone, c.email as customer_email, c.gst_number as customer_gst
        FROM invoices i
        LEFT JOIN contacts c ON i.contact_id = c.id
        WHERE i.transaction_id = ?
      `).get(transactionId) as any;

      if (!invoice) {
        return { success: false, message: 'Invoice not found for this transaction' };
      }

      const items = this.db.prepare(`
        SELECT * FROM invoice_items WHERE invoice_id = ?
      `).all(invoice.id) as any[];

      return {
        success: true,
        data: {
          ...invoice,
          taxType: invoice.tax_type,
          items: items.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unit_price,
            gstRate: item.gst_rate,
            gstAmount: item.gst_amount,
            total: item.total_amount
          }))
        }
      };
    } catch (error: any) {
      console.error('Get invoice by transaction error:', error);
      return { success: false, message: 'Failed to get invoice: ' + error.message };
    }
  }

  // ============================================
  // HELPER METHODS
  // Methods below here were kept or refactored

  private generateAccountCode(parentCode: string): string {
    const lastAccount = this.db.prepare(`
      SELECT code FROM accounts 
      WHERE code LIKE ? AND code != ?
      ORDER BY code DESC LIMIT 1
    `).get(`${parentCode}-%`, parentCode) as any;

    let sequence = 1;
    if (lastAccount) {
      const parts = (lastAccount as any).code.split('-');
      sequence = parseInt(parts[1]) + 1;
    }

    return `${parentCode}-${sequence.toString().padStart(3, '0')}`;
  }


  // This method doesn't fit standard double-entry pipelines well if just inserting a single line.
  // We'll update it to create a proper double-entry journal, or just leave it for legacy fallback knowing it imbalances unless a balancing entry exists.
  // Wait, if it's an opening balance, the other side is typically Equity (Retained Earnings/Capital).
  createOpeningBalanceEntry(contactAccountId: number, balance: number, type: 'customer' | 'supplier'): void {
    const equityAccount = this.db.prepare('SELECT id FROM accounts WHERE code = ?').get('3100') as any; // Retained Earnings or a specialized Opening Balance Equity account

    this.dbManager.safeTransaction(() => {
      const transactionResult = this.db.prepare(`
        INSERT INTO transactions (transaction_no, type, date, description, total_amount, net_amount, status)
        VALUES (?, 'adjustment', date('now'), 'Opening Balance', ?, ?, 'completed')
      `).run(`OB-${Date.now()}`, balance, balance);

      const id = transactionResult.lastInsertRowid as number;

      if (type === 'customer') {
        this.db.prepare(`INSERT INTO transaction_lines (transaction_id, account_id, description, debit_amount, credit_amount) VALUES (?, ?, 'Opening Balance', ?, 0)`).run(id, contactAccountId, balance);
        this.db.prepare(`INSERT INTO transaction_lines (transaction_id, account_id, description, debit_amount, credit_amount) VALUES (?, ?, 'Opening Balance Offset', 0, ?)`).run(id, equityAccount.id, balance);
      } else {
        this.db.prepare(`INSERT INTO transaction_lines (transaction_id, account_id, description, debit_amount, credit_amount) VALUES (?, ?, 'Opening Balance', 0, ?)`).run(id, contactAccountId, balance);
        this.db.prepare(`INSERT INTO transaction_lines (transaction_id, account_id, description, debit_amount, credit_amount) VALUES (?, ?, 'Opening Balance Offset', ?, 0)`).run(id, equityAccount.id, balance);
      }
      return id;
    });
  }



  // logAudit removed - replaced by AuditService

  private mapContactFromDb(row: any): Contact {
    return {
      id: row.id,
      type: row.type,
      name: row.name,
      contactPerson: row.contact_person,
      phone: row.phone,
      email: row.email,
      address: row.address,
      addressStructured: {
        street: row.address_street,
        gewog: row.address_gewog,
        dzongkhag: row.address_dzongkhag,
      },
      creditLimit: row.credit_limit,
      creditDays: row.credit_days,
      openingBalance: row.opening_balance,
      currentBalance: row.current_balance,
      gstNumber: row.gst_number,
      isActive: row.is_active === 1,
      accountId: row.account_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapTransactionFromDb(row: any): Transaction {
    return {
      id: row.id,
      transactionNo: row.transaction_no,
      type: row.type,
      date: row.date,
      reference: row.reference,
      contactId: row.contact_id,
      contactName: row.contact_name,
      description: row.description,
      totalAmount: row.total_amount,
      gstAmount: row.gst_amount,
      discountAmount: row.discount_amount,
      netAmount: row.net_amount,
      paymentMode: row.payment_mode,
      status: row.status,
      isVoid: row.is_void === 1,
      voidReason: row.void_reason,
      voidedAt: row.voided_at,
      voidedBy: row.voided_by,
      invoiceId: row.invoice_id,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
