const { app, BrowserWindow, shell, session, dialog } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

// Hardware audio flags if needed

// Ensure only one instance of Loopd runs at a time
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

let mainWindow;
let server;
const FIXED_PORT = 57890; // Fixed port ensures localStorage/AsyncStorage origin persists permanently

function startStaticServer(callback) {
  let distDir = path.join(__dirname, 'dist');
  if (!fs.existsSync(distDir)) {
    distDir = path.join(process.resourcesPath, 'app.asar', 'dist');
  }
  if (!fs.existsSync(distDir)) {
    distDir = path.join(process.resourcesPath, 'app', 'dist');
  }
  
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.ttf': 'font/ttf',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
  };

  server = http.createServer((req, res) => {
    let reqUrl = req.url.split('?')[0];
    let filePath = path.join(distDir, reqUrl);

    // Normalize
    if (filePath.endsWith(path.sep) || reqUrl === '/') {
      filePath = path.join(distDir, 'index.html');
    }

    try {
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(distDir, 'index.html');
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      const content = fs.readFileSync(filePath);

      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    } catch (err) {
      res.writeHead(500);
      res.end('Error loading ' + reqUrl + ': ' + err.message);
    }
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn('Port', FIXED_PORT, 'already in use, serving from existing instance');
      callback(FIXED_PORT);
    } else {
      console.error('Server error:', err);
    }
  });

  // Listen on consistent fixed port so localStorage origin (http://127.0.0.1:57890) is permanent
  server.listen(FIXED_PORT, '127.0.0.1', () => {
    callback(FIXED_PORT);
  });
}

function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    title: 'Loopd Music',
    backgroundColor: '#0c0d10',
    autoHideMenuBar: true,
    webPreferences: {
      partition: 'persist:loopd_data', // Permanent isolated storage partition
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
    icon: path.join(__dirname, 'assets', 'images', 'loopd-icon.ico'),
  });

  // Inject CSS to completely remove ugly orange/yellow browser focus outlines on inputs
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.insertCSS(`
      * {
        -webkit-tap-highlight-color: transparent !important;
      }
      input, textarea, select, [contenteditable], [tabindex] {
        outline: none !important;
        outline-width: 0 !important;
        outline-style: none !important;
        box-shadow: none !important;
      }
      *:focus, *:focus-visible {
        outline: none !important;
        outline-width: 0 !important;
        outline-style: none !important;
        box-shadow: none !important;
      }
    `).catch(() => {});
  });

  mainWindow.loadURL(`http://127.0.0.1:${port}`);

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.whenReady().then(() => {
  const loopdSession = session.fromPartition('persist:loopd_data');

  // Unconditionally grant all media and microphone permissions for Loopd
  const grantPermission = (webContents, permission, callback) => {
    callback(true);
  };

  loopdSession.setPermissionRequestHandler(grantPermission);
  loopdSession.setPermissionCheckHandler(() => true);
  if (loopdSession.setDevicePermissionHandler) {
    loopdSession.setDevicePermissionHandler(() => true);
  }

  session.defaultSession.setPermissionRequestHandler(grantPermission);
  session.defaultSession.setPermissionCheckHandler(() => true);
  if (session.defaultSession.setDevicePermissionHandler) {
    session.defaultSession.setDevicePermissionHandler(() => true);
  }

  startStaticServer((port) => {
    createWindow(port);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      if (server) {
        createWindow(FIXED_PORT);
      }
    }
  });
});

app.on('window-all-closed', () => {
  if (server) {
    server.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
