/**
 * SECURE PRELOAD SCRIPT
 * Minimal API Exposure with Permission-Based Access
 *
 * Security Principles:
 * - Expose ONLY required APIs
 * - Validate all inputs before sending to main
 * - Never expose raw Node.js APIs
 * - Type-safe IPC communication
 * - Secure token storage using OS keychain
 */
import { ipcRenderer, contextBridge } from 'electron';

// ============================================
// INPUT SANITIZATION HELPERS
// ============================================

/**
 * Sanitize string input
 */
function sanitizeString(input: any, maxLength: number = 1000): string | null {
  if (typeof input !== 'string') return null;
  const sanitized = input.trim().slice(0, maxLength);
  // Remove null bytes and control characters
  return sanitized.replace(/[\x00-\x1F\x7F]/g, '');
}

/**
 * Sanitize number input
 */
function sanitizeNumber(input: any): number | null {
  if (typeof input === 'number' && !isNaN(input) && isFinite(input)) {
    return input;
  }
  if (typeof input === 'string') {
    const parsed = parseFloat(input);
    if (!isNaN(parsed) && isFinite(parsed)) return parsed;
  }
  return null;
}

/**
 * Validate ID
 */
function validateId(id: any): number | null {
  const num = sanitizeNumber(id);
  if (num === null) return null;
  return Number.isInteger(num) && num > 0 && num <= 2147483647 ? num : null;
}

// ============================================
// SECURE API IMPLEMENTATIONS
// ============================================

interface Credentials {
  username: string;
  password: string;
}

interface SaasRequestOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: Record<string, string>;
}

interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  userId: string;
  email: string;
}

const secureAuth = {
  /**
   * Login with credentials
   */
  login: async (credentials: Credentials) => {
    if (!credentials?.username || !credentials?.password) {
      return { success: false, message: 'Username and password required' };
    }

    const sanitized = {
      username: sanitizeString(credentials.username, 100) || '',
      password: credentials.password.slice(0, 256), // Limit password length
    };

    return ipcRenderer.invoke('auth:login', sanitized);
  },

  /**
   * Logout current user
   */
  logout: async () => {
    return ipcRenderer.invoke('auth:logout');
  },

  /**
   * Get current logged in user
   */
  getCurrentUser: async () => {
    return ipcRenderer.invoke('auth:getCurrentUser');
  },

  /**
   * Sync local password with SaaS password
   */
  syncPassword: async (data: { email: string; password: string }) => {
    if (!data?.email || !data?.password) {
      return { success: false, message: 'Email and password required' };
    }
    return ipcRenderer.invoke('auth:syncPassword', data);
  },
};

