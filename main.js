const path = require('path');
const { startBackupScheduler } = require('./src/backups/scheduler');
const { runBackup } = require('./src/backups/backupManager');

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const http = require('http');
const handler = require('serve-handler');
const fs = require('fs');
const Database = require('better-sqlite3');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
autoUpdater.autoDownload = false; // não baixa sozinho — só depois que o usuário confirmar
autoUpdater.disableWebInstaller = true; // não usamos web installer, evita o aviso nos logs
log.info('=== App iniciado, versão:', app.getVersion(), '===');

// ================================
// REDE DE SEGURANÇA — evita que um erro não previsto derrube o app
// inteiro com aquele popup assustador. Registra no log e segue rodando.
// ================================
process.on('uncaughtException', (err) => {
    log.error('[uncaughtException] Erro não tratado (app continuou rodando):', err);
});

process.on('unhandledRejection', (motivo) => {
    log.error('[unhandledRejection] Promise rejeitada sem tratamento:', motivo);
});

let janelaProgresso = null;

app.setName("Sistema Psicologia");

let mainWindow;
let server;
let db;

// Guardados aqui para serem reutilizados pelo backup disparado a cada salvamento
let caminhoBancoAtual;
let pastaBackupAtual;
let timerBackupDebounce = null;

/**
 * Dispara um backup criptografado alguns segundos depois do último
 * salvamento (evita rodar um backup para cada tecla digitada — só roda
 * quando a pessoa realmente parou de mexer no sistema).
 */
function agendarBackupAposSalvar() {
    if (!caminhoBancoAtual || !pastaBackupAtual) return;

    clearTimeout(timerBackupDebounce);
    timerBackupDebounce = setTimeout(() => {
        runBackup({
            dbPath: caminhoBancoAtual,
            dataDir: null,
            backupDir: pastaBackupAtual,
            password: process.env.BACKUP_PASSWORD,
        }).catch((err) => log.error('[backup] Falha no backup após salvar:', err));
    }, 20000); // espera 20s de "silêncio" antes de rodar — dá tempo do backup inicial terminar
}

// ================================
// BANCO DE DADOS
// ================================
function iniciarBanco() {
    const pastaDados = path.join(app.getPath('userData'), 'dados');
    if (!fs.existsSync(pastaDados)) fs.mkdirSync(pastaDados, { recursive: true });

    const caminhoBanco = path.join(pastaDados, 'sistema.db');
    db = new Database(caminhoBanco);

    db.exec(`
        CREATE TABLE IF NOT EXISTS armazenamento (
            chave TEXT PRIMARY KEY,
            valor TEXT
        )
    `);

    caminhoBancoAtual = caminhoBanco;
    // Pasta na Área de Trabalho do usuário logado (funciona tanto no seu PC quanto no notebook dela).
    // Você só precisa criar uma pasta com ESSE MESMO NOME na Área de Trabalho e sincronizá-la com o Google Drive.
    pastaBackupAtual = path.join(app.getPath('desktop'), 'Backups-Sistema-Psicologia');

    // Backup automático, criptografado, direto na pasta sincronizada com o Google Drive.
    // Além disso, roda logo depois de cada salvamento (ver agendarBackupAposSalvar).
    // O agendamento por hora fica como uma segunda camada de segurança (caso o
    // sistema fique aberto muito tempo sem ninguém salvar nada).
    startBackupScheduler({
        dbPath: caminhoBanco,
        dataDir: null, // não há pasta separada de anexos hoje; deixe null
        backupDir: pastaBackupAtual,
        cronExpr: '0 */6 * * *',
    });
}

// ================================
// IPC — comunicação tela <-> banco
// ================================
ipcMain.handle('storage-get', (event, chave) => {
    const linha = db.prepare('SELECT valor FROM armazenamento WHERE chave = ?').get(chave);
    return linha ? linha.valor : null;
});

ipcMain.handle('storage-set', (event, chave, valor) => {
    db.prepare(`
        INSERT INTO armazenamento (chave, valor) VALUES (?, ?)
        ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor
    `).run(chave, valor);

    agendarBackupAposSalvar();
    return true;
});

