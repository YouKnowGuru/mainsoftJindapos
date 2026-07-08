import { app, BrowserWindow, ipcMain, dialog, shell, session } from 'electron';
import path from 'path';
import fs from 'fs';
import { pathToFileURL, URL } from 'url';
import { encryptBuffer, decryptBuffer } from '../src/utils/encryption';
import { z } from 'zod';
import type { TokenData } from '../src/utils/secureStorage';
import { getDeviceId } from '../src/utils/deviceId';

// Import validators
import {
  LoginCredentialsSchema,
  CreateUserSchema,
  ChangePasswordSchema,
  CreateItemSchema,
  UpdateItemSchema,
  SaleDataSchema,
  CreateContactSchema,
  UpdateContactSchema,
  ReceiveMoneySchema,
  PayMoneySchema,
  VoidTransactionSchema,
  GSTPeriodSchema,
  ClosePeriodSchema,
  CloudBackupSettingsSchema,
  MegaCredentialsSchema,
  SaaSRequestSchema,
  IdSchema,
  StockMovementSchema,
} from './security/validators';

const isDev = process.env.NODE_ENV === 'development' || !app?.isPackaged;

// Global unhandled rejection handler to prevent crashes from async errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Main] Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't crash — log and continue
});

process.on('uncaughtException', (error) => {
  console.error('[Main] Uncaught Exception:', error);
  // Don't crash — log and continue
  // In production you might want to restart the app here
});

// Load environment variables from .env file (dev only)
if (isDev) {
  try {
    const envPath = path.join(__dirname, '../../.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      envContent.split('\n').forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let value = match[2] || '';
          if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
          if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
          process.env[key] = value;
        }
      });
      console.log('[Main] Environment variables loaded from:', envPath);
    } else {
      console.warn('[Main] .env file not found at:', envPath);
    }
    
    if (!process.env.ENCRYPTION_PEPPER) {
      console.warn('[Main] WARNING: ENCRYPTION_PEPPER is missing in environment!');
    }
  } catch (error) {
    console.error('[Main] Failed to load .env file:', error);
  }
}

import { DatabaseManager } from '../src/database/DatabaseManager';
import { AccountingService } from '../src/services/AccountingService';
import { InventoryService } from '../src/services/InventoryService';
import { GSTService } from '../src/services/GSTService';
import { ReportService } from '../src/services/ReportService';
import { PrintingService } from '../src/services/PrintingService';
import { BackupService } from '../src/services/BackupService';
import { CloudBackupService } from '../src/services/CloudBackupService';
import { AutomationService } from '../src/services/AutomationService';
import { AccountingEngineService } from '../src/services/AccountingEngineService';
import { LicenseService } from '../src/services/LicenseService';
import { UpdateService } from '../src/services/UpdateService';
import { updateManager } from './update-manager';
import { HeldCartService } from '../src/services/HeldCartService';
import { ExpenseService } from '../src/services/ExpenseService';
import { PurchaseOrderService } from '../src/services/PurchaseOrderService';
import { AuditService } from '../src/services/AuditService';
import { QuotationService } from '../src/services/QuotationService';
import { RefundService } from '../src/services/RefundService';
import { RecurringService } from '../src/services/RecurringService';
import { AgedReportService } from '../src/services/AgedReportService';
import { ExportService } from '../src/services/ExportService';
import { BarcodeService } from '../src/services/BarcodeService';
import { EmployeeService } from '../src/services/EmployeeService';
import { BranchService } from '../src/services/BranchService';
import { CSVImportService } from '../src/services/CSVImportService';
import { SplitPaymentService } from '../src/services/SplitPaymentService';
import { TieredPricingService } from '../src/services/TieredPricingService';
import { EmailInvoiceService } from '../src/services/EmailInvoiceService';
import { PayrollService } from '../src/services/PayrollService';

// Disable ALL Chromium print preview features to force the Native Windows System Print Dialog
app?.commandLine?.appendSwitch?.('disable-features', 'PrintPreview,PrintPreviewV2');

// Keep global references to prevent garbage collection
let mainWindow: BrowserWindow | null = null;
let dbManager: DatabaseManager;
let accountingService: AccountingService;
let inventoryService: InventoryService;
let gstService: GSTService;
let reportService: ReportService;
let printingService: PrintingService;
let backupService: BackupService;
let cloudBackupService: CloudBackupService;
let automationService: AutomationService;
let accountingEngineService: AccountingEngineService;
let licenseService: LicenseService;
let updateService: UpdateService;
let heldCartService: HeldCartService;
let expenseService: ExpenseService;
let purchaseOrderService: PurchaseOrderService;
let auditService: AuditService;
let quotationService: QuotationService;
let refundService: RefundService;
let recurringService: RecurringService;
let agedReportService: AgedReportService;
let exportService: ExportService;
let barcodeService: BarcodeService;
let employeeService: EmployeeService;
let branchService: BranchService;
let csvImportService: CSVImportService;
let splitPaymentService: SplitPaymentService;
let tieredPricingService: TieredPricingService;
let emailInvoiceService: EmailInvoiceService;
let payrollService: PayrollService;

/**
 * Validate and sanitize table names to prevent SQL injection
 */
const ALLOWED_TABLES = [
  'users', 'companies', 'accounts', 'contacts', 'items',
  'transactions', 'transaction_lines', 'stock_movements',
  'invoices', 'invoice_items', 'gst_entries', 'audit_logs',
  'item_categories', 'item_units', 'settings', 'period_locks'
];

function validateTableName(tableName: string): boolean {
  return ALLOWED_TABLES.includes(tableName);
}

/**
 * Validate URL for shell.openExternal
 */
const ALLOWED_PROTOCOLS = ['https:', 'http:'];
const ALLOWED_DOMAINS = [
  'jinda.com',
  'www.jinda.com',
  'api.jinda.com',
  'support.jinda.com',
  'github.com',
  'docs.google.com',
  'drive.google.com',
  'dhisum-tseyig.vercel.app',
];

function isValidExternalUrl(urlString: string): { valid: boolean; error?: string } {
  try {
    const url = new URL(urlString);

    // Validate protocol
    if (!ALLOWED_PROTOCOLS.includes(url.protocol)) {
      return { valid: false, error: 'Invalid protocol' };
    }

    // Validate domain against allowlist
    const isAllowedDomain = ALLOWED_DOMAINS.some(domain =>
      url.hostname === domain || url.hostname.endsWith('.' + domain)
    );

    if (!isAllowedDomain) {
      return { valid: false, error: 'Domain not in allowlist' };
    }

    // Block localhost/file protocols
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      return { valid: false, error: 'Localhost not allowed' };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Sanitize input to prevent path traversal
 */
function sanitizePath(inputPath: string): string {
  // Remove null bytes
  const cleaned = inputPath.replace(/\0/g, '');
  // Normalize and resolve to prevent traversal
  const resolved = path.resolve(cleaned);
  const userData = app.getPath('userData');

  // Ensure path is within userData directory
  if (!resolved.startsWith(userData)) {
    throw new Error('Path traversal detected');
  }

  return resolved;
}

// ============================================
// SECURITY MIDDLEWARE
// ============================================

type IpcHandler = (event: Electron.IpcMainInvokeEvent, ...args: any[]) => Promise<any>;

interface IpcSecurityOptions {
  requireAuth?: boolean;
  requireAdmin?: boolean;
  rateLimit?: boolean;
  rateLimitKey?: string;
  validator?: z.ZodSchema<any>;
}

// Rate limiting storage
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 5;

function checkRateLimit(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(identifier, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1, resetTime: now + RATE_LIMIT_WINDOW };
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0, resetTime: entry.resetTime };
  }

  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX - entry.count, resetTime: entry.resetTime };
}

function createSecureIpcHandler(
  handler: IpcHandler,
  options: IpcSecurityOptions = {}
): IpcHandler {
  return async (event, ...args) => {
    try {
      // Rate limiting
      if (options.rateLimit) {
        const key = options.rateLimitKey || event.sender.id.toString();
        const rateCheck = checkRateLimit(key);
        if (!rateCheck.allowed) {
          return {
            ok: false,
            status: 429,
            data: {
              success: false,
              error: 'Too many requests. Please try again later.',
              retryAfter: Math.ceil((rateCheck.resetTime - Date.now()) / 1000),
            },
          };
        }
      }

      // Authentication check
      if (options.requireAuth && accountingService) {
        const currentUser = accountingService.getCurrentUser();
        if (!currentUser) {
          return {
            ok: false,
            status: 401,
            data: { success: false, error: 'Authentication required' }
          };
        }

        // Admin check
        if (options.requireAdmin && currentUser.role !== 'admin') {
          return {
            ok: false,
            status: 403,
            data: { success: false, error: 'Admin privileges required' }
          };
        }
      }

      // Input validation
      if (options.validator && args.length > 0) {
        const validationResult = options.validator.safeParse(args[0]);
        if (!validationResult.success) {
          return {
            ok: false,
            status: 400,
            data: {
              success: false,
              error: 'Invalid input: ' + (validationResult.error as any).issues.map((e: any) => e.message).join(', '),
            },
          };
        }
        args[0] = validationResult.data;
      }

      return await handler(event, ...args);
    } catch (error: any) {
      console.error('[IPC Security] Handler error:', error);
      return {
        ok: false,
        status: 500,
        data: {
          success: false,
          error: isDev ? error.message : 'An error occurred',
        },
      };
    }
  };
}