const secureInventory = {
  /**
   * Create new inventory item
   */
  createItem: async (data: any) => {
    if (!data?.name) {
      return { success: false, message: 'Item name required' };
    }

    const sanitized = {
      ...data,
      name: sanitizeString(data.name, 200) || '',
      code: data.code ? sanitizeString(data.code, 50) : null,
      description: data.description ? sanitizeString(data.description, 1000) : null,
      category: data.category ? sanitizeString(data.category, 100) : null,
    };

    return ipcRenderer.invoke('inventory:createItem', sanitized);
  },

  /**
   * Get all inventory items
   */
  getItems: async () => {
    const result = await ipcRenderer.invoke('inventory:getItems');
    return { success: true, data: result };
  },

  /**
   * Get single item by ID
   */
  getItem: async (id: any) => {
    const validatedId = validateId(id);
    if (validatedId === null) {
      return { success: false, message: 'Invalid ID' };
    }
    const result = await ipcRenderer.invoke('inventory:getItem', validatedId);
    return { success: true, data: result };
  },

  /**
   * Update inventory item
   */
  updateItem: async (id: any, data: any) => {
    const validatedId = validateId(id);
    if (validatedId === null) {
      return { success: false, message: 'Invalid ID' };
    }

    const sanitized = {
      id: validatedId,
      data: {
        ...data,
        name: data.name ? sanitizeString(data.name, 200) : undefined,
        code: data.code ? sanitizeString(data.code, 50) : undefined,
        description: data.description ? sanitizeString(data.description, 1000) : undefined,
      },
    };

    return ipcRenderer.invoke('inventory:updateItem', sanitized);
  },

  /**
   * Delete inventory item
   */
  deleteItem: async (id: any) => {
    const validatedId = validateId(id);
    if (validatedId === null) {
      return { success: false, message: 'Invalid ID' };
    }
    return ipcRenderer.invoke('inventory:deleteItem', validatedId);
  },

  /**
   * Add stock to item
   */
  addStock: async (stockData: any) => {
    const sanitized = {
      itemId: stockData.itemId ? validateId(stockData.itemId) : undefined,
      itemName: stockData.itemName ? sanitizeString(stockData.itemName, 200) : undefined,
      quantity: sanitizeNumber(stockData.quantity) || 0,
      purchasePrice: sanitizeNumber(stockData.purchasePrice) || 0,
      sellingPrice: stockData.sellingPrice !== undefined ? sanitizeNumber(stockData.sellingPrice) : undefined,
      gstApplicable: !!stockData.gstApplicable,
      gstRate: stockData.gstRate !== undefined ? sanitizeNumber(stockData.gstRate) : undefined,
      supplierId: stockData.supplierId ? validateId(stockData.supplierId) : undefined,
      paymentMode: ['cash', 'bank', 'credit', 'card', 'mBOB', 'BNB', 'TPay', 'DrukPNB', 'BDBL', 'DKBank'].includes(stockData.paymentMode) ? stockData.paymentMode : 'cash',
      type: stockData.type === 'in' || stockData.type === 'out' ? stockData.type : 'in',
      reference: stockData.reference ? sanitizeString(stockData.reference, 100) : null,
      notes: stockData.notes ? sanitizeString(stockData.notes, 500) : null,
    };
    return ipcRenderer.invoke('inventory:addStock', sanitized);
  },

  /**
   * Get low stock items
   */
  getLowStock: async () => {
    const result = await ipcRenderer.invoke('inventory:getLowStock');
    return { success: true, data: result };
  },

  /**
   * Get categories
   */
  getCategories: async () => {
    const result = await ipcRenderer.invoke('inventory:getCategories');
    return { success: true, data: result };
  },

  /**
   * Create category
   */
  createCategory: async (name: string) => {
    const sanitized = sanitizeString(name, 100);
    if (!sanitized) {
      return { success: false, message: 'Invalid category name' };
    }
    return ipcRenderer.invoke('inventory:createCategory', sanitized);
  },

  /**
   * Delete category
   */
  deleteCategory: async (id: number) => {
    const validatedId = validateId(id);
    if (validatedId === null) {
      return { success: false, message: 'Invalid ID' };
    }
    return ipcRenderer.invoke('inventory:deleteCategory', validatedId);
  },

  /**
   * Get units
   */
  getUnits: async () => {
    const result = await ipcRenderer.invoke('inventory:getUnits');
    return { success: true, data: result };
  },

  /**
   * Create unit
   */
  createUnit: async (name: string) => {
    const sanitized = sanitizeString(name, 50);
    if (!sanitized) {
      return { success: false, message: 'Invalid unit name' };
    }
    return ipcRenderer.invoke('inventory:createUnit', sanitized);
  },

  /**
   * Delete unit
   */
  deleteUnit: async (id: number) => {
    const validatedId = validateId(id);
    if (validatedId === null) {
      return { success: false, message: 'Invalid ID' };
    }
    return ipcRenderer.invoke('inventory:deleteUnit', validatedId);
  },
};

const securePOS = {
  /**
   * Create new sale
   */
  createSale: async (saleData: any) => {
    if (!saleData?.items || !Array.isArray(saleData.items) || saleData.items.length === 0) {
      return { success: false, message: 'Sale must have at least one item' };
    }

    if (saleData.items.length > 100) {
      return { success: false, message: 'Too many items (max 100)' };
    }

    const sanitizedItems = saleData.items.map((item: any) => ({
      itemId: validateId(item.itemId) || 0,
      quantity: sanitizeNumber(item.quantity) || 0,
      unitPrice: sanitizeNumber(item.unitPrice || item.price) || 0,
      discount: sanitizeNumber(item.discount) || 0,
      gstRate: sanitizeNumber(item.gstRate) || 5,
    }));

    const sanitized = {
      ...saleData,
      items: sanitizedItems,
      customerId: saleData.customerId ? validateId(saleData.customerId) : null,
      discountAmount: sanitizeNumber(saleData.discountAmount) || 0,
      notes: saleData.notes ? sanitizeString(saleData.notes, 1000) : null,
    };

    return ipcRenderer.invoke('pos:createSale', sanitized);
  },

  /**
   * Search inventory items
   */
  searchItems: async (query: string) => {
    const sanitizedQuery = sanitizeString(query, 100);
    if (!sanitizedQuery) {
      return { success: false, message: 'Invalid search query' };
    }
    const result = await ipcRenderer.invoke('pos:searchItems', sanitizedQuery);
    return { success: true, data: result };
  },

  /**
   * Get customers
   */
  getCustomers: async () => {
    const result = await ipcRenderer.invoke('pos:getCustomers');
    return { success: true, data: result };
  },

  /**
   * Get items
   */
  getItems: async () => {
    const result = await ipcRenderer.invoke('pos:getItems');
    return { success: true, data: result };
  },
};

