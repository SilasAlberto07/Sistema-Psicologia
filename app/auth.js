/**
 * auth.js
 * -----------------------------------------------------------------------
 * Login do sistema, feito no PROCESSO PRINCIPAL (Node), e não nas telas.
 *
 * Por que aqui e não na tela?
 *   Tudo que roda na tela (HTML/JS da página) pode ser visto e alterado
 *   por quem estiver usando o computador. Já o processo principal é o
 *   "porteiro": é ele que entrega os dados do banco. Se o porteiro não
 *   souber que a pessoa fez login, ele simplesmente não entrega nada.
 *
 * Como a senha é guardada:
 *   Nunca guardamos a senha em si, só um "hash" dela, feito com scrypt
 *   (o mesmo algoritmo do backup) + um "sal" aleatório. O sal faz com que
 *   duas senhas iguais gerem hashes diferentes, e o scrypt é lento de
 *   propósito, o que torna o "chute em massa" de senhas muito caro.
 *   Formato salvo:  scrypt$<sal em hex>$<hash em hex>
 *
 * Compatibilidade:
 *   As versões antigas guardavam um SHA-256 simples (64 caracteres hex).
 *   Quem já tem senha continua entrando normalmente; no primeiro login
 *   certo, o hash antigo é trocado pelo novo formato automaticamente.
 * -----------------------------------------------------------------------
 */

const crypto = require('crypto');
const { promisify } = require('util');

const scrypt = promisify(crypto.scrypt);

const CHAVE_SENHA = 'senhaHash';
const CHAVE_RESPOSTA = 'respostaSegurancaHash';

// Chaves que as telas NUNCA podem ler ou alterar pelo window.storage
const CHAVES_PROTEGIDAS = [CHAVE_SENHA, CHAVE_RESPOSTA];

const TAMANHO_MINIMO_SENHA = 8;
const MAX_TENTATIVAS = 5;          // erros seguidos antes de bloquear
const ESPERA_BLOQUEIO_MS = 30000;  // 30 segundos de espera depois disso