/**
 * Create the main application window
 */
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      webSecurity: true, // ✅ SECURITY: Enabled to prevent CORS bypass
      allowRunningInsecureContent: false, // ✅ SECURITY: Block insecure content
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload-secure.js'),
    },
    title: 'Jinda - Accounting & POS',
    icon: path.join(__dirname, '../build/icon.png'),
    show: false,
  });

  // Load the app
  if (mainWindow) {
    if (isDev) {
      mainWindow.loadURL('http://127.0.0.1:5173').catch(() => {
        console.log('Dev server not available, falling back to local files');
        mainWindow?.loadFile(path.join(__dirname, '../../dist/index.html'));
      });
      // Only open DevTools in development
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    } else {
      mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
      // ✅ SECURITY: Prevent DevTools in production
      mainWindow.webContents.on('devtools-opened', () => {
        mainWindow?.webContents.closeDevTools();
      });
    }
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    console.log('[Main] Window ready to show');
    mainWindow?.show();
    console.log('[Main] Window shown');
  });

  // Debug: Log navigation events
  mainWindow.webContents.on('did-start-loading', () => {
    console.log('[Main] Window started loading');
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[Main] Window finished loading');
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('[Main] Window failed to load:', errorCode, errorDescription);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Initialize the application
 */
// Disable GPU cache to prevent Windows permission issues
app?.commandLine?.appendSwitch?.('disable-gpu-sandbox');
app?.commandLine?.appendSwitch?.('disable-gpu-rasterization');
app?.commandLine?.appendSwitch?.('disable-software-rasterizer');

console.log('[Main] App starting, NODE_ENV:', process.env.NODE_ENV);
console.log('[Main] App object exists:', !!app);
console.log('[Main] App isReady:', app?.isReady?.());
console.log('[Main] App isPackaged:', app?.isPackaged);

// Set custom cache directory to avoid permission issues
// Delay until app is ready to ensure app.getPath works
let customCacheDir: string;
function setupCacheDir() {
  try {
    customCacheDir = path.join(app.getPath('userData'), 'cache');
    if (!fs.existsSync(customCacheDir)) {
      fs.mkdirSync(customCacheDir, { recursive: true });
    }
    app?.commandLine?.appendSwitch?.('disk-cache-dir', customCacheDir);
    console.log('[Main] Cache directory:', customCacheDir);
  } catch (e) {
    console.warn('[Main] Could not set custom cache dir:', e);
  }
}

if (app?.isReady()) {
  console.log('[Main] App already ready, initializing immediately');
  initializeApp();
} else {
  console.log('[Main] Waiting for app to be ready...');
  app?.whenReady().then(() => {
    console.log('[Main] App is ready (event)');
    initializeApp();
  }).catch((err) => {
    console.error('[Main] whenReady error:', err);
  });
}

function initializeApp(): void {
  console.log('[Main] Initializing app...');
  setupCacheDir();

  // SECURITY: Set CSP headers
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; " +
          "script-src 'self' 'unsafe-inline'; " +
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
          "img-src 'self' data: blob: https:; " +
          (isDev
            ? "connect-src 'self' http://localhost:* http://127.0.0.1:* https://api.jinda.com https://jindapos.com https://dhisum-tseyig.vercel.app ws://localhost:*; "
            : "connect-src 'self' https://api.jinda.com https://jindapos.com https://dhisum-tseyig.vercel.app; ") +
          "font-src 'self' https://fonts.gstatic.com; " +
          "frame-ancestors 'none'; " +
          "base-uri 'self'; " +
          "form-action 'self';"
        ],
        'X-Frame-Options': ['DENY'],
        'X-Content-Type-Options': ['nosniff'],
        'Referrer-Policy': ['strict-origin-when-cross-origin'],
        'Permissions-Policy': [
          'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()'
        ],
      },
    });
  });

  // Initialize database
  const dbPath = path.join(app.getPath('userData'), 'dhisum_tseyig.db');
  console.log('Database path:', dbPath);

  try {
    dbManager = new DatabaseManager(dbPath);
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    app.quit();
    return;
  }

  // Initialize services
  accountingEngineService = new AccountingEngineService(dbManager);
  automationService = new AutomationService(dbManager);
  accountingService = new AccountingService(dbManager);
  inventoryService = new InventoryService(dbManager);
  gstService = new GSTService(dbManager);
  reportService = new ReportService(dbManager);
  printingService = new PrintingService();
  backupService = new BackupService(dbManager, app.getPath('userData'));
  cloudBackupService = new CloudBackupService(dbManager, app.getPath('userData'));

  // Initialize license and update services
  licenseService = new LicenseService(app.getPath('userData'));
  const pkg = require(path.join(__dirname, '../../package.json'));
  updateService = new UpdateService(pkg.version || '1.0.0');

  // Initialize auto-updater
  updateManager.setBackupService(backupService);
  updateManager.start();

  // Initialize new feature services
  heldCartService = new HeldCartService(dbManager);
  expenseService = new ExpenseService(dbManager);
  purchaseOrderService = new PurchaseOrderService(dbManager);
  auditService = new AuditService(dbManager);
  quotationService = new QuotationService(dbManager);
  refundService = new RefundService(dbManager);
  recurringService = new RecurringService(dbManager);
  agedReportService = new AgedReportService(dbManager);
  exportService = new ExportService();
  barcodeService = new BarcodeService(dbManager);
  employeeService = new EmployeeService(dbManager);
  branchService = new BranchService(dbManager);
  csvImportService = new CSVImportService(accountingService, inventoryService);
  splitPaymentService = new SplitPaymentService(dbManager);
  tieredPricingService = new TieredPricingService(dbManager);
  emailInvoiceService = new EmailInvoiceService();
  payrollService = new PayrollService(dbManager);

  // Start periodic license verification (daily)
  licenseService.startPeriodicVerification();

  // Create main window
  createWindow();

  // BUG-12 FIX: Set the mainWindow references AFTER createWindow() is called
  // so the window actually exists and the services can communicate with it.
  if (mainWindow) {
    updateManager.setMainWindow(mainWindow);
    cloudBackupService.setMainWindow(mainWindow);
  }

  // BUG-05 FIX: Track the last backup date so we never fire more than once
  // per day, even if the interval drifts (e.g. machine sleep/wake).
  let lastBackupDate: string | null = null;

  // Daily backup scheduler (runs every hour to check)
  setInterval(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    if (now.getHours() === 23 && lastBackupDate !== today) {
      lastBackupDate = today;
      backupService.createDailyBackup();
    }
  }, 60 * 60 * 1000);


  // Recurring transactions scheduler (runs every hour, and once at startup)
  // Process any due transactions at startup
  try {
    const initialResult = recurringService.processDueToday();
    if (initialResult.success && initialResult.data && initialResult.data > 0) {
      console.log(`[Recurring Scheduler] Initial processing: ${initialResult.data} transaction(s) processed`);
    }
  } catch (error) {
    console.error('[Recurring Scheduler] Initial processing error');
  }

  // Check every hour for new due transactions
  setInterval(() => {
    try {
      const result = recurringService.processDueToday();
      if (result.success && result.data && result.data > 0) {
        console.log(`[Recurring Scheduler] Processed ${result.data} transaction(s)`);
        // Notify renderer if window exists
        if (mainWindow) {
          mainWindow.webContents.send('recurring:processed', { count: result.data, message: result.message });
        }
      } else if (!result.success) {
        console.error('[Recurring Scheduler] Processing failed');
      }
    } catch (error) {
      console.error('[Recurring Scheduler] Interval processing error');
    }
  }, 60 * 60 * 1000); // Every hour

  app.on('activate', () => {
    if (mainWindow === null) {
      createWindow();
    }
  });
}

// ============================================
// IPC HANDLERS - Authentication
// ============================================

ipcMain.handle('auth:login', createSecureIpcHandler(
  async (_event, credentials) => {
    // Login attempt logged via audit system;
    const rateCheck = checkRateLimit(`login:${credentials.username}`);
    if (!rateCheck.allowed) {
      return {
        success: false,
        message: 'Too many login attempts. Please try again later.',
      };
    }
    const result = await accountingService.login(credentials);
    // Login result logged via audit system;
    return result;
  },
  { validator: LoginCredentialsSchema, rateLimit: true }
));

ipcMain.handle('auth:logout', createSecureIpcHandler(
  async () => {
    accountingService.logout();
    return { success: true };
  },
  { requireAuth: true }
));

ipcMain.handle('auth:syncPassword', createSecureIpcHandler(
  async (_event, data) => {
    return accountingService.syncLocalPassword(data.email, data.password);
  },
  { requireAuth: true, validator: z.object({ email: z.string().email(), password: z.string().min(1).max(256) }) }
));

ipcMain.handle('auth:getCurrentUser', createSecureIpcHandler(
  async () => {
    return accountingService.getCurrentUser();
  },
  {}
));

// ============================================
// IPC HANDLERS - Dashboard
// ============================================

ipcMain.handle('dashboard:getData', createSecureIpcHandler(
  async () => reportService.getDashboardData(),
  { requireAuth: true }
));

ipcMain.handle('dashboard:getRealtimeMetrics', createSecureIpcHandler(
  async () => automationService.getRealtimeDashboardMetrics(),
  { requireAuth: true }
));

ipcMain.handle('dashboard:getNotifications', createSecureIpcHandler(
  async () => reportService.getNotifications(),
  { requireAuth: true }
));

// ============================================
// IPC HANDLERS - POS Sales
// ============================================

ipcMain.handle('pos:createSale', createSecureIpcHandler(
  async (_event, saleData) => accountingService.createSale(saleData),
  { requireAuth: true, validator: SaleDataSchema }
));

ipcMain.handle('pos:getItems', createSecureIpcHandler(
  async () => inventoryService.getAllItems(),
  { requireAuth: true }
));

ipcMain.handle('pos:searchItems', createSecureIpcHandler(
  async (_event, query) => {
    if (typeof query !== 'string' || query.length > 100) {
      return { success: false, message: 'Invalid search query' };
    }
    return inventoryService.searchItems(query);
  },
  { requireAuth: true }
));

ipcMain.handle('pos:getCustomers', createSecureIpcHandler(
  async () => accountingService.getContacts('customer'),
  { requireAuth: true }
));

// ============================================
// IPC HANDLERS - Inventory
// ============================================

ipcMain.handle('inventory:createItem', createSecureIpcHandler(
  async (_event, data) => inventoryService.createItem(data),
  { requireAuth: true, validator: CreateItemSchema }
));

ipcMain.handle('inventory:addStock', createSecureIpcHandler(
  async (_event, stockData) => inventoryService.addStock(stockData),
  { requireAuth: true, validator: StockMovementSchema }
));

ipcMain.handle('inventory:getItems', createSecureIpcHandler(
  async () => inventoryService.getAllItems(),
  { requireAuth: true }
));

ipcMain.handle('inventory:getItem', createSecureIpcHandler(
  async (_event, id) => {
    const validated = IdSchema.safeParse(id);
    if (!validated.success) return { success: false, message: 'Invalid ID' };
    return inventoryService.getItemById(validated.data);
  },
  { requireAuth: true }
));

ipcMain.handle('inventory:updateItem', createSecureIpcHandler(
  async (_event, { id, data }) => {
    const idValidation = IdSchema.safeParse(id);
    if (!idValidation.success) return { success: false, message: 'Invalid ID' };
    return inventoryService.updateItem(idValidation.data, data);
  },
  { requireAuth: true, validator: UpdateItemSchema }
));

