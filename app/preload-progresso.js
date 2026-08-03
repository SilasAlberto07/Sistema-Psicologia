const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('updateAPI', {
    onProgresso: (callback) => {
        ipcRenderer.on('progresso-download', (event, percent) => callback(percent));
    }
});
