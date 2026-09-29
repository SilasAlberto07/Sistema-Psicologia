const path = require('path');
const { startBackupScheduler } = require('./backups/scheduler');
const { runBackup } = require('./backups/backupManager');

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const http = require('http');
const handler = require('serve-handler');
const fs = require('fs');
const Database = require('better-sqlite3');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const { criarSincronizacao } = require('./sync/sincronizacao');

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

// Sincronização entre computadores (Windows ↔ Mac) pela pasta do Google Drive
let sync = null;
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

    iniciarSincronizacao(pastaDados);
}

// ================================
// SINCRONIZAÇÃO ENTRE COMPUTADORES
// ================================
function avisarTelas(canal, dados) {
    BrowserWindow.getAllWindows().forEach((janela) => {
        if (!janela.isDestroyed()) janela.webContents.send(canal, dados);
    });
}

function iniciarSincronizacao(pastaDados) {
    try {
        sync = criarSincronizacao({
            db,
            log,
            pastaDadosApp: pastaDados,
            versaoApp: app.getVersion(),
            senha: process.env.BACKUP_PASSWORD,
            // antes da 1ª junção com outro computador, faz um backup completo
            fazerBackup: () => runBackup({
                dbPath: caminhoBancoAtual,
                dataDir: null,
                backupDir: pastaBackupAtual,
                password: process.env.BACKUP_PASSWORD,
            }),
            aoAtualizarDados: (info) => avisarTelas('sync-dados-atualizados', info),
        });
    } catch (err) {
        // se algo der errado aqui, o sistema continua funcionando normalmente, só sem sincronizar
        log.error('[sync] Não foi possível iniciar a sincronização:', err);
        sync = null;
    }
}

ipcMain.handle('sync-status', () => (sync ? sync.status() : { indisponivel: true }));

ipcMain.handle('sync-sincronizar-agora', async () => (sync ? sync.sincronizarAgora() : { indisponivel: true }));

ipcMain.handle('sync-usar-pasta-sugerida', async () => {
    if (!sync) return { indisponivel: true };
    const sugerida = sync.pastaSugerida();
    if (!sugerida) return sync.status();
    sync.definirPasta(sugerida);
    return sync.sincronizarAgora();
});

ipcMain.handle('sync-escolher-pasta', async (event) => {
    if (!sync) return { indisponivel: true };
    const janela = BrowserWindow.fromWebContents(event.sender) || janelaPai();
    const resultado = await dialog.showOpenDialog(janela, {
        title: 'Escolha a pasta de sincronização (dentro do Google Drive)',
        defaultPath: sync.pastaSugerida() || app.getPath('home'),
        properties: ['openDirectory', 'createDirectory'],
    });
    if (resultado.canceled || !resultado.filePaths.length) return sync.status();
    sync.definirPasta(resultado.filePaths[0]);
    return sync.sincronizarAgora();
});

ipcMain.handle('sync-desativar', () => {
    if (!sync) return { indisponivel: true };
    sync.definirPasta(null);
    return sync.status();
});

// Quando uma tela fecha, esquecemos o que ela tinha lido
app.on('web-contents-created', (event, contents) => {
    const idTela = contents.id;
    contents.once('destroyed', () => {
        if (sync) sync.esquecerTela(idTela);
    });
});

// ================================
// IPC — comunicação tela <-> banco
// ================================
ipcMain.handle('storage-get', (event, chave) => {
    // guarda o que esta tela leu (a sincronização usa isso para saber
    // exatamente o que a pessoa mudou quando ela mandar salvar)
    if (sync && sync.ehSincronizada(chave)) {
        sync.registrarLeitura(event.sender.id, chave);
    }
    const linha = db.prepare('SELECT valor FROM armazenamento WHERE chave = ?').get(chave);
    return linha ? linha.valor : null;
});

ipcMain.handle('storage-set', (event, chave, valor) => {
    if (sync && sync.ehSincronizada(chave)) {
        // pacientes/casais/financeiro: junta com o que já está salvo
        // (inclusive o que chegou do outro computador) em vez de sobrescrever
        sync.gravar(event.sender.id, chave, valor);
    } else {
        db.prepare(`
            INSERT INTO armazenamento (chave, valor) VALUES (?, ?)
            ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor
        `).run(chave, valor);
    }

    agendarBackupAposSalvar();
    return true;
});

ipcMain.handle('storage-remove', (event, chave) => {
    if (sync && sync.ehSincronizada(chave)) {
        // apagar a lista inteira apagaria também no outro computador — bloqueado por segurança
        log.warn(`[sync] storage-remove ignorado para a chave sincronizada "${chave}".`);
        return false;
    }
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
                public: path.join(__dirname, '..', 'public'),
                cleanUrls: false
            });
        });
        server.listen(0, '127.0.0.1', () => {
            resolve(server.address().port);
        });
    });
}