ipcMain.handle('inventory:deleteItem', createSecureIpcHandler(
  async (_event, id) => {
    const validated = IdSchema.safeParse(id);
    if (!validated.success) return { success: false, message: 'Invalid ID' };
    return inventoryService.deleteItem(validated.data);
  },
  { requireAuth: true }
));

ipcMain.handle('inventory:getLowStock', createSecureIpcHandler(
  async () => inventoryService.getLowStockItems(),
  { requireAuth: true }
));

ipcMain.handle('inventory:getCategories', createSecureIpcHandler(
  async () => inventoryService.getCategories(),
  { requireAuth: true }
));

ipcMain.handle('inventory:createCategory', createSecureIpcHandler(
  async (_event, name) => {
    const validated = z.string().min(1).max(100).safeParse(name);
    if (!validated.success) return { success: false, message: 'Invalid category name' };
    return inventoryService.createCategory(validated.data);
  },
  { requireAuth: true }
));

ipcMain.handle('inventory:deleteCategory', createSecureIpcHandler(
  async (_event, id) => {
    const validated = IdSchema.safeParse(id);
    if (!validated.success) return { success: false, message: 'Invalid ID' };
    return inventoryService.deleteCategory(validated.data);
  },
  { requireAuth: true }
));

ipcMain.handle('inventory:getUnits', createSecureIpcHandler(
  async () => inventoryService.getUnits(),
  { requireAuth: true }
));

ipcMain.handle('inventory:createUnit', createSecureIpcHandler(
  async (_event, name) => {
    const validated = z.string().min(1).max(50).safeParse(name);
    if (!validated.success) return { success: false, message: 'Invalid unit name' };
    return inventoryService.createUnit(validated.data);
  },
  { requireAuth: true }
));

ipcMain.handle('inventory:deleteUnit', createSecureIpcHandler(
  async (_event, id) => {
    const validated = IdSchema.safeParse(id);
    if (!validated.success) return { success: false, message: 'Invalid ID' };
    return inventoryService.deleteUnit(validated.data);
  },
  { requireAuth: true }
));

// ============================================
// IPC HANDLERS - Contacts
// ============================================

ipcMain.handle('contacts:getAll', createSecureIpcHandler(
  async (_event, type) => {
    if (type && !['customer', 'supplier'].includes(type)) {
      return { success: false, message: 'Invalid contact type' };
    }
    return accountingService.getContacts(type);
  },
  { requireAuth: true }
));

ipcMain.handle('contacts:create', createSecureIpcHandler(
  async (_event, data) => accountingService.createContact(data),
  { requireAuth: true, validator: CreateContactSchema }
));

ipcMain.handle('contacts:update', createSecureIpcHandler(
  async (_event, { id, data }) => {
    const idValidation = IdSchema.safeParse(id);
    if (!idValidation.success) return { success: false, message: 'Invalid ID' };
    return accountingService.updateContact(idValidation.data, data);
  },
  { requireAuth: true, validator: UpdateContactSchema }
));

ipcMain.handle('contacts:delete', createSecureIpcHandler(
  async (_event, id) => {
    const validated = IdSchema.safeParse(id);
    if (!validated.success) return { success: false, message: 'Invalid ID' };
    return accountingService.deleteContact(validated.data);
  },
  { requireAuth: true }
));

ipcMain.handle('contacts:getLedger', createSecureIpcHandler(
  async (_event, contactId) => {
    const validated = IdSchema.safeParse(contactId);
    if (!validated.success) return { success: false, message: 'Invalid contact ID' };
    return accountingService.getContactLedger(validated.data);
  },
  { requireAuth: true }
));

ipcMain.handle('accounts:getAll', createSecureIpcHandler(
  async () => {
    try {
      const db = dbManager.getDatabase();
      const accounts = db.prepare(`
        SELECT a.id, a.code, a.name, a.type, a.subtype, a.is_active,
               COALESCE(
                 (SELECT SUM(tl.debit_amount) - SUM(tl.credit_amount) FROM transaction_lines tl WHERE tl.account_id = a.id),
                 0
               ) as balance
        FROM accounts a
        WHERE a.is_active = 1
        ORDER BY a.code
      `).all();
      return { success: true, data: accounts };
    } catch (error: any) {
      console.error('[accounts:getAll] SQL Error');
      return { success: false, message: 'Failed to get accounts' };
    }
  },
  { requireAuth: true }
));

// ============================================
// IPC HANDLERS - Transactions
// ============================================

ipcMain.handle('transactions:receiveMoney', createSecureIpcHandler(
  async (_event, data) => accountingService.receiveMoney(data),
  { requireAuth: true, validator: ReceiveMoneySchema }
));

ipcMain.handle('transactions:payMoney', createSecureIpcHandler(
  async (_event, data) => accountingService.payMoney(data),
  { requireAuth: true, validator: PayMoneySchema }
));

ipcMain.handle('transactions:transfer', createSecureIpcHandler(
  async (_event, data) => accountingService.transferMoney(data),
  { requireAuth: true, validator: z.object({ amount: z.number().positive(), fromAccountId: IdSchema, toAccountId: IdSchema, date: z.string(), reference: z.string().optional(), description: z.string().optional() }) }
));

ipcMain.handle('transactions:getAll', createSecureIpcHandler(
  async (_event, filters) => accountingService.getTransactions(filters),
  { requireAuth: true }
));

ipcMain.handle('transactions:void', createSecureIpcHandler(
  async (_event, data) => accountingService.voidTransaction(data.transactionId, data.reason),
  { requireAuth: true, requireAdmin: true, validator: VoidTransactionSchema }
));

ipcMain.handle('transactions:getInvoiceData', createSecureIpcHandler(
  async (_event, transactionId) => {
    const validated = IdSchema.safeParse(transactionId);
    if (!validated.success) return { success: false, message: 'Invalid transaction ID' };
    return accountingService.getInvoiceByTransactionId(validated.data);
  },
  { requireAuth: true }
));

ipcMain.handle('transactions:export', createSecureIpcHandler(
  async (_event, filters) => {
    const result = accountingService.getTransactions(filters);
    if (result.length > 0) {
      exportService.exportTransactions(result);
      return { success: true, message: 'Transactions exported successfully' };
    }
    return { success: false, message: 'No transactions to export' };
  },
  { requireAuth: true }
));

// ============================================
// IPC HANDLERS - GST
// ============================================

ipcMain.handle('gst:getSummary', createSecureIpcHandler(
  async (_event, { month, year }) => gstService.getGSTSummary(month, year),
  { requireAuth: true, validator: GSTPeriodSchema }
));

ipcMain.handle('gst:getReturns', createSecureIpcHandler(
  async () => gstService.getGSTReturns(),
  { requireAuth: true }
));

ipcMain.handle('gst:fileReturn', createSecureIpcHandler(
  async (_event, { month, year }) => gstService.fileGSTReturn(month, year),
  { requireAuth: true, requireAdmin: true, validator: GSTPeriodSchema }
));

ipcMain.handle('gst:updateStatus', createSecureIpcHandler(
  async (_event, { month, year, isFiled }) => gstService.updateGSTStatus(month, year, isFiled),
  { requireAuth: true, requireAdmin: true, validator: GSTPeriodSchema.extend({ isFiled: z.boolean() }) }
));

// ============================================
// IPC HANDLERS - Reports
// ============================================

const DateRangeSchema = z.object({ startDate: z.string(), endDate: z.string() });

ipcMain.handle('reports:trialBalance', createSecureIpcHandler(
  async (_event, asOfDate) => reportService.getTrialBalance(asOfDate),
  { requireAuth: true }
));

ipcMain.handle('reports:profitLoss', createSecureIpcHandler(
  async (_event, { startDate, endDate }) => reportService.getProfitLoss(startDate, endDate),
  { requireAuth: true, validator: DateRangeSchema }
));

ipcMain.handle('reports:balanceSheet', createSecureIpcHandler(
  async (_event, asOfDate) => reportService.getBalanceSheet(asOfDate),
  { requireAuth: true }
));

ipcMain.handle('reports:outstanding', createSecureIpcHandler(
  async (_event, type) => {
    if (type && !['customer', 'supplier'].includes(type)) {
      return { success: false, message: 'Invalid type' };
    }
    return reportService.getOutstandingReport(type);
  },
  { requireAuth: true }
));

ipcMain.handle('reports:stockReport', createSecureIpcHandler(
  async () => reportService.getStockReport(),
  { requireAuth: true }
));

ipcMain.handle('reports:salesReport', createSecureIpcHandler(
  async (_event, { startDate, endDate }) => reportService.getSalesReport(startDate, endDate),
  { requireAuth: true, validator: DateRangeSchema }
));

ipcMain.handle('reports:payrollReport', createSecureIpcHandler(
  async (_event, { startDate, endDate }) => reportService.getPayrollReport(startDate, endDate),
  { requireAuth: true }
));

ipcMain.handle('reports:purchaseReport', createSecureIpcHandler(
  async (_event, { startDate, endDate }) => reportService.getPurchaseReport(startDate, endDate),
  { requireAuth: true }
));

// ============================================
// IPC HANDLERS - Backup
// ============================================

ipcMain.handle('backup:create', createSecureIpcHandler(
  async () => {
    const result = await dialog.showSaveDialog({
      defaultPath: `dhisum_backup_${new Date().toISOString().split('T')[0]}.db`,
      filters: [{ name: 'Database', extensions: ['db'] }],
    });

    if (!result.canceled && result.filePath) {
      try {
        const resolvedPath = path.resolve(result.filePath);
        return backupService.createBackup(resolvedPath);
      } catch (error: any) {
        return { success: false, message: 'Invalid path' };
      }
    }
    return { success: false, message: 'Backup cancelled' };
  },
  { requireAuth: true, requireAdmin: true }
));

ipcMain.handle('backup:restore', createSecureIpcHandler(
  async () => {
    const result = await dialog.showOpenDialog({
      filters: [{ name: 'Database', extensions: ['db'] }],
      properties: ['openFile'],
    });

    if (!result.canceled && result.filePaths.length > 0) {
      try {
        const resolvedPath = path.resolve(result.filePaths[0]);
        const restoreResult = backupService.restoreBackup(resolvedPath);
        if (restoreResult.success) {
          setTimeout(() => {
            app.relaunch();
            app.exit(0);
          }, 1500);
        }
        return restoreResult;
      } catch (error: any) {
        return { success: false, message: 'Invalid path' };
      }
    }
    return { success: false, message: 'Restore cancelled' };
  },
  { requireAuth: true, requireAdmin: true }
));

