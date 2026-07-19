const { app, BrowserWindow, ipcMain } = require('electron');
const http = require('http');
const handler = require('serve-handler');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

let mainWindow;
let server;
let db;

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

    fazerBackup(caminhoBanco);
}

// ================================
// BACKUP AUTOMÁTICO (mantém os últimos 10)
// ================================
function fazerBackup(caminhoBanco) {
    const pastaBackup = path.join(app.getPath('userData'), 'backups');
    if (!fs.existsSync(pastaBackup)) fs.mkdirSync(pastaBackup, { recursive: true });

    const agora = new Date().toISOString().replace(/[:.]/g, '-');
    const destino = path.join(pastaBackup, `sistema-${agora}.db`);

    fs.copyFileSync(caminhoBanco, destino);

    // limpa backups antigos, mantendo só os 10 mais recentes
    const arquivos = fs.readdirSync(pastaBackup)
        .filter(f => f.endsWith('.db'))
        .map(f => ({ nome: f, tempo: fs.statSync(path.join(pastaBackup, f)).mtimeMs }))
        .sort((a, b) => b.tempo - a.tempo);

    arquivos.slice(10).forEach(f => fs.unlinkSync(path.join(pastaBackup, f.nome)));
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
    return true;
});

ipcMain.handle('storage-remove', (event, chave) => {
    db.prepare('DELETE FROM armazenamento WHERE chave = ?').run(chave);
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
    }
    );
}

app.whenReady().then(criarJanela);

    app.on('window-all-closed', () => {
        if (server) server.close();
        if (db) db.close();
        if (process.platform !== 'darwin') app.quit();
    });