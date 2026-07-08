"use strict";
/**
 * SECURE PRELOAD SCRIPT
 * Minimal API Exposure with Permission-Based Access
 *
 * Security Principles:
 * - Expose ONLY required APIs
 * - Validate all inputs before sending to main
 * - Never expose raw Node.js APIs
 * - Type-safe IPC communication
 */
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// ============================================
// INPUT SANITIZATION HELPERS
// ============================================
/**
 * Sanitize string input
 */
function sanitizeString(input, maxLength = 1000) {
    if (typeof input !== 'string')
        return null;
    const sanitized = input.trim().slice(0, maxLength);
    // Remove null bytes and control characters
    return sanitized.replace(/[\x00-\x1F\x7F]/g, '');
}
/**
 * Sanitize number input
 */
function sanitizeNumber(input) {
    if (typeof input === 'number' && !isNaN(input) && isFinite(input)) {
        return input;
    }
    if (typeof input === 'string') {
        const parsed = parseFloat(input);
        if (!isNaN(parsed) && isFinite(parsed))
            return parsed;
    }
    return null;
}
/**
 * Validate ID
 */
function validateId(id) {
    const num = sanitizeNumber(id);
    if (num === null)
        return null;
    return Number.isInteger(num) && num > 0 && num <= 2147483647 ? num : null;
}
// ============================================
// SECURE API IMPLEMENTATIONS
// ============================================
const secureAuth = {
    /**
     * Login with credentials
     */
    async login(credentials) {
        if (!credentials?.username || !credentials?.password) {
            return { success: false, message: 'Username and password required' };
        }
        const sanitized = {
            username: sanitizeString(credentials.username, 100) || '',
            password: credentials.password.slice(0, 256), // Limit password length
        };
        return electron_1.ipcRenderer.invoke('auth:login', sanitized);
    },
    /**
     * Logout current user
     */
    async logout() {
        return electron_1.ipcRenderer.invoke('auth:logout');
    },
    /**
     * Get current logged in user
     */
    async getCurrentUser() {
        return electron_1.ipcRenderer.invoke('auth:getCurrentUser');
    },
};
const secureInventory = {
    /**
     * Create new inventory item
     */
    async createItem(data) {
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
        return electron_1.ipcRenderer.invoke('inventory:createItem', sanitized);
    },
    /**
     * Get all inventory items
     */
    async getItems() {
        return electron_1.ipcRenderer.invoke('inventory:getItems');
    },
    /**
     * Get single item by ID
     */
    async getItem(id) {
        const validatedId = validateId(id);
        if (validatedId === null) {
            return { success: false, message: 'Invalid ID' };
        }
        return electron_1.ipcRenderer.invoke('inventory:getItem', validatedId);
    },
    /**
     * Update inventory item
     */
    async updateItem(id, data) {
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
        return electron_1.ipcRenderer.invoke('inventory:updateItem', sanitized);
    },
    /**
     * Delete inventory item
     */
    async deleteItem(id) {
        const validatedId = validateId(id);
        if (validatedId === null) {
            return { success: false, message: 'Invalid ID' };
        }
        return electron_1.ipcRenderer.invoke('inventory:deleteItem', validatedId);
    },
};
const securePOS = {
    /**
     * Create new sale
     */
    async createSale(saleData) {
        if (!saleData?.items || !Array.isArray(saleData.items) || saleData.items.length === 0) {
            return { success: false, message: 'Sale must have at least one item' };
        }
        if (saleData.items.length > 100) {
            return { success: false, message: 'Too many items (max 100)' };
        }
        // Sanitize items
        const sanitizedItems = saleData.items.map((item) => ({
            itemId: validateId(item.itemId) || 0,
            quantity: sanitizeNumber(item.quantity) || 0,
            price: sanitizeNumber(item.price) || 0,
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
        return electron_1.ipcRenderer.invoke('pos:createSale', sanitized);
    },
    /**
     * Search inventory items
     */
    async searchItems(query) {
        const sanitizedQuery = sanitizeString(query, 100);
        if (!sanitizedQuery) {
            return { success: false, message: 'Invalid search query' };
        }
        return electron_1.ipcRenderer.invoke('pos:searchItems', sanitizedQuery);
    },
    /**
     * Get customers
     */
    async getCustomers() {
        return electron_1.ipcRenderer.invoke('pos:getCustomers');
    },
};
const secureContacts = {
    /**
     * Create new contact (customer/supplier)
     */
    async create(data) {
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
        return electron_1.ipcRenderer.invoke('contacts:create', sanitized);
    },
    /**
     * Get all contacts
     */
    async getAll(type) {
        const validType = type && ['customer', 'supplier'].includes(type) ? type : undefined;
        return electron_1.ipcRenderer.invoke('contacts:getAll', validType);
    },
    /**
     * Update contact
     */
    async update(id, data) {
        const validatedId = validateId(id);
        if (validatedId === null) {
            return { success: false, message: 'Invalid ID' };
        }
        return electron_1.ipcRenderer.invoke('contacts:update', { id: validatedId, data });
    },
    /**
     * Delete contact
     */
    async delete(id) {
        const validatedId = validateId(id);
        if (validatedId === null) {
            return { success: false, message: 'Invalid ID' };
        }
        return electron_1.ipcRenderer.invoke('contacts:delete', validatedId);
    },
    /**
     * Get contact ledger
     */
    async getLedger(contactId) {
        const validatedId = validateId(contactId);
        if (validatedId === null) {
            return { success: false, message: 'Invalid contact ID' };
        }
        return electron_1.ipcRenderer.invoke('contacts:getLedger', validatedId);
    },
};
const secureTransactions = {
    /**
     * Receive money transaction
     */
    async receiveMoney(data) {
        const sanitized = {
            contactId: data.contactId ? validateId(data.contactId) : null,
            amount: sanitizeNumber(data.amount) || 0,
            paymentMode: sanitizeString(data.paymentMode, 20) || 'cash',
            reference: data.reference ? sanitizeString(data.reference, 100) : null,
            description: data.description ? sanitizeString(data.description, 1000) : null,
            date: data.date || new Date().toISOString().split('T')[0],
        };
        return electron_1.ipcRenderer.invoke('transactions:receiveMoney', sanitized);
    },
    /**
     * Pay money transaction
     */
    async payMoney(data) {
        const sanitized = {
            contactId: data.contactId ? validateId(data.contactId) : null,
            amount: sanitizeNumber(data.amount) || 0,
            paymentMode: sanitizeString(data.paymentMode, 20) || 'cash',
            reference: data.reference ? sanitizeString(data.reference, 100) : null,
            description: data.description ? sanitizeString(data.description, 1000) : null,
            date: data.date || new Date().toISOString().split('T')[0],
        };
        return electron_1.ipcRenderer.invoke('transactions:payMoney', sanitized);
    },
    /**
     * Void a transaction
     */
    async void(data) {
        const validatedId = validateId(data.transactionId);
        if (validatedId === null) {
            return { success: false, message: 'Invalid transaction ID' };
        }
        const sanitized = {
            transactionId: validatedId,
            reason: sanitizeString(data.reason, 500) || '',
        };
        return electron_1.ipcRenderer.invoke('transactions:void', sanitized);
    },
};
const secureSettings = {
    /**
     * Create new user
     */
    async createUser(userData) {
        if (!userData?.username || !userData?.password || !userData?.fullName) {
            return { success: false, message: 'Username, password, and full name required' };
        }
        // Password strength validation
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
        return electron_1.ipcRenderer.invoke('settings:createUser', sanitized);
    },
    /**
     * Change password
     */
    async changePassword(data) {
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
        return electron_1.ipcRenderer.invoke('settings:changePassword', sanitized);
    },
};
const secureShell = {
    /**
     * Open external URL (validated in main process)
     */
    async openExternal(url) {
        const sanitizedUrl = sanitizeString(url, 2000);
        if (!sanitizedUrl) {
            return { success: false, message: 'Invalid URL' };
        }
        return electron_1.ipcRenderer.invoke('shell:openExternal', sanitizedUrl);
    },
};
const secureCloudBackup = {
    /**
     * Get cloud backup settings
     */
    async getSettings() {
        return electron_1.ipcRenderer.invoke('cloudBackup:getSettings');
    },
    /**
     * Save cloud backup settings
     */
    async saveSettings(settings) {
        return electron_1.ipcRenderer.invoke('cloudBackup:saveSettings', settings);
    },
    /**
     * Run backup now
     */
    async runNow(targets) {
        if (!Array.isArray(targets)) {
            return { success: false, message: 'Invalid targets' };
        }
        const sanitizedTargets = targets
            .filter(t => typeof t === 'string')
            .map(t => sanitizeString(t, 50))
            .filter(Boolean);
        return electron_1.ipcRenderer.invoke('cloudBackup:runNow', sanitizedTargets);
    },
    /**
     * Progress listener
     */
    onProgress(callback) {
        const handler = (_event, progress) => {
            callback(progress);
        };
        electron_1.ipcRenderer.on('cloudBackup:progress', handler);
        // Return cleanup function
        return () => {
            electron_1.ipcRenderer.removeListener('cloudBackup:progress', handler);
        };
    },
};
const secureSaas = {
    /**
     * Make request to SaaS API (with SSRF protection in main)
     */
    async request(options) {
        const sanitized = {
            url: sanitizeString(options.url, 2000) || '',
            method: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method || '')
                ? options.method
                : 'GET',
            body: options.body,
            headers: options.headers || {},
        };
        return electron_1.ipcRenderer.invoke('saas:request', sanitized);
    },
};
// ============================================
// EXPOSE SECURE API
// ============================================
const electronSecureAPI = {
    auth: secureAuth,
    inventory: secureInventory,
    pos: securePOS,
    contacts: secureContacts,
    transactions: secureTransactions,
    settings: secureSettings,
    shell: secureShell,
    cloudBackup: secureCloudBackup,
    saas: secureSaas,
    // Utility
    platform: process.platform,
    versions: {
        node: process.versions.node,
        electron: process.versions.electron,
        chrome: process.versions.chrome,
    },
};
// Expose to renderer
electron_1.contextBridge.exposeInMainWorld('electronSecureAPI', electronSecureAPI);