ipcMain.handle('backup:autoBackupStatus', createSecureIpcHandler(
  async () => backupService.getAutoBackupStatus(),
  { requireAuth: true }
));

// ============================================
// IPC HANDLERS - Cloud Backup
// ============================================

ipcMain.handle('cloudBackup:getSettings', createSecureIpcHandler(
  async () => cloudBackupService.getSettings(),
  { requireAuth: true }
));

ipcMain.handle('cloudBackup:saveSettings', createSecureIpcHandler(
  async (_event, settings) => {
    try {
      cloudBackupService.saveSettings(settings);
      return { success: true, message: 'Cloud backup settings saved' };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  },
  { requireAuth: true, requireAdmin: true, validator: CloudBackupSettingsSchema }
));

ipcMain.handle('cloudBackup:runNow', createSecureIpcHandler(
  async (_event, targets) => {
    if (!Array.isArray(targets)) {
      console.error('[CloudBackup] Invalid targets received');
      return { success: false, message: 'Invalid targets' };
    }
    return cloudBackupService.runBackup(targets);
  },
  { requireAuth: true, requireAdmin: true }
));

ipcMain.handle('cloudBackup:getLogs', createSecureIpcHandler(
  async () => cloudBackupService.getLogs(),
  { requireAuth: true }
));

ipcMain.handle('cloudBackup:getConnectionStatus', createSecureIpcHandler(
  async () => cloudBackupService.getConnectionStatus(),
  { requireAuth: true }
));

ipcMain.handle('cloudBackup:connectDrive', async () => {
  try {
    const driveService = cloudBackupService.driveService;
    if (!driveService.isConfigured()) {
      return { success: false, message: 'Google Drive not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env file.' };
    }

    const authUrl = driveService.getAuthUrl();
    const http = require('http');

    return new Promise((resolve) => {
      // BUG-06 FIX: Use a settled flag so resolve() is only ever called once,
      // preventing double-resolve from the 5-minute timeout firing after success.
      let settled = false;
      const safeResolve = (val: any) => {
        if (settled) return;
        settled = true;
        resolve(val);
      };

      const server = http.createServer(async (req: any, res: any) => {
        const url = new URL(req.url, 'http://127.0.0.1:38291');
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');

        if (error) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<html><body style="font-family:sans-serif;text-align:center;padding:60px"><h2>Authorization Failed</h2><p>You can close this window.</p></body></html>');
          try { server.close(); } catch { }
          if (authWindow && !authWindow.isDestroyed()) authWindow.close();
          safeResolve({ success: false, message: 'Authorization cancelled' });
          return;
        }

        if (code) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<html><body style="font-family:sans-serif;text-align:center;padding:60px"><h2 style="color:#22c55e">✓ Connected Successfully!</h2><p>You can close this window and return to the app.</p></body></html>');
          try { server.close(); } catch { }
          if (authWindow && !authWindow.isDestroyed()) authWindow.close();

          const result = await driveService.handleAuthCode(code);
          safeResolve(result);
          return;
        }

        res.writeHead(404);
        res.end();
      });

      server.listen(38291, '127.0.0.1');

      const { BrowserWindow: BW } = require('electron');
      const authWindow = new BW({
        width: 600,
        height: 700,
        title: 'Connect Google Drive',
        parent: mainWindow || undefined,
        modal: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          webSecurity: true // ✅ SECURITY
        }
      });

      authWindow.loadURL(authUrl);

      // BUG-06 FIX: If user closes the window manually, clean up the server
      // and resolve as cancelled (instead of leaving the promise hanging).
      authWindow.on('closed', () => {
        try { server.close(); } catch { }
        safeResolve({ success: false, message: 'Authorization cancelled by user' });
      });

      // 5-minute timeout — now uses safeResolve so it's a no-op if already resolved
      setTimeout(() => {
        try { server.close(); } catch { }
        if (authWindow && !authWindow.isDestroyed()) authWindow.close();
        safeResolve({ success: false, message: 'Authorization timed out' });
      }, 300000);
    });
  } catch (error: any) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle('cloudBackup:disconnectDrive', createSecureIpcHandler(
  async () => {
    try {
      cloudBackupService.driveService.disconnect();
      return { success: true, message: 'Google Drive disconnected' };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  },
  { requireAuth: true, requireAdmin: true }
));

ipcMain.handle('cloudBackup:connectMega', createSecureIpcHandler(
  async (_event, credentials) => cloudBackupService.megaService.connect(credentials.email, credentials.password),
  { requireAuth: true, requireAdmin: true, validator: MegaCredentialsSchema }
));

ipcMain.handle('cloudBackup:disconnectMega', createSecureIpcHandler(
  async () => {
    try {
      cloudBackupService.megaService.disconnect();
      return { success: true, message: 'MEGA disconnected' };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  },
  { requireAuth: true, requireAdmin: true }
));

ipcMain.handle('cloudBackup:getCloudBackups', createSecureIpcHandler(
  async (_event, { provider }) => {
    try {
      if (!['drive', 'mega'].includes(provider)) {
        return [];
      }
      return await cloudBackupService.getCloudBackups(provider);
    } catch (error: any) {
      console.error('[IPC] cloudBackup:getCloudBackups failed:', error);
      return [];
    }
  },
  { requireAuth: true }
));

ipcMain.handle('cloudBackup:restoreFromCloud', createSecureIpcHandler(
  async (_event, provider, backupId, backupName) => {
    if (!['drive', 'mega'].includes(provider)) {
      return { success: false, message: 'Invalid provider' };
    }
    if (!backupId || typeof backupId !== 'string') {
      return { success: false, message: 'Invalid backup ID' };
    }
    if (!backupName || typeof backupName !== 'string') {
      return { success: false, message: 'Invalid backup name' };
    }
    return cloudBackupService.restoreFromCloud(provider, backupId, backupName);
  },
  { requireAuth: true, requireAdmin: true }
));

// ============================================
// IPC HANDLERS - Settings
// ============================================

ipcMain.handle('settings:get', createSecureIpcHandler(
  async () => {
    const db = dbManager.getDatabase();
    const settings = db.prepare('SELECT * FROM settings').all();
    const result: Record<string, string> = {};

    for (const setting of settings as any[]) {
      result[setting.key] = setting.value;
    }

    return result;
  },
  { requireAuth: true }
));

ipcMain.handle('app:getDeviceId', () => {
  return getDeviceId();
});

ipcMain.handle('settings:getSmartDefaults', createSecureIpcHandler(
  async () => automationService.getSmartDefaults(),
  { requireAuth: true }
));

ipcMain.handle('settings:update', createSecureIpcHandler(
  async (_event, settings) => {
    try {
      const db = dbManager.getDatabase();
      const stmt = db.prepare(`
        INSERT INTO settings (key, value, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
      `);

      for (const [key, value] of Object.entries(settings)) {
        const keyValidation = z.string().max(100).regex(/^[a-zA-Z0-9_]+$/).safeParse(key);
        if (!keyValidation.success) {
          return { success: false, message: 'Invalid setting key' };
        }
        const valueStr = String(value).slice(0, 10000);
        stmt.run(key, valueStr);
      }

      return { success: true, message: 'Settings updated successfully' };
    } catch (error: any) {
      return { success: false, message: 'Failed to update settings: ' + error.message };
    }
  },
  { requireAuth: true, requireAdmin: true, validator: z.record(z.string(), z.any()) }
));

ipcMain.handle('settings:getAgreementStatus', async () => {
  // Intentionally NO auth — must be callable before login to check EULA status
  try {
    const db = dbManager.getDatabase();
    const result = db.prepare("SELECT value FROM settings WHERE key = 'eula_accepted'").get() as { value: string };
    return result ? result.value === 'true' : false;
  } catch {
    return false;
  }
});

ipcMain.handle('settings:acceptAgreement', async () => {
  // Intentionally NO auth — must be callable before login to accept EULA
  try {
    const db = dbManager.getDatabase();
    db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES ('eula_accepted', 'true', CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = 'true', updated_at = CURRENT_TIMESTAMP
    `).run();
    return { success: true };
  } catch (error: any) {
    return { success: false, message: 'Failed to save agreement' };
  }
});

ipcMain.handle('app:quit', createSecureIpcHandler(
  async () => {
    app.quit();
    return { success: true };
  },
  { requireAuth: true }
));

ipcMain.handle('settings:closePeriod', createSecureIpcHandler(
  async (_event, { year, month }) => {
    try {
      const db = dbManager.getDatabase();
      const currentUser = accountingService.getCurrentUser();

      const existing = db.prepare('SELECT 1 FROM period_locks WHERE year = ? AND month = ?').get(year, month);

      if (existing) {
        return { success: false, message: 'Period is already locked' };
      }

      db.prepare(`
        INSERT INTO period_locks (year, month, locked_by)
        VALUES (?, ?, ?)
      `).run(year, month, currentUser?.id || 1);

      return { success: true, message: `Period ${month}/${year} closed successfully` };
    } catch (error: any) {
      return { success: false, message: 'Failed to close period: ' + error.message };
    }
  },
  { requireAuth: true, requireAdmin: true, validator: ClosePeriodSchema }
));

ipcMain.handle('settings:hasUsers', createSecureIpcHandler(
  async () => {
    try {
      const db = dbManager.getDatabase();
      const user = db.prepare('SELECT 1 FROM users LIMIT 1').get();
      return !!user;
    } catch {
      return false;
    }
  },
  {}
));

ipcMain.handle('settings:getUserCount', createSecureIpcHandler(
  async () => {
    try {
      const db = dbManager.getDatabase();
      const result = db.prepare('SELECT COUNT(*) as count FROM users WHERE is_active = 1').get() as { count: number };
      return result.count;
    } catch {
      return 0;
    }
  },
  { requireAuth: true }
));

ipcMain.handle('settings:getUsers', createSecureIpcHandler(
  async () => {
    try {
      const db = dbManager.getDatabase();
      const users = db.prepare('SELECT id, username, email, full_name, role, is_active, is_verified, created_at FROM users ORDER BY created_at').all();
      return { success: true, data: users };
    } catch (error: any) {
      return { success: false, message: 'Failed to get users: ' + error.message };
    }
  },
  { requireAuth: true, requireAdmin: true }
));

ipcMain.handle('settings:createInitialUser', async (_event, userData) => {
  try {
    const bcrypt = require('bcryptjs');
    const db = dbManager.getDatabase();

    // Check if username already taken
    const existing = db.prepare('SELECT 1 FROM users WHERE username = ?').get(userData.username);
    if (existing) {
      return { success: false, message: 'Username already exists' };
    }

    // Allow first user creation without auth (for setup)
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    if (userCount.count > 0) {
      return { success: false, message: 'Initial user already exists. Please login to create more users.' };
    }

    // ✅ SECURITY: Use 12 salt rounds for bcrypt
    const passwordHash = bcrypt.hashSync(userData.password, 12);
    db.prepare(`
      INSERT INTO users (username, email, password_hash, full_name, role, is_verified)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(userData.username, userData.email || null, passwordHash, userData.fullName, userData.role || 'admin');

    return { success: true, message: 'Initial user created successfully' };
  } catch (error: any) {
    return { success: false, message: 'Failed to create user: ' + error.message };
  }
});

ipcMain.handle('settings:createUser', createSecureIpcHandler(
  async (_event, userData) => {
    try {
      const bcrypt = require('bcryptjs');
      const db = dbManager.getDatabase();

      // Check if username already taken
      const existing = db.prepare('SELECT 1 FROM users WHERE username = ?').get(userData.username);
      if (existing) {
        return { success: false, message: 'Username already exists' };
      }

      // CRITICAL FIX: Enforce user limit check (always, not just when count > 0)
      const userCount = dbManager.getDatabase().prepare('SELECT COUNT(*) as count FROM users WHERE is_active = 1').get() as { count: number };
      const status = licenseService.getStatus();

      if (userCount.count >= status.maxUsers) {
        return {
          success: false,
          message: `Plan Limit Reached: Your ${status.plan || 'current'} plan allowed up to ${status.maxUsers} user(s). Please upgrade to add more.`
        };
      }

      // ✅ SECURITY: Use 12 salt rounds for bcrypt
      const passwordHash = bcrypt.hashSync(userData.password, 12);
      db.prepare(`
        INSERT INTO users (username, email, password_hash, full_name, role, is_verified)
        VALUES (?, ?, ?, ?, ?, 0)
      `).run(userData.username, userData.email || null, passwordHash, userData.fullName, userData.role || 'staff');

      return { success: true, message: 'User created successfully' };
    } catch (error: any) {
      return { success: false, message: 'Failed to create user: ' + error.message };
    }
  },
  { requireAuth: true, requireAdmin: true, validator: CreateUserSchema }
));

ipcMain.handle('settings:changePassword', createSecureIpcHandler(
  async (_event, data) => accountingService.changePassword(data),
  { requireAuth: true, validator: ChangePasswordSchema }
));

// ============================================
// IPC HANDLERS - Printing
// ============================================

function getBusinessInfo(): Record<string, string> {
  const db = dbManager.getDatabase();
  const settings = db.prepare('SELECT * FROM settings').all();
  const result: Record<string, string> = {};
  for (const setting of settings as any[]) {
    result[setting.key] = setting.value;
  }
  return result;
}

async function printHTML(html: string, printOptions: any = {}): Promise<any> {
  return new Promise((resolve) => {
    let printWin: Electron.BrowserWindow | null = null;
    let tempPath: string | null = null;

    try {
      // SECURITY: Hide print window in production, show only in dev for debugging
      printWin = new BrowserWindow({
        show: isDev, // Only show in development
        width: 1200,
        height: 900,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          webSecurity: true,
          allowRunningInsecureContent: false,
        },
      });

      const win = printWin;

      // ✅ ROBUST: Use temp file instead of data: URL (bypasses URL length limits for A4)
      tempPath = path.join(app.getPath('temp'), `dhisum_print_${Date.now()}.html`);
      fs.writeFileSync(tempPath, html, 'utf-8');
      win.loadURL(`file://${tempPath}`);

      win.webContents.once('did-finish-load', () => {
        // Give 500ms for fonts/images to stabilize
        setTimeout(() => {
          const options: Electron.WebContentsPrintOptions = {
            silent: false,
            printBackground: true,
            color: true,
            margins: { marginType: 'none' },
            ...printOptions,
          };

          win.webContents.print(options, (success, failureReason) => {
            console.log(`[Print] Dispatching to printer. Result: ${success ? 'success' : failureReason}`);

            // Wait 20 seconds before cleanup so spooler can finish
            setTimeout(() => {
              try { if (win && !win.isDestroyed()) win.destroy(); } catch { }
              if (tempPath && fs.existsSync(tempPath)) {
                try { fs.unlinkSync(tempPath); } catch { }
              }
            }, 20000);

            if (success) {
              resolve({ success: true, message: 'Print job sent' });
            } else {
              resolve({ success: failureReason === 'cancelled', message: 'Print: ' + failureReason });
            }
          });
        }, 1000);
      });

      win.webContents.once('did-fail-load', (_e: any, _code: any, desc: string) => {
        console.error('[Print] Page load failed');
        try { win.destroy(); } catch { }
        if (tempPath && fs.existsSync(tempPath)) {
          try { fs.unlinkSync(tempPath); } catch { }
        }
        resolve({ success: false, message: 'Failed to load print content: ' + desc });
      });

    } catch (err: any) {
      console.error('[Print] Error');
      if (printWin) { try { printWin.destroy(); } catch { } }
      resolve({ success: false, message: 'Print error: ' + err.message });
    }
  });
}

// Logo Upload Handler
ipcMain.handle('settings:uploadLogo', createSecureIpcHandler(
  async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
          { name: 'Images', extensions: ['png', 'jpg', 'jpeg'] }
        ]
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, message: 'No file selected' };
      }

      const filePath = result.filePaths[0];
      const resolvedPath = path.resolve(filePath);
      const stats = fs.statSync(resolvedPath);

      if (stats.size > 5 * 1024 * 1024) {
        return { success: false, message: 'File too large (max 5MB)' };
      }

      const ext = path.extname(filePath).toLowerCase();
      if (!['.png', '.jpg', '.jpeg'].includes(ext)) {
        return { success: false, message: 'Invalid file type' };
      }

      const fd = fs.openSync(resolvedPath, 'r');
      const buffer = Buffer.alloc(8);
      fs.readSync(fd, buffer, 0, 8, 0);
      fs.closeSync(fd);

      const isPng = buffer[0] === 0x89 && buffer[1] === 0x50;
      const isJpeg = buffer[0] === 0xFF && buffer[1] === 0xD8;

      if (!isPng && !isJpeg) {
        return { success: false, message: 'Invalid image file' };
      }

      const mime = isPng ? 'image/png' : 'image/jpeg';
      const fileBuffer = fs.readFileSync(resolvedPath);
      const base64 = fileBuffer.toString('base64');
      const dataUri = `data:${mime};base64,${base64}`;

      const db = dbManager.getDatabase();
      db.prepare(`
        INSERT INTO settings (key, value, updated_at) VALUES ('company_logo', ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
      `).run(dataUri);

      return { success: true, data: dataUri, message: 'Logo uploaded successfully' };
    } catch (error: any) {
      return { success: false, message: 'Failed to upload logo: ' + error.message };
    }
  },
  { requireAuth: true, requireAdmin: true }
));

