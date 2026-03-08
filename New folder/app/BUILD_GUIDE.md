# Dhisum Tseyig - Build Guide

## Project Status: COMPLETE ✅

All code has been written, TypeScript errors have been fixed, and the project is ready for building.

## Prerequisites for Building

### On Windows:
1. **Node.js 20+** - Download from https://nodejs.org/
2. **Python 3.x** - Required for building native modules
3. **Visual Studio Build Tools** or **Visual Studio Community** with C++ workload
4. **Git** - For cloning the repository

### On macOS/Linux (for development only):
- Node.js 20+
- Python 3.x
- build-essential (Linux) or Xcode Command Line Tools (macOS)

## Build Instructions

### Step 1: Install Dependencies

```bash
cd /mnt/okcomputer/output/app
npm install
```

### Step 2: Build React Application

```bash
npm run build
```

This will create the `dist/` folder with the compiled React app.

### Step 3: Compile Electron Files

```bash
npm run electron:compile
```

This will compile the TypeScript files in `electron/` to `dist-electron/`.

### Step 4: Build Windows Installer

**IMPORTANT: This step must be run on Windows!**

```bash
npm run dist:win
```

This will create:
- `release/Dhisum Tseyig Setup.exe` - Windows installer
- `release/DhisumTseyig-Portable.exe` - Portable version
- `release/win-unpacked/` - Unpacked application files

## Output Files

After successful build, you'll find:

```
release/
├── Dhisum Tseyig Setup.exe          # Main installer
├── DhisumTseyig-Portable.exe        # Portable version
├── win-unpacked/                     # Unpacked app files
│   ├── Dhisum Tseyig.exe            # Main executable
│   ├── resources/
│   │   └── app.asar                 # Packaged app
│   └── ...
└── ...
```

## Development Mode

To run in development mode:

```bash
# Terminal 1: Start React dev server
npm run dev

# Terminal 2: Start Electron
npm run electron:dev
```

## Troubleshooting

### Build Errors

#### "node-gyp rebuild failed"
- Install Visual Studio Build Tools with C++ workload
- Or install windows-build-tools: `npm install --global windows-build-tools`

#### "better-sqlite3 build failed"
- Make sure Python is installed and in PATH
- Run: `npm install better-sqlite3 --build-from-source`

#### "electron-builder not found"
- Install electron-builder globally: `npm install -g electron-builder`
- Or use npx: `npx electron-builder --win`

### Runtime Errors

#### "Cannot find module 'better-sqlite3'"
- The native module needs to be rebuilt for Electron
- Run: `npm run postinstall` or `npx electron-rebuild`

#### "Database is locked"
- Close all instances of the application
- Delete the WAL files: `dhisum_tseyig.db-shm` and `dhisum_tseyig.db-wal`

## Project Structure

```
app/
├── electron/              # Electron main process
│   ├── main.ts           # Main entry point
│   └── preload.ts        # Preload script
├── src/
│   ├── components/       # React components
│   ├── database/         # Database layer
│   ├── pages/            # Application pages
│   ├── services/         # Business logic
│   ├── store/            # State management
│   ├── types/            # TypeScript types
│   ├── App.tsx           # Main app component
│   └── main.tsx          # React entry point
├── dist/                 # Built React app (generated)
├── dist-electron/        # Compiled Electron (generated)
├── release/              # Packaged app (generated)
└── package.json          # Project configuration
```

## Features Implemented

✅ **Authentication** - Login with role-based access (Admin/Staff)
✅ **Dashboard** - Real-time metrics and alerts
✅ **POS System** - Sales with cart, GST auto-calculation, credit control
✅ **Inventory** - Stock management with average cost method
✅ **Customers/Suppliers** - Contact management with auto-ledgers
✅ **Transactions** - Receive money, pay money, transfers
✅ **GST Management** - Bhutan 5% GST tracking and returns
✅ **Reports** - Trial Balance, P&L, Balance Sheet, Outstanding, Stock, Sales
✅ **Printing** - A4 invoices and 80mm thermal receipts
✅ **Backup** - Daily auto-backup and manual backup/restore

## Default Login

- **Username**: `admin`
- **Password**: `admin123`

**⚠️ Change the default password after first login!**

## Database Location

The SQLite database is stored in:
- Windows: `%APPDATA%/Dhisum Tseyig/dhisum_tseyig.db`

## Support

For issues or questions:
- Check the README.md for detailed documentation
- Review the PROJECT_SUMMARY.md for architecture overview

---

**Built for Bhutanese Businesses** 🇧🇹
