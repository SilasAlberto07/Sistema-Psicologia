/**
 * senhaBackup.js
 * -----------------------------------------------------------------------
 * Guarda a senha que criptografa os backups e a sincronização no COFRE
 * do próprio sistema operacional (safeStorage do Electron):
 *   - Windows: DPAPI, ligada à conta do Windows de quem usa o computador
 *   - Mac: Keychain (Chaves)
 *
 * Por que não deixar no .env dentro do instalador?
 *   O instalador é público no GitHub. Qualquer pessoa pode baixá-lo,
 *   abrir o app.asar e ler o .env. Já o arquivo guardado aqui só pode ser
 *   aberto pela mesma conta, no mesmo computador.
 *
 * Migração (versões antigas tinham a senha no .env):
 *   Se ainda não há senha no cofre, mas existe BACKUP_PASSWORD no .env,
 *   ela é copiada para o cofre uma vez. Depois disso, o .env não é mais
 *   necessário e pode sair dos próximos instaladores.
 * -----------------------------------------------------------------------
 */

const fs = require('fs');
const path = require('path');

function criarSenhaBackup({ app, safeStorage, log }) {
    const arquivo = path.join(app.getPath('userData'), 'chave-backup.bin');
    let emMemoria = null; // evita abrir o cofre a cada backup

    function cofreDisponivel() {
        try {
            return safeStorage.isEncryptionAvailable();
        } catch (_) {
            return false;
        }
    }

    function lerDoCofre() {
        if (!fs.existsSync(arquivo) || !cofreDisponivel()) return null;
        try {
            return safeStorage.decryptString(fs.readFileSync(arquivo));
        } catch (err) {
            log.error('[senha-backup] Não foi possível abrir a senha guardada:', err);
            return null;
        }
    }

    function gravarNoCofre(senha) {
        if (!cofreDisponivel()) return false;
        fs.writeFileSync(arquivo, safeStorage.encryptString(senha));
        return true;
    }

    /** Devolve a senha, ou null se ainda não estiver configurada. */
    function obter() {
        if (emMemoria) return emMemoria;

        const doCofre = lerDoCofre();
        if (doCofre) {
            emMemoria = doCofre;
            return emMemoria;
        }

        // migração: versão antiga com a senha no .env
        const doEnv = process.env.BACKUP_PASSWORD;
        if (doEnv) {
            if (gravarNoCofre(doEnv)) {
                log.info('[senha-backup] Senha copiada do .env para o cofre do sistema.');
            } else {
                log.warn('[senha-backup] Cofre indisponível; usando a senha do .env só nesta execução.');
            }
            emMemoria = doEnv;
            return emMemoria;
        }

        return null;
    }

    function status() {
        return {
            configurada: !!obter(),
            cofreDisponivel: cofreDisponivel(),
        };
    }

    /**
     * Usado pela tela de Configurações quando este computador ainda não
     * tem a senha. Não troca uma senha que já existe: trocar exige mudar
     * nos dois computadores ao mesmo tempo, e isso fica para outra etapa.
     */
    function definir(senha, confirmar) {
        if (obter()) return { ok: false, erro: 'A senha do backup já está configurada neste computador.' };
        // Sem tamanho mínimo por enquanto: aqui se digita a MESMA senha que
        // o outro computador já usa (e ela precisa ser aceita como é).
        if (typeof senha !== 'string' || !senha) {
            return { ok: false, erro: 'Digite a senha do backup.' };
        }
        if (senha !== confirmar) return { ok: false, erro: 'As senhas não coincidem.' };
        if (!gravarNoCofre(senha)) {
            return { ok: false, erro: 'O cofre de senhas do sistema não está disponível neste computador.' };
        }
        emMemoria = senha;
        log.info('[senha-backup] Senha do backup configurada pela tela de Configurações.');
        return { ok: true };
    }

    /**
     * Desfaz uma senha recém-digitada que não bate com a do outro
     * computador (detectado pela sincronização). Assim dá para digitar de novo.
     */
    function desfazer() {
        emMemoria = null;
        try { fs.rmSync(arquivo, { force: true }); } catch (_) { /* nada a fazer */ }
        log.warn('[senha-backup] Senha digitada foi desfeita (não bate com o outro computador).');
    }

    return { obter, status, definir, desfazer };
}

module.exports = { criarSenhaBackup };
