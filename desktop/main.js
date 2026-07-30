const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { printReceipt, testPrint } = require('./print');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    icon: path.join(__dirname, 'build/icon.ico'),
    title: '餐饮点餐系统'
  });

  // 开发模式加载 Vite 开发服务器，生产模式加载打包文件
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL('http://localhost:5174');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC: 打印小票
ipcMain.handle('print-receipt', async (event, data) => {
  try {
    const result = await printReceipt(data);
    return { success: true, message: '打印成功' };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

// IPC: 测试打印
ipcMain.handle('test-print', async (event, data) => {
  try {
    const result = await testPrint(data);
    return { success: true, message: '测试打印成功' };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

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
