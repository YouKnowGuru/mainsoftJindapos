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
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function (t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function () { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function () { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var electron_1 = require("electron");
// ============================================
// INPUT SANITIZATION HELPERS
// ============================================
/**
 * Sanitize string input
 */
function sanitizeString(input, maxLength) {
    if (maxLength === void 0) { maxLength = 1000; }
    if (typeof input !== 'string')
        return null;
    var sanitized = input.trim().slice(0, maxLength);
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
        var parsed = parseFloat(input);
        if (!isNaN(parsed) && isFinite(parsed))
            return parsed;
    }
    return null;
}
/**
 * Validate ID
 */
function validateId(id) {
    var num = sanitizeNumber(id);
    if (num === null)
        return null;
    return Number.isInteger(num) && num > 0 && num <= 2147483647 ? num : null;
}
// ============================================
// SECURE API IMPLEMENTATIONS
// ============================================
var secureAuth = {
    /**
     * Login with credentials
     */
    login: function (credentials) {
        return __awaiter(this, void 0, void 0, function () {
            var sanitized;
            return __generator(this, function (_a) {
                if (!(credentials === null || credentials === void 0 ? void 0 : credentials.username) || !(credentials === null || credentials === void 0 ? void 0 : credentials.password)) {
                    return [2 /*return*/, { success: false, message: 'Username and password required' }];
                }
                sanitized = {
                    username: sanitizeString(credentials.username, 100) || '',
                    password: credentials.password.slice(0, 256), // Limit password length
                };
                return [2 /*return*/, electron_1.ipcRenderer.invoke('auth:login', sanitized)];
            });
        });
    },
    /**
     * Logout current user
     */
    logout: function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, electron_1.ipcRenderer.invoke('auth:logout')];
            });
        });
    },
    /**
     * Get current logged in user
     */
    getCurrentUser: function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, electron_1.ipcRenderer.invoke('auth:getCurrentUser')];
            });
        });
    },
};
var secureInventory = {
    /**
     * Create new inventory item
     */
    createItem: function (data) {
        return __awaiter(this, void 0, void 0, function () {
            var sanitized;
            return __generator(this, function (_a) {
                if (!(data === null || data === void 0 ? void 0 : data.name)) {
                    return [2 /*return*/, { success: false, message: 'Item name required' }];
                }
                sanitized = __assign(__assign({}, data), { name: sanitizeString(data.name, 200) || '', code: data.code ? sanitizeString(data.code, 50) : null, description: data.description ? sanitizeString(data.description, 1000) : null, category: data.category ? sanitizeString(data.category, 100) : null });
                return [2 /*return*/, electron_1.ipcRenderer.invoke('inventory:createItem', sanitized)];
            });
        });
    },
    /**
     * Get all inventory items
     */
    getItems: function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, electron_1.ipcRenderer.invoke('inventory:getItems')];
            });
        });
    },
    /**
     * Get single item by ID
     */
    getItem: function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var validatedId;
            return __generator(this, function (_a) {
                validatedId = validateId(id);
                if (validatedId === null) {
                    return [2 /*return*/, { success: false, message: 'Invalid ID' }];
                }
                return [2 /*return*/, electron_1.ipcRenderer.invoke('inventory:getItem', validatedId)];
            });
        });
    },
    /**
     * Update inventory item
     */
    updateItem: function (id, data) {
        return __awaiter(this, void 0, void 0, function () {
            var validatedId, sanitized;
            return __generator(this, function (_a) {
                validatedId = validateId(id);
                if (validatedId === null) {
                    return [2 /*return*/, { success: false, message: 'Invalid ID' }];
                }
                sanitized = {
                    id: validatedId,
                    data: __assign(__assign({}, data), { name: data.name ? sanitizeString(data.name, 200) : undefined, code: data.code ? sanitizeString(data.code, 50) : undefined, description: data.description ? sanitizeString(data.description, 1000) : undefined }),
                };
                return [2 /*return*/, electron_1.ipcRenderer.invoke('inventory:updateItem', sanitized)];
            });
        });
    },
    /**
     * Delete inventory item
     */
    deleteItem: function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var validatedId;
            return __generator(this, function (_a) {
                validatedId = validateId(id);
                if (validatedId === null) {
                    return [2 /*return*/, { success: false, message: 'Invalid ID' }];
                }
                return [2 /*return*/, electron_1.ipcRenderer.invoke('inventory:deleteItem', validatedId)];
            });
        });
    },
};
var securePOS = {
    /**
     * Create new sale
     */
    createSale: function (saleData) {
        return __awaiter(this, void 0, void 0, function () {
            var sanitizedItems, sanitized;
            return __generator(this, function (_a) {
                if (!(saleData === null || saleData === void 0 ? void 0 : saleData.items) || !Array.isArray(saleData.items) || saleData.items.length === 0) {
                    return [2 /*return*/, { success: false, message: 'Sale must have at least one item' }];
                }
                if (saleData.items.length > 100) {
                    return [2 /*return*/, { success: false, message: 'Too many items (max 100)' }];
                }
                sanitizedItems = saleData.items.map(function (item) {
                    return ({
                        itemId: validateId(item.itemId) || 0,
                        quantity: sanitizeNumber(item.quantity) || 0,
                        price: sanitizeNumber(item.price) || 0,
                        discount: sanitizeNumber(item.discount) || 0,
                        gstRate: sanitizeNumber(item.gstRate) || 5,
                    });
                });
                sanitized = __assign(__assign({}, saleData), { items: sanitizedItems, customerId: saleData.customerId ? validateId(saleData.customerId) : null, discountAmount: sanitizeNumber(saleData.discountAmount) || 0, notes: saleData.notes ? sanitizeString(saleData.notes, 1000) : null });
                return [2 /*return*/, electron_1.ipcRenderer.invoke('pos:createSale', sanitized)];
            });
        });
    },
    /**
     * Search inventory items
     */
    searchItems: function (query) {
        return __awaiter(this, void 0, void 0, function () {
            var sanitizedQuery;
            return __generator(this, function (_a) {
                sanitizedQuery = sanitizeString(query, 100);
                if (!sanitizedQuery) {
                    return [2 /*return*/, { success: false, message: 'Invalid search query' }];
                }
                return [2 /*return*/, electron_1.ipcRenderer.invoke('pos:searchItems', sanitizedQuery)];
            });
        });
    },
    /**
     * Get customers
     */
    getCustomers: function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, electron_1.ipcRenderer.invoke('pos:getCustomers')];
            });
        });
    },
};
var secureContacts = {
    /**
     * Create new contact (customer/supplier)
     */
    create: function (data) {
        return __awaiter(this, void 0, void 0, function () {
            var sanitized;
            return __generator(this, function (_a) {
                if (!(data === null || data === void 0 ? void 0 : data.name) || !(data === null || data === void 0 ? void 0 : data.type)) {
                    return [2 /*return*/, { success: false, message: 'Name and type required' }];
                }
                sanitized = __assign(__assign({}, data), { name: sanitizeString(data.name, 200) || '', contactPerson: data.contactPerson ? sanitizeString(data.contactPerson, 100) : null, phone: data.phone ? sanitizeString(data.phone, 20) : null, email: data.email ? sanitizeString(data.email, 254) : null, address: data.address ? sanitizeString(data.address, 500) : null, gstNumber: data.gstNumber ? sanitizeString(data.gstNumber, 50) : null });
                return [2 /*return*/, electron_1.ipcRenderer.invoke('contacts:create', sanitized)];
            });
        });
    },
    /**
     * Get all contacts
     */
    getAll: function (type) {
        return __awaiter(this, void 0, void 0, function () {
            var validType;
            return __generator(this, function (_a) {
                validType = type && ['customer', 'supplier'].includes(type) ? type : undefined;
                return [2 /*return*/, electron_1.ipcRenderer.invoke('contacts:getAll', validType)];
            });
        });
    },
};
var secureTransactions = {
    /**
     * Receive money transaction
     */
    receiveMoney: function (data) {
        return __awaiter(this, void 0, void 0, function () {
            var sanitized;
            return __generator(this, function (_a) {
                sanitized = {
                    contactId: data.contactId ? validateId(data.contactId) : null,
                    amount: sanitizeNumber(data.amount) || 0,
                    paymentMode: sanitizeString(data.paymentMode, 20) || 'cash',
                    reference: data.reference ? sanitizeString(data.reference, 100) : null,
                    description: data.description ? sanitizeString(data.description, 1000) : null,
                    date: data.date || new Date().toISOString().split('T')[0],
                };
                return [2 /*return*/, electron_1.ipcRenderer.invoke('transactions:receiveMoney', sanitized)];
            });
        });
    },
    /**
     * Pay money transaction
     */
    payMoney: function (data) {
        return __awaiter(this, void 0, void 0, function () {
            var sanitized;
            return __generator(this, function (_a) {
                sanitized = {
                    contactId: data.contactId ? validateId(data.contactId) : null,
                    amount: sanitizeNumber(data.amount) || 0,
                    paymentMode: sanitizeString(data.paymentMode, 20) || 'cash',
                    reference: data.reference ? sanitizeString(data.reference, 100) : null,
                    description: data.description ? sanitizeString(data.description, 1000) : null,
                    date: data.date || new Date().toISOString().split('T')[0],
                };
                return [2 /*return*/, electron_1.ipcRenderer.invoke('transactions:payMoney', sanitized)];
            });
        });
    },
    /**
     * Void a transaction
     */
    void: function (data) {
        return __awaiter(this, void 0, void 0, function () {
            var validatedId, sanitized;
            return __generator(this, function (_a) {
                validatedId = validateId(data.transactionId);
                if (validatedId === null) {
                    return [2 /*return*/, { success: false, message: 'Invalid transaction ID' }];
                }
                sanitized = {
                    transactionId: validatedId,
                    reason: sanitizeString(data.reason, 500) || '',
                };
                return [2 /*return*/, electron_1.ipcRenderer.invoke('transactions:void', sanitized)];
            });
        });
    },
};
var secureDashboard = {
    /**
     * Get dashboard data
     */
    getData: function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, electron_1.ipcRenderer.invoke('dashboard:getData')];
            });
        });
    },
    /**
     * Get real-time metrics
     */
    getRealtimeMetrics: function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, electron_1.ipcRenderer.invoke('dashboard:getRealtimeMetrics')];
            });
        });
    },
    /**
     * Get notifications
     */
    getNotifications: function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, electron_1.ipcRenderer.invoke('dashboard:getNotifications')];
            });
        });
    },
};
var secureSettings = {
    /**
     * Get settings
     */
    get: function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, electron_1.ipcRenderer.invoke('settings:get')];
            });
        });
    },
    /**
     * Update settings
     */
    update: function (settings) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, electron_1.ipcRenderer.invoke('settings:update', settings)];
            });
        });
    },
    /**
     * Get users
     */
    getUsers: function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, electron_1.ipcRenderer.invoke('settings:getUsers')];
            });
        });
    },
    /**
     * Check if users exist
     */
    hasUsers: function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, electron_1.ipcRenderer.invoke('settings:hasUsers')];
            });
        });
    },
    /**
     * Create initial user (no auth required)
     */
    createInitialUser: function (userData) {
        return __awaiter(this, void 0, void 0, function () {
            var sanitized;
            return __generator(this, function (_a) {
                if (!(userData === null || userData === void 0 ? void 0 : userData.username) || !(userData === null || userData === void 0 ? void 0 : userData.password) || !(userData === null || userData === void 0 ? void 0 : userData.fullName)) {
                    return [2 /*return*/, { success: false, message: 'Username, password, and full name required' }];
                }
                sanitized = {
                    username: sanitizeString(userData.username, 50) || '',
                    email: userData.email ? sanitizeString(userData.email, 254) : null,
                    password: userData.password.slice(0, 128),
                    fullName: sanitizeString(userData.fullName, 100) || '',
                    role: 'admin',
                };
                return [2 /*return*/, electron_1.ipcRenderer.invoke('settings:createInitialUser', sanitized)];
            });
        });
    },
    /**
     * Create new user
     */
    createUser: function (userData) {
        return __awaiter(this, void 0, void 0, function () {
            var password, sanitized;
            return __generator(this, function (_a) {
                if (!(userData === null || userData === void 0 ? void 0 : userData.username) || !(userData === null || userData === void 0 ? void 0 : userData.password) || !(userData === null || userData === void 0 ? void 0 : userData.fullName)) {
                    return [2 /*return*/, { success: false, message: 'Username, password, and full name required' }];
                }
                password = userData.password;
                if (password.length < 8) {
                    return [2 /*return*/, { success: false, message: 'Password must be at least 8 characters' }];
                }
                if (password.length > 128) {
                    return [2 /*return*/, { success: false, message: 'Password too long' }];
                }
                sanitized = {
                    username: sanitizeString(userData.username, 50) || '',
                    email: userData.email ? sanitizeString(userData.email, 254) : null,
                    password: password,
                    fullName: sanitizeString(userData.fullName, 100) || '',
                    role: ['admin', 'staff'].includes(userData.role) ? userData.role : 'staff',
                };
                return [2 /*return*/, electron_1.ipcRenderer.invoke('settings:createUser', sanitized)];
            });
        });
    },
    /**
     * Change password
     */
    changePassword: function (data) {
        return __awaiter(this, void 0, void 0, function () {
            var validatedId, sanitized;
            var _a;
            return __generator(this, function (_b) {
                validatedId = validateId(data.userId);
                if (validatedId === null) {
                    return [2 /*return*/, { success: false, message: 'Invalid user ID' }];
                }
                if (!data.newPassword || data.newPassword.length < 8) {
                    return [2 /*return*/, { success: false, message: 'New password must be at least 8 characters' }];
                }
                sanitized = {
                    userId: validatedId,
                    oldPassword: (_a = data.oldPassword) === null || _a === void 0 ? void 0 : _a.slice(0, 256),
                    newPassword: data.newPassword.slice(0, 128),
                };
                return [2 /*return*/, electron_1.ipcRenderer.invoke('settings:changePassword', sanitized)];
            });
        });
    },
    /**
     * Get smart defaults
     */
    getSmartDefaults: function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, electron_1.ipcRenderer.invoke('settings:getSmartDefaults')];
            });
        });
    },
};
var secureShell = {
    /**
     * Open external URL (validated in main process)
     */
    openExternal: function (url) {
        return __awaiter(this, void 0, void 0, function () {
            var sanitizedUrl;
            return __generator(this, function (_a) {
                sanitizedUrl = sanitizeString(url, 2000);
                if (!sanitizedUrl) {
                    return [2 /*return*/, { success: false, message: 'Invalid URL' }];
                }
                return [2 /*return*/, electron_1.ipcRenderer.invoke('shell:openExternal', sanitizedUrl)];
            });
        });
    },
};
var secureCloudBackup = {
    /**
     * Get cloud backup settings
     */
    getSettings: function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, electron_1.ipcRenderer.invoke('cloudBackup:getSettings')];
            });
        });
    },
    /**
     * Save cloud backup settings
     */
    saveSettings: function (settings) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, electron_1.ipcRenderer.invoke('cloudBackup:saveSettings', settings)];
            });
        });
    },
    /**
     * Run backup now
     */
    runNow: function (targets) {
        return __awaiter(this, void 0, void 0, function () {
            var sanitizedTargets;
            return __generator(this, function (_a) {
                if (!Array.isArray(targets)) {
                    return [2 /*return*/, { success: false, message: 'Invalid targets' }];
                }
                sanitizedTargets = targets
                    .filter(function (t) { return typeof t === 'string'; })
                    .map(function (t) { return sanitizeString(t, 50); })
                    .filter(Boolean);
                return [2 /*return*/, electron_1.ipcRenderer.invoke('cloudBackup:runNow', sanitizedTargets)];
            });
        });
    },
    /**
     * Progress listener
     */
    onProgress: function (callback) {
        var handler = function (_event, progress) {
            callback(progress);
        };
        electron_1.ipcRenderer.on('cloudBackup:progress', handler);
        // Return cleanup function
        return function () {
            electron_1.ipcRenderer.removeListener('cloudBackup:progress', handler);
        };
    },
};
var secureBackup = {
    /**
     * Create backup
     */
    create: function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, electron_1.ipcRenderer.invoke('backup:create')];
            });
        });
    },
    /**
     * Restore backup
     */
    restore: function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, electron_1.ipcRenderer.invoke('backup:restore')];
            });
        });
    },
    /**
     * Get auto backup status
     */
    autoBackupStatus: function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, electron_1.ipcRenderer.invoke('backup:autoBackupStatus')];
            });
        });
    },
};
var secureLicense = {
    /**
     * Get license status
     */
    getStatus: function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, electron_1.ipcRenderer.invoke('license:getStatus')];
            });
        });
    },
    /**
     * Activate license - FIXED: sends object instead of separate args
     */
    activate: function (licenseKey, otp, password) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, electron_1.ipcRenderer.invoke('license:activate', { licenseKey: licenseKey, otp: otp, password: password })];
            });
        });
    },
    /**
     * Start trial
     */
    startTrial: function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, electron_1.ipcRenderer.invoke('license:startTrial')];
            });
        });
    },
    /**
     * Get trial info
     */
    getTrialInfo: function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, electron_1.ipcRenderer.invoke('license:getTrialInfo')];
            });
        });
    },
    /**
     * Verify with server
     */
    verifyWithServer: function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, electron_1.ipcRenderer.invoke('license:verifyWithServer')];
            });
        });
    },
    /**
     * Get user limit
     */
    getUserLimit: function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, electron_1.ipcRenderer.invoke('license:getUserLimit')];
            });
        });
    },
    /**
     * Check for updates
     */
    checkUpdate: function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, electron_1.ipcRenderer.invoke('license:checkUpdate')];
            });
        });
    },
};
var secureSaas = {
    /**
     * Make request to SaaS API (with SSRF protection in main)
     */
    request: function (options) {
        return __awaiter(this, void 0, void 0, function () {
            var sanitized;
            return __generator(this, function (_a) {
                sanitized = {
                    url: sanitizeString(options.url, 2000) || '',
                    method: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method || '')
                        ? options.method
                        : 'GET',
                    body: options.body,
                    headers: options.headers || {},
                };
                return [2 /*return*/, electron_1.ipcRenderer.invoke('saas:request', sanitized)];
            });
        });
    },
};
// ============================================
// EXPOSE SECURE API
// ============================================
var electronSecureAPI = {
    auth: secureAuth,
    dashboard: secureDashboard,
    inventory: secureInventory,
    pos: securePOS,
    contacts: secureContacts,
    transactions: secureTransactions,
    settings: secureSettings,
    license: secureLicense,
    backup: secureBackup,
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
