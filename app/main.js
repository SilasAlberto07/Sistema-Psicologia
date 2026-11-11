const path = require('path');
const { startBackupScheduler } = require('./backups/scheduler');
const { runBackup } = require('./backups/backupManager');
const { listarBackups, lerBackup, descreverArquivo } = require('./backups/restaurar');
const M = require('./sync/merge');

const { app, BrowserWindow, ipcMain, dialog, Menu, session, safeStorage, shell } = require('electron');
const http = require('http');
const handler = require('serve-handler');
const fs = require('fs');
const Database = require('better-sqlite3');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const { criarSincronizacao } = require('./sync/sincronizacao');
const { criarAutenticacao } = require('./auth');
const { criarSenhaBackup } = require('./senhaBackup');

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
let auth; // controle do login (ver app/auth.js)
let senhaBackup; // senha dos backups, guardada no cofre do sistema (ver app/senhaBackup.js)

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
            password: senhaBackup.obter(),
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

    auth = criarAutenticacao({ db, log });
    senhaBackup = criarSenhaBackup({ app, safeStorage, log });

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
        obterSenha: () => senhaBackup.obter(),
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
            senha: () => senhaBackup.obter(), // lida na hora (pode ser configurada depois)
            senhasConhecidas: () => senhaBackup.todas(), // atual + antigas (depois de trocar)
            // antes da 1ª junção com outro computador, faz um backup completo
            fazerBackup: () => runBackup({
                dbPath: caminhoBancoAtual,
                dataDir: null,
                backupDir: pastaBackupAtual,
                password: senhaBackup.obter(),
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
// ================================
// LOGIN — as telas pedem, o processo principal decide
// ================================
ipcMain.handle('auth-estado', () => auth.estado());
ipcMain.handle('auth-criar', (event, nova, confirmar, resposta) => auth.criarSenha(nova, confirmar, resposta));
ipcMain.handle('auth-entrar', (event, senha) => auth.entrar(senha));
ipcMain.handle('auth-trocar', (event, atual, nova, confirmar) => auth.trocarSenha(atual, nova, confirmar));
ipcMain.handle('auth-redefinir', (event, resposta) => auth.redefinirComResposta(resposta));
ipcMain.handle('auth-sair', () => { auth.sair(); return true; });

// ================================
// SENHA DO BACKUP — tela de Configurações
// ================================
function fazerBackupAgora() {
    runBackup({
        dbPath: caminhoBancoAtual,
        dataDir: null,
        backupDir: pastaBackupAtual,
        password: senhaBackup.obter(),
    }).catch((err) => log.error('[backup] Falha no backup após configurar a senha:', err));
}

ipcMain.handle('backup-senha-status', () => {
    if (!auth.estaAutenticado()) return null;
    const st = senhaBackup.status();
    const stSync = sync ? sync.status() : null;
    return {
        ...st,
        sincronizacaoAtiva: !!(stSync && stSync.ativa),
        // o outro computador usa uma senha que este não conhece (foi trocada lá?)
        senhaDiferenteDoOutro: !!(stSync && stSync.senhaDiferente),
    };
});

// Primeira vez neste computador: só salva se for a MESMA senha do outro computador
ipcMain.handle('backup-senha-definir', async (event, senha, confirmar) => {
    if (!auth.estaAutenticado()) return { ok: false, erro: 'Faça login novamente.' };
    if (senhaBackup.obter()) return { ok: false, erro: 'A senha do backup já está configurada neste computador.' };
    if (typeof senha !== 'string' || !senha) return { ok: false, erro: 'Digite a senha do backup.' };
    if (senha !== confirmar) return { ok: false, erro: 'As senhas não coincidem.' };

    // confere ANTES de salvar (só lê o arquivo do outro computador, não grava nada)
    let conferencia = { resultado: 'sem-pasta' };
    if (sync) conferencia = await sync.testarSenha(senha);
    if (conferencia.resultado === 'diferente') {
        return { ok: false, erro: 'Essa senha não é a mesma do outro computador. Nada foi salvo. Confira e digite de novo.' };
    }
    if (conferencia.resultado === 'pasta-inacessivel') {
        return { ok: false, erro: 'Não consegui abrir a pasta de sincronização para conferir a senha. Verifique se o Google Drive está aberto e tente de novo.' };
    }

    const resultado = senhaBackup.definir(senha, confirmar);
    if (!resultado.ok) return resultado;

    if (sync) await sync.sincronizarAgora();
    fazerBackupAgora();
    return { ok: true, conferida: conferencia.resultado === 'confere' };
});

/**
 * Trocar a senha do backup (também serve para quem ESQUECEU a senha:
 * em vez da senha antiga, pede a senha de login).
 *   - Se a senha nova é a que o outro computador já usa → só "iguala" este.
 *   - Se o outro computador ainda usa a senha de antes → este passa a usar a
 *     nova, e o outro vai pedir para digitar a mesma senha nova.
 *   - Se o outro computador usa uma senha que este não conhece e a digitada
 *     também não abre → recusa (seria a senha errada).
 */
ipcMain.handle('backup-senha-trocar', async (event, senhaLogin, nova, confirmar) => {
    if (!auth.estaAutenticado()) return { ok: false, erro: 'Faça login novamente.' };

    const login = await auth.conferirSenha(senhaLogin);
    if (!login.ok) return login;

    if (typeof nova !== 'string' || !nova) return { ok: false, erro: 'Digite a nova senha do backup.' };
    if (nova !== confirmar) return { ok: false, erro: 'As senhas não coincidem.' };
    if (nova === senhaBackup.obter()) {
        return { ok: false, erro: 'Essa já é a senha do backup deste computador.' };
    }

    let modo = 'trocar';
    if (sync) {
        const comNova = await sync.testarSenha(nova);
        if (comNova.resultado === 'pasta-inacessivel') {
            return { ok: false, erro: 'Não consegui abrir a pasta de sincronização para conferir a senha. Verifique se o Google Drive está aberto e tente de novo.' };
        }
        if (comNova.resultado === 'confere') {
            modo = 'igualar';
        } else if (comNova.resultado === 'diferente') {
            const comConhecidas = await sync.testarSenhasConhecidas();
            if (comConhecidas.resultado !== 'confere') {
                return { ok: false, erro: 'Essa senha não é a que o outro computador está usando. Digite a mesma senha do outro computador. Nada foi alterado.' };
            }
        }
    }

    if (modo === 'trocar' && nova.length < 8) {
        return { ok: false, erro: 'A nova senha do backup precisa ter pelo menos 8 caracteres.' };
    }

    const resultado = senhaBackup.trocar(nova);
    if (!resultado.ok) return resultado;

    if (sync) await sync.sincronizarAgora();
    fazerBackupAgora(); // backup novo já com a senha nova
    return { ok: true, modo, temOutroComputador: !!(sync && sync.status().outrosComputadores.length) };
});

// ================================
// BACKUP E RESTAURAÇÃO — tela de Configurações
// ================================
// "runBackup" devolve null quando já tem outro backup rodando. Aqui
// esperamos ele terminar e fazemos o nosso, para ter certeza de que o
// backup foi feito de verdade.
async function backupGarantido(prefixo = 'backup') {
    const senha = senhaBackup.obter();
    if (!senha) throw new Error('SEM_SENHA');
    for (let tentativa = 0; tentativa < 180; tentativa++) {
        const caminho = await runBackup({
            dbPath: caminhoBancoAtual,
            dataDir: null,
            backupDir: pastaBackupAtual,
            password: senha,
            prefixo,
        });
        if (caminho) return caminho;
        await new Promise((r) => setTimeout(r, 1000));
    }
    throw new Error('Não foi possível fazer o backup agora (outro backup demorou demais).');
}

// arquivos escolhidos pela janela "Escolher arquivo..." (só esses podem ser
// restaurados além dos que estão na pasta de backups)
const arquivosEscolhidos = new Set();

function caminhoDoBackupPedido(pedido) {
    if (!pedido) return null;
    if (arquivosEscolhidos.has(pedido)) return pedido;
    const nome = path.basename(String(pedido));
    const caminho = path.join(pastaBackupAtual, nome);
    const daLista = listarBackups(pastaBackupAtual).some((b) => b.nome === nome);
    return daLista ? caminho : null;
}

ipcMain.handle('backup-listar', () => {
    if (!auth.estaAutenticado()) return null;
    return {
        pasta: pastaBackupAtual,
        senhaConfigurada: !!senhaBackup.obter(),
        backups: listarBackups(pastaBackupAtual),
    };
});

ipcMain.handle('backup-fazer-agora', async () => {
    if (!auth.estaAutenticado()) return { ok: false, erro: 'Faça login novamente.' };
    try {
        const caminho = await backupGarantido();
        return { ok: true, backup: descreverArquivo(caminho) };
    } catch (err) {
        log.error('[backup] Falha no backup pedido em Configurações:', err);
        return {
            ok: false,
            erro: err.message === 'SEM_SENHA'
                ? 'Configure a senha do backup (logo abaixo, nesta tela) antes de fazer backups.'
                : 'Não foi possível fazer o backup. Tente de novo em alguns segundos.',
        };
    }
});

// confere a senha do backup antes de mostrar a confirmação de restaurar
ipcMain.handle('backup-conferir-senha', (event, senha) => {
    if (!auth.estaAutenticado()) return { ok: false, erro: 'Faça login novamente.' };
    return senhaBackup.conferir(senha);
});

ipcMain.handle('backup-abrir-pasta', async (event, senha) => {
    if (!auth.estaAutenticado()) return { ok: false, erro: 'Faça login novamente.' };
    const conferencia = senhaBackup.conferir(senha);
    if (!conferencia.ok) return conferencia;
    fs.mkdirSync(pastaBackupAtual, { recursive: true });
    await shell.openPath(pastaBackupAtual);
    return { ok: true };
});

ipcMain.handle('backup-escolher-arquivo', async (event) => {
    if (!auth.estaAutenticado()) return null;
    const janela = BrowserWindow.fromWebContents(event.sender) || janelaPai();
    const resultado = await dialog.showOpenDialog(janela, {
        title: 'Escolha o arquivo de backup (.bak)',
        defaultPath: fs.existsSync(pastaBackupAtual) ? pastaBackupAtual : app.getPath('home'),
        filters: [{ name: 'Backup do Sistema Psicologia', extensions: ['bak'] }],
        properties: ['openFile'],
    });
    if (resultado.canceled || !resultado.filePaths.length) return null;
    const caminho = resultado.filePaths[0];
    arquivosEscolhidos.add(caminho);
    return descreverArquivo(caminho);
});

/**
 * Restaura um backup SEM perder nada:
 *   1. faz uma cópia de segurança dos dados atuais ("antes-de-restaurar-....bak",
 *      que nunca é apagada pela limpeza automática);
 *   2. junta o backup com os dados atuais: o que está no backup volta, e o que
 *      foi criado depois dele continua lá (ver uniaoParaRestaurar em merge.js);
 *   3. a senha de login deste computador não muda.
 * "senhaDoArquivo" só é usada quando o backup foi feito com outra senha.
 */
let restaurando = false;

function unirValorSimples(atual, backup) {
    // mesma ideia do merge, para chaves que não são sincronizadas
    if (Array.isArray(atual) || Array.isArray(backup) || atual === null || backup === null ||
        typeof atual !== 'object' || typeof backup !== 'object') {
        return backup;
    }
    const r = { ...atual };
    Object.keys(backup).forEach((k) => {
        r[k] = Object.prototype.hasOwnProperty.call(atual, k) ? unirValorSimples(atual[k], backup[k]) : backup[k];
    });
    return r;
}

ipcMain.handle('backup-restaurar', async (event, pedido, senhaDoArquivo, senhaConfirmacao) => {
    if (!auth.estaAutenticado()) return { ok: false, erro: 'Faça login novamente.' };

    // proteção contra acidente: só restaura com a senha do backup
    const conferencia = senhaBackup.conferir(senhaConfirmacao);
    if (!conferencia.ok) return { ok: false, senhaConfirmacaoErrada: true, erro: conferencia.erro };
    if (restaurando) return { ok: false, erro: 'Já existe uma restauração em andamento.' };

    const arquivo = caminhoDoBackupPedido(pedido);
    if (!arquivo || !fs.existsSync(arquivo)) {
        return { ok: false, erro: 'Arquivo de backup não encontrado.' };
    }
    if (!senhaBackup.obter()) {
        return { ok: false, erro: 'Configure a senha do backup (logo abaixo, nesta tela) antes de restaurar.' };
    }

    restaurando = true;
    let aplicando = false;
    try {
        // 1) abre o backup (antes de mexer em qualquer coisa)
        let conteudo;
        try {
            // sem senha digitada: tenta a atual e as antigas (backups de antes de uma troca)
            const tentativas = senhaDoArquivo ? [senhaDoArquivo] : senhaBackup.todas();
            let ultimoErro = new Error('SENHA_INCORRETA');
            for (const s of tentativas) {
                try {
                    conteudo = lerBackup(arquivo, s);
                    break;
                } catch (e) {
                    ultimoErro = e;
                    if (e.message !== 'SENHA_INCORRETA') break;
                }
            }
            if (!conteudo) throw ultimoErro;
        } catch (err) {
            if (err.message === 'SENHA_INCORRETA') {
                return { ok: false, precisaSenha: true,
                    erro: senhaDoArquivo ? 'Essa senha também não abre o backup.' : null };
            }
            if (err.message === 'ARQUIVO_INVALIDO') {
                return { ok: false, erro: 'Esse arquivo não é um backup do sistema ou está danificado.' };
            }
            throw err;
        }

        // 2) cópia de segurança dos dados atuais
        const copia = await backupGarantido('antes-de-restaurar');
        log.info(`[restaurar] Cópia de segurança antes de restaurar: ${copia}`);

        // 3) aplica, chave por chave
        aplicando = true;
        let alteracoes = 0;
        const lerAtual = db.prepare('SELECT valor FROM armazenamento WHERE chave = ?');
        const gravarAtual = db.prepare(`
            INSERT INTO armazenamento (chave, valor) VALUES (?, ?)
            ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor
        `);

        for (const { chave, valor } of conteudo.linhas) {
            if (auth.chaveProtegida(chave)) continue; // senha de login fica a deste computador

            let valorBackup;
            let textoPuro = false; // valor salvo como texto simples (não JSON)
            try { valorBackup = JSON.parse(valor); } catch (_) { valorBackup = valor; textoPuro = true; }

            if (sync && sync.ehSincronizada(chave)) {
                alteracoes += sync.restaurarChave(chave, valorBackup ?? [], conteudo.metas[chave] || null);
                continue;
            }

            const linha = lerAtual.get(chave);
            let textoNovo = valor;
            if (linha && !textoPuro) {
                let valorAtual;
                try { valorAtual = JSON.parse(linha.valor); } catch (_) { valorAtual = linha.valor; }
                if (['pacientes', 'casais', 'financeiro'].includes(chave)) {
                    // sincronização desligada por erro: junta as listas item por item mesmo assim
                    const preparado = M.prepararChave(chave, valorAtual ?? [], null);
                    const { novo } = M.uniaoParaRestaurar(chave, preparado.valor, preparado.meta,
                        valorBackup ?? [], conteudo.metas[chave] || null);
                    textoNovo = JSON.stringify(novo);
                } else {
                    textoNovo = JSON.stringify(unirValorSimples(valorAtual, valorBackup));
                }
            }
            if (!linha || linha.valor !== textoNovo) {
                gravarAtual.run(chave, textoNovo);
                alteracoes++;
            }
        }

        log.info(`[restaurar] Backup restaurado (${path.basename(arquivo)}): ${alteracoes} alteração(ões).`);
        if (alteracoes > 0) agendarBackupAposSalvar();

        return { ok: true, alteracoes, copia: descreverArquivo(copia), backup: descreverArquivo(arquivo) };
    } catch (err) {
        log.error('[restaurar] Falha ao restaurar backup:', err);
        return {
            ok: false,
            erro: err.message === 'SEM_SENHA'
                ? 'Configure a senha do backup antes de restaurar.'
                : aplicando
                    ? 'A restauração parou no meio. Os dados de antes estão guardados na cópia "antes de restaurar", na pasta de backups.'
                    : 'Não foi possível restaurar o backup. Nada foi alterado nos seus dados.',
        };
    } finally {
        restaurando = false;
    }
});

/**
 * Só entrega/aceita dados se a pessoa fez login, e nunca deixa as telas
 * mexerem diretamente nos hashes de senha. É isso que torna o login uma
 * proteção de verdade, e não só uma tela na frente do sistema.
 */
function acessoPermitido(chave) {
    if (!auth || !auth.estaAutenticado()) return false;
    if (auth.chaveProtegida(chave)) return false;
    return true;
}

ipcMain.handle('storage-get', (event, chave) => {
    if (!acessoPermitido(chave)) {
        log.warn(`[auth] Leitura negada para "${chave}" (sem login ou chave protegida).`);
        return null;
    }
    // guarda o que esta tela leu (a sincronização usa isso para saber
    // exatamente o que a pessoa mudou quando ela mandar salvar)
    if (sync && sync.ehSincronizada(chave)) {
        sync.registrarLeitura(event.sender.id, chave);
    }
    const linha = db.prepare('SELECT valor FROM armazenamento WHERE chave = ?').get(chave);
    return linha ? linha.valor : null;
});

ipcMain.handle('storage-set', (event, chave, valor) => {
    if (!acessoPermitido(chave)) {
        log.warn(`[auth] Gravação negada para "${chave}" (sem login ou chave protegida).`);
        return false;
    }
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
    if (!acessoPermitido(chave)) {
        log.warn(`[auth] Remoção negada para "${chave}" (sem login ou chave protegida).`);
        return false;
    }
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
            // DevTools (Ctrl+Shift+I) só no modo desenvolvimento (npm start).
            // No programa instalado ele daria acesso direto aos dados.
            devTools: !app.isPackaged,
            // liga o leitor de PDF embutido (usado para abrir os documentos anexados no prontuário)
            plugins: true,
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
                    devTools: !app.isPackaged,
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

/**
 * Sem login, qualquer página do sistema (index.html, pacientes.html...)
 * é redirecionada para o login.html. Assim não adianta tentar abrir uma
 * tela direto pelo endereço.
 */
function protegerPaginas(porta) {
    session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
        try {
            const url = new URL(details.url);
            const ehDoSistema = url.hostname === '127.0.0.1' && Number(url.port) === porta;
            const ehPagina = url.pathname.toLowerCase().endsWith('.html');
            const ehLogin = url.pathname.toLowerCase() === '/login.html';

            if (ehDoSistema && ehPagina && !ehLogin && !auth.estaAutenticado()) {
                return callback({ redirectURL: `http://127.0.0.1:${porta}/login.html` });
            }
        } catch (err) {
            log.error('[auth] Erro ao conferir a página pedida:', err);
        }
        callback({});
    });
}

/**
 * No programa instalado tiramos o menu padrão do Electron, que tem
 * "Toggle Developer Tools". No Mac mantemos um menu mínimo, porque sem
 * ele param de funcionar atalhos como Cmd+C, Cmd+V e Cmd+Q.
 */
function configurarMenu() {
    if (!app.isPackaged) return; // em desenvolvimento fica o menu completo

    if (process.platform === 'darwin') {
        Menu.setApplicationMenu(Menu.buildFromTemplate([
            { role: 'appMenu' },
            { role: 'editMenu' },
            { role: 'windowMenu' },
        ]));
    } else {
        Menu.setApplicationMenu(null);
    }
}

async function criarJanela() {
    configurarMenu();
    iniciarBanco();
    portaAtual = await iniciarServidor();
    protegerPaginas(portaAtual);
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

// Documentos do paciente: transforma a página de impressão aberta em PDF
// (o PDF fica guardado no cadastro do paciente, e a impressão continua normal)
ipcMain.handle('documento-gerar-pdf', async (event) => {
    if (!auth || !auth.estaAutenticado()) return null;
    try {
        const pdf = await event.sender.printToPDF({
            printBackground: true,
            pageSize: 'A4',          // todos os documentos são em folha A4
            preferCSSPageSize: true
        });
        return pdf.toString('base64');
    } catch (err) {
        log.error('[documentos] Falha ao gerar PDF:', err);
        return null;
    }
});

// Atividades Terapêuticas: botão "Abrir ChatGPT".
// Abre no navegador do computador (fora do programa), e SOMENTE este endereço —
// a tela não consegue pedir para abrir outro site por aqui.
const ENDERECO_CHATGPT = 'https://chatgpt.com';
ipcMain.handle('abrir-chatgpt', async () => {
    try {
        await shell.openExternal(ENDERECO_CHATGPT);
        return true;
    } catch (err) {
        log.error('[atividades] Não foi possível abrir o ChatGPT:', err);
        return false;
    }
});

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
        if (auth) auth.sair(); // janela nova = pede a senha de novo
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