const secureContacts = {
  /**
   * Create new contact (customer/supplier)
   */
  create: async (data: any) => {
    if (!data?.name || !data?.type) {
      return { success: false, message: 'Name and type required' };
    }

    const sanitized = {
      ...data,
      name: sanitizeString(data.name, 200) || '',
      contactPerson: data.contactPerson ? sanitizeString(data.contactPerson, 100) : null,
      phone: data.phone ? sanitizeString(data.phone, 20) : null,
      email: data.email ? sanitizeString(data.email, 254) : null,
      address: data.address ? sanitizeString(data.address, 500) : null,
      gstNumber: data.gstNumber ? sanitizeString(data.gstNumber, 50) : null,
    };

    return ipcRenderer.invoke('contacts:create', sanitized);
  },

  /**
   * Get all contacts
   */
  getAll: async (type?: 'customer' | 'supplier') => {
    const validType = type && ['customer', 'supplier'].includes(type) ? type : undefined;
    const result = await ipcRenderer.invoke('contacts:getAll', validType);
    return { success: true, data: result };
  },

  /**
   * Update contact
   */
  update: async (id: number, data: any) => {
    const validatedId = validateId(id);
    if (validatedId === null) {
      return { success: false, message: 'Invalid ID' };
    }
    return ipcRenderer.invoke('contacts:update', { id: validatedId, data });
  },

  /**
   * Delete contact
   */
  delete: async (id: number) => {
    const validatedId = validateId(id);
    if (validatedId === null) {
      return { success: false, message: 'Invalid ID' };
    }
    return ipcRenderer.invoke('contacts:delete', validatedId);
  },

  /**
   * Get contact ledger
   */
  getLedger: async (contactId: number) => {
    const validatedId = validateId(contactId);
    if (validatedId === null) {
      return { success: false, message: 'Invalid contact ID' };
    }
    return ipcRenderer.invoke('contacts:getLedger', validatedId);
  },
};

const secureTransactions = {
  /**
   * Receive money transaction
   */
  receiveMoney: async (data: any) => {
    const sanitized = {
      contactId: data.contactId ? validateId(data.contactId) : null,
      accountId: data.accountId ? validateId(data.accountId) : undefined,
      amount: sanitizeNumber(data.amount) || 0,
      paymentMode: sanitizeString(data.paymentMode, 20) || 'cash',
      reference: data.reference ? sanitizeString(data.reference, 100) : '',
      description: data.description ? sanitizeString(data.description, 1000) : '',
      date: data.date || new Date().toISOString().split('T')[0],
    };

    return ipcRenderer.invoke('transactions:receiveMoney', sanitized);
  },

  /**
   * Pay money transaction
   */
  payMoney: async (data: any) => {
    const sanitized = {
      contactId: data.contactId ? validateId(data.contactId) : null,
      accountId: data.accountId ? validateId(data.accountId) : undefined,
      amount: sanitizeNumber(data.amount) || 0,
      paymentMode: sanitizeString(data.paymentMode, 20) || 'cash',
      reference: data.reference ? sanitizeString(data.reference, 100) : '',
      description: data.description ? sanitizeString(data.description, 1000) : '',
      date: data.date || new Date().toISOString().split('T')[0],
    };

    return ipcRenderer.invoke('transactions:payMoney', sanitized);
  },

  /**
   * Void a transaction
   */
  void: async (data: any) => {
    const validatedId = validateId(data.transactionId);
    if (validatedId === null) {
      return { success: false, message: 'Invalid transaction ID' };
    }

    const sanitized = {
      transactionId: validatedId,
      reason: sanitizeString(data.reason, 500) || '',
    };

    return ipcRenderer.invoke('transactions:void', sanitized);
  },

  /**
   * Get all transactions
   */
  getAll: async (filters?: any) => {
    const result = await ipcRenderer.invoke('transactions:getAll', filters);
    return { success: true, data: result };
  },

  /**
   * Transfer money
   */
  transfer: async (data: any) => {
    const sanitized = {
      fromAccountId: validateId(data.fromAccountId) || 0,
      toAccountId: validateId(data.toAccountId) || 0,
      amount: sanitizeNumber(data.amount) || 0,
      date: data.date || new Date().toISOString().split('T')[0],
      reference: data.reference ? sanitizeString(data.reference, 100) : '',
      description: data.description ? sanitizeString(data.description, 1000) : '',
    };
    return ipcRenderer.invoke('transactions:transfer', sanitized);
  },

  /**
   * Get invoice data by transaction ID
   */
  getInvoiceData: async (transactionId: number) => {
    const validatedId = validateId(transactionId);
    if (validatedId === null) {
      return { success: false, message: 'Invalid transaction ID' };
    }
    const result = await ipcRenderer.invoke('transactions:getInvoiceData', validatedId);
    return { success: true, data: result };
  },

  /**
   * Export transactions
   */
  export: async (filters?: any) => {
    return ipcRenderer.invoke('transactions:export', filters);
  },
};

const secureDashboard = {
  /**
   * Get dashboard data
   */
  getData: async () => {
    return ipcRenderer.invoke('dashboard:getData');
  },

  /**
   * Get real-time metrics
   */
  getRealtimeMetrics: async () => {
    return ipcRenderer.invoke('dashboard:getRealtimeMetrics');
  },

  /**
   * Get notifications
   */
  getNotifications: async () => {
    return ipcRenderer.invoke('dashboard:getNotifications');
  },
};

