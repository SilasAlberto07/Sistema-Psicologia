const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('storage', {
    getItem: (chave) => ipcRenderer.invoke('storage-get', chave),
    setItem: (chave, valor) => ipcRenderer.invoke('storage-set', chave, valor),
    removeItem: (chave) => ipcRenderer.invoke('storage-remove', chave)
});