ipcMain.handle('settings:getLogo', createSecureIpcHandler(
  async () => {
    try {
      const db = dbManager.getDatabase();
      const row = db.prepare("SELECT value FROM settings WHERE key = 'company_logo'").get() as any;
      return { success: true, data: row?.value || null };
    } catch (error: any) {
      return { success: false, data: null };
    }
  },
  { requireAuth: true }
));

// Seal Upload Handler
ipcMain.handle('settings:uploadSeal', createSecureIpcHandler(
  async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
          { name: 'Images', extensions: ['png', 'jpg', 'jpeg'] }
        ]
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, message: 'No file selected' };
      }

      const filePath = result.filePaths[0];
      const resolvedPath = path.resolve(filePath);
      const stats = fs.statSync(resolvedPath);

      if (stats.size > 2 * 1024 * 1024) {
        return { success: false, message: 'File too large (max 2MB)' };
      }

      const ext = path.extname(filePath).toLowerCase();
      if (!['.png', '.jpg', '.jpeg'].includes(ext)) {
        return { success: false, message: 'Invalid file type' };
      }

      // BUG-13 FIX: Perform magic byte validation
      const fd = fs.openSync(resolvedPath, 'r');
      const buffer = Buffer.alloc(8);
      fs.readSync(fd, buffer, 0, 8, 0);
      fs.closeSync(fd);

      const isPng = buffer[0] === 0x89 && buffer[1] === 0x50;
      const isJpeg = buffer[0] === 0xFF && buffer[1] === 0xD8;

      if (!isPng && !isJpeg) {
        return { success: false, message: 'Invalid image file (failed magic byte verification)' };
      }

      const mime = isPng ? 'image/png' : 'image/jpeg';
      const fileBuffer = fs.readFileSync(resolvedPath);
      const base64 = fileBuffer.toString('base64');
      const dataUri = `data:${mime};base64,${base64}`;

      const db = dbManager.getDatabase();
      db.prepare(`
        INSERT INTO settings (key, value, updated_at) VALUES ('company_seal', ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
      `).run(dataUri);

      return { success: true, data: dataUri, message: 'Seal uploaded successfully' };
    } catch (error: any) {
      return { success: false, message: 'Failed to upload seal: ' + error.message };
    }
  },
  { requireAuth: true, requireAdmin: true }
));

ipcMain.handle('settings:getSeal', createSecureIpcHandler(
  async () => {
    try {
      const db = dbManager.getDatabase();
      const row = db.prepare("SELECT value FROM settings WHERE key = 'company_seal'").get() as any;
      return { success: true, data: row?.value || null };
    } catch (error: any) {
      return { success: false, data: null };
    }
  },
  { requireAuth: true }
));