// guarda a porta do servidor já em execução, para o Mac poder reabrir
// uma janela nova (evento "activate") sem precisar recriar servidor/banco
let portaAtual = null;

function abrirJanela(porta) {
    log.info(`[janela] abrirJanela() chamada (porta ${porta})`);

    const nomeIcone = process.platform === 'win32' ? 'PsiLogo.ico' : 'PsiLogo.icns';

    mainWindow = new BrowserWindow({
        icon: path.join(__dirname, '..', 'build', nomeIcone),
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

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        log.error(`[janela] Falha ao carregar a página: ${errorCode} - ${errorDescription}`);
    });

    mainWindow.webContents.on('did-finish-load', () => {
        log.info('[janela] Página carregada com sucesso (did-finish-load)');
    });

    mainWindow.webContents.on('render-process-gone', (event, details) => {
        log.error('[janela] Processo de renderização morreu:', details);
    });

    mainWindow.on('unresponsive', () => {
        log.error('[janela] Janela ficou SEM RESPONDER (unresponsive)');
    });

    mainWindow.on('responsive', () => {
        log.info('[janela] Janela voltou a responder (responsive)');
    });

    mainWindow.on('closed', () => {
        log.info('[janela] Evento closed disparado');
        mainWindow = null;
    });

    log.info('[janela] Chamando loadURL...');
    mainWindow.loadURL(`http://127.0.0.1:${porta}/login.html`).catch((err) => {
        log.error('[janela] loadURL rejeitou a Promise:', err);
    });
    // mainWindow.webContents.openDevTools();

    mainWindow.maximize();

    mainWindow.once("ready-to-show", () => {
        log.info('[janela] ready-to-show disparado, chamando show()');
        mainWindow.show();
    });
}

async function criarJanela() {
    iniciarBanco();
    portaAtual = await iniciarServidor();
    abrirJanela(portaAtual);
}

// ================================
// ATUALIZAÇÃO AUTOMÁTICA (GitHub Releases)
// ================================
// Estado da atualização — evita baixar duas vezes, perguntar duas vezes etc.
let verificacaoManual = false;   // true quando o usuário clicou em "Verificar atualizações"
let baixandoAtualizacao = false; // download em andamento
let atualizacaoBaixada = false;  // já baixou, só falta instalar

function janelaPai() {
    return mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined;
}

function avisar(tipo, titulo, mensagem, detalhe) {
    return dialog.showMessageBox(janelaPai(), {
        type: tipo,
        title: titulo,
        message: mensagem,
        detail: detalhe,
        buttons: ['OK']
    });
}