ipcMain.handle('storage-remove', (event, chave) => {
    db.prepare('DELETE FROM armazenamento WHERE chave = ?').run(chave);

    agendarBackupAposSalvar();
    return true;
});

// ================================
// SERVIDOR + JANELA (igual já era)
// ================================
function iniciarServidor() {
    return new Promise((resolve) => {
        server = http.createServer((req, res) => {
            return handler(req, res, {
                public: __dirname,
                cleanUrls: false
            });
        });
        server.listen(0, '127.0.0.1', () => {
            resolve(server.address().port);
        });
    });
}

async function criarJanela() {
    iniciarBanco();
    const porta = await iniciarServidor();

    mainWindow = new BrowserWindow({
        icon: path.join(__dirname, 'build', 'PsiLogo.ico'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        return {
            action: 'allow',
            overrideBrowserWindowOptions: {
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true,
                    preload: path.join(__dirname, 'preload.js')
                }
            }
        };
    });

    mainWindow.loadURL(`http://127.0.0.1:${porta}/login.html`);
    // mainWindow.webContents.openDevTools();

    mainWindow.maximize();

    mainWindow.once("ready-to-show", () => {
        mainWindow.show();
    });
}

// ================================
// ATUALIZAÇÃO AUTOMÁTICA (GitHub Releases)
// ================================
autoUpdater.on('checking-for-update', () => {
    log.info('[update] Checando por atualização...');
});

autoUpdater.on('update-available', (info) => {
    log.info('[update] Atualização encontrada:', info.version);

    dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Atualização disponível',
        message: `Uma nova versão (${info.version}) está disponível.`,
        detail: 'Deseja baixar agora?',
        buttons: ['Baixar agora', 'Depois'],
        defaultId: 0,
        cancelId: 1
    }).then((result) => {
        if (result.response === 0) {
            criarJanelaProgresso();
            autoUpdater.downloadUpdate();
        }
    });
});

autoUpdater.on('update-not-available', (info) => {
    log.info('[update] Nenhuma atualização disponível. Versão atual já é a mais recente.', info);
});

autoUpdater.on('download-progress', (progress) => {
    log.info(`[update] Baixando... ${Math.round(progress.percent)}%`);
    if (janelaProgresso) {
        janelaProgresso.webContents.send('progresso-download', Math.round(progress.percent));
    }
});

autoUpdater.on('update-downloaded', () => {
    log.info('[update] Atualização baixada, perguntando ao usuário...');
    if (janelaProgresso) {
        janelaProgresso.close();
        janelaProgresso = null;
    }
    dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Atualização pronta',
        message: 'A atualização foi baixada com sucesso.',
        detail: 'Deseja instalar agora? O programa vai fechar e abrir de novo sozinho.',
        buttons: ['Instalar agora', 'Depois'],
        defaultId: 0,
        cancelId: 1
    }).then((result) => {
        if (result.response === 0) {
            autoUpdater.quitAndInstall();
        }
    });
});

/**
 * Cria uma janelinha simples só para mostrar a barra de progresso do download.
 */
function criarJanelaProgresso() {
    janelaProgresso = new BrowserWindow({
        width: 380,
        height: 160,
        resizable: false,
        minimizable: false,
        maximizable: false,
        title: 'Baixando atualização',
        parent: mainWindow,
        webPreferences: {
            contextIsolation: true,
            preload: path.join(__dirname, 'preload-progresso.js')
        }
    });

    janelaProgresso.setMenu(null);
    janelaProgresso.loadFile(path.join(__dirname, 'progresso.html'));
}

autoUpdater.on('error', (err) => {
    log.error('[update] Erro no auto-updater:', err);
});

app.whenReady().then(() => {
    criarJanela();
    autoUpdater.checkForUpdates();
});

app.on('window-all-closed', () => {
    if (server) server.close();
    if (db) db.close();
    if (process.platform !== 'darwin') app.quit();
});