// Signature Upload Handler
ipcMain.handle('settings:uploadSignature', createSecureIpcHandler(
  async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
          { name: 'Images', extensions: ['png', 'jpg', 'jpeg'] }
        ]
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, message: 'No file selected' };
      }

      const filePath = result.filePaths[0];
      const resolvedPath = path.resolve(filePath);
      const stats = fs.statSync(resolvedPath);

      if (stats.size > 2 * 1024 * 1024) {
        return { success: false, message: 'File too large (max 2MB)' };
      }

      const ext = path.extname(filePath).toLowerCase();
      if (!['.png', '.jpg', '.jpeg'].includes(ext)) {
        return { success: false, message: 'Invalid file type' };
      }

      // BUG-13 FIX: Perform magic byte validation
      const fd = fs.openSync(resolvedPath, 'r');
      const buffer = Buffer.alloc(8);
      fs.readSync(fd, buffer, 0, 8, 0);
      fs.closeSync(fd);

      const isPng = buffer[0] === 0x89 && buffer[1] === 0x50;
      const isJpeg = buffer[0] === 0xFF && buffer[1] === 0xD8;

      if (!isPng && !isJpeg) {
        return { success: false, message: 'Invalid image file (failed magic byte verification)' };
      }

      const mime = isPng ? 'image/png' : 'image/jpeg';
      const fileBuffer = fs.readFileSync(resolvedPath);
      const base64 = fileBuffer.toString('base64');
      const dataUri = `data:${mime};base64,${base64}`;

      const db = dbManager.getDatabase();
      db.prepare(`
        INSERT INTO settings (key, value, updated_at) VALUES ('company_signature', ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
      `).run(dataUri);

      return { success: true, data: dataUri, message: 'Signature uploaded successfully' };
    } catch (error: any) {
      return { success: false, message: 'Failed to upload signature: ' + error.message };
    }
  },
  { requireAuth: true, requireAdmin: true }
));

ipcMain.handle('settings:getSignature', createSecureIpcHandler(
  async () => {
    try {
      const db = dbManager.getDatabase();
      const row = db.prepare("SELECT value FROM settings WHERE key = 'company_signature'").get() as any;
      return { success: true, data: row?.value || null };
    } catch (error: any) {
      return { success: false, data: null };
    }
  },
  { requireAuth: true }
));

ipcMain.handle('print:invoice', createSecureIpcHandler(
  async (_event, data, template) => {
    try {
      const biz = getBusinessInfo();
      const enrichedData = {
        businessName: data.businessName || biz.company_name || 'My Business',
        businessAddress: data.businessAddress || biz.address || '',
        businessPhone: data.businessPhone || biz.phone || '',
        businessEmail: data.businessEmail || biz.email || '',
        businessTagline: data.businessTagline || biz.tagline || '',
        businessLogo: data.businessLogo || biz.company_logo || '',
        businessSeal: data.businessSeal || biz.company_seal || '',
        businessSignature: data.businessSignature || biz.company_signature || '',
        taxNo: data.taxNo || biz.tax_no || '',
        ...data,
      };

      const result = printingService.printInvoice(enrichedData, template);
      if (!result.success) return result;

      const html = (global as any).lastPrintHTML;
      return await printHTML(html, {
        printBackground: true,
        color: true,
        margins: { marginType: 'none' },
      });
    } catch (error: any) {
      return { success: false, message: 'Print failed: ' + error.message };
    }
  },
  { requireAuth: true }
));

ipcMain.handle('print:thermalReceipt', createSecureIpcHandler(
  async (_event, data) => {
    try {
      const biz = getBusinessInfo();
      const enrichedData = {
        businessName: data.businessName || biz.company_name || 'My Business',
        businessAddress: data.businessAddress || biz.address || '',
        businessPhone: data.businessPhone || biz.phone || '',
        businessEmail: data.businessEmail || biz.email || '',
        businessTagline: data.businessTagline || biz.tagline || '',
        businessSeal: data.businessSeal || biz.company_seal || '',
        businessSignature: data.businessSignature || biz.company_signature || '',
        taxNo: data.taxNo || biz.tax_no || '',
        ...data
      };

      const result = printingService.printThermalReceipt(enrichedData);
      if (!result.success) return result;

      const html = (global as any).lastPrintHTML;
      return await printHTML(html, {
        printBackground: true,
        color: true,
        margins: { marginType: 'none' },
        // removed hardcoded pageSize to let printer driver determine height
      });
    } catch (error: any) {
      return { success: false, message: 'Print failed: ' + error.message };
    }
  },
  { requireAuth: true }
));

ipcMain.handle('print:report', createSecureIpcHandler(
  async (_event, title, contentHtml) => {
    try {
      const bizInfo = getBusinessInfo();
      const result = printingService.printReport(title, contentHtml, bizInfo);
      if (!result.success) return result;

      const html = (global as any).lastPrintHTML;
      return await printHTML(html);
    } catch (error: any) {
      return { success: false, message: 'Print failed: ' + error.message };
    }
  },
  { requireAuth: true }
));

ipcMain.handle('print:payrollReport', createSecureIpcHandler(
  async (_event, title, data) => {
    try {
      const bizInfo = getBusinessInfo();
      const result = printingService.printPayrollReport(title, data, bizInfo);
      if (!result.success) return result;

      const html = (global as any).lastPrintHTML;
      return await printHTML(html);
    } catch (error: any) {
      return { success: false, message: 'Payroll print failed: ' + error.message };
    }
  },
  { requireAuth: true }
));

ipcMain.handle('print:barcodes', createSecureIpcHandler(
  async (_event, mappings) => {
    try {
      const result = printingService.printBarcodes(mappings);
      if (!result.success) return result;

      const html = (global as any).lastPrintHTML;
      return await printHTML(html);
    } catch (error: any) {
      return { success: false, message: 'Print failed: ' + error.message };
    }
  },
  { requireAuth: true }
));

ipcMain.handle('print:getPrinters', createSecureIpcHandler(
  async () => {
    try {
      return await printingService.getPrinters();
    } catch (error) {
      return [];
    }
  },
  { requireAuth: true }
));

// ============================================
// IPC HANDLERS - New Features
// ============================================

// Held Carts
ipcMain.handle('heldCarts:getAll', createSecureIpcHandler(
  async () => heldCartService.getAllCarts(),
  { requireAuth: true }
));
ipcMain.handle('heldCarts:save', createSecureIpcHandler(
  async (_event, data) => heldCartService.saveCart(data.cartName, data.customerId, data.items),
  { requireAuth: true }
));
ipcMain.handle('heldCarts:load', createSecureIpcHandler(
  async (_event, cartId) => heldCartService.loadCart(cartId),
  { requireAuth: true }
));
ipcMain.handle('heldCarts:delete', createSecureIpcHandler(
  async (_event, cartId) => heldCartService.deleteCart(cartId),
  { requireAuth: true }
));
ipcMain.handle('heldCarts:count', createSecureIpcHandler(
  async () => heldCartService.getCartCount(),
  { requireAuth: true }
));

// Expenses
ipcMain.handle('expenses:getAll', createSecureIpcHandler(
  async (_event, filters) => expenseService.getAll(filters),
  { requireAuth: true }
));
ipcMain.handle('expenses:create', createSecureIpcHandler(
  async (_event, data) => expenseService.create(data),
  { requireAuth: true }
));
ipcMain.handle('expenses:getSummary', createSecureIpcHandler(
  async (_event, month, year) => expenseService.getSummary(month, year),
  { requireAuth: true }
));
ipcMain.handle('expenses:delete', createSecureIpcHandler(
  async (_event, id) => expenseService.delete(id),
  { requireAuth: true, requireAdmin: true }
));

// Payroll
ipcMain.handle('payroll:process', createSecureIpcHandler(
  async (_event, data) => payrollService.processMonthlyPayroll(data),
  { requireAuth: true, requireAdmin: true }
));
ipcMain.handle('payroll:getHistory', createSecureIpcHandler(
  async () => payrollService.getHistory(),
  { requireAuth: true }
));
ipcMain.handle('payroll:getEmployeeHistory', createSecureIpcHandler(
  async (_event, employeeId) => payrollService.getEmployeeHistory(employeeId),
  { requireAuth: true }
));

// Purchase Orders
ipcMain.handle('purchaseOrders:getAll', createSecureIpcHandler(
  async () => purchaseOrderService.getAll(),
  { requireAuth: true }
));
ipcMain.handle('purchaseOrders:getById', createSecureIpcHandler(
  async (_event, id) => purchaseOrderService.getById(id),
  { requireAuth: true }
));
ipcMain.handle('purchaseOrders:create', createSecureIpcHandler(
  async (_event, data) => purchaseOrderService.create(data),
  { requireAuth: true }
));
ipcMain.handle('purchaseOrders:updateStatus', createSecureIpcHandler(
  async (_event, id, status, paymentMode) => purchaseOrderService.updateStatus(id, status, paymentMode),
  { requireAuth: true }
));
ipcMain.handle('purchaseOrders:delete', createSecureIpcHandler(
  async (_event, id) => purchaseOrderService.delete(id),
  { requireAuth: true, requireAdmin: true }
));

// Quotations
ipcMain.handle('quotations:getAll', createSecureIpcHandler(
  async () => quotationService.getAll(),
  { requireAuth: true }
));
ipcMain.handle('quotations:getById', createSecureIpcHandler(
  async (_event, id) => quotationService.getById(id),
  { requireAuth: true }
));
ipcMain.handle('quotations:create', createSecureIpcHandler(
  async (_event, data) => quotationService.create(data),
  { requireAuth: true }
));
ipcMain.handle('quotations:updateStatus', createSecureIpcHandler(
  async (_event, id, status) => quotationService.updateStatus(id, status),
  { requireAuth: true }
));
ipcMain.handle('quotations:convertToSale', createSecureIpcHandler(
  async (_event, id, paymentMode) => quotationService.convertToSale(id, paymentMode),
  { requireAuth: true }
));
ipcMain.handle('quotations:delete', createSecureIpcHandler(
  async (_event, id) => quotationService.delete(id),
  { requireAuth: true, requireAdmin: true }
));

// Refunds
ipcMain.handle('refunds:create', createSecureIpcHandler(
  async (_event, data) => refundService.create(data),
  { requireAuth: true }
));
ipcMain.handle('refunds:getAll', createSecureIpcHandler(
  async () => refundService.getAll(),
  { requireAuth: true }
));
ipcMain.handle('refunds:delete', createSecureIpcHandler(
  async (_event, id) => refundService.delete(id),
  { requireAuth: true, requireAdmin: true }
));

// Recurring Transactions
ipcMain.handle('recurring:getAll', createSecureIpcHandler(
  async (_event, activeOnly) => recurringService.getAll(activeOnly),
  { requireAuth: true }
));
ipcMain.handle('recurring:create', createSecureIpcHandler(
  async (_event, data) => recurringService.create(data),
  { requireAuth: true }
));
ipcMain.handle('recurring:toggleActive', createSecureIpcHandler(
  async (_event, id) => recurringService.toggleActive(id),
  { requireAuth: true }
));
ipcMain.handle('recurring:processDue', createSecureIpcHandler(
  async () => recurringService.processDueToday(),
  { requireAuth: true }
));
ipcMain.handle('recurring:delete', createSecureIpcHandler(
  async (_event, id) => recurringService.delete(id),
  { requireAuth: true, requireAdmin: true }
));

