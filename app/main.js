const { app, BrowserWindow, ipcMain, dialog, screen } = require('electron');
const path = require('path');
const fs   = require('fs');

// Dev: app/../data  |  Packaged: sibling "data" folder if it already exists (Colm's OneDrive
// repo copy), else Documents/Electron App Data/Tempo/data for everyone else's install.
// xattr -cr in build script prevents macOS App Translocation so this path stays correct
const SIBLING_DATA = path.join(process.resourcesPath, '..', '..', '..', 'data');
const SHARED_APP_DATA = path.join(app.getPath('documents'), 'Electron App Data', 'Tempo', 'data');
const DATA_DIR = !app.isPackaged
  ? path.join(__dirname, '..', 'data')
  : fs.existsSync(SIBLING_DATA) ? SIBLING_DATA : SHARED_APP_DATA;
const ARCHIVE_DIR = path.join(DATA_DIR, 'archive');

let mainWindow = null;
let isDirty    = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width:  1600,
    height: 860,
    minWidth:  1100,
    minHeight: 600,
    title: 'Tempo',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 14, y: 9 },
    vibrancy: 'under-window',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile('tempo.html');
  mainWindow.setMenuBarVisibility(false);

  mainWindow.on('close', e => {
    if (!isDirty) return;
    e.preventDefault();
    const response = dialog.showMessageBoxSync(mainWindow, {
      type: 'warning',
      buttons: ['Save', "Don't Save", 'Cancel'],
      defaultId: 0,
      cancelId: 2,
      message: 'You have unsaved changes',
      detail: 'Do you want to save your schedule before closing?',
    });
    if (response === 0) {
      mainWindow.webContents.send('save-and-quit');
    } else if (response === 1) {
      mainWindow.destroy();
    }
  });
}

app.whenReady().then(() => {
  [DATA_DIR, ARCHIVE_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });
  // Dock icon in dev (packaged app uses the bundled .icns)
  if (process.platform === 'darwin' && app.dock) {
    try { app.dock.setIcon(path.join(__dirname, 'logo.png')); } catch(_) {}
  }
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => app.quit());

ipcMain.on('set-dirty', (e, dirty) => { isDirty = dirty; });
ipcMain.on('save-complete', () => app.quit());

ipcMain.handle('get-data-dir', () => DATA_DIR);

// ── Resize the window to fit content, clamped to the screen work area ──
ipcMain.handle('resize-to-fit', (e, w, h) => {
  if (!mainWindow) return null;
  const wa = screen.getDisplayMatching(mainWindow.getBounds()).workAreaSize;
  const W = Math.min(Math.max(Math.round(w), 900), wa.width);
  const H = Math.min(Math.max(Math.round(h), 500), wa.height);
  mainWindow.setSize(W, H, true);
  mainWindow.center();
  return { W, H };
});

ipcMain.handle('list-projects', () => {
  try {
    const active = fs.existsSync(DATA_DIR)
      ? fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'))
          .map(f => ({ label: f.replace('.json', '').replace(/-/g, ' '), file: f, archived: false }))
      : [];
    const archived = fs.existsSync(ARCHIVE_DIR)
      ? fs.readdirSync(ARCHIVE_DIR).filter(f => f.endsWith('.json'))
          .map(f => ({ label: f.replace('.json', '').replace(/-/g, ' '), file: f, archived: true }))
      : [];
    return [...active, ...archived];
  } catch(e) {
    console.error('list-projects error:', e.message, '\nDATA_DIR:', DATA_DIR);
    return { error: e.message, dataDir: DATA_DIR };
  }
});

ipcMain.handle('load-project', (e, file, archived) => {
  try {
    const p = path.join(archived ? ARCHIVE_DIR : DATA_DIR, file);
    return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null;
  } catch(e) { return null; }
});

ipcMain.handle('save-project', (e, file, data) => {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch(e) { return false; }
});

ipcMain.handle('archive-project', (e, file) => {
  try {
    if (!fs.existsSync(ARCHIVE_DIR)) fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
    fs.renameSync(path.join(DATA_DIR, file), path.join(ARCHIVE_DIR, file));
    return true;
  } catch(e) { return false; }
});

ipcMain.handle('unarchive-project', (e, file) => {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.renameSync(path.join(ARCHIVE_DIR, file), path.join(DATA_DIR, file));
    return true;
  } catch(e) { return false; }
});

// ── Open an arbitrary JSON file from disk ──
ipcMain.handle('open-file-dialog', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Open Tempo Schedule',
    defaultPath: DATA_DIR,
    filters: [{ name: 'Tempo Schedule', extensions: ['json'] }],
    properties: ['openFile'],
  });
  if (canceled || !filePaths.length) return null;
  try { return JSON.parse(fs.readFileSync(filePaths[0], 'utf8')); }
  catch(e) { return null; }
});

// ── Export a self-contained HTML fragment (as .txt) for a Confluence HTML macro ──
ipcMain.handle('export-html', async (e, html, filename) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export for Wiki — paste contents into a Confluence HTML macro',
    defaultPath: filename || 'tempo-wiki.txt',
    filters: [
      { name: 'Text (paste into wiki)', extensions: ['txt'] },
      { name: 'HTML', extensions: ['html'] },
    ],
  });
  if (canceled || !filePath) return null;
  try { fs.writeFileSync(filePath, html, 'utf8'); return true; }
  catch(err) { return false; }
});
