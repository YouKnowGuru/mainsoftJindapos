import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';

const isDev = !app.isPackaged || process.env.NODE_ENV === 'development';

// Load environment variables from .env file
try {
  const envPath = isDev ? path.join(__dirname, '../../.env') : path.join(process.resourcesPath, '.env');
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
  }
} catch (error) {
  console.error('[Main] Failed to load .env file:', error);
}
import { DatabaseManager } from '../src/database/DatabaseManager';
import { AccountingService } from '../src/services/AccountingService';
import { InventoryService } from '../src/services/InventoryService';
import { GSTService } from '../src/services/GSTService';
import { ReportService } from '../src/services/ReportService';
import { PrintingService } from '../src/services/PrintingService';
import { BackupService } from '../src/services/BackupService';
import { AutomationService } from '../src/services/AutomationService';
import { AccountingEngineService } from '../src/services/AccountingEngineService';
import { LicenseService } from '../src/services/LicenseService';
import { UpdateService } from '../src/services/UpdateService';

// DEFINTIVE FIX: Disable ALL Chromium print preview features to force the Native Windows System Print Dialog.
// These MUST be set before app.whenReady().
app.commandLine.appendSwitch('disable-print-preview');
app.commandLine.appendSwitch('--disable-print-preview');
app.commandLine.appendSwitch('disable-features', 'PrintPreview,PrintPreviewV2');
app.commandLine.appendSwitch('no-sandbox');

