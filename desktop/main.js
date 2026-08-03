const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const { printReceipt, testPrint, testConnection } = require('./print');

let mainWindow = null;
let serverProcess = null;

// 启动内嵌后端服务
function startServer() {
  if (app.isPackaged) {
    // 打包后：用内嵌的 node.exe 运行服务
    const nodePath = path.join(process.resourcesPath, 'server', 'node.exe');
    const serverScript = path.join(process.resourcesPath, 'server', 'src', 'app.js');
    serverProcess = spawn(nodePath, [serverScript], {
      env: { ...process.env, PORT: '3000' },
      cwd: path.join(process.resourcesPath, 'server'),
      stdio: 'ignore'
    });
  } else {
    // 开发模式：用系统 node 运行
    const serverPath = path.join(__dirname, '../server/src/app.js');
    serverProcess = spawn('node', [serverPath], {
      env: { ...process.env, PORT: '3000' },
      stdio: 'ignore'
    });
  }
  serverProcess.on('error', (err) => {
    console.error('服务器启动失败:', err.message);
  });
  console.log('后端服务已启动 (PID:', serverProcess.pid, ')');
}

// 停止后端服务
function stopServer() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
}

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
    await printReceipt(data);
    return { success: true, message: '打印成功' };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

// IPC: 测试打印
ipcMain.handle('test-print', async (event, data) => {
  try {
    await testPrint(data);
    return { success: true, message: '测试打印成功' };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

// IPC: 测试打印机连接
ipcMain.handle('test-connection', async (event, data) => {
  try {
    return await testConnection(data.ip, data.port);
  } catch (err) {
    return { success: false, message: err.message };
  }
});

app.whenReady().then(() => {
  // 先启动后端服务
  startServer();
  // 等待服务启动后再创建窗口
  setTimeout(() => {
    createWindow();
  }, app.isPackaged ? 2000 : 500);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  stopServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  stopServer();
});
