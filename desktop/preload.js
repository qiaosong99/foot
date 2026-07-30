const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  printReceipt: (data) => ipcRenderer.invoke('print-receipt', data),
  testPrint: (data) => ipcRenderer.invoke('test-print', data)
});