// Keep global references to prevent garbage collection
let mainWindow: BrowserWindow | null = null;
let dbManager: DatabaseManager;
let accountingService: AccountingService;
let inventoryService: InventoryService;
let gstService: GSTService;
let reportService: ReportService;
let printingService: PrintingService;
let backupService: BackupService;
let automationService: AutomationService;
let accountingEngineService: AccountingEngineService;
let licenseService: LicenseService;
let updateService: UpdateService;



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
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    title: 'Dhisum Tseyig - Accounting & POS',
    icon: path.join(__dirname, '../build/icon.png'),
    show: false, // Don't show until ready
  });

  // Load the app
  if (mainWindow) {
    if (isDev) {
      mainWindow.loadURL('http://localhost:5173').catch(() => {
        console.log('Dev server not available, falling back to local files');
        mainWindow?.loadFile(path.join(__dirname, '../../dist/index.html'));
      });
      mainWindow.webContents.openDevTools();
    } else {
      mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
    }
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Initialize the application
 */
app.whenReady().then(() => {
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

  // Initialize license and update services
  licenseService = new LicenseService(app.getPath('userData'));
  const pkg = require(path.join(__dirname, '../../package.json'));
  updateService = new UpdateService(pkg.version || '1.0.0');

  // Create main window
  createWindow();

  // Daily backup scheduler (runs every hour to check)
  setInterval(() => {
    const now = new Date();
    if (now.getHours() === 23) {
      backupService.createDailyBackup();
    }
  }, 60 * 60 * 1000);

  app.on('activate', () => {
    if (mainWindow === null) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // Close database connection
  if (dbManager) {
    dbManager.close();
  }
});

// ============================================
// IPC HANDLERS - Authentication
// ============================================

ipcMain.handle('auth:login', async (_event, credentials) => {
  return accountingService.login(credentials);
});

ipcMain.handle('auth:logout', async () => {
  accountingService.logout();
  return { success: true };
});

ipcMain.handle('auth:getCurrentUser', async () => {
  return accountingService.getCurrentUser();
});

// ============================================
// IPC HANDLERS - Dashboard
// ============================================

ipcMain.handle('dashboard:getData', async () => {
  return reportService.getDashboardData();
});

ipcMain.handle('dashboard:getRealtimeMetrics', async () => {
  return automationService.getRealtimeDashboardMetrics();
});

ipcMain.handle('dashboard:getNotifications', async () => {
  return reportService.getNotifications();
});

// ============================================
// IPC HANDLERS - POS Sales
// ============================================

ipcMain.handle('pos:createSale', async (_event, saleData) => {
  return accountingService.createSale(saleData);
});

ipcMain.handle('pos:getItems', async () => {
  return inventoryService.getAllItems();
});

ipcMain.handle('pos:searchItems', async (_event, query) => {
  return inventoryService.searchItems(query);
});

ipcMain.handle('pos:getCustomers', async () => {
  return accountingService.getContacts('customer');
});

// ============================================
// IPC HANDLERS - Inventory
// ============================================

ipcMain.handle('inventory:createItem', async (_event, data) => {
  return inventoryService.createItem(data);
});

ipcMain.handle('inventory:addStock', async (_event, stockData) => {
  return inventoryService.addStock(stockData);
});

ipcMain.handle('inventory:getItems', async () => {
  return inventoryService.getAllItems();
});

ipcMain.handle('inventory:getItem', async (_event, id) => {
  return inventoryService.getItemById(id);
});

ipcMain.handle('inventory:updateItem', async (_event, id, data) => {
  return inventoryService.updateItem(id, data);
});

ipcMain.handle('inventory:deleteItem', async (_event, id) => {
  return inventoryService.deleteItem(id);
});

ipcMain.handle('inventory:getLowStock', async () => {
  return inventoryService.getLowStockItems();
});

ipcMain.handle('inventory:getCategories', async () => {
  return inventoryService.getCategories();
});

ipcMain.handle('inventory:createCategory', async (_event, name) => {
  return inventoryService.createCategory(name);
});

ipcMain.handle('inventory:deleteCategory', async (_event, id) => {
  return inventoryService.deleteCategory(id);
});

ipcMain.handle('inventory:getUnits', async () => {
  return inventoryService.getUnits();
});

ipcMain.handle('inventory:createUnit', async (_event, name) => {
  return inventoryService.createUnit(name);
});

ipcMain.handle('inventory:deleteUnit', async (_event, id) => {
  return inventoryService.deleteUnit(id);
});

// ============================================
// IPC HANDLERS - Contacts
// ============================================

ipcMain.handle('contacts:getAll', async (_event, type) => {
  return accountingService.getContacts(type);
});

ipcMain.handle('contacts:create', async (_event, data) => {
  return accountingService.createContact(data);
});

ipcMain.handle('contacts:update', async (_event, id, data) => {
  return accountingService.updateContact(id, data);
});

ipcMain.handle('contacts:delete', async (_event, id) => {
  return accountingService.deleteContact(id);
});

ipcMain.handle('contacts:getLedger', async (_event, contactId) => {
  return accountingService.getContactLedger(contactId);
});

ipcMain.handle('accounts:getAll', async () => {
  try {
    const db = dbManager.getDatabase();
    const accounts = db.prepare(`
      SELECT id, code, name, type, subtype
      FROM accounts
      WHERE is_active = 1
      ORDER BY code
    `).all();
    return { success: true, data: accounts };
  } catch (error: any) {
    return { success: false, message: 'Failed to get accounts: ' + error.message };
  }
});

// ============================================
// IPC HANDLERS - Transactions
// ============================================

ipcMain.handle('transactions:receiveMoney', async (_event, data) => {
  return accountingService.receiveMoney(data);
});

ipcMain.handle('transactions:payMoney', async (_event, data) => {
  return accountingService.payMoney(data);
});

ipcMain.handle('transactions:transfer', async (_event, data) => {
  return accountingService.transferMoney(data);
});

ipcMain.handle('transactions:getAll', async (_event, filters) => {
  return accountingService.getTransactions(filters);
});

ipcMain.handle('transactions:void', async (_event, id, reason) => {
  return accountingService.voidTransaction(id, reason);
});

ipcMain.handle('transactions:getInvoiceData', async (_event, transactionId) => {
  return accountingService.getInvoiceByTransactionId(transactionId);
});

// ============================================
// IPC HANDLERS - GST
// ============================================

ipcMain.handle('gst:getSummary', async (_event, month, year) => {
  return gstService.getGSTSummary(month, year);
});

ipcMain.handle('gst:getReturns', async () => {
  return gstService.getGSTReturns();
});

ipcMain.handle('gst:fileReturn', async (_event, month, year) => {
  return gstService.fileGSTReturn(month, year);
});

// ============================================
// IPC HANDLERS - Reports
// ============================================

ipcMain.handle('reports:trialBalance', async (_event, asOfDate) => {
  return reportService.getTrialBalance(asOfDate);
});

ipcMain.handle('reports:profitLoss', async (_event, startDate, endDate) => {
  return reportService.getProfitLoss(startDate, endDate);
});

ipcMain.handle('reports:balanceSheet', async (_event, asOfDate) => {
  return reportService.getBalanceSheet(asOfDate);
});

ipcMain.handle('reports:outstanding', async (_event, type) => {
  return reportService.getOutstandingReport(type);
});

ipcMain.handle('reports:stockReport', async () => {
  return reportService.getStockReport();
});

ipcMain.handle('reports:salesReport', async (_event, startDate, endDate) => {
  return reportService.getSalesReport(startDate, endDate);
});

// ============================================
// IPC HANDLERS - Backup
// ============================================

ipcMain.handle('backup:create', async () => {
  const result = await dialog.showSaveDialog({
    defaultPath: `dhisum_backup_${new Date().toISOString().split('T')[0]}.db`,
    filters: [{ name: 'Database', extensions: ['db'] }],
  });

  if (!result.canceled && result.filePath) {
    return backupService.createBackup(result.filePath);
  }
  return { success: false, message: 'Backup cancelled' };
});

ipcMain.handle('backup:restore', async () => {
  const result = await dialog.showOpenDialog({
    filters: [{ name: 'Database', extensions: ['db'] }],
    properties: ['openFile'],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const restoreResult = backupService.restoreBackup(result.filePaths[0]);
    if (restoreResult.success) {
      // Relaunch the app after a short delay to allow the IPC response to be sent
      setTimeout(() => {
        app.relaunch();
        app.exit(0);
      }, 1500);
    }
    return restoreResult;
  }
  return { success: false, message: 'Restore cancelled' };
});

ipcMain.handle('backup:autoBackupStatus', async () => {
  return backupService.getAutoBackupStatus();
});

// ============================================
// IPC HANDLERS - Settings
// ============================================

ipcMain.handle('settings:get', async () => {
  // Get settings from database
  const db = dbManager.getDatabase();
  const settings = db.prepare('SELECT * FROM settings').all();
  const result: Record<string, string> = {};

  for (const setting of settings as any[]) {
    result[setting.key] = setting.value;
  }

  return result;
});

ipcMain.handle('settings:getSmartDefaults', async () => {
  return automationService.getSmartDefaults();
});

ipcMain.handle('settings:update', async (_event, settings) => {
  try {
    const db = dbManager.getDatabase();
    const stmt = db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `);

    for (const [key, value] of Object.entries(settings)) {
      stmt.run(key, value as string);
    }

    return { success: true, message: 'Settings updated successfully' };
  } catch (error: any) {
    return { success: false, message: 'Failed to update settings: ' + error.message };
  }
});

ipcMain.handle('settings:closePeriod', async (_event, year, month) => {
  try {
    const db = dbManager.getDatabase();
    const currentUser = accountingService.getCurrentUser();

    // Check if already locked
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
});

ipcMain.handle('settings:hasUsers', async () => {
  try {
    const db = dbManager.getDatabase();
    const user = db.prepare('SELECT 1 FROM users LIMIT 1').get();
    return !!user;
  } catch {
    return false;
  }
});

ipcMain.handle('settings:getUserCount', async () => {
  try {
    const db = dbManager.getDatabase();
    const result = db.prepare('SELECT COUNT(*) as count FROM users WHERE is_active = 1').get() as { count: number };
    return result.count;
  } catch {
    return 0;
  }
});

ipcMain.handle('settings:getUsers', async () => {
  try {
    const db = dbManager.getDatabase();
    const users = db.prepare('SELECT id, username, full_name, role, is_active, created_at FROM users ORDER BY created_at').all();
    return { success: true, data: users };
  } catch (error: any) {
    return { success: false, message: 'Failed to get users: ' + error.message };
  }
});

ipcMain.handle('settings:createUser', async (_event, userData) => {
  try {
    const bcrypt = require('bcryptjs');
    const db = dbManager.getDatabase();

    // Validate
    if (!userData.username || !userData.password || !userData.fullName) {
      return { success: false, message: 'Username, password, and full name are required' };
    }

    // Check if username already taken
    const existing = db.prepare('SELECT 1 FROM users WHERE username = ?').get(userData.username);
    if (existing) {
      return { success: false, message: 'Username already exists' };
    }

    // Enforce user limit check (except for first setup)
    const userCount = dbManager.getDatabase().prepare('SELECT COUNT(*) as count FROM users WHERE is_active = 1').get() as { count: number };
    const status = licenseService.getStatus();

    // Only allow creation if under limit (or if it's the first user ever)
    if (userCount.count > 0 && userCount.count >= status.maxUsers) {
      return {
        success: false,
        message: `Plan Limit Reached: Your ${status.plan || 'current'} plan allowed up to ${status.maxUsers} user(s). Please upgrade to add more.`
      };
    }

    const passwordHash = bcrypt.hashSync(userData.password, 10);
    db.prepare(`
      INSERT INTO users (username, password_hash, full_name, role)
      VALUES (?, ?, ?, ?)
    `).run(userData.username, passwordHash, userData.fullName, userData.role || 'staff');

    return { success: true, message: 'User created successfully' };
  } catch (error: any) {
    return { success: false, message: 'Failed to create user: ' + error.message };
  }
});

ipcMain.handle('settings:changePassword', async (_event, data) => {
  return accountingService.changePassword(data);
});

// ============================================
// IPC HANDLERS - Printing
// ============================================

/**
 * Helper: Get business info from settings DB for printing
 */
function getBusinessInfo(): Record<string, string> {
  const db = dbManager.getDatabase();
  const settings = db.prepare('SELECT * FROM settings').all();
  const result: Record<string, string> = {};
  for (const setting of settings as any[]) {
    result[setting.key] = setting.value;
  }
  return result;
}

/**
 * Helper to print HTML content.
 * USES THE NUCLEAR WINDOWS OPTION: rundll32.exe mshtml.dll,PrintHTML
 * This utility is built into all Windows versions and triggers the REAL 
 * System Print Dialog for an HTML file. It bypasses Chromium/Electron completely.
 */
async function printHTML(html: string, _options: any = {}) {
  const tempDir = app.getPath('temp');
  const tempFile = path.join(tempDir, `print_job_${Date.now()}.html`);

  try {
    fs.writeFileSync(tempFile, html, 'utf-8');
    console.log(`[Print] Wrote temp file for rundll32: ${tempFile}`);
  } catch (err) {
    console.error('[Print] Failed to write temp file:', err);
    return { success: false, message: 'Failed to create internal print file' };
  }

  return new Promise((resolve) => {
    const { exec } = require('child_process');

    // rundll32.exe mshtml.dll,PrintHTML is the "secret" way to trigger the 
    // native Windows system print dialog for any HTML file.
    const command = `rundll32.exe mshtml.dll,PrintHTML "${tempFile}"`;

    console.log(`[Print] Executing: ${command}`);

    exec(command, (error: any) => {
      // Cleanup temp file after a while (dialog needs it to be present)
      setTimeout(() => {
        try { if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile); } catch (e) { }
      }, 60000);

      if (error) {
        console.error('[Print] rundll32 error:', error);
        resolve({ success: false, message: 'Print dialog error: ' + error.message });
      } else {
        console.log('[Print] rundll32 launched successfully');
        resolve({ success: true, message: 'Print dialog opened' });
      }
    });
  });
}

// Logo Upload Handler
ipcMain.handle('settings:uploadLogo', async () => {
  try {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'] }
      ]
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, message: 'No file selected' };
    }

    const filePath = result.filePaths[0];
    const ext = path.extname(filePath).toLowerCase().replace('.', '');
    const mimeMap: Record<string, string> = {
      png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
      gif: 'image/gif', bmp: 'image/bmp', webp: 'image/webp', svg: 'image/svg+xml'
    };
    const mime = mimeMap[ext] || 'image/png';

    // Read the file and convert to base64 data URI
    const fileBuffer = fs.readFileSync(filePath);
    const base64 = fileBuffer.toString('base64');
    const dataUri = `data:${mime};base64,${base64}`;

    // Save to settings DB
    const db = dbManager.getDatabase();
    db.prepare(`
      INSERT INTO settings (key, value, updated_at) VALUES ('company_logo', ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `).run(dataUri);

    return { success: true, data: dataUri, message: 'Logo uploaded successfully' };
  } catch (error: any) {
    return { success: false, message: 'Failed to upload logo: ' + error.message };
  }
});

// Logo Get Handler
ipcMain.handle('settings:getLogo', async () => {
  try {
    const db = dbManager.getDatabase();
    const row = db.prepare("SELECT value FROM settings WHERE key = 'company_logo'").get() as any;
    return { success: true, data: row?.value || null };
  } catch (error: any) {
    return { success: false, data: null };
  }
});

ipcMain.handle('print:invoice', async (_event, data, template) => {
  try {
    const result = printingService.printInvoice(data, template);
    if (!result.success) return result;

    const html = (global as any).lastPrintHTML;
    return await printHTML(html);
  } catch (error: any) {
    return { success: false, message: 'Print failed: ' + error.message };
  }
});

ipcMain.handle('print:thermalReceipt', async (_event, data) => {
  try {
    const result = printingService.printThermalReceipt(data);
    if (!result.success) return result;

    const html = (global as any).lastPrintHTML;
    return await printHTML(html, { margins: { marginType: 'none' }, pageSize: { width: 80000, height: 200000 } });
  } catch (error: any) {
    return { success: false, message: 'Print failed: ' + error.message };
  }
});

ipcMain.handle('print:report', async (_event, title, contentHtml) => {
  try {
    // Fetch business info from DB so it appears in the report header
    const bizInfo = getBusinessInfo();
    const result = printingService.printReport(title, contentHtml, bizInfo);
    if (!result.success) return result;

    const html = (global as any).lastPrintHTML;
    return await printHTML(html);
  } catch (error: any) {
    return { success: false, message: 'Print failed: ' + error.message };
  }
});

ipcMain.handle('print:getPrinters', async () => {
  try {
    return await printingService.getPrinters();
  } catch (error) {
    return [];
  }
});

// ============================================
// IPC HANDLERS - Utilities
// ============================================

ipcMain.handle('shell:openExternal', async (_event, url) => {
  await shell.openExternal(url);
});

// ============================================
// IPC HANDLERS - License System
// ============================================

ipcMain.handle('license:getStatus', async () => {
  const status = licenseService.getStatus();
  console.log('[License] Current status requested:', status.type, status.daysRemaining ? `(${status.daysRemaining} days)` : '');
  return status;
});

ipcMain.handle('license:activate', async (_event, licenseKey) => {
  return licenseService.activate(licenseKey);
});

ipcMain.handle('license:startTrial', async () => {
  try {
    const status = licenseService.startTrial();
    console.log('[License] Trial started successfully:', status);
    return status;
  } catch (error: any) {
    console.error('[License] Failed to start trial:', error);
    throw error;
  }
});

ipcMain.handle('license:getTrialInfo', async () => {
  return licenseService.getTrialInfo();
});

ipcMain.handle('license:verifyWithServer', async () => {
  return licenseService.verifyWithServer();
});

ipcMain.handle('license:getUserLimit', async () => {
  const status = licenseService.getStatus();
  return status.maxUsers;
});

ipcMain.handle('license:checkUpdate', async () => {
  return updateService.checkForUpdates();
});
