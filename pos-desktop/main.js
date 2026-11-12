// Sparkling POS desktop shell: opens the billing desk (/pos) from the deployed web app.
// Set POS_URL to your Vercel URL, e.g. POS_URL=https://your-app.vercel.app
const { app, BrowserWindow } = require('electron');
const base = (process.env.POS_URL || 'http://localhost:5173').replace(/\/+$/, '');
app.whenReady().then(() => {
  const w = new BrowserWindow({ width: 1366, height: 800, autoHideMenuBar: true, title: 'Sparkling POS' });
  w.loadURL(`${base}/pos`);
  w.webContents.on('did-fail-load', () => setTimeout(() => w.loadURL(`${base}/pos`), 3000));
});
app.on('window-all-closed', () => app.quit());