// Audit Logs
ipcMain.handle('auditLogs:getAll', createSecureIpcHandler(
  async () => auditService.getAllLogs(),
  { requireAuth: true, requireAdmin: true }
));

// Aged Reports
ipcMain.handle('agedReports:getReceivables', createSecureIpcHandler(
  async (_event, asOfDate) => agedReportService.getAgedReceivables(asOfDate),
  { requireAuth: true }
));
ipcMain.handle('agedReports:getPayables', createSecureIpcHandler(
  async (_event, asOfDate) => agedReportService.getAgedPayables(asOfDate),
  { requireAuth: true }
));

// Audit Logs (read from existing audit_logs table)
// Audit Logs already handled above by auditService

// Barcodes
ipcMain.handle('barcodes:getAll', createSecureIpcHandler(
  async () => barcodeService.getAll(),
  { requireAuth: true }
));
ipcMain.handle('barcodes:create', createSecureIpcHandler(
  async (_event, data) => barcodeService.create(data.barcode, data.itemId),
  { requireAuth: true }
));
ipcMain.handle('barcodes:findByBarcode', createSecureIpcHandler(
  async (_event, barcode) => barcodeService.findByBarcode(barcode),
  { requireAuth: true }
));
ipcMain.handle('barcodes:delete', createSecureIpcHandler(
  async (_event, id) => barcodeService.delete(id),
  { requireAuth: true }
));

// Employees
ipcMain.handle('employees:getAll', createSecureIpcHandler(
  async (_event, activeOnly) => employeeService.getAll(activeOnly),
  { requireAuth: true }
));
ipcMain.handle('employees:create', createSecureIpcHandler(
  async (_event, data) => employeeService.create(data),
  { requireAuth: true }
));
ipcMain.handle('employees:update', createSecureIpcHandler(
  async (_event, id, data) => employeeService.update(id, data),
  { requireAuth: true }
));
ipcMain.handle('employees:getById', createSecureIpcHandler(
  async (_event, id) => employeeService.getById(id),
  { requireAuth: true }
));
ipcMain.handle('employees:delete', createSecureIpcHandler(
  async (_event, id) => employeeService.delete(id),
  { requireAuth: true, requireAdmin: true }
));
ipcMain.handle('employees:export', createSecureIpcHandler(
  async (_event) => {
    const result = employeeService.getAll(true);
    if (result.success && result.data && result.data.length > 0) {
      exportService.exportEmployees(result.data);
      return { success: true, message: 'Employees exported successfully' };
    }
    return { success: false, message: 'No employees to export' };
  },
  { requireAuth: true }
));

// Branches
ipcMain.handle('branches:getAll', createSecureIpcHandler(
  async (_event, activeOnly) => branchService.getAll(activeOnly),
  { requireAuth: true }
));
ipcMain.handle('branches:create', createSecureIpcHandler(
  async (_event, data) => branchService.create(data),
  { requireAuth: true }
));
ipcMain.handle('branches:delete', createSecureIpcHandler(
  async (_event, id) => branchService.delete(id),
  { requireAuth: true, requireAdmin: true }
));

// CSV Import
ipcMain.handle('csvImport:parseFile', createSecureIpcHandler(
  async (_event, buffer, sheetIndex) => csvImportService.parseFile(buffer, sheetIndex),
  { requireAuth: true }
));
ipcMain.handle('csvImport:contacts', createSecureIpcHandler(
  async (_event, data, type) => csvImportService.importContacts(data, type),
  { requireAuth: true }
));
ipcMain.handle('csvImport:items', createSecureIpcHandler(
  async (_event, data) => csvImportService.importItems(data),
  { requireAuth: true }
));

// Split Payments
ipcMain.handle('splitPayment:processSale', createSecureIpcHandler(
  async (_event, data) => splitPaymentService.processSaleWithSplit(data.customerId, data.items, data.payments, data.discountAmount, data.notes),
  { requireAuth: true }
));

// Tiered Pricing
ipcMain.handle('tieredPricing:getAll', createSecureIpcHandler(
  async () => tieredPricingService.getAllPriceLists(),
  { requireAuth: true }
));
ipcMain.handle('tieredPricing:create', createSecureIpcHandler(
  async (_event, data) => tieredPricingService.createPriceList(data),
  { requireAuth: true }
));
ipcMain.handle('tieredPricing:getItemPrice', createSecureIpcHandler(
  async (_event, itemId, priceListId) => tieredPricingService.getItemPrice(itemId, priceListId),
  { requireAuth: true }
));
ipcMain.handle('tieredPricing:getCustomerPriceList', createSecureIpcHandler(
  async (_event, customerId) => tieredPricingService.getCustomerPriceList(customerId),
  { requireAuth: true }
));
ipcMain.handle('tieredPricing:assignPriceListToCustomer', createSecureIpcHandler(
  async (_event, customerId, priceListId) => tieredPricingService.assignPriceListToCustomer(customerId, priceListId),
  { requireAuth: true }
));
ipcMain.handle('tieredPricing:update', createSecureIpcHandler(
  async (_event, id, data) => tieredPricingService.updatePriceList(id, data),
  { requireAuth: true }
));
ipcMain.handle('tieredPricing:delete', createSecureIpcHandler(
  async (_event, id) => tieredPricingService.deletePriceList(id),
  { requireAuth: true }
));

// Email Invoice
ipcMain.handle('emailInvoice:send', createSecureIpcHandler(
  async (_event, data) => {
    const success = emailInvoiceService.sendInvoiceViaEmail(data.customerEmail, data);
    return { success, message: success ? 'Email client opened' : 'Failed to open email client' };
  },
  { requireAuth: true }
));

// ============================================
// IPC HANDLERS - Utilities
// ============================================

ipcMain.handle('shell:openExternal', createSecureIpcHandler(
  async (_event, url) => {
    // ✅ SECURITY: Validate URL before opening
    const validation = isValidExternalUrl(url);
    if (!validation.valid) {
      console.error('[Shell] Blocked suspicious URL');
      return { success: false, error: validation.error };
    }

    try {
      await shell.openExternal(url);
      return { success: true };
    } catch {
      return { success: false, error: 'Failed to open URL' };
    }
  },
  { requireAuth: true }
));

// ============================================
// IPC HANDLERS - License System
// ============================================

const LicenseKeySchema = z.object({ 
  licenseKey: z.string().optional(), 
  otp: z.string().optional(), 
  password: z.string().optional(),
  deviceInfo: z.any().optional()
});

ipcMain.handle('license:getStatus', createSecureIpcHandler(
  async () => {
    const status = licenseService.getStatus();
    return status;
  },
  { requireAuth: false }
));

ipcMain.handle('license:activate', createSecureIpcHandler(
  async (_event, data) => {
    const { licenseKey, otp, password, deviceInfo } = data;
    return await licenseService.activate(licenseKey, otp, password, deviceInfo);
  },
  { requireAuth: false, validator: LicenseKeySchema }
));

ipcMain.handle('license:startTrial', createSecureIpcHandler(
  async () => {
    const status = licenseService.startTrial();
    // Trial start logged via audit system;
    return status;
  },
  {}
));

ipcMain.handle('license:getTrialInfo', createSecureIpcHandler(
  async () => licenseService.getTrialInfo(),
  { requireAuth: true }
));

ipcMain.handle('license:verifyWithServer', createSecureIpcHandler(
  async () => licenseService.verifyWithServer(),
  { requireAuth: true }
));

ipcMain.handle('license:getUserLimit', createSecureIpcHandler(
  async () => {
    const status = licenseService.getStatus();
    return status.maxUsers;
  },
  { requireAuth: true }
));

ipcMain.handle('license:checkUpdate', createSecureIpcHandler(
  async () => updateService.checkForUpdates(),
  { requireAuth: true }
));

// ============================================
// IPC HANDLERS - Auto Updater (electron-updater)
// ============================================

ipcMain.handle('update:check', createSecureIpcHandler(
  async () => {
    const state = await updateManager.checkForUpdates();
    return { success: true, data: state };
  },
  { requireAuth: false }
));

ipcMain.handle('update:install', createSecureIpcHandler(
  async () => {
    const result = await updateManager.installUpdate();
    return result;
  },
  { requireAuth: false }
));

ipcMain.handle('update:state', createSecureIpcHandler(
  async () => {
    return { success: true, data: updateManager.getState() };
  },
  { requireAuth: false }
));

// ============================================
// IPC HANDLERS - POS SaaS Auth (Server-backed)
// ============================================

let posAuthSession: { token: string; user: any } | null = null;

function getSessionFilePath(): string {
  return path.join(app.getPath('userData'), '.pos-session.enc'); // ✅ SECURITY: Changed to .enc
}

function loadPersistedSession(): void {
  try {
    const sessionPath = getSessionFilePath();
    if (fs.existsSync(sessionPath)) {
      // ✅ SECURITY: Decrypt session data
      const encrypted = fs.readFileSync(sessionPath);
      const decrypted = decryptBuffer(encrypted);
      posAuthSession = JSON.parse(decrypted.toString('utf-8'));
      // Session restored;
    }
  } catch (error) {
    console.error('[POS Auth] Failed to load persisted session');
    posAuthSession = null;
  }
}

function persistSession(): void {
  try {
    const sessionPath = getSessionFilePath();
    if (posAuthSession) {
      // ✅ SECURITY: Encrypt session data
      const data = Buffer.from(JSON.stringify(posAuthSession), 'utf-8');
      const encrypted = encryptBuffer(data);
      fs.writeFileSync(sessionPath, encrypted);
    } else {
      if (fs.existsSync(sessionPath)) fs.unlinkSync(sessionPath);
    }
  } catch (error) {
    console.error('[POS Auth] Failed to persist session');
  }
}

loadPersistedSession();

ipcMain.handle('posAuth:saveSession', createSecureIpcHandler(
  async (_event, sessionData) => {
    posAuthSession = sessionData;
    persistSession();
    // Session saved;
    return { success: true };
  },
  { requireAuth: true, validator: z.object({ token: z.string(), user: z.any() }) }
));

ipcMain.handle('posAuth:getSession', createSecureIpcHandler(
  async () => posAuthSession,
  { requireAuth: true }
));

