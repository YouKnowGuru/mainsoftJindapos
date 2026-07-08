/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly [key: string]: any;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Type declarations for Electron Secure API
declare global {
  interface Window {
    electronSecureAPI: {
      // Authentication
      auth: {
        login: (credentials: { username: string; password: string }) => Promise<any>;
        logout: () => Promise<any>;
        getCurrentUser: () => Promise<any>;
        syncPassword: (data: { email: string; password: string }) => Promise<{ success: boolean; message?: string }>;
      };

      // POS Auth for SaaS
      posAuth: {
        saasRequest: (options: { url: string; method?: string; body?: any; headers?: Record<string, string> }) => Promise<any>;
        getSession: () => Promise<any>;
        clearSession: () => Promise<any>;
      };

      // Secure Token Storage
      secureStorage: {
        setTokens: (tokens: { accessToken: string; refreshToken: string; expiresAt: string; userId: string; email: string }) => Promise<boolean>;
        getTokens: () => Promise<any>;
        clearTokens: () => Promise<boolean>;
        hasTokens: () => Promise<boolean>;
      };

      // Inventory
      inventory: {
        createItem: (data: any) => Promise<any>;
        getItems: () => Promise<any>;
        getItem: (id: number) => Promise<any>;
        updateItem: (id: number, data: any) => Promise<any>;
        deleteItem: (id: number) => Promise<any>;
        addStock: (stockData: any) => Promise<any>;
        getLowStock: () => Promise<any>;
        getCategories: () => Promise<any>;
        createCategory: (name: string) => Promise<any>;
        deleteCategory: (id: number) => Promise<any>;
        getUnits: () => Promise<any>;
        createUnit: (name: string) => Promise<any>;
        deleteUnit: (id: number) => Promise<any>;
      };

      // POS
      pos: {
        createSale: (saleData: any) => Promise<any>;
        searchItems: (query: string) => Promise<any>;
        getCustomers: () => Promise<any>;
        getItems: () => Promise<any>;
      };

      // Contacts
      contacts: {
        create: (data: any) => Promise<any>;
        getAll: (type?: string) => Promise<any>;
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
        void: (data: { transactionId: number; reason: string }) => Promise<any>;
        getAll: (filters?: any) => Promise<any>;
        transfer: (data: any) => Promise<any>;
        getInvoiceData: (transactionId: number) => Promise<any>;
        export: (filters?: any) => Promise<any>;
      };

      // GST
      gst: {
        getSummary: (month: number, year: number) => Promise<any>;
        getReturns: () => Promise<any>;
        fileReturn: (month: number, year: number) => Promise<any>;
        updateStatus: (month: number, year: number, isFiled: boolean) => Promise<any>;
      };

      // Reports
      reports: {
        trialBalance: (asOfDate?: string) => Promise<any>;
        profitLoss: (startDate: string, endDate: string) => Promise<any>;
        balanceSheet: (asOfDate?: string) => Promise<any>;
        outstanding: (type?: string) => Promise<any>;
        stockReport: () => Promise<any>;
        salesReport: (startDate: string, endDate: string) => Promise<any>;
        purchaseReport: (startDate: string, endDate: string) => Promise<any>;
        payrollReport: (startDate: string, endDate: string) => Promise<any>;
      };

      // Settings
      settings: {
        get: () => Promise<any>;
        update: (settings: any) => Promise<any>;
        getUsers: () => Promise<any>;
        hasUsers: () => Promise<any>;
        createInitialUser: (userData: any) => Promise<any>;
        createUser: (userData: any) => Promise<any>;
        changePassword: (data: any) => Promise<any>;
        getSmartDefaults: () => Promise<any>;
        closePeriod: (year: number, month: number) => Promise<any>;
        getUserCount: () => Promise<any>;
        uploadLogo: () => Promise<any>;
        getLogo: () => Promise<any>;
        uploadSeal: () => Promise<any>;
        getSeal: () => Promise<any>;
        uploadSignature: () => Promise<any>;
        getSignature: () => Promise<any>;
        getAgreementStatus: () => Promise<boolean>;
        acceptAgreement: () => Promise<any>;
      };

      // Dashboard
      dashboard: {
        getData: () => Promise<any>;
        getRealtimeMetrics: () => Promise<any>;
        getNotifications: () => Promise<any>;
      };

      // License
      license: {
        getStatus: () => Promise<any>;
        activate: (licenseKey: string, otp?: string, password?: string, deviceInfo?: any) => Promise<any>;
        startTrial: () => Promise<any>;
        getTrialInfo: () => Promise<any>;
        verifyWithServer: () => Promise<any>;
        getUserLimit: () => Promise<any>;
        checkUpdate: () => Promise<any>;
        getDeviceId: () => Promise<any>;
      };

      // Auto-updater
      update: {
        checkForUpdates: () => Promise<any>;
        installUpdate: () => Promise<any>;
        getUpdateState: () => Promise<any>;
        onUpdateEvent: (callback: (event: string, data?: any) => void) => () => void;
      };

      // Backup
      backup: {
        create: () => Promise<any>;
        restore: () => Promise<any>;
        autoBackupStatus: () => Promise<any>;
      };

      // Shell
      shell: {
        openExternal: (url: string) => Promise<any>;
      };

      // Cloud Backup
      cloudBackup: {
        getSettings: () => Promise<any>;
        saveSettings: (settings: any) => Promise<any>;
        runNow: (targets: string[]) => Promise<any>;
        onProgress: (callback: (progress: any) => void) => () => void;
        getLogs: () => Promise<any>;
        getConnectionStatus: () => Promise<any>;
        connectDrive: () => Promise<any>;
        disconnectDrive: () => Promise<any>;
        connectMega: (email: string, password: string) => Promise<any>;
        disconnectMega: () => Promise<any>;
        getCloudBackups: (provider: string) => Promise<any>;
        restoreFromCloud: (provider: string, backupId: string, backupName: string) => Promise<any>;
        removeProgressListener: () => void;
      };

      // SaaS
      saas: {
        request: (options: { url: string; method?: string; body?: any; headers?: Record<string, string> }) => Promise<any>;
      };

      // Print
      print: {
        invoice: (invoiceData: any, template?: string) => Promise<any>;
        thermalReceipt: (receiptData: any) => Promise<any>;
        report: (title: string, html: string) => Promise<any>;
        payrollReport: (title: string, data: any) => Promise<any>;
        barcodes: (mappings: any[]) => Promise<any>;
        getPrinters: () => Promise<any>;
      };

      // New modules from phase 1
      refunds: {
        create: (data: any) => Promise<any>;
        getAll: () => Promise<any>;
        delete: (id: number) => Promise<any>;
      };
      recurring: {
        getAll: (activeOnly?: boolean) => Promise<any>;
        create: (data: any) => Promise<any>;
        toggleActive: (id: number) => Promise<any>;
        processDue: () => Promise<any>;
        delete: (id: number) => Promise<any>;
      };
      purchaseOrders: {
        getAll: () => Promise<any>;
        getById: (id: number) => Promise<any>;
        create: (data: any) => Promise<any>;
        updateStatus: (id: number, status: string, paymentMode?: string) => Promise<any>;
        delete: (id: number) => Promise<any>;
      };
      quotations: {
        getAll: () => Promise<any>;
        getById: (id: number) => Promise<any>;
        create: (data: any) => Promise<any>;
        updateStatus: (id: number, status: string) => Promise<any>;
        convertToSale: (id: number, paymentMode: string) => Promise<any>;
        delete: (id: number) => Promise<any>;
      };
      expenses: {
        getAll: (filters?: any) => Promise<any>;
        create: (data: any) => Promise<any>;
        getSummary: (month: number, year: number) => Promise<any>;
        delete: (id: number) => Promise<any>;
      };
      auditLogs: {
        getAll: () => Promise<any>;
      };
      barcodes: {
        getAll: () => Promise<any>;
        create: (data: { barcode: string; itemId: number }) => Promise<any>;
        findByBarcode: (barcode: string) => Promise<any>;
        delete: (id: number) => Promise<any>;
      };
      employees: {
        getAll: (activeOnly?: boolean) => Promise<any>;
        create: (data: any) => Promise<any>;
        update: (id: number, data: any) => Promise<any>;
        getById: (id: number) => Promise<any>;
        delete: (id: number) => Promise<any>;
        export: () => Promise<any>;
      };
      payroll: {
        getHistory: (startDate?: string, endDate?: string) => Promise<any>;
        process: (data: any) => Promise<any>;
      };
      branches: {
        getAll: (activeOnly?: boolean) => Promise<any>;
        create: (data: any) => Promise<any>;
        delete: (id: number) => Promise<any>;
      };
      csvImport: {
        parseFile: (buffer: ArrayBuffer, sheetIndex?: number) => Promise<any>;
        contacts: (data: any[], type: 'customer' | 'supplier') => Promise<any>;
        items: (data: any[]) => Promise<any>;
      };
      splitPayment: {
        processSale: (data: any) => Promise<any>;
      };
      tieredPricing: {
        getAll: () => Promise<any>;
        create: (data: any) => Promise<any>;
        getItemPrice: (itemId: number, priceListId: number) => Promise<any>;
        getCustomerPriceList: (customerId: number) => Promise<any>;
        assignPriceListToCustomer: (customerId: number, priceListId: number | null) => Promise<any>;
        update: (id: number, data: any) => Promise<any>;
        delete: (id: number) => Promise<any>;
      };
      agedReports: {
        getReceivables: (asOfDate?: string) => Promise<any>;
        getPayables: (asOfDate?: string) => Promise<any>;
      };
      heldCarts: {
        getAll: () => Promise<any>;
        save: (data: any) => Promise<any>;
        load: (id: number) => Promise<any>;
        delete: (id: number) => Promise<any>;
        count: () => Promise<any>;
      };
      emailInvoice: {
        send: (data: { customerEmail: string; invoiceNo: string; totalAmount: number; businessName: string }) => Promise<any>;
      };
      app: {
        quit: () => Promise<any>;
        getDeviceId: () => Promise<string>;
      };

      // Utility
      platform: string;
      versions: {
        node: string;
        electron: string;
        chrome: string;
      };
    };

    // Keep old electronAPI for backward compatibility during migration
    electronAPI?: any;
  }
}

export { };
