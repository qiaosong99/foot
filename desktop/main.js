const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { spawn } = require('child_process');
const { printReceipt, testPrint, testConnection, generateReceiptHtml } = require('./print');

let mainWindow = null;
let serverProcess = null;
let embeddedServer = null;

// 启动内嵌后端服务
function startServer() {
  if (app.isPackaged) {
    // 打包后：直接在 Electron 主进程内运行后端（Win7 兼容，不依赖外置 node.exe）
    process.env.PORT = '3000';
    const serverEntry = path.join(process.resourcesPath, 'server', 'src', 'app.js');
    try {
      embeddedServer = require(serverEntry);
      console.log('后端服务已启动（进程内模式）');
    } catch (err) {
      console.error('后端服务启动失败:', err);
    }
  } else {
    // 开发模式：用系统 node 运行
    const serverPath = path.join(__dirname, '../server/src/app.js');
    serverProcess = spawn('node', [serverPath], {
      env: { ...process.env, PORT: '3000' },
      stdio: 'ignore'
    });
    serverProcess.on('error', (err) => {
      console.error('服务器启动失败:', err.message);
    });
    console.log('后端服务已启动 (PID:', serverProcess.pid, ')');
  }
}

// 停止后端服务
function stopServer() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
  if (embeddedServer && embeddedServer.server) {
    try { embeddedServer.server.close(); } catch (e) { /* ignore */ }
    embeddedServer = null;
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

// 统一打印入口：收银/外卖/测试打印全部走这里，保证链路完全一致
async function doPrint(printer, template = {}, order) {
  if (!printer) {
    throw new Error('未配置打印机');
  }
  if (printer.printMode === 'system') {
    // Windows 系统打印机（USB/共享打印机等已安装驱动的）
    if (!printer.deviceName) {
      throw new Error('未选择系统打印机');
    }
    // 打印前校验打印机是否存在
    const printers = await getSystemPrinters();
    const found = printers.find(p => (p.name || p.printerName) === printer.deviceName);
    if (!found) {
      throw new Error(`系统中未找到打印机「${printer.deviceName}」，请重新选择`);
    }
    const html = generateReceiptHtml(template, order);
    await printViaSystemPrinter(html, printer.deviceName, template.paperWidth || printer.paperWidth || 58);
  } else {
    // 网络打印机 (TCP 9100)
    if (!printer.ip) {
      throw new Error('未配置打印机IP');
    }
    await printReceipt({ printer, template, order });
  }
}

// 获取系统打印机列表（内部复用）
async function getSystemPrinters() {
  const win = new BrowserWindow({ show: false, width: 100, height: 100 });
  try {
    await win.loadURL('about:blank');
    return (await win.webContents.getPrintersAsync()) || [];
  } finally {
    win.destroy();
  }
}

// IPC: 打印小票（收银/外卖正式打印）
ipcMain.handle('print-receipt', async (event, data) => {
  try {
    await doPrint(data.printer, data.template, data.order);
    return { success: true, message: '打印成功' };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

// IPC: 测试打印（小票模板+示例订单，复用与正式打印完全相同的 doPrint 链路）
ipcMain.handle('test-print', async (event, data) => {
  try {
    const printer = data.printer || { printMode: 'network', ip: data.ip, port: data.port };
    await doPrint(printer, data.template || {}, data.order);
    const target = printer.printMode === 'system' ? printer.deviceName : `${printer.ip}:${printer.port || 9100}`;
    return { success: true, message: `已发送至「${target}」` };
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

// IPC: 获取 Windows 系统已安装的打印机列表
ipcMain.handle('get-system-printers', async () => {
  try {
    const printers = await getSystemPrinters();
    return { success: true, data: printers };
  } catch (err) {
    return { success: false, message: err.message, data: [] };
  }
});

// IPC: 获取本机局域网IP（供手机配置服务器地址，含子网/推荐标识）
function getDefaultGatewayIface() {
  // 解析路由表，找到默认路由对应的网卡IP（仅 Windows）
  try {
    if (process.platform !== 'win32') return null;
    const { execSync } = require('child_process');
    const out = execSync('netstat -rn', { encoding: 'utf8', timeout: 3000 });
    for (const line of out.split('\n')) {
      const parts = line.trim().split(/\s+/);
      // 格式: 网络目标 网络掩码 网关 接口 跃点数
      if (parts.length >= 4 && parts[0] === '0.0.0.0') {
        return parts[3]; // 接口IP
      }
    }
  } catch (e) { /* ignore */ }
  return null;
}

ipcMain.handle('get-lan-ip', () => {
  try {
    const interfaces = os.networkInterfaces();
    const gatewayIface = getDefaultGatewayIface();
    const ips = [];
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          ips.push({
            name,
            address: iface.address,
            netmask: iface.netmask,
            subnet: iface.address.split('.').slice(0, 3).join('.'),
            recommended: gatewayIface ? iface.address === gatewayIface : ips.length === 0
          });
        }
      }
    }
    // 若网关匹配失败，默认推荐第一个
    if (ips.length && !ips.some(i => i.recommended)) ips[0].recommended = true;
    return { success: true, data: ips };
  } catch (err) {
    return { success: false, message: err.message, data: [] };
  }
});

// IPC: 保存文件（报表导出等）
ipcMain.handle('save-file', async (event, { filename, content } = {}) => {
  try {
    const { canceled, filePath } = await dialog.showSaveDialog({
      defaultPath: filename || 'export.csv',
      filters: [
        { name: 'CSV 文件', extensions: ['csv'] },
        { name: '所有文件', extensions: ['*'] }
      ]
    });
    if (canceled || !filePath) return { success: false, canceled: true };
    fs.writeFileSync(filePath, content, 'utf8');
    return { success: true, path: filePath };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

// IPC: 服务器配置持久化（写入 userData 文件，避免 localStorage 丢失）
function getConfigPath() {
  return path.join(app.getPath('userData'), 'server-config.json');
}

ipcMain.handle('save-server-config', (event, { serverUrl } = {}) => {
  try {
    fs.writeFileSync(getConfigPath(), JSON.stringify({ serverUrl }), 'utf8');
    return { success: true };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle('get-server-config', () => {
  try {
    if (fs.existsSync(getConfigPath())) {
      return { success: true, data: JSON.parse(fs.readFileSync(getConfigPath(), 'utf8')) };
    }
    return { success: true, data: null };
  } catch (err) {
    return { success: false, message: err.message, data: null };
  }
});

// 通过 Windows 系统打印机静默打印 HTML 小票
async function printViaSystemPrinter(html, deviceName, paperWidth) {
  const win = new BrowserWindow({ show: false, width: 400, height: 700 });
  try {
    await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    // 测量内容高度，设置纸张长度（避免多走纸）
    const heightPx = await win.webContents.executeJavaScript('document.body.scrollHeight');
    const MICRONS_PER_PX = 25400 / 96;
    const customPageSize = {
      width: Math.round(paperWidth * 1000),
      height: Math.max(Math.round(heightPx * MICRONS_PER_PX) + 3000, 30000)
    };
    const baseOptions = {
      silent: true,
      deviceName: deviceName || '',
      printBackground: true,
      margins: { marginType: 'none' }
    };
    await new Promise((resolve, reject) => {
      // 先尝试自定义纸张尺寸，失败则退回默认纸张再试一次
      win.webContents.print({ ...baseOptions, pageSize: customPageSize }, (success, reason) => {
        if (success) return resolve();
        win.webContents.print(baseOptions, (ok, errReason) => {
          ok ? resolve() : reject(new Error(errReason || reason || '系统打印机打印失败，请确认打印机已安装且处于就绪状态'));
        });
      });
    });
  } finally {
    win.destroy();
  }
}

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