ipcMain.handle('posAuth:clearSession', createSecureIpcHandler(
  async () => {
    posAuthSession = null;
    persistSession();
    // Session cleared;
    return { success: true };
  },
  { requireAuth: true }
));

// ============================================
// SECURITY: SaaS API Bridge (SSRF Protection)
// ============================================

// Get allowed SaaS domains from environment or use defaults
function getAllowedSaasDomains(): string[] {
  let envDomains: string[] = [];
  if (process.env.VITE_API_URL) {
    try {
      envDomains = [new URL(process.env.VITE_API_URL).hostname];
    } catch {
      // Invalid VITE_API_URL format, ignore
      console.warn('[Security] Invalid VITE_API_URL format, using defaults');
    }
  }
  return [
    ...envDomains,
    'jindapos.com',
    'www.jindapos.com',
    'api.jinda.com',
    'dhisum-tseyig.vercel.app',
    'localhost',
    '127.0.0.1',
    'localhost:3000',
    '127.0.0.1:3000',
    'localhost:3001',
    '127.0.0.1:3001',
  ];
}

const ALLOWED_SAAS_DOMAINS = getAllowedSaasDomains();

function validateSaasUrl(urlString: string): { valid: boolean; error?: string } {
  try {
    const url = new URL(urlString);

    const isAllowed = ALLOWED_SAAS_DOMAINS.some(domain =>
      url.hostname.includes(domain) || url.host === domain
    );

    if (!isAllowed) {
      return { valid: false, error: 'Unauthorized domain' };
    }

    // Block private IPs except allowed ones
    const hostname = url.hostname;
    if (/^10\./.test(hostname) ||
      /^172\.(1[6-9]|2[0-9]|3[01])\./.test(hostname) ||
      /^192\.168\./.test(hostname)) {
      if (!ALLOWED_SAAS_DOMAINS.includes(hostname)) {
        return { valid: false, error: 'Private IP not allowed' };
      }
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL' };
  }
}

// Define these at module level so both handlers can use them
const SERVICE_NAME = 'Jinda-POS';
const ACCOUNT_NAME = 'saas-tokens';

// Optional keytar import for OS keychain (falls back to encrypted file if unavailable)
let keytar: { setPassword: (s: string, a: string, p: string) => Promise<void>; getPassword: (s: string, a: string) => Promise<string | null>; deletePassword: (s: string, a: string) => Promise<boolean> } | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  keytar = require('keytar');
} catch {
  console.log('[SecureStorage] keytar not available, using encrypted file fallback');
}

// Helper function to get tokens (used internally and by IPC handler)
async function getSecureTokens(): Promise<TokenData | null> {
  // Try keytar first if available
  if (keytar) {
    try {
      const encryptedBase64 = await keytar.getPassword(SERVICE_NAME, ACCOUNT_NAME);
      if (encryptedBase64) {
        const encrypted = Buffer.from(encryptedBase64, 'base64');
        const decrypted = decryptBuffer(encrypted);
        const tokens = JSON.parse(decrypted.toString('utf-8'));
        return tokens as TokenData;
      }
    } catch (error) {
      console.error('[SecureStorage] Keytar retrieval failed');
    }
  }
  // Fallback to encrypted file
  try {
    const sessionPath = path.join(app.getPath('userData'), '.secure-tokens');
    if (!fs.existsSync(sessionPath)) return null;

    const encrypted = fs.readFileSync(sessionPath);
    const decrypted = decryptBuffer(encrypted);
    return JSON.parse(decrypted.toString('utf-8')) as TokenData;
  } catch (fallbackError) {
    console.error('[SecureStorage] Fallback retrieval failed');
    return null;
  }
}

ipcMain.handle('auth:saas:request', createSecureIpcHandler(
  async (_event, options) => {
    const validation = SaaSRequestSchema.safeParse(options);
    if (!validation.success) {
      return { ok: false, status: 0, data: { success: false, message: 'Invalid request format' } };
    }

    const urlValidation = validateSaasUrl(options.url);
    if (!urlValidation.valid) {
      console.error('[Security] Blocked SSRF attempt');
      return { ok: false, status: 0, data: { success: false, message: 'Unauthorized domain' } };
    }

    try {
      // Bridge request sent;
      const response = await fetch(options.url, {
        method: options.method,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      const contentType = response.headers.get('content-type');
      let data;
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = { success: false, message: `Server error (${response.status})`, errorDetails: text.slice(0, 500) };
      }

      return {
        ok: response.ok,
        status: response.status,
        data,
      };
    } catch (error: any) {
      console.error('[POS Bridge] Request failed');
      return {
        ok: false,
        status: 0,
        data: { success: false, message: 'Network connection failed. Ensure the server is running.' }
      };
    }
  },
  { requireAuth: true, validator: SaaSRequestSchema }
));

// ============================================
// SECURITY: Secure Token Storage (OS Keychain)
// ============================================

ipcMain.handle('secureStorage:setTokens', createSecureIpcHandler(
  async (_event, tokens: TokenData) => {
    if (keytar) {
      try {
        const encryptedData = encryptBuffer(Buffer.from(JSON.stringify(tokens), 'utf-8'));
        await keytar.setPassword(SERVICE_NAME, ACCOUNT_NAME, encryptedData.toString('base64'));
        return true;
      } catch (error) {
        console.error('[SecureStorage] Keytar failed');
      }
    }
    try {
      const sessionPath = path.join(app.getPath('userData'), '.secure-tokens');
      const encrypted = encryptBuffer(Buffer.from(JSON.stringify(tokens), 'utf-8'));
      fs.writeFileSync(sessionPath, encrypted);
      return true;
    } catch (fallbackError) {
      console.error('[SecureStorage] Fallback storage failed');
      return false;
    }
  },
  { requireAuth: false }
));

ipcMain.handle('secureStorage:getTokens', createSecureIpcHandler(
  async () => await getSecureTokens(),
  { requireAuth: false }
));

ipcMain.handle('secureStorage:clearTokens', createSecureIpcHandler(
  async () => {
    if (keytar) {
      try {
        await keytar.deletePassword(SERVICE_NAME, ACCOUNT_NAME);
      } catch (error) {
        console.error('[SecureStorage] Failed to clear from keychain');
      }
    }

    try {
      const sessionPath = path.join(app.getPath('userData'), '.secure-tokens');
      if (fs.existsSync(sessionPath)) {
        fs.unlinkSync(sessionPath);
      }
    } catch (error) {
      console.error('[SecureStorage] Failed to clear fallback');
    }

    return true;
  },
  { requireAuth: false }
));

ipcMain.handle('secureStorage:hasTokens', createSecureIpcHandler(
  async () => {
    if (keytar) {
      const hasKeychain = await keytar.getPassword(SERVICE_NAME, ACCOUNT_NAME) !== null;
      if (hasKeychain) return true;
    }

    const sessionPath = path.join(app.getPath('userData'), '.secure-tokens');
    return fs.existsSync(sessionPath);
  },
  { requireAuth: false }
));

// ============================================
// SECURITY: POS Auth SaaS Request Bridge
// ============================================

ipcMain.handle('posAuth:saasRequest', createSecureIpcHandler(
  async (_event, options) => {
    console.log('[POS Auth] saasRequest called:', { url: options.url, method: options.method });
    try {
      // Validate request
      const validation = SaaSRequestSchema.safeParse(options);
      if (!validation.success) {
        console.log('[POS Auth] Validation failed');
        return {
          ok: false,
          status: 0,
          data: { success: false, error: 'Invalid request format' }
        };
      }

      // Validate URL
      const urlValidation = validateSaasUrl(options.url);
      console.log('[POS Auth] URL validation:', urlValidation);
      if (!urlValidation.valid) {
        console.error('[Security] Blocked SSRF attempt');
        return {
          ok: false,
          status: 0,
          data: { success: false, error: 'Unauthorized domain' }
        };
      }

      // Get tokens from secure storage
      const tokens = await getSecureTokens();

      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...options.headers,
      };

      // Add authorization if available
      if (tokens?.accessToken) {
        headers['Authorization'] = `Bearer ${tokens.accessToken}`;
      }

      console.log('[POS Auth] Sending request to:', options.url);
      const response = await fetch(options.url, {
        method: options.method,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      console.log('[POS Auth] Response status:', response.status);

      let data;
      try {
        data = await response.json();
        console.log('[POS Auth] Response data:', JSON.stringify(data).slice(0, 200));
      } catch (e) {
        console.log('[POS Auth] Failed to parse JSON response');
        data = null;
      }

      const result = {
        ok: response.ok,
        status: response.status,
        data: data || { success: false, error: 'Invalid response' },
      };
      console.log('[POS Auth] Returning result:', { ok: result.ok, status: result.status, hasData: !!result.data });
      return result;
    } catch (error: any) {
      console.error('[POS Auth] Request failed:', error.message || error);
      console.error('[POS Auth] Error stack:', error.stack || 'No stack');
      console.error('[POS Auth] Error name:', error.name || 'Unknown');
      return {
        ok: false,
        status: 0,
        data: {
          success: false,
          error: 'Network connection failed. Please check your internet connection.'
        }
      };
    }
  },
  { requireAuth: false }
));

// Get device ID from license service
// NOTE: This MUST NOT require auth — it's called during login before authentication
ipcMain.handle('license:getDeviceId', async () => {
  try {
    return licenseService.getDeviceId() || null;
  } catch (error) {
    console.error('[License] Failed to get device ID');
    return null;
  }
});

// ============================================
// SECURITY: Prevent navigation and new windows
// ============================================

app.on('web-contents-created', (_event, contents) => {
  // BUG-11 FIX: Don't set window handlers on OAuth popups or external helper windows.
  // Only apply to the main app window's primary webContents.
  if (mainWindow && contents.id === mainWindow.webContents.id) {
    contents.setWindowOpenHandler(({ url }) => {
      console.log('[Security] Blocked new window:', url);
      return { action: 'deny' };
    });

    contents.on('will-navigate', (event, navigationUrl) => {
      const parsedUrl = new URL(navigationUrl);
      // BUG-10 FIX: Allow file:// protocol for packaged production builds,
      // as well as localhost dev server and the official api server.
      const isAllowed = 
        parsedUrl.protocol === 'file:' ||
        parsedUrl.origin === 'http://127.0.0.1:5173' ||
        parsedUrl.origin === 'https://api.jinda.com';
      if (!isAllowed) {
        event.preventDefault();
        console.log('[Security] Blocked navigation:', navigationUrl);
      }
    });
  }
});

app?.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
