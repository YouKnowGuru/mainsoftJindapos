/**
 * Browser polyfill for Node.js process object
 * This prevents "process is not defined" errors in browser builds
 */

// Define process for browser environment
if (typeof window !== 'undefined' && !(window as any).process) {
  (window as any).process = {
    env: {
      NODE_ENV: 'production',
    },
    platform: 'browser',
    nextTick: (cb: () => void) => setTimeout(cb, 0),
  };
}

// Also define globalThis.process
if (typeof globalThis !== 'undefined' && !(globalThis as any).process) {
  (globalThis as any).process = (window as any).process;
}

export { };