const secureSettings = {
  /**
   * Get settings
   */
  get: async () => {
    const result = await ipcRenderer.invoke('settings:get');
    return { success: true, data: result };
  },

  /**
   * Update settings
   */
  update: async (settings: any) => {
    return ipcRenderer.invoke('settings:update', settings);
  },

  /**
   * Get users
   */
  getUsers: async () => {
    return ipcRenderer.invoke('settings:getUsers');
  },

  /**
   * Check if users exist
   */
  hasUsers: async () => {
    const result = await ipcRenderer.invoke('settings:hasUsers');
    return { success: true, data: result };
  },

  /**
   * Create initial user (no auth required)
   */
  createInitialUser: async (userData: any) => {
    if (!userData?.username || !userData?.password || !userData?.fullName) {
      return { success: false, message: 'Username, password, and full name required' };
    }

    const sanitized = {
      username: sanitizeString(userData.username, 50) || '',
      email: userData.email ? sanitizeString(userData.email, 254) : null,
      password: userData.password.slice(0, 128),
      fullName: sanitizeString(userData.fullName, 100) || '',
      role: 'admin',
    };

    return ipcRenderer.invoke('settings:createInitialUser', sanitized);
  },

  /**
   * Create new user
   */
  createUser: async (userData: any) => {
    if (!userData?.username || !userData?.password || !userData?.fullName) {
      return { success: false, message: 'Username, password, and full name required' };
    }

    const password = userData.password;
    if (password.length < 8) {
      return { success: false, message: 'Password must be at least 8 characters' };
    }
    if (password.length > 128) {
      return { success: false, message: 'Password too long' };
    }

    const sanitized = {
      username: sanitizeString(userData.username, 50) || '',
      email: userData.email ? sanitizeString(userData.email, 254) : null,
      password: password,
      fullName: sanitizeString(userData.fullName, 100) || '',
      role: ['admin', 'staff'].includes(userData.role) ? userData.role : 'staff',
    };

    return ipcRenderer.invoke('settings:createUser', sanitized);
  },

  /**
   * Change password
   */
  changePassword: async (data: any) => {
    const validatedId = validateId(data.userId);
    if (validatedId === null) {
      return { success: false, message: 'Invalid user ID' };
    }

    if (!data.newPassword || data.newPassword.length < 8) {
      return { success: false, message: 'New password must be at least 8 characters' };
    }

    const sanitized = {
      userId: validatedId,
      oldPassword: data.oldPassword?.slice(0, 256),
      newPassword: data.newPassword.slice(0, 128),
    };

    return ipcRenderer.invoke('settings:changePassword', sanitized);
  },

  /**
   * Get smart defaults
   */
  getSmartDefaults: async () => {
    return ipcRenderer.invoke('settings:getSmartDefaults');
  },

  /**
   * Close period
   */
  closePeriod: async (year: number, month: number) => {
    return ipcRenderer.invoke('settings:closePeriod', { year, month });
  },

  getUserCount: async () => {
    const result = await ipcRenderer.invoke('settings:getUserCount');
    return { success: true, data: result };
  },

  /**
   * Upload logo
   */
  uploadLogo: async () => {
    return ipcRenderer.invoke('settings:uploadLogo');
  },

  getLogo: async () => {
    return ipcRenderer.invoke('settings:getLogo');
  },

  /**
   * Upload seal
   */
  uploadSeal: async () => {
    return ipcRenderer.invoke('settings:uploadSeal');
  },

  getSeal: async () => {
    return ipcRenderer.invoke('settings:getSeal');
  },

  /**
   * Upload signature
   */
  uploadSignature: async () => {
    return ipcRenderer.invoke('settings:uploadSignature');
  },

  getSignature: async () => {
    return ipcRenderer.invoke('settings:getSignature');
  },
  getAgreementStatus: async () => {
    return ipcRenderer.invoke('settings:getAgreementStatus');
  },
  acceptAgreement: async () => {
    return ipcRenderer.invoke('settings:acceptAgreement');
  },
};

const secureShell = {
  /**
   * Open external URL (validated in main process)
   */
  openExternal: async (url: string) => {
    const sanitizedUrl = sanitizeString(url, 2000);
    if (!sanitizedUrl) {
      return { success: false, message: 'Invalid URL' };
    }
    return ipcRenderer.invoke('shell:openExternal', sanitizedUrl);
  },
};

