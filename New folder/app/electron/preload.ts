import { contextBridge, ipcRenderer } from 'electron';

/**
 * Preload script - Exposes safe APIs to the renderer process
 * All IPC communication goes through this layer
 */

// ============================================
// API Definitions
// ============================================

interface ElectronAPI {
  // Authentication
  auth: {
    login: (credentials: { username: string; password: string }) => Promise<any>;
    logout: () => Promise<any>;
    getCurrentUser: () => Promise<any>;
  };

  // Dashboard
  dashboard: {
    getData: () => Promise<any>;
    getRealtimeMetrics: () => Promise<any>;
    getNotifications: () => Promise<any>;
  };

  // POS
  pos: {
    createSale: (saleData: any) => Promise<any>;
    getItems: () => Promise<any>;
    searchItems: (query: string) => Promise<any>;
    getCustomers: () => Promise<any>;
  };

  // Inventory
  inventory: {
    createItem: (data: any) => Promise<any>;
    addStock: (stockData: any) => Promise<any>;
    getItems: () => Promise<any>;
    getItem: (id: number) => Promise<any>;
    updateItem: (id: number, data: any) => Promise<any>;
    deleteItem: (id: number) => Promise<any>;
    getLowStock: () => Promise<any>;
    getCategories: () => Promise<any>;
    createCategory: (name: string) => Promise<any>;
    deleteCategory: (id: number) => Promise<any>;
    getUnits: () => Promise<any>;
    createUnit: (name: string) => Promise<any>;
    deleteUnit: (id: number) => Promise<any>;
  };

  // Contacts
  contacts: {
    getAll: (type?: string) => Promise<any>;
    create: (data: any) => Promise<any>;
    update: (id: number, data: any) => Promise<any>;
    delete: (id: number) => Promise<any>;
    getLedger: (contactId: number) => Promise<any>;
  };

  // Accounts (Chart of Accounts)
  accounts: {
    getAll: () => Promise<any>;
  };

  // Transactions
  transactions: {
    receiveMoney: (data: any) => Promise<any>;
    payMoney: (data: any) => Promise<any>;
    transfer: (data: any) => Promise<any>;
    getAll: (filters?: any) => Promise<any>;
    void: (id: number, reason: string) => Promise<any>;
    getInvoiceData: (transactionId: number) => Promise<any>;
  };

  // GST
  gst: {
    getSummary: (month: number, year: number) => Promise<any>;
    getReturns: () => Promise<any>;
    fileReturn: (month: number, year: number) => Promise<any>;
  };

  // Reports
  reports: {
    trialBalance: (asOfDate?: string) => Promise<any>;
    profitLoss: (startDate: string, endDate: string) => Promise<any>;
    balanceSheet: (asOfDate?: string) => Promise<any>;
    outstanding: (type?: string) => Promise<any>;
    stockReport: () => Promise<any>;
    salesReport: (startDate: string, endDate: string) => Promise<any>;
  };

  // Printing
  print: {
    invoice: (invoiceData: any, template?: string) => Promise<any>;
    thermalReceipt: (receiptData: any) => Promise<any>;
    report: (title: string, html: string) => Promise<any>;
    getPrinters: () => Promise<any>;
  };

  // Backup
  backup: {
    create: () => Promise<any>;
    restore: () => Promise<any>;
    autoBackupStatus: () => Promise<any>;
  };

  // Settings
  settings: {
    get: () => Promise<any>;
    update: (settings: any) => Promise<any>;
    closePeriod: (year: number, month: number) => Promise<any>;
    getUsers: () => Promise<any>;
    createUser: (userData: { username: string; password: string; fullName: string; role: string }) => Promise<any>;
    changePassword: (data: { userId: number; newPassword: string; oldPassword?: string }) => Promise<any>;
    getSmartDefaults: () => Promise<any>;
    uploadLogo: () => Promise<any>;
    getLogo: () => Promise<any>;
    hasUsers: () => Promise<boolean>;
    getUserCount: () => Promise<number>;
  };

  // Utilities
  shell: {
    openExternal: (url: string) => Promise<void>;
  };

  // License System
  license: {
    getStatus: () => Promise<any>;
    activate: (licenseKey: string) => Promise<any>;
    startTrial: () => Promise<any>;
    getTrialInfo: () => Promise<any>;
    verifyWithServer: () => Promise<any>;
    getUserLimit: () => Promise<number>;
    checkUpdate: () => Promise<any>;
  };
}

// ============================================
// Expose API to Renderer
// ============================================

