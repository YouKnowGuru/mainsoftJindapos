/// <reference types="vite/client" />

// Type declarations for Electron API
declare global {
  interface Window {
    electronAPI: {
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

      // Accounts
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
    };
  }
}

export { };
