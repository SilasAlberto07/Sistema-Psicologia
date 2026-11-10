/**
 * restaurar.js
 * -----------------------------------------------------------------------
 * Restauração de backup feita pela tela de Configurações (sem linha de
 * comando). Aqui ficam só as partes de LER o backup:
 *
 *   listarBackups(pasta)        → backups encontrados, do mais novo ao mais antigo
 *   lerBackup(arquivo, senha)   → abre o .bak e devolve os dados que estão nele
 *
 * Quem aplica os dados no banco é o main.js (ver "RESTAURAR BACKUP"), sempre:
 *   1. fazendo antes uma cópia de segurança dos dados atuais;
 *   2. sem apagar nada que exista agora (o que é novo continua lá).
 *
 * Nenhum arquivo do backup fica sem criptografia no disco: o banco é aberto
 * numa pasta temporária e apagado logo em seguida.
 * -----------------------------------------------------------------------
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const AdmZip = require('adm-zip');
const Database = require('better-sqlite3');
const { decryptFile } = require('./backupManager');

const PADRAO_NOME = /^(backup|antes-de-restaurar)-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)\.bak$/;

/** Data do backup pelo nome do arquivo (o horário de modificação muda ao copiar). */
function dataPeloNome(nome) {
    const m = nome.match(PADRAO_NOME);
    if (!m) return null;
    // 2026-11-10T11-53-52-429Z → 2026-11-10T11:53:52.429Z
    const iso = m[2].replace(/T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/, 'T$1:$2:$3.$4Z');
    const d = new Date(iso);
    return isNaN(d) ? null : d;
}

function descreverArquivo(caminho) {
    const nome = path.basename(caminho);
    const info = fs.statSync(caminho);
    const data = dataPeloNome(nome) || new Date(info.mtimeMs);
    return {
        nome,
        caminho,
        data: data.toISOString(),
        tamanho: info.size,
        tipo: nome.startsWith('antes-de-restaurar-') ? 'antes-de-restaurar' : 'automatico',
    };
}

function listarBackups(pasta) {
    if (!pasta || !fs.existsSync(pasta)) return [];
    return fs.readdirSync(pasta)
        .filter((nome) => PADRAO_NOME.test(nome))
        .map((nome) => {
            try { return descreverArquivo(path.join(pasta, nome)); } catch (_) { return null; }
        })
        .filter(Boolean)
        .sort((a, b) => (a.data < b.data ? 1 : -1));
}

/**
 * Abre um backup e devolve:
 *   { linhas: [{ chave, valor }], metas: { chave: metaObj } }
 * Erros com mensagem fixa (para a tela explicar):
 *   SENHA_INCORRETA  → a senha não abre esse arquivo
 *   ARQUIVO_INVALIDO → não é um backup do sistema (ou está corrompido)
 */
function lerBackup(arquivo, senha) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'restaurar-'));
    try {
        const zipPath = path.join(tmp, 'backup.zip');
        try {
            decryptFile(arquivo, zipPath, senha);
        } catch (err) {
            // AES-GCM recusa quando a senha (ou o arquivo) não confere
            throw new Error(fs.statSync(arquivo).size < 64 ? 'ARQUIVO_INVALIDO' : 'SENHA_INCORRETA');
        }

        let entrada;
        try {
            entrada = new AdmZip(zipPath).getEntry('database.sqlite');
        } catch (_) {
            throw new Error('ARQUIVO_INVALIDO');
        }
        if (!entrada) throw new Error('ARQUIVO_INVALIDO');

        const dbPath = path.join(tmp, 'database.sqlite');
        fs.writeFileSync(dbPath, entrada.getData());

        const db = new Database(dbPath, { readonly: true, fileMustExist: true });
        try {
            const tabelas = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((t) => t.name));
            if (!tabelas.has('armazenamento')) throw new Error('ARQUIVO_INVALIDO');

            const linhas = db.prepare('SELECT chave, valor FROM armazenamento').all();
            const metas = {};
            if (tabelas.has('sync_meta')) {
                db.prepare('SELECT chave, meta FROM sync_meta').all().forEach((l) => {
                    try { metas[l.chave] = JSON.parse(l.meta); } catch (_) { /* ignora meta estragado */ }
                });
            }
            return { linhas, metas };
        } finally {
            db.close();
        }
    } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
    }
}

module.exports = { listarBackups, lerBackup, descreverArquivo, dataPeloNome };
