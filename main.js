const { app, BrowserWindow, session } = require('electron');
const fs = require('fs');
const path = require('path');

async function loadAllowInsecureCerts() {
  // Fallback env var if needed
  if (String(process.env.ALLOW_INSECURE_CERTS || '').toLowerCase() === 'true') return true;
  if (String(process.env.ALLOW_INSECURE_CERTS || '') === '1') return true;

  try {
    const configPath = path.join(__dirname, 'config.js');
    const src = fs.readFileSync(configPath, 'utf8');
    const match = src.match(/allowInsecureCerts\s*:\s*(true|false)\s*,/);
    if (!match) return false;
    return match[1] === 'true';
  } catch {
    return false;
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 760,
    backgroundColor: '#0b1020',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(async () => {
  const allowInsecureCerts = await loadAllowInsecureCerts();

  if (allowInsecureCerts) {
    session.defaultSession.setCertificateVerifyProc((_request, callback) => {
      callback(0);
    });

    app.on('certificate-error', (event, _webContents, _url, _error, _certificate, callback) => {
      event.preventDefault();
      callback(true);
    });
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