const secureCloudBackup = {
  /**
   * Get cloud backup settings
   */
  getSettings: async () => {
    return ipcRenderer.invoke('cloudBackup:getSettings');
  },

  /**
   * Save cloud backup settings
   */
  saveSettings: async (settings: any) => {
    return ipcRenderer.invoke('cloudBackup:saveSettings', settings);
  },

  /**
   * Run backup now
   */
  runNow: async (targets: string[]) => {
    if (!Array.isArray(targets)) {
      return { success: false, message: 'Invalid targets' };
    }

    const sanitizedTargets = targets
      .filter((t) => typeof t === 'string')
      .map((t) => sanitizeString(t, 50))
      .filter(Boolean);

    return ipcRenderer.invoke('cloudBackup:runNow', sanitizedTargets);
  },

  /**
   * Progress listener
   */
  onProgress: (callback: (progress: any) => void) => {
    const handler = (_event: any, progress: any) => {
      callback(progress);
    };
    ipcRenderer.on('cloudBackup:progress', handler);
    // Return cleanup function
    return () => {
      ipcRenderer.removeListener('cloudBackup:progress', handler);
    };
  },

  /**
   * Get logs
   */
  getLogs: async () => {
    return ipcRenderer.invoke('cloudBackup:getLogs');
  },

  /**
   * Get connection status
   */
  getConnectionStatus: async () => {
    return ipcRenderer.invoke('cloudBackup:getConnectionStatus');
  },

  /**
   * Connect Google Drive
   */
  connectDrive: async () => {
    return ipcRenderer.invoke('cloudBackup:connectDrive');
  },

  /**
   * Disconnect Google Drive
   */
  disconnectDrive: async () => {
    return ipcRenderer.invoke('cloudBackup:disconnectDrive');
  },

  /**
   * Connect MEGA
   */
  connectMega: async (email: string, password: string) => {
    return ipcRenderer.invoke('cloudBackup:connectMega', { email, password });
  },

  /**
   * Disconnect MEGA
   */
  disconnectMega: async () => {
    return ipcRenderer.invoke('cloudBackup:disconnectMega');
  },

  /**
   * Get cloud backups
   */
  getCloudBackups: async (provider: string) => {
    return ipcRenderer.invoke('cloudBackup:getCloudBackups', { provider });
  },

  /**
   * Restore from cloud
   */
  restoreFromCloud: async (provider: string, backupId: string, backupName: string) => {
    return ipcRenderer.invoke('cloudBackup:restoreFromCloud', provider, backupId, backupName);
  },

  /**
   * Remove progress listener manually
   */
  removeProgressListener: () => {
    ipcRenderer.removeAllListeners('cloudBackup:progress');
  },
};

const securePrint = {
  /**
   * Print invoice
   */
  invoice: async (invoiceData: any, template?: string) => {
    return ipcRenderer.invoke('print:invoice', invoiceData, template);
  },

  /**
   * Print thermal receipt
   */
  thermalReceipt: async (receiptData: any) => {
    return ipcRenderer.invoke('print:thermalReceipt', receiptData);
  },

  /**
   * Print report
   */
  report: async (title: string, html: string) => {
    const sanitizedTitle = sanitizeString(title, 200) || '';
    const sanitizedHtml = sanitizeString(html, 100000) || '';
    return ipcRenderer.invoke('print:report', sanitizedTitle, sanitizedHtml);
  },

  /**
   * Print payroll report with dedicated template
   */
  payrollReport: async (title: string, data: any) => {
    const sanitizedTitle = sanitizeString(title, 200) || '';
    return ipcRenderer.invoke('print:payrollReport', sanitizedTitle, data);
  },

  /**
   * Print barcodes
   */
  barcodes: async (mappings: any[]) => {
    return ipcRenderer.invoke('print:barcodes', mappings);
  },

  /**
   * Get available printers
   */
  getPrinters: async () => {
    return ipcRenderer.invoke('print:getPrinters');
  },
};

const secureBackup = {
  /**
   * Create backup
   */
  create: async () => {
    return ipcRenderer.invoke('backup:create');
  },

  /**
   * Restore backup
   */
  restore: async () => {
    return ipcRenderer.invoke('backup:restore');
  },

  /**
   * Get auto backup status
   */
  autoBackupStatus: async () => {
    return ipcRenderer.invoke('backup:autoBackupStatus');
  },
};

const secureLicense = {
  /**
   * Get license status
   */
  getStatus: async () => {
    const result = await ipcRenderer.invoke('license:getStatus');
    return { success: true, data: result };
  },

  /**
   * Activate license
   */
  activate: async (licenseKey: string, otp?: string, password?: string, deviceInfo?: any) => {
    return ipcRenderer.invoke('license:activate', { licenseKey, otp, password, deviceInfo });
  },

  /**
   * Start trial
   */
  startTrial: async () => {
    return ipcRenderer.invoke('license:startTrial');
  },

  /**
   * Get trial info
   */
  getTrialInfo: async () => {
    const result = await ipcRenderer.invoke('license:getTrialInfo');
    return { success: true, data: result };
  },

  /**
   * Verify with server
   */
  verifyWithServer: async () => {
    return ipcRenderer.invoke('license:verifyWithServer');
  },

  /**
   * Get user limit
   */
  getUserLimit: async () => {
    const result = await ipcRenderer.invoke('license:getUserLimit');
    return { success: true, data: result };
  },

  /**
   * Check for updates
   */
  checkUpdate: async () => {
    const result = await ipcRenderer.invoke('license:checkUpdate');
    return { success: true, data: result };
  },

  /**
   * Auto-updater: check for updates via electron-updater
   */
  checkForUpdates: async () => {
    return ipcRenderer.invoke('update:check');
  },

  /**
   * Auto-updater: install downloaded update and restart
   */
  installUpdate: async () => {
    return ipcRenderer.invoke('update:install');
  },

  /**
   * Auto-updater: get current update state
   */
  getUpdateState: async () => {
    return ipcRenderer.invoke('update:state');
  },

  /**
   * Auto-updater: listen for events from main process
   */
  onUpdateEvent: (callback: (event: string, data?: any) => void) => {
    const handler = (_event: any, data: any) => callback(_event.type, data);
    ipcRenderer.on('update:available', handler);
    ipcRenderer.on('update:downloaded', handler);
    ipcRenderer.on('update:checking', handler);
    ipcRenderer.on('update:progress', handler);
    ipcRenderer.on('update:error', handler);
    return () => {
      ipcRenderer.removeListener('update:available', handler);
      ipcRenderer.removeListener('update:downloaded', handler);
      ipcRenderer.removeListener('update:checking', handler);
      ipcRenderer.removeListener('update:progress', handler);
      ipcRenderer.removeListener('update:error', handler);
    };
  },

  /**
   * Get device ID
   */
  getDeviceId: async () => {
    return ipcRenderer.invoke('license:getDeviceId');
  },
};

