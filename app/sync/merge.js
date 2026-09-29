/**
 * merge.js
 * -----------------------------------------------------------------------
 * Motor de junção (merge) dos dados entre computadores.
 *
 * Ideia geral
 *   - Os dados continuam salvos do jeito de sempre (JSON puro), só que cada
 *     item de lista (paciente, sessão, evolução, lançamento...) ganha um
 *     identificador escondido "_sid", para ser reconhecido mesmo se mudar de
 *     posição na lista.
 *   - Ao lado dos dados, guardamos "meta": QUANDO cada pedacinho foi alterado
 *     (meta.t) e QUAIS itens foram apagados (meta.x).
 *   - Para juntar duas versões, cada pedacinho fica com o valor mais recente.
 *     Itens novos dos dois lados são mantidos; itens apagados continuam
 *     apagados. Assim, a secretária e a Dra podem mexer ao mesmo tempo sem
 *     uma apagar o trabalho da outra.
 *
 * Caminhos (paths) usados no meta:
 *   "pacientes/@<sid>/nomeCompleto"
 *   "pacientes/@<sid>/sessoes/@<sid>/status"
 *   "pacientes/@<sid>/anamnese/queixa"
 *   "<caminho do item>#c"  → quando o item foi criado (define a ordem na lista)
 * -----------------------------------------------------------------------
 */

const crypto = require('crypto');

// ------------------------------------------------------------------
// Relógio (carimbo de tempo) — sempre crescente, com desempate por
// computador. Formato: "000001790640000000:0001:abc123" (ordenável como texto)
// ------------------------------------------------------------------
function criarRelogio(idDispositivo) {
    let ultimoMs = 0;
    let contador = 0;

    function agora() {
        const ms = Date.now();
        if (ms > ultimoMs) {
            ultimoMs = ms;
            contador = 0;
        } else {
            contador++;
        }
        return `${String(ultimoMs).padStart(15, '0')}:${String(contador).padStart(4, '0')}:${idDispositivo}`;
    }

    // Ao receber dados de outro computador, garante que os próximos
    // carimbos daqui sejam maiores que os de lá (mesmo com relógio atrasado).
    function observar(ts) {
        if (!ts || ts[0] === '!') return;
        const ms = Number(ts.slice(0, 15));
        if (Number.isFinite(ms) && ms > ultimoMs) {
            ultimoMs = ms;
            contador = 0;
        }
    }

    return { agora, observar };
}

// ------------------------------------------------------------------
// Utilitários
// ------------------------------------------------------------------
const MARCA_ITEM = '_sid';

function ehObjeto(v) {
    return v !== null && typeof v === 'object' && !Array.isArray(v);
}

// Lista "de itens" = lista em que todos os elementos são objetos (pode ser vazia)
function ehListaDeItens(v) {
    return Array.isArray(v) && v.every(ehObjeto);
}

function ehFolha(v) {
    return !ehObjeto(v) && !ehListaDeItens(v);
}

function iguais(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
}

function clonar(v) {
    return v === undefined ? undefined : JSON.parse(JSON.stringify(v));
}

function novoSid() {
    return crypto.randomBytes(8).toString('hex');
}

function hashCurto(texto) {
    return crypto.createHash('sha256').update(texto).digest('hex').slice(0, 16);
}

