import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import Store from 'electron-store';

const store = new Store({ cwd: 'C:\\ProgramData\\pos_data' });
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
    app.quit();
}

let mainWindow;

const createWindow = () => {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            nodeIntegration: true, // For simplicity in this POS app
            contextIsolation: false, // For simplicity to access Electron APIs directly
            webSecurity: false // Sometimes needed for local file access if any
        },
        autoHideMenuBar: true, // Clean look
    });

    // Check if we are in development mode
    const isDev = process.env.NODE_ENV === 'development';

    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        // mainWindow.webContents.openDevTools();
    } else {
        // In production, load the index.html from the dist folder
        // 'npm run build' outputs React to 'dist'
        // This file is in 'electron/main.js', so we need to go up one level to find 'dist'
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
};

// IPC Handlers for Data Persistence
ipcMain.handle('get-data', (event, key) => {
    return store.get(key);
});

ipcMain.on('save-data', (event, key, value) => {
    store.set(key, value);
});

ipcMain.handle('print-receipt', async (event, html) => {
    const tmpHtmlPath = path.join(os.tmpdir(), 'pos_receipt_print.html');
    const tmpPdfPath = path.join(os.tmpdir(), 'pos_receipt_print.pdf');

    const fullHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 12mm 15mm; background: white; color: #111; }
  @page { size: A4; margin: 10mm; }
</style></head><body>${html}</body></html>`;

    fs.writeFileSync(tmpHtmlPath, fullHtml, 'utf8');

    const pdfWin = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false, contextIsolation: true } });
    await pdfWin.loadFile(tmpHtmlPath);
    const pdfData = await pdfWin.webContents.printToPDF({ printBackground: true, pageSize: 'A4' });
    pdfWin.destroy();

    try { fs.unlinkSync(tmpHtmlPath); } catch { /* ignore */ }

    fs.writeFileSync(tmpPdfPath, pdfData);
    await shell.openPath(tmpPdfPath);
    return true;
});

ipcMain.handle('download-pdf', async (event, { html, filename }) => {
    // Write receipt HTML to a temp file so the hidden window can load it reliably
    const tmpPath = path.join(os.tmpdir(), `pos_receipt_${Date.now()}.html`);
    const fullHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 12mm 15mm; background: white; color: #111; }
</style></head><body>${html}</body></html>`;
    fs.writeFileSync(tmpPath, fullHtml, 'utf8');

    const pdfWin = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false, contextIsolation: true } });
    await pdfWin.loadFile(tmpPath);
    const pdfData = await pdfWin.webContents.printToPDF({ printBackground: true, pageSize: 'A4' });
    pdfWin.close();
    fs.unlinkSync(tmpPath);

    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
        defaultPath: filename,
        filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
    });
    if (!canceled && filePath) {
        fs.writeFileSync(filePath, pdfData);
        return true;
    }
    return false;
});

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