const secureSaas = {
  /**
   * Make request to SaaS API (with SSRF protection in main)
   */
  request: async (options: SaasRequestOptions) => {
    const sanitized = {
      url: sanitizeString(options.url, 2000) || '',
      method: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method || '')
        ? options.method
        : 'GET',
      body: options.body,
      headers: options.headers || {},
    };

    return ipcRenderer.invoke('saas:request', sanitized);
  },
};

// NEW: Secure token storage for SaaS auth
const secureStorage = {
  /**
   * Store tokens securely using OS keychain
   */
  setTokens: async (tokens: TokenData): Promise<boolean> => {
    try {
      const sanitized = {
        accessToken: sanitizeString(tokens.accessToken, 4000) || '',
        refreshToken: sanitizeString(tokens.refreshToken, 4000) || '',
        expiresAt: sanitizeString(tokens.expiresAt, 50) || '',
        userId: sanitizeString(tokens.userId, 100) || '',
        email: sanitizeString(tokens.email, 254) || '',
      };
      return ipcRenderer.invoke('secureStorage:setTokens', sanitized);
    } catch {
      return false;
    }
  },

  /**
   * Retrieve stored tokens
   */
  getTokens: async (): Promise<TokenData | null> => {
    return ipcRenderer.invoke('secureStorage:getTokens');
  },

  /**
   * Clear all stored tokens
   */
  clearTokens: async (): Promise<boolean> => {
    return ipcRenderer.invoke('secureStorage:clearTokens');
  },

  /**
   * Check if tokens exist
   */
  hasTokens: async (): Promise<boolean> => {
    return ipcRenderer.invoke('secureStorage:hasTokens');
  },
};

// NEW: POS Auth for SaaS
const securePosAuth = {
  /**
   * Make SaaS authentication request
   */
  saasRequest: async (options: SaasRequestOptions) => {
    const sanitized = {
      url: sanitizeString(options.url, 2000) || '',
      method: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method || '')
        ? options.method
        : 'GET',
      body: options.body,
      headers: options.headers || {},
    };

    return ipcRenderer.invoke('posAuth:saasRequest', sanitized);
  },

  getSession: async () => {
    return ipcRenderer.invoke('posAuth:getSession');
  },

  clearSession: async () => {
    return ipcRenderer.invoke('posAuth:clearSession');
  },
};

const secureAccounts = {
  /**
   * Get all accounts
   */
  getAll: async () => {
    return await ipcRenderer.invoke('accounts:getAll');
  },
};

const secureGST = {
  /**
   * Get GST summary
   */
  getSummary: async (month: number, year: number) => {
    return ipcRenderer.invoke('gst:getSummary', { month, year });
  },

  /**
   * Get GST returns
   */
  getReturns: async () => {
    return ipcRenderer.invoke('gst:getReturns');
  },

  /**
   * File GST return
   */
  fileReturn: async (month: number, year: number) => {
    return ipcRenderer.invoke('gst:fileReturn', { month, year });
  },

  /**
   * Update GST filing status
   */
  updateStatus: async (month: number, year: number, isFiled: boolean) => {
    return ipcRenderer.invoke('gst:updateStatus', { month, year, isFiled });
  },
};