function perguntarSeInstala() {
    return dialog.showMessageBox(janelaPai(), {
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
}

function fecharJanelaProgresso() {
    if (janelaProgresso && !janelaProgresso.isDestroyed()) {
        janelaProgresso.close();
    }
    janelaProgresso = null;
}

/**
 * Procura atualização no GitHub.
 * manual = true → mostra aviso mesmo quando não há nada novo ou quando dá erro.
 * manual = false (ao abrir o programa) → só aparece algo se tiver versão nova.
 */
async function verificarAtualizacao(manual = false) {
    if (!app.isPackaged) {
        log.info('[update] Verificação ignorada: app rodando em modo desenvolvimento (npm start).');
        if (manual) {
            await avisar('info', 'Atualizações',
                'A verificação de atualização só funciona no programa instalado.',
                'Você está rodando pelo "npm start" (modo desenvolvimento).');
        }
        return;
    }

    // Mac: sem assinatura da Apple o macOS não deixa o app se atualizar sozinho,
    // então lá a atualização é manual (abrir o instalador .pkg novo).
    if (process.platform === 'darwin') {
        log.info('[update] Verificação ignorada no Mac: atualização é manual.');
        if (manual) {
            await avisar('info', 'Atualizações',
                'No Mac, as atualizações são instaladas manualmente.',
                `Versão instalada: ${app.getVersion()}. Para atualizar, feche o programa e abra o instalador .pkg da nova versão.`);
        }
        return;
    }

    if (atualizacaoBaixada) {
        await perguntarSeInstala();
        return;
    }

    if (baixandoAtualizacao) {
        if (manual) {
            await avisar('info', 'Atualizações', 'A atualização já está sendo baixada.',
                'Aguarde o download terminar.');
        }
        return;
    }

    verificacaoManual = manual;
    try {
        await autoUpdater.checkForUpdates();
    } catch (err) {
        // O erro também dispara o evento 'error' abaixo, que mostra o aviso.
        log.error('[update] Falha ao verificar atualização:', err);
    }
}

autoUpdater.on('checking-for-update', () => {
    log.info('[update] Checando por atualização...');
});

autoUpdater.on('update-available', (info) => {
    log.info('[update] Atualização encontrada:', info.version);
    verificacaoManual = false;

    dialog.showMessageBox(janelaPai(), {
        type: 'info',
        title: 'Atualização disponível',
        message: `Uma nova versão (${info.version}) está disponível.`,
        detail: `Você está usando a versão ${app.getVersion()}. Deseja baixar agora?`,
        buttons: ['Baixar agora', 'Depois'],
        defaultId: 0,
        cancelId: 1
    }).then((result) => {
        if (result.response === 0 && !baixandoAtualizacao) {
            baixandoAtualizacao = true;
            criarJanelaProgresso();
            autoUpdater.downloadUpdate().catch((err) => {
                log.error('[update] Falha no download:', err);
            });
        }
    });
});

autoUpdater.on('update-not-available', (info) => {
    log.info('[update] Nenhuma atualização disponível. Versão atual já é a mais recente.', info);
    if (verificacaoManual) {
        verificacaoManual = false;
        avisar('info', 'Atualizações', 'Você já está usando a versão mais recente.',
            `Versão instalada: ${app.getVersion()}`);
    }
});

autoUpdater.on('download-progress', (progress) => {
    log.info(`[update] Baixando... ${Math.round(progress.percent)}%`);
    if (janelaProgresso && !janelaProgresso.isDestroyed()) {
        janelaProgresso.webContents.send('progresso-download', Math.round(progress.percent));
    }
});

autoUpdater.on('update-downloaded', () => {
    log.info('[update] Atualização baixada, perguntando ao usuário...');
    baixandoAtualizacao = false;
    atualizacaoBaixada = true;
    fecharJanelaProgresso();
    perguntarSeInstala();
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
        parent: janelaPai(),
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

    // Erro durante o download: fecha a barrinha e avisa sempre.
    if (baixandoAtualizacao) {
        baixandoAtualizacao = false;
        fecharJanelaProgresso();
        avisar('error', 'Atualização', 'Não foi possível baixar a atualização.',
            'Verifique a internet e tente de novo pelo botão "Verificar atualizações".');
        return;
    }

    // Erro ao verificar: só avisa se foi o usuário que pediu.
    if (verificacaoManual) {
        verificacaoManual = false;
        avisar('error', 'Atualização', 'Não foi possível verificar se há atualizações.',
            'Verifique a conexão com a internet e tente novamente.');
    }
});

// Botão "Verificar atualizações" do menu
ipcMain.handle('verificar-atualizacao', () => verificarAtualizacao(true));
ipcMain.handle('versao-app', () => app.getVersion());

app.whenReady().then(async () => {
    await criarJanela();
    verificarAtualizacao(false);
    if (sync) sync.iniciar();
});

app.on('window-all-closed', () => {
    log.info('[app] window-all-closed disparado. Plataforma:', process.platform);
    // No Mac, fechar a janela NÃO deve derrubar servidor/banco — o app
    // continua vivo no Dock (comportamento padrão) e pode reabrir uma
    // janela nova depois, através do evento "activate" logo abaixo.
    if (process.platform !== 'darwin') {
        encerrar();
    }
});

// Antes de fechar: envia as últimas alterações para o outro computador
let encerrando = false;
async function encerrar() {
    if (encerrando) return;
    encerrando = true;
    if (sync) {
        sync.parar();
        await sync.enviarAoFechar();
    }
    if (server) server.close();
    if (db && db.open) db.close();
    app.quit();
}

// Mac: clicou no ícone do Dock e não tem nenhuma janela aberta → reabre
// uma janela nova, reaproveitando o servidor/banco que já estão rodando.
app.on('activate', () => {
    const janelasAbertas = BrowserWindow.getAllWindows().length;
    log.info(`[app] activate disparado. Janelas abertas: ${janelasAbertas}. portaAtual: ${portaAtual}`);
    if (janelasAbertas === 0 && portaAtual) {
        abrirJanela(portaAtual);
    } else if (janelasAbertas === 0 && !portaAtual) {
        log.error('[app] activate disparou mas portaAtual está vazio — servidor pode não ter iniciado corretamente.');
    }
});

// Fecha servidor e banco só quando o app está realmente sendo encerrado
// de vez (Cmd+Q, ou "Sair" no menu do Dock) — não apenas ao fechar a janela.
app.on('before-quit', (event) => {
    log.info('[app] before-quit disparado');
    if (!encerrando) {
        // ainda não enviou as últimas alterações (ex.: Cmd+Q no Mac, ou instalar atualização)
        event.preventDefault();
        encerrar();
        return;
    }
    if (server) server.close();
    if (db && db.open) db.close();
});