function criarAutenticacao({ db, log }) {
    let autenticado = false;
    let errosSeguidos = 0;
    let bloqueadoAte = 0;

    // ---------- acesso ao banco ----------
    function ler(chave) {
        const linha = db.prepare('SELECT valor FROM armazenamento WHERE chave = ?').get(chave);
        return linha ? linha.valor : null;
    }

    function gravar(chave, valor) {
        db.prepare(`
            INSERT INTO armazenamento (chave, valor) VALUES (?, ?)
            ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor
        `).run(chave, valor);
    }

    function apagar(chave) {
        db.prepare('DELETE FROM armazenamento WHERE chave = ?').run(chave);
    }

    // ---------- hash ----------
    async function gerarHash(texto) {
        const sal = crypto.randomBytes(16);
        const hash = await scrypt(texto, sal, 32);
        return `scrypt$${sal.toString('hex')}$${hash.toString('hex')}`;
    }

    function ehHashAntigo(salvo) {
        return typeof salvo === 'string' && /^[0-9a-f]{64}$/.test(salvo);
    }

    // compara "em tempo constante": não dá pistas pelo tempo de resposta
    function iguais(a, b) {
        return a.length === b.length && crypto.timingSafeEqual(a, b);
    }

    async function conferir(texto, salvo) {
        if (!salvo) return false;

        if (ehHashAntigo(salvo)) {
            const sha = crypto.createHash('sha256').update(texto, 'utf8').digest();
            return iguais(sha, Buffer.from(salvo, 'hex'));
        }

        const partes = salvo.split('$');
        if (partes.length !== 3 || partes[0] !== 'scrypt') return false;
        const sal = Buffer.from(partes[1], 'hex');
        const esperado = Buffer.from(partes[2], 'hex');
        const hash = await scrypt(texto, sal, esperado.length);
        return iguais(hash, esperado);
    }

    function normalizarResposta(resposta) {
        return String(resposta || '').trim().toLowerCase();
    }

    // ---------- proteção contra chutes seguidos ----------
    function segundosBloqueado() {
        const restante = bloqueadoAte - Date.now();
        return restante > 0 ? Math.ceil(restante / 1000) : 0;
    }

    function registrarErro() {
        errosSeguidos += 1;
        if (errosSeguidos >= MAX_TENTATIVAS) {
            bloqueadoAte = Date.now() + ESPERA_BLOQUEIO_MS;
            errosSeguidos = 0;
            log.warn('[auth] Muitas tentativas erradas, login bloqueado por 30s.');
        }
    }

    function erroBloqueio() {
        return { ok: false, erro: `Muitas tentativas. Aguarde ${segundosBloqueado()} segundos.` };
    }

    function validarNovaSenha(nova, confirmar) {
        if (typeof nova !== 'string' || nova.length < TAMANHO_MINIMO_SENHA) {
            return `A senha precisa ter pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.`;
        }
        if (nova !== confirmar) return 'As senhas não coincidem.';
        return null;
    }

    // ---------- ações usadas pelas telas ----------
    function estado() {
        return {
            temSenha: !!ler(CHAVE_SENHA),
            autenticado,
            tamanhoMinimo: TAMANHO_MINIMO_SENHA,
        };
    }

    // Primeiro acesso (ou depois de redefinir pela pergunta de segurança)
    async function criarSenha(nova, confirmar, resposta) {
        if (ler(CHAVE_SENHA)) {
            return { ok: false, erro: 'Já existe uma senha cadastrada.' };
        }
        const problema = validarNovaSenha(nova, confirmar);
        if (problema) return { ok: false, erro: problema };

        const respostaLimpa = normalizarResposta(resposta);
        if (!respostaLimpa) return { ok: false, erro: 'Preencha a resposta de segurança.' };

        gravar(CHAVE_SENHA, await gerarHash(nova));
        gravar(CHAVE_RESPOSTA, await gerarHash(respostaLimpa));
        autenticado = true;
        log.info('[auth] Senha criada.');
        return { ok: true };
    }

    async function entrar(senha) {
        if (segundosBloqueado()) return erroBloqueio();

        const salvo = ler(CHAVE_SENHA);
        const certo = await conferir(String(senha || ''), salvo);

        if (!certo) {
            registrarErro();
            return segundosBloqueado() ? erroBloqueio() : { ok: false, erro: 'Senha incorreta. Tente novamente.' };
        }

        errosSeguidos = 0;
        autenticado = true;

        // senha antiga (SHA-256 simples) → atualiza para o formato novo
        if (ehHashAntigo(salvo)) {
            gravar(CHAVE_SENHA, await gerarHash(String(senha)));
            log.info('[auth] Hash da senha atualizado para scrypt.');
        }
        return { ok: true };
    }

    async function trocarSenha(atual, nova, confirmar) {
        if (!autenticado) return { ok: false, erro: 'Faça login novamente.' };
        if (segundosBloqueado()) return erroBloqueio();

        if (!(await conferir(String(atual || ''), ler(CHAVE_SENHA)))) {
            registrarErro();
            return { ok: false, erro: 'Senha atual incorreta.' };
        }
        const problema = validarNovaSenha(nova, confirmar);
        if (problema) return { ok: false, erro: problema };

        gravar(CHAVE_SENHA, await gerarHash(nova));
        log.info('[auth] Senha alterada.');
        return { ok: true };
    }

    // "Esqueci minha senha": resposta certa apaga a senha para criar outra
    async function redefinirComResposta(resposta) {
        if (segundosBloqueado()) return erroBloqueio();

        const certo = await conferir(normalizarResposta(resposta), ler(CHAVE_RESPOSTA));
        if (!certo) {
            registrarErro();
            return { ok: false, erro: 'Resposta incorreta. Não foi possível redefinir a senha.' };
        }

        errosSeguidos = 0;
        apagar(CHAVE_SENHA);
        autenticado = false;
        log.info('[auth] Senha redefinida pela pergunta de segurança.');
        return { ok: true };
    }

    function sair() {
        autenticado = false;
    }

    return {
        estado,
        criarSenha,
        entrar,
        trocarSenha,
        redefinirComResposta,
        sair,
        estaAutenticado: () => autenticado,
        chaveProtegida: (chave) => CHAVES_PROTEGIDAS.includes(chave),
    };
}

module.exports = { criarAutenticacao };
