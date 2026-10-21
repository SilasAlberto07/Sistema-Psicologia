const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('storage', {
    getItem: (chave) => ipcRenderer.invoke('storage-get', chave),
    setItem: (chave, valor) => ipcRenderer.invoke('storage-set', chave, valor),
    removeItem: (chave) => ipcRenderer.invoke('storage-remove', chave)
});

// Login: a tela só pergunta; quem confere a senha é o processo principal
contextBridge.exposeInMainWorld('auth', {
    estado: () => ipcRenderer.invoke('auth-estado'),
    criar: (nova, confirmar, resposta) => ipcRenderer.invoke('auth-criar', nova, confirmar, resposta),
    entrar: (senha) => ipcRenderer.invoke('auth-entrar', senha),
    trocar: (atual, nova, confirmar) => ipcRenderer.invoke('auth-trocar', atual, nova, confirmar),
    redefinir: (resposta) => ipcRenderer.invoke('auth-redefinir', resposta),
    sair: () => ipcRenderer.invoke('auth-sair')
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
