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

// Senha que criptografa backups e sincronização (fica no cofre do sistema)
contextBridge.exposeInMainWorld('senhaBackup', {
    status: () => ipcRenderer.invoke('backup-senha-status'),
    definir: (senha, confirmar) => ipcRenderer.invoke('backup-senha-definir', senha, confirmar),
    trocar: (senhaLogin, nova, confirmar) => ipcRenderer.invoke('backup-senha-trocar', senhaLogin, nova, confirmar)
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

// Backup e restauração (tela de Configurações)
contextBridge.exposeInMainWorld('backup', {
    listar: () => ipcRenderer.invoke('backup-listar'),
    fazerAgora: () => ipcRenderer.invoke('backup-fazer-agora'),
    conferirSenha: (senha) => ipcRenderer.invoke('backup-conferir-senha', senha),
    abrirPasta: (senha) => ipcRenderer.invoke('backup-abrir-pasta', senha),
    escolherArquivo: () => ipcRenderer.invoke('backup-escolher-arquivo'),
    restaurar: (arquivo, senhaDoArquivo, senhaConfirmacao) =>
        ipcRenderer.invoke('backup-restaurar', arquivo, senhaDoArquivo, senhaConfirmacao)
});
