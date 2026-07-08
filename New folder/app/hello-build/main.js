const { app, BrowserWindow } = require('electron');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    webPreferences: {
      nodeIntegration: false,  // Disable Node.js in renderer
      contextIsolation: true,   // Enable context isolation
      preload: path.join(__dirname, 'preload.js')
    },
    webSecurity: true  // Explicitly enable web security
  });

  // Restrict navigation to approved domains
  mainWindow.webContents.on('will-navigate', (event, navigatorUrl) => {
    const allowedDomains = ['yourapp.com', 'google.com'];
    if (!allowedDomains.some(domain => navigatorUrl.startsWith(`https://${domain}`))) {
      event.preventDefault();
    }
  });
}

app.whenReady().then(createWindow);