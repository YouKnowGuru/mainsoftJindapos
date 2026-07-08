// ESM entry point for Electron
// This works around module loading issues with Electron 28+
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require('./dist-electron/electron/main.js');