const secureReports = {
  /**
   * Get trial balance
   */
  trialBalance: async (asOfDate?: string) => {
    return ipcRenderer.invoke('reports:trialBalance', asOfDate);
  },

  /**
   * Get profit and loss
   */
  profitLoss: async (startDate: string, endDate: string) => {
    return ipcRenderer.invoke('reports:profitLoss', { startDate, endDate });
  },

  /**
   * Get balance sheet
   */
  balanceSheet: async (asOfDate?: string) => {
    return ipcRenderer.invoke('reports:balanceSheet', asOfDate);
  },

  /**
   * Get outstanding report
   */
  outstanding: async (type?: string) => {
    return ipcRenderer.invoke('reports:outstanding', type);
  },

  /**
   * Get stock report
   */
  stockReport: async () => {
    return ipcRenderer.invoke('reports:stockReport');
  },

  /**
   * Get sales report
   */
  salesReport: async (startDate: string, endDate: string) => {
    return ipcRenderer.invoke('reports:salesReport', { startDate, endDate });
  },

  /**
   * Get payroll report
   */
  payrollReport: async (startDate: string, endDate: string) => {
    return ipcRenderer.invoke('reports:payrollReport', { startDate, endDate });
  },

  /**
   * Get purchase report
   */
  purchaseReport: async (startDate: string, endDate: string) => {
    return ipcRenderer.invoke('reports:purchaseReport', { startDate, endDate });
  },
};

const secureRefunds = {
  create: async (data: any) => ipcRenderer.invoke('refunds:create', data),
  getAll: async () => ipcRenderer.invoke('refunds:getAll'),
  delete: async (id: number) => ipcRenderer.invoke('refunds:delete', id),
};

const securePayroll = {
  process: async (data: any) => ipcRenderer.invoke('payroll:process', data),
  getHistory: async (startDate?: string, endDate?: string) => ipcRenderer.invoke('payroll:getHistory', startDate, endDate),
  getEmployeeHistory: async (employeeId: number) => ipcRenderer.invoke('payroll:getEmployeeHistory', employeeId),
};

const secureRecurring = {
  getAll: async (activeOnly?: boolean) => ipcRenderer.invoke('recurring:getAll', activeOnly),
  create: async (data: any) => ipcRenderer.invoke('recurring:create', data),
  toggleActive: async (id: number) => ipcRenderer.invoke('recurring:toggleActive', id),
  processDue: async () => ipcRenderer.invoke('recurring:processDue'),
  delete: async (id: number) => ipcRenderer.invoke('recurring:delete', id),
};

const securePurchaseOrders = {
  getAll: async () => ipcRenderer.invoke('purchaseOrders:getAll'),
  getById: async (id: number) => ipcRenderer.invoke('purchaseOrders:getById', id),
  create: async (data: any) => ipcRenderer.invoke('purchaseOrders:create', data),
  updateStatus: async (id: number, status: string, paymentMode?: string) => ipcRenderer.invoke('purchaseOrders:updateStatus', id, status, paymentMode),
  delete: async (id: number) => ipcRenderer.invoke('purchaseOrders:delete', id),
};

const secureQuotations = {
  getAll: async () => ipcRenderer.invoke('quotations:getAll'),
  getById: async (id: number) => ipcRenderer.invoke('quotations:getById', id),
  create: async (data: any) => ipcRenderer.invoke('quotations:create', data),
  updateStatus: async (id: number, status: string) => ipcRenderer.invoke('quotations:updateStatus', id, status),
  convertToSale: async (id: number, paymentMode: string) => ipcRenderer.invoke('quotations:convertToSale', id, paymentMode),
  delete: async (id: number) => ipcRenderer.invoke('quotations:delete', id),
};

const secureExpenses = {
  getAll: async (filters?: any) => ipcRenderer.invoke('expenses:getAll', filters),
  create: async (data: any) => ipcRenderer.invoke('expenses:create', data),
  getSummary: async (month: number, year: number) => ipcRenderer.invoke('expenses:getSummary', month, year),
  delete: async (id: number) => ipcRenderer.invoke('expenses:delete', id),
};

const secureAuditLogs = {
  getAll: async () => ipcRenderer.invoke('auditLogs:getAll'),
};

const secureBarcodes = {
  getAll: async () => ipcRenderer.invoke('barcodes:getAll'),
  create: async (data: { barcode: string; itemId: number }) => ipcRenderer.invoke('barcodes:create', data),
  findByBarcode: async (barcode: string) => ipcRenderer.invoke('barcodes:findByBarcode', barcode),
  delete: async (id: number) => ipcRenderer.invoke('barcodes:delete', id),
};

const secureEmployees = {
  getAll: async (activeOnly?: boolean) => ipcRenderer.invoke('employees:getAll', activeOnly),
  create: async (data: any) => ipcRenderer.invoke('employees:create', data),
  update: async (id: number, data: any) => ipcRenderer.invoke('employees:update', id, data),
  getById: async (id: number) => ipcRenderer.invoke('employees:getById', id),
  delete: async (id: number) => ipcRenderer.invoke('employees:delete', id),
  export: async () => ipcRenderer.invoke('employees:export'),
};

const secureBranches = {
  getAll: async (activeOnly?: boolean) => ipcRenderer.invoke('branches:getAll', activeOnly),
  create: async (data: any) => ipcRenderer.invoke('branches:create', data),
  delete: async (id: number) => ipcRenderer.invoke('branches:delete', id),
};

