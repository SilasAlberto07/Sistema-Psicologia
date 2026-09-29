/**
 * sincronizacao.js
 * -----------------------------------------------------------------------
 * Sincroniza os dados entre computadores usando uma pasta do Google Drive
 * (ou qualquer pasta sincronizada), sem servidor.
 *
 *  - Cada computador grava SÓ o seu próprio arquivo:  sync-<id>.psisync
 *    (criptografado com a mesma senha dos backups). Como ninguém escreve no
 *    arquivo do outro, o Google Drive não cria conflitos.
 *  - De tempos em tempos (e ao salvar algo), cada computador lê os arquivos
 *    dos outros e JUNTA com os seus dados item por item (ver merge.js).
 *  - Antes de juntar, guarda uma cópia de segurança dos dados daqui.
 *
 * Só pacientes, casais e financeiro são sincronizados. A senha de login
 * continua separada em cada computador.
 * -----------------------------------------------------------------------
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const zlib = require('zlib');
const crypto = require('crypto');
const M = require('./merge');

const CHAVES_SINCRONIZADAS = ['pacientes', 'casais', 'financeiro'];
const FORMATO = 1;
const EXTENSAO = '.psisync';
const INTERVALO_LEITURA_MS = 45 * 1000;   // lê os outros computadores a cada 45s
const ESPERA_ENVIO_MS = 4 * 1000;         // espera 4s de "silêncio" antes de enviar
const LEITURAS_GUARDADAS_POR_TELA = 6;
const COPIAS_ANTES_DE_JUNTAR = 30;
const NOME_PASTA_SUGERIDA = 'Sistema Psicologia - Sincronizacao';

// ------------------------------------------------------------------
// Criptografia (AES-256-GCM, mesma ideia dos backups)
// ------------------------------------------------------------------
const MAGICO = Buffer.from('PSISYNC1');
const cacheChaves = new Map();

function derivarChave(senha, sal) {
    const id = crypto.createHash('sha256').update(senha).update(sal).digest('hex');
    if (!cacheChaves.has(id)) {
        if (cacheChaves.size > 50) cacheChaves.clear();
        cacheChaves.set(id, crypto.scryptSync(senha, sal, 32));
    }
    return cacheChaves.get(id);
}

function cifrar(buffer, senha) {
    const sal = crypto.randomBytes(16);
    const iv = crypto.randomBytes(12);
    const cifra = crypto.createCipheriv('aes-256-gcm', derivarChave(senha, sal), iv);
    const corpo = Buffer.concat([cifra.update(buffer), cifra.final()]);
    return Buffer.concat([MAGICO, sal, iv, cifra.getAuthTag(), corpo]);
}

function decifrar(buffer, senha) {
    if (buffer.length < 52 || !buffer.subarray(0, 8).equals(MAGICO)) {
        throw new Error('arquivo de sincronização inválido');
    }
    const sal = buffer.subarray(8, 24);
    const iv = buffer.subarray(24, 36);
    const tag = buffer.subarray(36, 52);
    const decifra = crypto.createDecipheriv('aes-256-gcm', derivarChave(senha, sal), iv);
    decifra.setAuthTag(tag);
    try {
        return Buffer.concat([decifra.update(buffer.subarray(52)), decifra.final()]);
    } catch (e) {
        throw new Error('SENHA_DIFERENTE');
    }
}

// ------------------------------------------------------------------
// Onde fica o Google Drive neste computador (para sugerir a pasta)
// ------------------------------------------------------------------
function detectarGoogleDrive() {
    const nomes = ['Meu Drive', 'My Drive'];
    const candidatos = [];

    if (process.platform === 'win32') {
        for (const letra of 'DEFGHIJKLMNOPQRSTUVWXYZ') {
            for (const n of nomes) candidatos.push(`${letra}:\\${n}`);
        }
        for (const n of nomes) candidatos.push(path.join(os.homedir(), 'Google Drive', n));
        candidatos.push(path.join(os.homedir(), 'Google Drive'));
    } else if (process.platform === 'darwin') {
        const nuvem = path.join(os.homedir(), 'Library', 'CloudStorage');
        try {
            fs.readdirSync(nuvem)
                .filter((d) => d.startsWith('GoogleDrive'))
                .forEach((d) => nomes.forEach((n) => candidatos.push(path.join(nuvem, d, n))));
        } catch (_) { /* sem Google Drive */ }
        for (const n of nomes) candidatos.push(path.join('/Volumes', 'GoogleDrive', n));
    }

    for (const c of candidatos) {
        try {
            if (fs.statSync(c).isDirectory()) return c;
        } catch (_) { /* não existe */ }
    }
    return null;
}

