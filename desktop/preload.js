const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  printReceipt: (data) => ipcRenderer.invoke('print-receipt', data),
  testPrint: (data) => ipcRenderer.invoke('test-print', data),
  testConnection: (data) => ipcRenderer.invoke('test-connection', data),
  getPrinters: () => ipcRenderer.invoke('get-system-printers'),
  getLanIp: () => ipcRenderer.invoke('get-lan-ip'),
  saveFile: (data) => ipcRenderer.invoke('save-file', data),
  saveServerConfig: (data) => ipcRenderer.invoke('save-server-config', data),
  getServerConfig: () => ipcRenderer.invoke('get-server-config')
});