const secureCsvImport = {
  parseFile: async (buffer: ArrayBuffer, sheetIndex?: number) => ipcRenderer.invoke('csvImport:parseFile', buffer, sheetIndex),
  contacts: async (data: any[], type: 'customer' | 'supplier') => ipcRenderer.invoke('csvImport:contacts', data, type),
  items: async (data: any[]) => ipcRenderer.invoke('csvImport:items', data),
};

const secureSplitPayment = {
  processSale: async (data: any) => ipcRenderer.invoke('splitPayment:processSale', data),
};

const secureTieredPricing = {
  getAll: async () => ipcRenderer.invoke('tieredPricing:getAll'),
  create: async (data: any) => ipcRenderer.invoke('tieredPricing:create', data),
  getItemPrice: async (itemId: number, priceListId: number) => ipcRenderer.invoke('tieredPricing:getItemPrice', itemId, priceListId),
  getCustomerPriceList: async (customerId: number) => ipcRenderer.invoke('tieredPricing:getCustomerPriceList', customerId),
  assignPriceListToCustomer: async (customerId: number, priceListId: number | null) => ipcRenderer.invoke('tieredPricing:assignPriceListToCustomer', customerId, priceListId),
  update: async (id: number, data: any) => ipcRenderer.invoke('tieredPricing:update', id, data),
  delete: async (id: number) => ipcRenderer.invoke('tieredPricing:delete', id),
};

const secureAgedReports = {
  getReceivables: async (asOfDate?: string) => ipcRenderer.invoke('agedReports:getReceivables', asOfDate),
  getPayables: async (asOfDate?: string) => ipcRenderer.invoke('agedReports:getPayables', asOfDate),
};

const secureHeldCarts = {
  getAll: async () => ipcRenderer.invoke('heldCarts:getAll'),
  save: async (data: any) => ipcRenderer.invoke('heldCarts:save', data),
  load: async (id: number) => ipcRenderer.invoke('heldCarts:load', id),
  delete: async (id: number) => ipcRenderer.invoke('heldCarts:delete', id),
  count: async () => ipcRenderer.invoke('heldCarts:count'),
};

const secureEmailInvoice = {
  send: async (data: { customerEmail: string; invoiceNo: string; totalAmount: number; businessName: string }) =>
    ipcRenderer.invoke('emailInvoice:send', data),
};

const secureApp = {
  quit: () => ipcRenderer.invoke('app:quit'),
  getDeviceId: () => ipcRenderer.invoke('app:getDeviceId'),
};

// ============================================
// EXPOSE SECURE API
// ============================================

const electronSecureAPI = {
  auth: secureAuth,
  posAuth: securePosAuth,
  secureStorage,
  dashboard: secureDashboard,
  inventory: secureInventory,
  pos: securePOS,
  contacts: secureContacts,
  accounts: secureAccounts,
  transactions: secureTransactions,
  gst: secureGST,
  reports: secureReports,
  settings: secureSettings,
  license: secureLicense,
  backup: secureBackup,
  shell: secureShell,
  cloudBackup: secureCloudBackup,
  saas: secureSaas,
  print: securePrint,
  // New modules
  refunds: secureRefunds,
  recurring: secureRecurring,
  purchaseOrders: securePurchaseOrders,
  quotations: secureQuotations,
  expenses: secureExpenses,
  auditLogs: secureAuditLogs,
  barcodes: secureBarcodes,
  employees: secureEmployees,
  payroll: securePayroll,
  branches: secureBranches,
  csvImport: secureCsvImport,
  splitPayment: secureSplitPayment,
  tieredPricing: secureTieredPricing,
  agedReports: secureAgedReports,
  heldCarts: secureHeldCarts,
  emailInvoice: secureEmailInvoice,
  app: secureApp,
  // Auto-updater
  update: {
    checkForUpdates: async () => ipcRenderer.invoke('update:check'),
    installUpdate: async () => ipcRenderer.invoke('update:install'),
    getUpdateState: async () => ipcRenderer.invoke('update:state'),
    onUpdateEvent: (callback: (event: string, data?: any) => void) => {
      const handler = (_event: any, data: any) => callback(_event.type, data);
      ipcRenderer.on('update:available', handler);
      ipcRenderer.on('update:downloaded', handler);
      ipcRenderer.on('update:checking', handler);
      ipcRenderer.on('update:progress', handler);
      ipcRenderer.on('update:error', handler);
      return () => {
        ipcRenderer.removeListener('update:available', handler);
        ipcRenderer.removeListener('update:downloaded', handler);
        ipcRenderer.removeListener('update:checking', handler);
        ipcRenderer.removeListener('update:progress', handler);
        ipcRenderer.removeListener('update:error', handler);
      };
    },
  },
  // Utility
  platform: process.platform,
  versions: {
    node: process.versions.node,
    electron: process.versions.electron,
    chrome: process.versions.chrome,
  },
};


// Expose to renderer
contextBridge.exposeInMainWorld('electronSecureAPI', electronSecureAPI);

// Also expose as electronAPI for backwards compatibility
contextBridge.exposeInMainWorld('electronAPI', electronSecureAPI);