const api: ElectronAPI = {
  // Authentication
  auth: {
    login: (credentials) => ipcRenderer.invoke('auth:login', credentials),
    logout: () => ipcRenderer.invoke('auth:logout'),
    getCurrentUser: () => ipcRenderer.invoke('auth:getCurrentUser'),
  },

  // Dashboard
  dashboard: {
    getData: () => ipcRenderer.invoke('dashboard:getData'),
    getRealtimeMetrics: () => ipcRenderer.invoke('dashboard:getRealtimeMetrics'),
    getNotifications: () => ipcRenderer.invoke('dashboard:getNotifications'),
  },

  // POS
  pos: {
    createSale: (saleData) => ipcRenderer.invoke('pos:createSale', saleData),
    getItems: () => ipcRenderer.invoke('pos:getItems'),
    searchItems: (query) => ipcRenderer.invoke('pos:searchItems', query),
    getCustomers: () => ipcRenderer.invoke('pos:getCustomers'),
  },

  // Inventory
  inventory: {
    createItem: (data) => ipcRenderer.invoke('inventory:createItem', data),
    addStock: (stockData) => ipcRenderer.invoke('inventory:addStock', stockData),
    getItems: () => ipcRenderer.invoke('inventory:getItems'),
    getItem: (id) => ipcRenderer.invoke('inventory:getItem', id),
    updateItem: (id, data) => ipcRenderer.invoke('inventory:updateItem', id, data),
    deleteItem: (id) => ipcRenderer.invoke('inventory:deleteItem', id),
    getLowStock: () => ipcRenderer.invoke('inventory:getLowStock'),
    getCategories: () => ipcRenderer.invoke('inventory:getCategories'),
    createCategory: (name) => ipcRenderer.invoke('inventory:createCategory', name),
    deleteCategory: (id) => ipcRenderer.invoke('inventory:deleteCategory', id),
    getUnits: () => ipcRenderer.invoke('inventory:getUnits'),
    createUnit: (name) => ipcRenderer.invoke('inventory:createUnit', name),
    deleteUnit: (id) => ipcRenderer.invoke('inventory:deleteUnit', id),
  },

  // Contacts
  contacts: {
    getAll: (type) => ipcRenderer.invoke('contacts:getAll', type),
    create: (data) => ipcRenderer.invoke('contacts:create', data),
    update: (id, data) => ipcRenderer.invoke('contacts:update', id, data),
    delete: (id) => ipcRenderer.invoke('contacts:delete', id),
    getLedger: (contactId) => ipcRenderer.invoke('contacts:getLedger', contactId),
  },

  // Accounts
  accounts: {
    getAll: () => ipcRenderer.invoke('accounts:getAll'),
  },

  // Transactions
  transactions: {
    receiveMoney: (data) => ipcRenderer.invoke('transactions:receiveMoney', data),
    payMoney: (data) => ipcRenderer.invoke('transactions:payMoney', data),
    transfer: (data) => ipcRenderer.invoke('transactions:transfer', data),
    getAll: (filters) => ipcRenderer.invoke('transactions:getAll', filters),
    void: (id, reason) => ipcRenderer.invoke('transactions:void', id, reason),
    getInvoiceData: (transactionId) => ipcRenderer.invoke('transactions:getInvoiceData', transactionId),
  },

  // GST
  gst: {
    getSummary: (month, year) => ipcRenderer.invoke('gst:getSummary', month, year),
    getReturns: () => ipcRenderer.invoke('gst:getReturns'),
    fileReturn: (month, year) => ipcRenderer.invoke('gst:fileReturn', month, year),
  },

  // Reports
  reports: {
    trialBalance: (asOfDate) => ipcRenderer.invoke('reports:trialBalance', asOfDate),
    profitLoss: (startDate, endDate) => ipcRenderer.invoke('reports:profitLoss', startDate, endDate),
    balanceSheet: (asOfDate) => ipcRenderer.invoke('reports:balanceSheet', asOfDate),
    outstanding: (type) => ipcRenderer.invoke('reports:outstanding', type),
    stockReport: () => ipcRenderer.invoke('reports:stockReport'),
    salesReport: (startDate, endDate) => ipcRenderer.invoke('reports:salesReport', startDate, endDate),
  },

  // Printing
  print: {
    invoice: (invoiceData, template) => ipcRenderer.invoke('print:invoice', invoiceData, template),
    thermalReceipt: (receiptData) => ipcRenderer.invoke('print:thermalReceipt', receiptData),
    report: (title, html) => ipcRenderer.invoke('print:report', title, html),
    getPrinters: () => ipcRenderer.invoke('print:getPrinters'),
  },

  // Backup
  backup: {
    create: () => ipcRenderer.invoke('backup:create'),
    restore: () => ipcRenderer.invoke('backup:restore'),
    autoBackupStatus: () => ipcRenderer.invoke('backup:autoBackupStatus'),
  },

  // Settings
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (settings) => ipcRenderer.invoke('settings:update', settings),
    closePeriod: (year, month) => ipcRenderer.invoke('settings:closePeriod', year, month),
    getUsers: () => ipcRenderer.invoke('settings:getUsers'),
    createUser: (userData) => ipcRenderer.invoke('settings:createUser', userData),
    changePassword: (data) => ipcRenderer.invoke('settings:changePassword', data),
    getSmartDefaults: () => ipcRenderer.invoke('settings:getSmartDefaults'),
    uploadLogo: () => ipcRenderer.invoke('settings:uploadLogo'),
    getLogo: () => ipcRenderer.invoke('settings:getLogo'),
    hasUsers: () => ipcRenderer.invoke('settings:hasUsers'),
    getUserCount: () => ipcRenderer.invoke('settings:getUserCount'),
  },

  // Utilities
  shell: {
    openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
  },

  // License System
  license: {
    getStatus: () => ipcRenderer.invoke('license:getStatus'),
    activate: (licenseKey) => ipcRenderer.invoke('license:activate', licenseKey),
    startTrial: () => ipcRenderer.invoke('license:startTrial'),
    getTrialInfo: () => ipcRenderer.invoke('license:getTrialInfo'),
    verifyWithServer: () => ipcRenderer.invoke('license:verifyWithServer'),
    getUserLimit: () => ipcRenderer.invoke('license:getUserLimit'),
    checkUpdate: () => ipcRenderer.invoke('license:checkUpdate'),
  },
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', api);

// Type declaration for TypeScript
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export { };
