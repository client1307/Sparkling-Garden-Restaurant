// Sparkling POS desktop shell: opens the billing desk (/pos) from the local or remote restaurant server.
const { app, BrowserWindow, Menu, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');

let mainWindow = null;
let retryTimer = null;
let currentServerUrl = 'http://localhost:5173';

// 1. Persistent Configuration Storage
function getConfigPath() {
  return path.join(app.getPath('userData'), 'pos-config.json');
}

function loadConfig() {
  try {
    const configPath = getConfigPath();
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (data && data.serverUrl) {
        return data.serverUrl.replace(/\/+$/, '');
      }
    }
  } catch (e) {
    console.error('Failed to read pos-config.json:', e.message);
  }
  return (process.env.POS_URL || 'http://localhost:5173').replace(/\/+$/, '');
}

function saveConfig(newUrl) {
  try {
    const cleanUrl = String(newUrl || '').trim().replace(/\/+$/, '');
    if (!cleanUrl) return;
    const configPath = getConfigPath();
    fs.writeFileSync(configPath, JSON.stringify({ serverUrl: cleanUrl }, null, 2), 'utf8');
    currentServerUrl = cleanUrl;
  } catch (e) {
    console.error('Failed to save pos-config.json:', e.message);
  }
}

// 2. Generate Friendly Connection & Configuration Screen
function getConnectionHtml(targetUrl, errorText = '') {
  const safeTarget = (targetUrl || 'http://localhost:5173').replace(/"/g, '&quot;');
  const safeError = (errorText || 'Server offline or port unreachable').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Connecting to Sparkling POS...</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: #F4F6F0;
      color: #222222;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: #FFFFFF;
      border: 1px solid #EBEBEB;
      border-radius: 24px;
      box-shadow: 0 16px 40px rgba(47, 68, 40, 0.08);
      max-width: 540px;
      width: 100%;
      padding: 36px 32px;
      text-align: center;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #FFFBEB;
      color: #B45309;
      border: 1px solid #FDE68A;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 4px 12px;
      border-radius: 9999px;
      margin-bottom: 16px;
    }
    .badge-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #F59E0B;
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
    }
    h1 {
      font-size: 24px;
      font-weight: 900;
      color: #1C2B1A;
      letter-spacing: -0.5px;
      margin-bottom: 8px;
    }
    p.subtitle {
      font-size: 13px;
      color: #818181;
      margin-bottom: 24px;
      line-height: 1.5;
    }
    .error-box {
      background: #FEF2F2;
      border: 1px solid #FEE2E2;
      border-radius: 12px;
      padding: 12px;
      color: #B91C1C;
      font-size: 12px;
      font-family: Consolas, monospace;
      margin-bottom: 24px;
      text-align: left;
      word-break: break-all;
    }
    .form-group {
      text-align: left;
      margin-bottom: 20px;
    }
    label {
      display: block;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #5A724A;
      margin-bottom: 6px;
    }
    .input-wrapper {
      position: relative;
      display: flex;
      gap: 8px;
    }
    input[type="text"] {
      flex: 1;
      padding: 12px 16px;
      border: 1.5px solid #D1D5DB;
      border-radius: 12px;
      font-size: 13px;
      font-family: inherit;
      color: #111827;
      outline: none;
      transition: all 0.2s;
    }
    input[type="text"]:focus {
      border-color: #5A724A;
      box-shadow: 0 0 0 3px rgba(90, 114, 74, 0.15);
    }
    button.primary {
      background: #5A724A;
      color: #FFFFFF;
      border: none;
      border-radius: 12px;
      padding: 12px 20px;
      font-size: 13px;
      font-weight: 800;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
    }
    button.primary:hover {
      background: #485D3B;
    }
    .quick-links {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 10px;
    }
    .pill {
      background: #F4F6F0;
      border: 1px solid #EBEBEB;
      color: #425934;
      font-size: 11px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 9999px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .pill:hover {
      background: #E4ECD9;
      border-color: #5A724A;
    }
    .instructions {
      background: #F8F8F8;
      border: 1px solid #EBEBEB;
      border-radius: 14px;
      padding: 16px;
      font-size: 11.5px;
      color: #555555;
      text-align: left;
      line-height: 1.6;
      margin-top: 24px;
    }
    .instructions ol {
      margin-left: 20px;
      margin-top: 6px;
    }
    .footer {
      margin-top: 20px;
      font-size: 11px;
      color: #9CA3AF;
    }
    .auto-retry {
      font-size: 11px;
      color: #5A724A;
      font-weight: 700;
      margin-top: 14px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">
      <div class="badge-dot"></div>
      Connecting to POS
    </div>
    <h1>Sparkling POS Desktop</h1>
    <p class="subtitle">Unable to connect to the restaurant server. Please verify the server address or ensure the backend service is running.</p>

    <div class="error-box">
      <strong>Connection Status:</strong> ${safeError}
    </div>

    <form onsubmit="handleConnect(event)">
      <div class="form-group">
        <label for="serverInput">Restaurant Server Address</label>
        <div class="input-wrapper">
          <input type="text" id="serverInput" value="${safeTarget}" placeholder="e.g. http://localhost:5173 or http://192.168.1.100:5173" required />
          <button type="submit" class="primary">Connect</button>
        </div>
        <div class="quick-links">
          <span class="pill" onclick="setServer('http://localhost:5173')">Localhost (5173)</span>
          <span class="pill" onclick="setServer('http://localhost:5000')">Backend (5000)</span>
          <span class="pill" onclick="setServer('http://127.0.0.1:5173')">127.0.0.1</span>
        </div>
      </div>
    </form>

    <div class="instructions">
      <strong>How to connect:</strong>
      <ol>
        <li>If running on <strong>this PC</strong>, make sure the frontend server is started: <code>npm run dev</code></li>
        <li>If connecting to a <strong>cashier/billing counter across LAN</strong>, enter the server PC's local IP (e.g. <code>http://192.168.1.100:5173</code>).</li>
        <li>If connecting to a <strong>deployed cloud server</strong>, enter your live domain (e.g. <code>https://your-restaurant.vercel.app</code>).</li>
      </ol>
    </div>

    <div class="auto-retry" id="retryMsg">Auto-retrying in <span id="countdown">3</span>s...</div>
    <div class="footer">Press <strong>Ctrl+R</strong> to reload | <strong>Ctrl+Shift+S</strong> for server settings</div>
  </div>

  <script>
    function setServer(url) {
      document.getElementById('serverInput').value = url;
    }

    function handleConnect(e) {
      if (e) e.preventDefault();
      var inputUrl = document.getElementById('serverInput').value.trim();
      if (!inputUrl) return;
      if (!inputUrl.startsWith('http://') && !inputUrl.startsWith('https://')) {
        inputUrl = 'http://' + inputUrl;
      }
      window.location.href = 'https://pos-internal-action/?action=connect&url=' + encodeURIComponent(inputUrl);
    }

    // Auto-retry polling
    var count = 3;
    setInterval(function() {
      count--;
      var el = document.getElementById('countdown');
      if (el) el.innerText = count;
      if (count <= 0) {
        count = 3;
        var current = document.getElementById('serverInput').value.trim();
        window.location.href = 'https://pos-internal-action/?action=retry&url=' + encodeURIComponent(current);
      }
    }, 1000);
  </script>
</body>
</html>`;
}

// 3. Load POS or Display Connection Screen
function loadPos(serverUrl, errorText = '') {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  const cleanBase = (serverUrl || currentServerUrl).replace(/\/+$/, '');
  const targetPosUrl = `${cleanBase}/pos`;

  console.log(`[Sparkling POS] Attempting to load: ${targetPosUrl}`);

  // Test reachability first or initiate load
  mainWindow.loadURL(targetPosUrl).catch((err) => {
    console.warn(`[Sparkling POS] Failed to load ${targetPosUrl}:`, err.message);
    showConnectionScreen(cleanBase, err.message || 'Connection refused or offline');
  });
}

function showConnectionScreen(targetUrl, errorText = '') {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const html = getConnectionHtml(targetUrl, errorText);
  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
}

// 4. Create Main Electron Window
function createWindow() {
  currentServerUrl = loadConfig();

  mainWindow = new BrowserWindow({
    width: 1366,
    height: 820,
    minWidth: 1024,
    minHeight: 700,
    autoHideMenuBar: false,
    title: 'Sparkling POS - Billing Terminal',
    icon: path.join(__dirname, '../public/logo.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Native application menu
  const menuTemplate = [
    {
      label: 'Sparkling POS',
      submenu: [
        {
          label: 'Change Server URL...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => showConnectionScreen(currentServerUrl, 'Change configured server address')
        },
        {
          label: 'Reload Terminal',
          accelerator: 'CmdOrCtrl+R',
          click: () => loadPos(currentServerUrl)
        },
        { type: 'separator' },
        {
          label: 'Exit POS',
          accelerator: 'CmdOrCtrl+Q',
          click: () => app.quit()
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  // Intercept navigation from connection page
  mainWindow.webContents.on('will-navigate', (event, targetUrl) => {
    if (targetUrl.startsWith('https://pos-internal-action/')) {
      event.preventDefault();
      try {
        const parsed = new URL(targetUrl);
        const action = parsed.searchParams.get('action');
        const candidateUrl = parsed.searchParams.get('url');

        if (action === 'connect' && candidateUrl) {
          saveConfig(candidateUrl);
          loadPos(candidateUrl);
        } else if (action === 'retry') {
          const testUrl = candidateUrl || currentServerUrl;
          loadPos(testUrl);
        }
      } catch (err) {
        console.error('Action parse error:', err.message);
      }
    }
  });

  // Handle failure to connect
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    // Ignore internal actions
    if (validatedURL && validatedURL.startsWith('data:')) return;
    if (validatedURL && validatedURL.startsWith('https://pos-internal-action/')) return;

    console.warn(`[Sparkling POS] did-fail-load: ${errorCode} ${errorDescription} on ${validatedURL}`);
    showConnectionScreen(currentServerUrl, `${errorDescription} (${errorCode})`);
  });

  // Initial load
  loadPos(currentServerUrl);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