// ------------------------------------------------------------------
// Serviço de sincronização
// ------------------------------------------------------------------
function criarSincronizacao({ db, log, pastaDadosApp, versaoApp, senha, aoAtualizarDados, fazerBackup }) {

    db.exec(`
        CREATE TABLE IF NOT EXISTS sync_meta (chave TEXT PRIMARY KEY, meta TEXT);
        CREATE TABLE IF NOT EXISTS config_local (chave TEXT PRIMARY KEY, valor TEXT);
    `);

    const stmtLer = db.prepare('SELECT valor FROM armazenamento WHERE chave = ?');
    const stmtGravar = db.prepare(`
        INSERT INTO armazenamento (chave, valor) VALUES (?, ?)
        ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor
    `);
    const stmtLerMeta = db.prepare('SELECT meta FROM sync_meta WHERE chave = ?');
    const stmtGravarMeta = db.prepare(`
        INSERT INTO sync_meta (chave, meta) VALUES (?, ?)
        ON CONFLICT(chave) DO UPDATE SET meta = excluded.meta
    `);
    const stmtLerConfig = db.prepare('SELECT valor FROM config_local WHERE chave = ?');
    const stmtGravarConfig = db.prepare(`
        INSERT INTO config_local (chave, valor) VALUES (?, ?)
        ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor
    `);

    const config = {
        ler(chave, padrao = null) {
            const l = stmtLerConfig.get(chave);
            if (!l) return padrao;
            try { return JSON.parse(l.valor); } catch (_) { return padrao; }
        },
        gravar(chave, valor) {
            stmtGravarConfig.run(chave, JSON.stringify(valor));
        },
    };

    // identidade deste computador
    let idDispositivo = config.ler('dispositivo_id');
    if (!idDispositivo) {
        idDispositivo = crypto.randomBytes(5).toString('hex');
        config.gravar('dispositivo_id', idDispositivo);
    }
    const nomeDispositivo = `${process.platform === 'darwin' ? 'Mac' : process.platform === 'win32' ? 'Windows' : process.platform} (${os.hostname()})`;
    const relogio = M.criarRelogio(idDispositivo);
    const arquivoProprio = `sync-${idDispositivo}${EXTENSAO}`;

    const estado = {
        ultimoEnvio: config.ler('ultimo_envio'),
        ultimaRecepcao: config.ler('ultima_recepcao'),
        ultimoErro: null,
        sincronizando: false,
    };

    // ---------------- dados locais ----------------
    function lerChave(chave) {
        const l = stmtLer.get(chave);
        let valor = [];
        if (l && l.valor) {
            try { valor = JSON.parse(l.valor); } catch (_) { valor = []; }
        }
        if (valor === null || valor === undefined) valor = [];
        const lm = stmtLerMeta.get(chave);
        const meta = lm ? JSON.parse(lm.meta) : null;
        return { valor, meta };
    }

    const salvarVarias = db.transaction((itens) => {
        itens.forEach(({ chave, valor, meta }) => {
            stmtGravar.run(chave, JSON.stringify(valor));
            stmtGravarMeta.run(chave, JSON.stringify(meta));
        });
    });

    // Primeira vez com a sincronização: prepara os dados que já existiam
    (function prepararDadosExistentes() {
        const preparar = [];
        CHAVES_SINCRONIZADAS.forEach((chave) => {
            const { valor, meta } = lerChave(chave);
            if (!meta) {
                const r = M.prepararChave(chave, valor, null);
                preparar.push({ chave, valor: r.valor, meta: r.meta });
            } else {
                relogio.observar(M.maiorCarimbo(meta));
            }
        });
        if (preparar.length) {
            salvarVarias(preparar);
            log.info(`[sync] Dados preparados para sincronização: ${preparar.map((p) => p.chave).join(', ')}`);
        }
    })();

    // ---------------- leituras das telas (para a junção de 3 vias) ----------------
    // Guardamos o que cada tela LEU, para saber exatamente o que ela mudou
    // quando mandar salvar (e não desfazer o que chegou do outro computador).
    const leiturasPorTela = new Map(); // idTela -> Map(chave -> [{valor, meta}])

    function registrarLeitura(idTela, chave) {
        if (!CHAVES_SINCRONIZADAS.includes(chave)) return;
        const { valor, meta } = lerChave(chave);
        if (!leiturasPorTela.has(idTela)) leiturasPorTela.set(idTela, new Map());
        const porChave = leiturasPorTela.get(idTela);
        const lista = porChave.get(chave) || [];
        lista.push({ valor, meta: meta || M.metaVazio() });
        while (lista.length > LEITURAS_GUARDADAS_POR_TELA) lista.shift();
        porChave.set(chave, lista);
    }

    function esquecerTela(idTela) {
        leiturasPorTela.delete(idTela);
    }

    function ehSincronizada(chave) {
        return CHAVES_SINCRONIZADAS.includes(chave);
    }

    /** Uma tela mandou salvar uma chave sincronizada. */
    function gravar(idTela, chave, textoValor) {
        let novo;
        try { novo = JSON.parse(textoValor); } catch (_) { novo = null; }
        if (novo === null || novo === undefined) novo = [];

        const atual = lerChave(chave);
        const metaAtual = atual.meta || M.metaVazio();

        // base = a leitura desta tela mais parecida com o que ela mandou salvar
        const leituras = (leiturasPorTela.get(idTela) || new Map()).get(chave) || [];
        let base = { valor: atual.valor, meta: metaAtual };
        let menor = Infinity;
        [...leituras].reverse().forEach((l) => {
            const n = M.contarDiferencas(chave, l.valor, novo);
            if (n < menor) { menor = n; base = l; }
        });

        const r = M.gravacaoLocal(chave, atual.valor, metaAtual, base.valor, base.meta, novo, relogio.agora());
        salvarVarias([{ chave, valor: r.valor, meta: r.meta }]);

        // a próxima gravação desta tela parte do que ela tem na memória
        if (!leiturasPorTela.has(idTela)) leiturasPorTela.set(idTela, new Map());
        leiturasPorTela.get(idTela).set(chave, [{ valor: r.valorTela, meta: r.metaTela }]);

        if (r.renumerados.length) {
            log.info('[sync] Códigos repetidos corrigidos:', r.renumerados);
            aoAtualizarDados({ renumerados: r.renumerados, origem: 'local' });
        }
        agendarEnvio();
    }

    // ---------------- pasta de sincronização ----------------
    function pasta() {
        return config.ler('pasta_sync');
    }

    function definirPasta(novaPasta) {
        if (novaPasta) {
            fs.mkdirSync(novaPasta, { recursive: true });
            config.gravar('pasta_sync', novaPasta);
            log.info('[sync] Pasta de sincronização:', novaPasta);
        } else {
            config.gravar('pasta_sync', null);
            log.info('[sync] Sincronização desativada.');
        }
        estado.ultimoErro = null;
    }

    function pastaSugerida() {
        const drive = detectarGoogleDrive();
        return drive ? path.join(drive, NOME_PASTA_SUGERIDA) : null;
    }

    // ---------------- envio ----------------
    let timerEnvio = null;
    function agendarEnvio() {
        if (!pasta()) return;
        clearTimeout(timerEnvio);
        timerEnvio = setTimeout(() => {
            enviar().catch((e) => registrarErro('envio', e));
        }, ESPERA_ENVIO_MS);
    }

    function montarPacote() {
        const chaves = {};
        CHAVES_SINCRONIZADAS.forEach((chave) => {
            const { valor, meta } = lerChave(chave);
            chaves[chave] = { valor, meta: meta || M.metaVazio() };
        });
        return {
            formato: FORMATO,
            dispositivo: idDispositivo,
            nome: nomeDispositivo,
            versaoApp,
            geradoEm: new Date().toISOString(),
            chaves,
        };
    }

    async function enviar() {
        const p = pasta();
        if (!p) return;
        if (!senha) throw new Error('SEM_SENHA');
        fs.mkdirSync(p, { recursive: true });

        const pacote = montarPacote();
        const conteudo = cifrar(zlib.gzipSync(Buffer.from(JSON.stringify(pacote))), senha);
        const temporario = path.join(p, `.${arquivoProprio}.tmp`);
        const final = path.join(p, arquivoProprio);
        await fs.promises.writeFile(temporario, conteudo);
        await fs.promises.rename(temporario, final);

        estado.ultimoEnvio = new Date().toISOString();
        config.gravar('ultimo_envio', estado.ultimoEnvio);
    }

    // ---------------- recepção ----------------
    function copiaDeSegurancaAntesDeJuntar(motivo) {
        try {
            const dir = path.join(pastaDadosApp, 'sincronizacao-copias');
            fs.mkdirSync(dir, { recursive: true });
            const dados = {};
            CHAVES_SINCRONIZADAS.forEach((c) => { dados[c] = lerChave(c); });
            const nome = `antes-de-juntar-${new Date().toISOString().replace(/[:.]/g, '-')}.psisync`;
            const conteudo = senha
                ? cifrar(zlib.gzipSync(Buffer.from(JSON.stringify({ motivo, dados }))), senha)
                : zlib.gzipSync(Buffer.from(JSON.stringify({ motivo, dados })));
            fs.writeFileSync(path.join(dir, nome), conteudo);

            const antigas = fs.readdirSync(dir).filter((f) => f.startsWith('antes-de-juntar-')).sort();
            antigas.slice(0, Math.max(0, antigas.length - COPIAS_ANTES_DE_JUNTAR))
                .forEach((f) => fs.rmSync(path.join(dir, f), { force: true }));
        } catch (e) {
            log.error('[sync] Não foi possível guardar a cópia de segurança antes de juntar:', e);
            throw e; // sem cópia de segurança, não junta
        }
    }

    async function receber() {
        const p = pasta();
        if (!p) return { mudou: false };
        if (!senha) throw new Error('SEM_SENHA');

        let arquivos;
        try {
            arquivos = await fs.promises.readdir(p);
        } catch (e) {
            throw new Error('PASTA_INACESSIVEL');
        }

        const pares = config.ler('pares', {});
        let mudouAlgo = false;
        const renumerados = [];

        for (const arq of arquivos) {
            const m = arq.match(/^sync-([a-f0-9]+)\.psisync$/);
            if (!m || m[1] === idDispositivo) continue;
            const idPar = m[1];
            const caminho = path.join(p, arq);

            let info;
            try { info = await fs.promises.stat(caminho); } catch (_) { continue; }
            const par = pares[idPar] || {};
            if (par.mtimeMs === info.mtimeMs && par.tamanho === info.size) continue; // nada novo

            let pacote;
            try {
                const bruto = await fs.promises.readFile(caminho);
                pacote = JSON.parse(zlib.gunzipSync(decifrar(bruto, senha)).toString('utf8'));
            } catch (e) {
                if (e.message === 'SENHA_DIFERENTE') throw e;
                log.warn(`[sync] Arquivo ${arq} ainda incompleto ou inválido, tento de novo depois:`, e.message);
                continue;
            }
            if (!pacote || pacote.formato !== FORMATO || !pacote.chaves) {
                log.warn(`[sync] Arquivo ${arq} de formato desconhecido (versão ${pacote && pacote.versaoApp}). Atualize o sistema nos dois computadores.`);
                continue;
            }

            // primeira vez juntando com este computador → backup completo antes
            if (!par.jaJuntou && fazerBackup) {
                try { await fazerBackup(); } catch (e) { log.error('[sync] Backup antes da primeira junção falhou:', e); }
            }

            // ----- junção (sem "await" daqui até salvar: nada muda no meio) -----
            const resultados = [];
            let mudouDesteArquivo = false;
            CHAVES_SINCRONIZADAS.forEach((chave) => {
                const remoto = pacote.chaves[chave];
                if (!remoto) return;
                relogio.observar(M.maiorCarimbo(remoto.meta || M.metaVazio()));
                const local = lerChave(chave);
                const r = M.juntarRemoto(chave, local.valor, local.meta || M.metaVazio(),
                    remoto.valor || [], remoto.meta || M.metaVazio(), relogio.agora());
                if (r.mudou) mudouDesteArquivo = true;
                renumerados.push(...r.renumerados);
                resultados.push({ chave, valor: r.valor, meta: r.meta });
            });

            if (mudouDesteArquivo) {
                copiaDeSegurancaAntesDeJuntar(`dados recebidos de ${pacote.nome}`);
            }
            salvarVarias(resultados);
            mudouAlgo = mudouAlgo || mudouDesteArquivo;

            pares[idPar] = {
                ...par,
                nome: pacote.nome,
                versaoApp: pacote.versaoApp,
                geradoEm: pacote.geradoEm,
                mtimeMs: info.mtimeMs,
                tamanho: info.size,
                jaJuntou: true,
                recebidoEm: new Date().toISOString(),
            };
            config.gravar('pares', pares);
            log.info(`[sync] Recebido de ${pacote.nome} (gerado em ${pacote.geradoEm})${mudouDesteArquivo ? ' — dados atualizados' : ' — nada novo'}`);
        }

        estado.ultimaRecepcao = new Date().toISOString();
        config.gravar('ultima_recepcao', estado.ultimaRecepcao);

        if (mudouAlgo) {
            aoAtualizarDados({ renumerados, origem: 'remoto' });
            agendarEnvio(); // espalha o resultado da junção
        }
        return { mudou: mudouAlgo };
    }

    // ---------------- ciclo ----------------
    function registrarErro(onde, e) {
        const mensagens = {
            SEM_SENHA: 'A senha de criptografia não está configurada neste computador.',
            SENHA_DIFERENTE: 'O outro computador usa uma senha de criptografia diferente. Instale a mesma versão do sistema nos dois.',
            PASTA_INACESSIVEL: 'Não foi possível acessar a pasta de sincronização. Verifique se o Google Drive está aberto.',
        };
        estado.ultimoErro = mensagens[e.message] || `Erro na sincronização (${onde}): ${e.message}`;
        log.error(`[sync] Erro (${onde}):`, e);
    }

    async function sincronizarAgora() {
        if (!pasta()) return status();
        if (estado.sincronizando) return status();
        estado.sincronizando = true;
        let deuErro = false;
        // receber e enviar são independentes: se um falhar, o outro ainda acontece
        try {
            await receber();
        } catch (e) {
            deuErro = true;
            registrarErro('recepção', e);
        }
        try {
            await enviar();
        } catch (e) {
            if (!deuErro) registrarErro('envio', e);
            deuErro = true;
        }
        if (!deuErro) estado.ultimoErro = null;
        estado.sincronizando = false;
        return status();
    }

    let timerLeitura = null;
    function iniciar() {
        setTimeout(() => sincronizarAgora(), 3000);
        timerLeitura = setInterval(() => {
            if (!pasta() || estado.sincronizando) return;
            estado.sincronizando = true;
            receber()
                .then(() => { estado.ultimoErro = null; })
                .catch((e) => registrarErro('recepção', e))
                .finally(() => { estado.sincronizando = false; });
        }, INTERVALO_LEITURA_MS);
    }

    function parar() {
        clearInterval(timerLeitura);
        clearTimeout(timerEnvio);
    }

    /** Envia na hora (ao fechar o programa). */
    async function enviarAoFechar() {
        clearTimeout(timerEnvio);
        if (pasta()) {
            try { await enviar(); } catch (e) { registrarErro('envio', e); }
        }
    }

    function status() {
        const pares = config.ler('pares', {});
        return {
            ativa: !!pasta(),
            pasta: pasta(),
            pastaSugerida: pastaSugerida(),
            esteComputador: nomeDispositivo,
            ultimoEnvio: estado.ultimoEnvio,
            ultimaRecepcao: estado.ultimaRecepcao,
            ultimoErro: estado.ultimoErro,
            sincronizando: estado.sincronizando,
            outrosComputadores: Object.values(pares).map((p) => ({
                nome: p.nome,
                atualizadoEm: p.geradoEm,
                versaoApp: p.versaoApp,
            })),
        };
    }

    return {
        ehSincronizada,
        registrarLeitura,
        esquecerTela,
        gravar,
        definirPasta,
        pastaSugerida,
        sincronizarAgora,
        enviarAoFechar,
        iniciar,
        parar,
        status,
    };
}

module.exports = { criarSincronizacao, detectarGoogleDrive, _interno: { cifrar, decifrar } };
