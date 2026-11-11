// ═══════════════════════════════════════════════
// IMPRESSÃO DA ATIVIDADE TERAPÊUTICA
// Os dados vêm da tela Atividades (localStorage "atividadeImpressao"),
// são lidos uma vez e apagados em seguida (o nome do paciente não fica guardado).
// A folha é montada no modelo padrão (folha-padrao.js), em A4.
// ?visualizar=true → mostra a folha com botões; sem isso → abre a impressão direto.
// ═══════════════════════════════════════════════
const params = new URLSearchParams(window.location.search);
const modoVisualizar = params.get("visualizar") === "true";
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
        if (modoVisualizar) montarBarra();
        else window.print();
    });
})();
