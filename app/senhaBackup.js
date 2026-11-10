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
const crypto = require('crypto');
const path = require('path');

function criarSenhaBackup({ app, safeStorage, log }) {
    const arquivo = path.join(app.getPath('userData'), 'chave-backup.bin');
    // senhas usadas antes de uma troca (para ainda abrir backups antigos)
    const arquivoAntigas = path.join(app.getPath('userData'), 'chave-backup-antigas.bin');
    const MAX_ANTIGAS = 20;
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

    function lerAntigas() {
        if (!fs.existsSync(arquivoAntigas) || !cofreDisponivel()) return [];
        try {
            const lista = JSON.parse(safeStorage.decryptString(fs.readFileSync(arquivoAntigas)));
            return Array.isArray(lista) ? lista.filter((s) => typeof s === 'string' && s) : [];
        } catch (err) {
            log.error('[senha-backup] Não foi possível abrir as senhas antigas:', err);
            return [];
        }
    }

    function gravarAntigas(lista) {
        fs.writeFileSync(arquivoAntigas, safeStorage.encryptString(JSON.stringify(lista)));
    }

    /** Senha atual + senhas antigas (sem repetir), nessa ordem. */
    function todas() {
        return [...new Set([obter(), ...lerAntigas()].filter(Boolean))];
    }

    /**
     * Troca a senha do backup. Quem chama (main.js) já conferiu a senha de
     * login e se a senha nova bate com o outro computador. A senha antiga
     * NÃO é perdida: vai para a lista de antigas, para os backups feitos
     * antes da troca continuarem podendo ser restaurados.
     */
    function trocar(nova) {
        if (typeof nova !== 'string' || !nova) return { ok: false, erro: 'Digite a nova senha do backup.' };
        if (!cofreDisponivel()) {
            return { ok: false, erro: 'O cofre de senhas do sistema não está disponível neste computador.' };
        }
        const atual = obter();
        try {
            // 1º guarda a antiga; só depois grava a nova (se algo falhar no meio, nada se perde)
            if (atual && atual !== nova) {
                const antigas = [atual, ...lerAntigas().filter((s) => s !== atual && s !== nova)];
                gravarAntigas(antigas.slice(0, MAX_ANTIGAS));
            }
            gravarNoCofre(nova);
        } catch (err) {
            log.error('[senha-backup] Falha ao trocar a senha do backup:', err);
            return { ok: false, erro: 'Não foi possível gravar a nova senha. Nada foi alterado.' };
        }
        emMemoria = nova;
        log.info('[senha-backup] Senha do backup trocada pela tela de Configurações.');
        return { ok: true };
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

    // ---------- conferência antes de restaurar / abrir a pasta ----------
    // Evita acidente: restaurar ou mexer nos backups só com a senha do backup.
    const MAX_TENTATIVAS = 5;         // erros seguidos antes de bloquear
    const ESPERA_BLOQUEIO_MS = 30000; // 30 segundos de espera depois disso
    let errosSeguidos = 0;
    let bloqueadoAte = 0;

    function segundosBloqueado() {
        const restante = bloqueadoAte - Date.now();
        return restante > 0 ? Math.ceil(restante / 1000) : 0;
    }

    /**
     * Confere a senha digitada com a senha do backup guardada no cofre.
     * Devolve { ok: true } ou { ok: false, erro }.
     */
    function conferir(digitada) {
        const espera = segundosBloqueado();
        if (espera) return { ok: false, erro: `Muitas tentativas. Aguarde ${espera} segundos.` };

        const salva = obter();
        if (!salva) {
            return { ok: false, erro: 'Configure a senha do backup (nesta tela, em "Senha do backup") primeiro.' };
        }

        // compara pelo hash: mesmo tamanho e "tempo constante"
        const a = crypto.createHash('sha256').update(String(digitada || ''), 'utf8').digest();
        const b = crypto.createHash('sha256').update(salva, 'utf8').digest();
        if (crypto.timingSafeEqual(a, b)) {
            errosSeguidos = 0;
            return { ok: true };
        }

        errosSeguidos += 1;
        if (errosSeguidos >= MAX_TENTATIVAS) {
            errosSeguidos = 0;
            bloqueadoAte = Date.now() + ESPERA_BLOQUEIO_MS;
            log.warn('[senha-backup] Muitas tentativas erradas na senha do backup, bloqueado por 30s.');
            return { ok: false, erro: 'Senha incorreta. Muitas tentativas: aguarde 30 segundos.' };
        }
        return { ok: false, erro: 'Senha do backup incorreta.' };
    }

    return { obter, todas, status, definir, trocar, desfazer, conferir };
}

module.exports = { criarSenhaBackup };
