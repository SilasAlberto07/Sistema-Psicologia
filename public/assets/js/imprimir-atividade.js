// ═══════════════════════════════════════════════
// IMPRESSÃO DA ATIVIDADE TERAPÊUTICA
// Os dados vêm da tela Atividades (localStorage "atividadeImpressao"),
// são lidos uma vez e apagados em seguida (o nome do paciente não fica guardado).
// A folha é montada no modelo padrão (folha-padrao.js), em A4.
// ?visualizar=true → mostra a folha com botões; sem isso → abre a impressão direto.
// ═══════════════════════════════════════════════
const params = new URLSearchParams(window.location.search);
const modoVisualizar = params.get("visualizar") === "true";
const modoGuardar = params.get("guardar") === "true"; // guarda nos Documentos do paciente e fecha
const container = document.getElementById("conteudo-impressao");

function esc(texto) {
    return String(texto ?? "").replace(/[&<>"']/g, (c) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
}

function dataBR(iso) {
    const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

function espacoResposta(tipo) {
    const linhas = String(tipo || "").match(/^linhas-(\d+)$/);
    if (linhas) {
        const n = Math.min(30, Number(linhas[1]) || 5);
        return `<div class="resposta-linhas">${"<div></div>".repeat(n)}</div>`;
    }
    if (tipo === "caixa-pequena") return `<div class="resposta-caixa pequena"></div>`;
    if (tipo === "caixa-grande") return `<div class="resposta-caixa grande"></div>`;
    if (tipo === "nenhum") return "";
    return `<div class="resposta-linhas">${"<div></div>".repeat(5)}</div>`;
}

function montarAtividade(dados) {
    const a = dados.atividade || {};
    const perguntas = (a.perguntas || []).filter(p => String(p.texto || "").trim());

    const ident = [
        dados.paciente ? `<div class="item full"><span class="rotulo">Paciente:</span><span class="valor">${esc(dados.paciente)}</span></div>` : "",
        `<div class="item"><span class="rotulo">Data:</span><span class="valor">${esc(dataBR(dados.data)) || "____/____/______"}</span></div>`
    ].join("");

    return `
    <div class="prontuario">
        <div class="cabecalho-print">
            <h1>${esc(a.titulo || "Atividade Terapêutica")}</h1>
        </div>

        <div class="identificacao-grid atividade-ident">${ident}</div>

        ${a.objetivoPaciente ? `
            <h2 class="titulo-secao">Objetivo da atividade</h2>
            <p class="atividade-texto">${esc(a.objetivoPaciente)}</p>` : ""}

        ${a.introducao ? `
            <h2 class="titulo-secao">Orientações</h2>
            <p class="atividade-texto">${esc(a.introducao)}</p>` : ""}

        <h2 class="titulo-secao">Atividade</h2>
        ${perguntas.map((p, i) => `
            <div class="atividade-pergunta">
                <div class="atividade-pergunta-texto">
                    <span class="atividade-numero">${i + 1}</span>
                    <span>${esc(p.texto)}</span>
                </div>
                ${espacoResposta(p.espaco)}
            </div>`).join("")}

        ${a.orientacoesFinais ? `<div class="atividade-final">${esc(a.orientacoesFinais)}</div>` : ""}
    </div>`;
}

// ═══════════════════════════════════════════════
// APROVEITAR AO MÁXIMO CADA FOLHA A4
// Simula onde cada folha vai terminar (mesma regra da impressão:
// um bloco que não cabe inteiro vai todo para a próxima folha).
// O espaço que ficaria em branco no fim da folha vira linhas a mais
// na última pergunta daquela folha (ou uma caixa maior).
// Nada é dividido entre duas folhas.
// ═══════════════════════════════════════════════
const MM = 96 / 25.4;                 // pixels por milímetro
const AREA_UTIL_FOLHA = (297 - 37 - 41) * MM; // A4 menos o espaço do topo e do rodapé
const FOLGA_FOLHA = 3 * MM;           // margem de segurança no fim de cada folha
const FOLGA_PREENCHER = 2 * MM;       // não encosta o preenchimento no limite

function medirBlocos(texto) {
    return [...texto.children].map(el => {
        const estilo = getComputedStyle(el);
        return {
            el,
            altura: el.getBoundingClientRect().height,
            margemTopo: parseFloat(estilo.marginTop) || 0,
            margemBaixo: parseFloat(estilo.marginBottom) || 0,
            // título de seção vai sempre junto com o que vem logo depois
            grudaNoProximo: el.classList.contains("titulo-secao")
        };
    });
}

function preencherEspacoFinal(bloco, sobra, alturaLinha) {
    if (!bloco || !bloco.el.classList.contains("atividade-pergunta")) return;
    const espaco = sobra - FOLGA_PREENCHER;
    if (espaco <= 0) return;

    const linhas = bloco.el.querySelector(".resposta-linhas");
    const caixa = bloco.el.querySelector(".resposta-caixa");
    if (linhas) {
        const extras = Math.floor(espaco / alturaLinha);
        for (let i = 0; i < extras; i++) linhas.appendChild(document.createElement("div"));
    } else if (caixa) {
        caixa.style.height = `${caixa.getBoundingClientRect().height + espaco}px`;
    }
}

function compactarPaginas() {
    const texto = document.querySelector(".folha .texto");
    if (!texto) return;

    const linhaModelo = texto.querySelector(".resposta-linhas div");
    const alturaLinha = linhaModelo ? linhaModelo.getBoundingClientRect().height : 7.5 * MM;
    const limite = AREA_UTIL_FOLHA - FOLGA_FOLHA;
    const blocos = medirBlocos(texto);

    let posicao = 0;          // até onde a folha atual já está ocupada
    let margemAnterior = 0;
    let ultimoDaFolha = null;
    let folha = 1;
    const inicioDeFolha = [];

    blocos.forEach((bloco, i) => {
        let topo = posicao === 0 ? 0 : posicao + Math.max(margemAnterior, bloco.margemTopo);
        let fim = topo + bloco.altura;

        // título: só fica nesta folha se o bloco seguinte também couber
        const proximo = blocos[i + 1];
        const fimComProximo = bloco.grudaNoProximo && proximo
            ? fim + Math.max(bloco.margemBaixo, proximo.margemTopo) + proximo.altura
            : fim;

        if (posicao > 0 && fimComProximo > limite) {
            preencherEspacoFinal(ultimoDaFolha, limite - posicao, alturaLinha);
            folha++;
            inicioDeFolha.push({ el: bloco.el, folha });
            topo = 0;
            fim = bloco.altura;
        }

        // bloco maior que uma folha inteira (raro): continua na folha seguinte
        posicao = fim > limite ? fim % limite : fim;
        margemAnterior = bloco.margemBaixo;
        ultimoDaFolha = bloco;
    });

    // na visualização em tela, marca onde começa cada folha (não sai na impressão)
    inicioDeFolha.forEach(({ el, folha: numero }) => {
        const marca = document.createElement("div");
        marca.className = "marca-pagina";
        marca.innerHTML = `<span>Folha ${numero}</span>`;
        el.before(marca);
    });
}

function montarBarra() {
    const barra = document.createElement("div");
    barra.className = "barra-acoes-tela";
    barra.innerHTML = `
        <button type="button" id="btnImprimirAtividade">🖨️ Imprimir / Salvar PDF</button>
        <button type="button" id="btnFecharAtividade" class="secundario">Fechar</button>
    `;
    document.body.prepend(barra);
    document.getElementById("btnImprimirAtividade").addEventListener("click", () => window.print());
    document.getElementById("btnFecharAtividade").addEventListener("click", () => window.close());
}

// ═══════════════════════════════════════════════
// GUARDAR NOS DOCUMENTOS DO PACIENTE (tela Sessões → Documentos)
// Se a mesma atividade já foi guardada para esta pessoa, a anterior
// fica como "substituída" (nada é apagado).
// ═══════════════════════════════════════════════
async function guardarNosDocumentos(dados) {
    const a = dados.atividade;
    const destino = dados.destino;

    let substitui = null;
    const lista = await DocsPaciente.lerLista(destino.origem);
    const registro = lista.find(r => String(r.id) === String(destino.id));
    if (registro) {
        const anterior = (registro.documentos || []).find(d =>
            d.tipo === "atividade" && (d.status || "ativo") === "ativo" &&
            d.dados && d.dados.atividadeId === a.id &&
            (d.pessoa || null) === (destino.pessoa || null));
        if (anterior) substitui = anterior.id;
    }

    // só o necessário: o conteúdo completo está no PDF
    const r = await DocsPaciente.guardarPaginaComoPDF({
        tipo: "atividade",
        tituloDocumento: a.titulo || "Atividade Terapêutica",
        atividadeId: a.id,
        categoria: a.categoria,
        faixaEtaria: a.faixaEtaria,
        data: dados.data,
        destino,
        substitui
    });
    return { ok: !!(r && r.ok), erro: r && r.erro, substituiu: !!substitui };
}

(function iniciar() {
    let dados = null;
    try { dados = JSON.parse(localStorage.getItem("atividadeImpressao") || "null"); } catch (e) { }
    localStorage.removeItem("atividadeImpressao");

    if (!dados || !dados.atividade) {
        container.innerHTML = "<h1 style='text-align:center;font-size:16px;font-family:Inter,Arial'>Nenhuma atividade para imprimir. Abra pela tela Atividades Terapêuticas.</h1>";
        return;
    }

    document.title = dados.atividade.titulo || "Atividade Terapêutica";
    container.innerHTML = montarAtividade(dados);

    FolhaPadrao.aplicar(container).then(() => {
        compactarPaginas();
        if (modoGuardar && dados.destino) {
            document.title = "Guardando nos documentos do paciente...";
            guardarNosDocumentos(dados)
                .catch(e => ({ ok: false, erro: e && e.message }))
                .then(resultado => {
                    localStorage.setItem("atividadeGuardadaResultado", JSON.stringify(resultado));
                    window.close();
                });
        } else if (modoVisualizar) montarBarra();
        else window.print();
    });
})();
