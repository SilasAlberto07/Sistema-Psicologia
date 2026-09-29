const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('storage', {
    getItem: (chave) => ipcRenderer.invoke('storage-get', chave),
    setItem: (chave, valor) => ipcRenderer.invoke('storage-set', chave, valor),
    removeItem: (chave) => ipcRenderer.invoke('storage-remove', chave)
});

contextBridge.exposeInMainWorld('atualizacao', {
    verificar: () => ipcRenderer.invoke('verificar-atualizacao'),
    versao: () => ipcRenderer.invoke('versao-app'),
    plataforma: process.platform
});

contextBridge.exposeInMainWorld('sincronizacao', {
    status: () => ipcRenderer.invoke('sync-status'),
    sincronizarAgora: () => ipcRenderer.invoke('sync-sincronizar-agora'),
    usarPastaSugerida: () => ipcRenderer.invoke('sync-usar-pasta-sugerida'),
    escolherPasta: () => ipcRenderer.invoke('sync-escolher-pasta'),
    desativar: () => ipcRenderer.invoke('sync-desativar'),
    // avisa a tela quando chegam dados do outro computador
    aoAtualizarDados: (callback) => {
        ipcRenderer.on('sync-dados-atualizados', (event, info) => callback(info));
    }
});