function chaveCampo(k) {
    // campos de formulário não têm "/" nem "@", mas por segurança:
    return String(k).replace(/[/@#]/g, (c) => encodeURIComponent(c));
}

function caminhoItem(caminhoLista, sid) {
    return `${caminhoLista}/@${sid}`;
}

function caminhoCampo(caminhoObj, campo) {
    return `${caminhoObj}/${chaveCampo(campo)}`;
}

function metaVazio() {
    return { t: {}, x: {} };
}

function maior(a, b) {
    return (a || '') >= (b || '') ? a : b;
}

// Valor "vazio" (usado no desempate: preferimos o valor preenchido)
function vazio(v) {
    return v === undefined || v === null || v === '' ||
        (Array.isArray(v) && v.length === 0);
}

// Desempate determinístico (dá o mesmo resultado nos dois computadores)
function desempatar(a, b) {
    if (vazio(a) && !vazio(b)) return b;
    if (!vazio(a) && vazio(b)) return a;
    return JSON.stringify(a) >= JSON.stringify(b) ? a : b;
}

// ------------------------------------------------------------------
// Status automático das sessões (mesma regra da página Sessões).
// Mudanças automáticas de status NÃO ganham carimbo novo, para não
// passar por cima de um "cancelada" feito no outro computador.
// ------------------------------------------------------------------
function statusCalculado(item, agora = new Date()) {
    if (!item || !item.data || !item.hora) return null;
    const duracao = Number(item.duracao) || 60;
    const inicio = new Date(`${item.data}T${item.hora}`);
    if (isNaN(inicio)) return null;
    const fim = new Date(inicio);
    fim.setMinutes(fim.getMinutes() + duracao);
    if (agora < inicio) return 'agendada';
    if (agora < fim) return 'andamento';
    return 'realizada';
}

function mudancaAutomaticaDeStatus(campo, valorAntigo, valorNovo, objNovo) {
    if (campo !== 'status') return false;
    if (valorAntigo === 'cancelada') return false; // sair de "cancelada" é sempre manual
    const esperado = statusCalculado(objNovo);
    return esperado !== null && valorNovo === esperado;
}

// ------------------------------------------------------------------
// 1) PREPARAÇÃO DOS DADOS ANTIGOS (primeira vez)
//    Dá um "_sid" a cada item. Para dados que já existiam, o _sid é
//    calculado a partir do conteúdo — assim, se os dois computadores
//    tiverem o MESMO registro (ex.: banco copiado de um para o outro),
//    ele é reconhecido como um só, e não duplicado.
// ------------------------------------------------------------------
function sidLegado(nomeLista, item, indice, sidPai) {
    const pai = sidPai || 'raiz';

    if (nomeLista === 'pacientes' || nomeLista === 'casais') {
        const nome = item.nomeCompleto ||
            `${item.p1NomeCompleto || ''}|${item.p2NomeCompleto || ''}`;
        return hashCurto(`${nomeLista}|${item.id || ''}|${nome}|${item.dataCadastro || ''}`);
    }

    if (nomeLista === 'sessoes') {
        // sessão N do paciente = mesma sessão nos dois computadores
        return hashCurto(`${pai}|sessoes|${indice}`);
    }

    // evoluções, lançamentos, pagamentos...: pelo conteúdo
    const semSid = { ...item };
    delete semSid[MARCA_ITEM];
    return hashCurto(`${pai}|${nomeLista}|${JSON.stringify(semSid)}`);
}

function prepararLegado(valor, caminho, meta, nomeLista, sidPai) {
    if (ehListaDeItens(valor)) {
        const usados = new Set();
        valor.forEach((item, i) => {
            if (!item[MARCA_ITEM]) {
                let sid = sidLegado(nomeLista, item, i, sidPai);
                // itens idênticos na mesma lista (ex.: duas evoluções iguais)
                while (usados.has(sid)) sid = hashCurto(`${sid}|${i}`);
                item[MARCA_ITEM] = sid;
            }
            usados.add(item[MARCA_ITEM]);
            const ci = caminhoItem(caminho, item[MARCA_ITEM]);
            if (!meta.t[`${ci}#c`]) {
                // "!" é menor que qualquer carimbo real → dados antigos vêm antes
                meta.t[`${ci}#c`] = `!${String(i).padStart(6, '0')}`;
            }
            prepararLegado(item, ci, meta, null, item[MARCA_ITEM]);
        });
    } else if (ehObjeto(valor)) {
        Object.keys(valor).forEach((k) => {
            if (k === MARCA_ITEM) return;
            prepararLegado(valor[k], caminhoCampo(caminho, k), meta, k, sidPai);
        });
    }
    return valor;
}

// ------------------------------------------------------------------
// 2) CARIMBAR UMA GRAVAÇÃO LOCAL
//    Compara o que a tela LEU (base) com o que a tela SALVOU (novo) e
//    carimba com "agora" só o que a pessoa realmente mudou.
// ------------------------------------------------------------------
function carimbarTudo(valor, caminho, meta, ts) {
    meta.t[caminho] = ts;
    if (ehListaDeItens(valor)) {
        valor.forEach((item) => {
            if (!item[MARCA_ITEM]) item[MARCA_ITEM] = novoSid();
            const ci = caminhoItem(caminho, item[MARCA_ITEM]);
            meta.t[`${ci}#c`] = meta.t[`${ci}#c`] || ts;
            carimbarTudo(item, ci, meta, ts);
        });
    } else if (ehObjeto(valor)) {
        Object.keys(valor).forEach((k) => {
            if (k === MARCA_ITEM) return;
            carimbarTudo(valor[k], caminhoCampo(caminho, k), meta, ts);
        });
    }
}

function carimbarDiferencas(base, novo, caminho, meta, ts, contador) {
    // mudou de tipo (ex.: número → lista)
    if (ehFolha(base) !== ehFolha(novo) || ehObjeto(base) !== ehObjeto(novo)) {
        carimbarTudo(novo, caminho, meta, ts);
        contador.n++;
        return;
    }

    if (ehListaDeItens(novo)) {
        const baseLista = base || [];
        const sidsNovos = new Set(novo.filter((i) => i[MARCA_ITEM]).map((i) => i[MARCA_ITEM]));

        // Itens sem _sid: se estão na mesma posição de um item da base que
        // "sumiu", é o mesmo item reescrito pela tela (edição) → herda o _sid.
        novo.forEach((item, i) => {
            if (item[MARCA_ITEM]) return;
            const naBase = baseLista[i];
            if (naBase && naBase[MARCA_ITEM] && !sidsNovos.has(naBase[MARCA_ITEM])) {
                item[MARCA_ITEM] = naBase[MARCA_ITEM];
                sidsNovos.add(item[MARCA_ITEM]);
            }
        });

        const porSid = new Map(baseLista.filter((i) => i[MARCA_ITEM]).map((i) => [i[MARCA_ITEM], i]));

        novo.forEach((item) => {
            if (!item[MARCA_ITEM]) item[MARCA_ITEM] = novoSid();
            const ci = caminhoItem(caminho, item[MARCA_ITEM]);
            const antigo = porSid.get(item[MARCA_ITEM]);
            if (antigo) {
                carimbarDiferencas(antigo, item, ci, meta, ts, contador);
            } else {
                // item novo
                meta.t[`${ci}#c`] = meta.t[`${ci}#c`] || ts;
                carimbarTudo(item, ci, meta, ts);
                contador.n++;
            }
        });

        // itens que a tela apagou
        porSid.forEach((_, sid) => {
            if (!sidsNovos.has(sid)) {
                meta.x[caminhoItem(caminho, sid)] = ts;
                contador.n++;
            }
        });
        return;
    }

    if (ehObjeto(novo)) {
        const chaves = new Set([...Object.keys(base || {}), ...Object.keys(novo)]);
        chaves.delete(MARCA_ITEM);
        chaves.forEach((k) => {
            const cc = caminhoCampo(caminho, k);
            const temBase = base && Object.prototype.hasOwnProperty.call(base, k);
            const temNovo = Object.prototype.hasOwnProperty.call(novo, k);

            if (temNovo && !temBase) {
                carimbarTudo(novo[k], cc, meta, ts);
                contador.n++;
            } else if (!temNovo && temBase) {
                meta.t[cc] = ts; // campo removido
                contador.n++;
            } else if (ehFolha(novo[k]) && ehFolha(base[k])) {
                if (!iguais(base[k], novo[k])) {
                    if (!mudancaAutomaticaDeStatus(k, base[k], novo[k], novo)) {
                        meta.t[cc] = ts;
                    }
                    contador.n++;
                }
            } else {
                carimbarDiferencas(base[k], novo[k], cc, meta, ts, contador);
            }
        });
        return;
    }

    // folha
    if (!iguais(base, novo)) {
        meta.t[caminho] = ts;
        contador.n++;
    }
}

// ------------------------------------------------------------------
// 3) JUNTAR DUAS VERSÕES (A e B) — o coração da sincronização
// ------------------------------------------------------------------
function juntarMeta(ma, mb) {
    const r = metaVazio();
    for (const [k, v] of Object.entries(ma.t)) r.t[k] = v;
    for (const [k, v] of Object.entries(mb.t)) r.t[k] = maior(r.t[k], v);
    for (const [k, v] of Object.entries(ma.x)) r.x[k] = v;
    for (const [k, v] of Object.entries(mb.x)) r.x[k] = maior(r.x[k], v);
    return r;
}

function juntarValor(a, b, caminho, ma, mb, mr) {
    const ta = ma.t[caminho] || '';
    const tb = mb.t[caminho] || '';

    // Listas de itens: une os itens dos dois lados
    if (ehListaDeItens(a) && ehListaDeItens(b)) {
        const mapaA = new Map(a.map((i) => [i[MARCA_ITEM], i]));
        const mapaB = new Map(b.map((i) => [i[MARCA_ITEM], i]));
        const sids = new Set([...mapaA.keys(), ...mapaB.keys()]);
        const resultado = [];

        sids.forEach((sid) => {
            if (!sid) return;
            const ci = caminhoItem(caminho, sid);
            if (mr.x[ci]) return; // apagado em algum dos lados → continua apagado

            const ia = mapaA.get(sid);
            const ib = mapaB.get(sid);
            let item;
            if (ia && ib) item = juntarValor(ia, ib, ci, ma, mb, mr);
            else item = clonar(ia || ib);
            item[MARCA_ITEM] = sid;
            resultado.push(item);
        });

        // ordem = ordem de criação (desempate pelo _sid)
        resultado.sort((i1, i2) => {
            const c1 = mr.t[`${caminhoItem(caminho, i1[MARCA_ITEM])}#c`] || '';
            const c2 = mr.t[`${caminhoItem(caminho, i2[MARCA_ITEM])}#c`] || '';
            if (c1 !== c2) return c1 < c2 ? -1 : 1;
            return i1[MARCA_ITEM] < i2[MARCA_ITEM] ? -1 : 1;
        });
        return resultado;
    }

    // Objetos: junta campo a campo
    if (ehObjeto(a) && ehObjeto(b)) {
        const r = {};
        const chaves = new Set([...Object.keys(a), ...Object.keys(b)]);
        chaves.forEach((k) => {
            if (k === MARCA_ITEM) {
                r[k] = a[k] || b[k];
                return;
            }
            const cc = caminhoCampo(caminho, k);
            const temA = Object.prototype.hasOwnProperty.call(a, k);
            const temB = Object.prototype.hasOwnProperty.call(b, k);

            if (temA && temB) {
                r[k] = juntarValor(a[k], b[k], cc, ma, mb, mr);
            } else if (temA) {
                // só A tem: B apagou depois? (carimbo de B mais novo)
                if ((ma.t[cc] || '') >= (mb.t[cc] || '')) r[k] = clonar(a[k]);
            } else if ((mb.t[cc] || '') >= (ma.t[cc] || '')) {
                r[k] = clonar(b[k]);
            }
        });
        return r;
    }

    // Folhas (ou tipos diferentes): vale o mais recente
    if (iguais(a, b)) return clonar(a);
    if (ta > tb) return clonar(a);
    if (tb > ta) return clonar(b);
    return clonar(desempatar(a, b));
}

function juntar(a, ma, b, mb, raiz) {
    const mr = juntarMeta(ma, mb);
    const valor = juntarValor(a, b, raiz, ma, mb, mr);
    return { valor, meta: mr };
}

// ------------------------------------------------------------------
// 4) CÓDIGOS REPETIDOS (PAC0005 criado nos dois computadores)
//    O mais antigo fica com o código; os outros ganham o próximo livre.
//    A regra é a mesma nos dois computadores → chegam ao mesmo resultado.
// ------------------------------------------------------------------
function corrigirCodigosRepetidos(lista, raiz, meta, ts) {
    if (!Array.isArray(lista)) return [];
    const prefixo = raiz === 'casais' ? 'CAS' : 'PAC';
    const grupos = new Map();
    lista.forEach((r) => {
        if (!r.id) return;
        if (!grupos.has(r.id)) grupos.set(r.id, []);
        grupos.get(r.id).push(r);
    });

    let maiorNumero = 0;
    lista.forEach((r) => {
        const n = parseInt(String(r.id || '').replace(/\D/g, ''), 10);
        if (Number.isFinite(n) && n > maiorNumero) maiorNumero = n;
    });

    const renumerados = [];
    const criacao = (r) => meta.t[`${caminhoItem(raiz, r[MARCA_ITEM])}#c`] || '';

    [...grupos.values()].filter((g) => g.length > 1).forEach((grupo) => {
        grupo.sort((r1, r2) => {
            const c1 = criacao(r1), c2 = criacao(r2);
            if (c1 !== c2) return c1 < c2 ? -1 : 1;
            return r1[MARCA_ITEM] < r2[MARCA_ITEM] ? -1 : 1;
        });
        grupo.slice(1).forEach((r) => {
            maiorNumero++;
            const antigo = r.id;
            r.id = `${prefixo}${String(maiorNumero).padStart(4, '0')}`;
            meta.t[caminhoCampo(caminhoItem(raiz, r[MARCA_ITEM]), 'id')] = ts;
            renumerados.push({ de: antigo, para: r.id, nome: r.nomeCompleto || `${r.p1NomeCompleto || ''} e ${r.p2NomeCompleto || ''}` });
        });
    });
    return renumerados;
}

// ------------------------------------------------------------------
// API usada pelo main.js
// ------------------------------------------------------------------

/** Primeira vez: prepara os dados antigos (dá _sid aos itens). */
function prepararChave(raiz, valor, meta) {
    const m = meta || metaVazio();
    const v = valor === undefined || valor === null ? [] : valor;
    prepararLegado(v, raiz, m, raiz, null);
    return { valor: v, meta: m };
}

/**
 * Gravação feita por uma tela.
 *  atual/metaAtual → o que está salvo agora
 *  base/metaBase   → o que a tela leu antes de editar
 *  novo            → o que a tela mandou salvar
 */
function gravacaoLocal(raiz, atual, metaAtual, base, metaBase, novo, ts) {
    const novoClone = clonar(novo);
    const metaNovo = clonar(metaBase);
    const contador = { n: 0 };
    carimbarDiferencas(clonar(base), novoClone, raiz, metaNovo, ts, contador);

    const { valor, meta } = juntar(atual, metaAtual, novoClone, metaNovo, raiz);
    const renumerados = (raiz === 'pacientes' || raiz === 'casais')
        ? corrigirCodigosRepetidos(valor, raiz, meta, ts) : [];

    return { valor, meta, valorTela: novoClone, metaTela: metaNovo, mudancas: contador.n, renumerados };
}

/** Junta a versão de outro computador com a daqui. */
function juntarRemoto(raiz, local, metaLocal, remoto, metaRemoto, ts) {
    const { valor, meta } = juntar(local, metaLocal, remoto, metaRemoto, raiz);
    const renumerados = (raiz === 'pacientes' || raiz === 'casais')
        ? corrigirCodigosRepetidos(valor, raiz, meta, ts) : [];
    return { valor, meta, mudou: !iguais(valor, local), renumerados };
}

/** Quantas alterações existem entre duas versões (para escolher a "base" certa). */
function contarDiferencas(raiz, base, novo) {
    const contador = { n: 0 };
    carimbarDiferencas(clonar(base), clonar(novo), raiz, metaVazio(), '0', contador);
    return contador.n;
}

/** Maior carimbo presente no meta (para acertar o relógio). */
function maiorCarimbo(meta) {
    let m = '';
    for (const v of Object.values(meta.t)) if (v > m) m = v;
    for (const v of Object.values(meta.x)) if (v > m) m = v;
    return m;
}

module.exports = {
    criarRelogio,
    metaVazio,
    prepararChave,
    gravacaoLocal,
    juntarRemoto,
    contarDiferencas,
    maiorCarimbo,
    statusCalculado,
    // exportados para os testes
    _interno: { juntar, carimbarDiferencas, corrigirCodigosRepetidos, sidLegado },
};
