// ═══════════════════════════════════════════════
// IMPRESSÃO / PDF DA ANAMNESE DE CASAL
// ?id=CAS0001                → abre já com a janela de impressão
// ?id=CAS0001&visualizar=true → abre para leitura, com botão Imprimir / Salvar PDF
// O "Registro individual (sigiloso)" só sai se for marcado na barra de cima.
// ═══════════════════════════════════════════════

const params = new URLSearchParams(window.location.search);
const idCasal = params.get("id");
const modoVisualizar = params.get("visualizar") === "true";

const container = document.getElementById("conteudo-impressao");

let casal = null;
let dados = {};
let nomes = { p1: "Pessoa 1", p2: "Pessoa 2" };

function esc(texto) {
    return String(texto ?? "").replace(/[&<>"']/g, (c) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
}

function formatarDataBR(valor) {
    if (!valor) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
        const [ano, mes, dia] = valor.split("-");
        return `${dia}/${mes}/${ano}`;
    }
    return valor;
}

function carimboGeracao() {
    const agora = new Date();
    return `Documento gerado eletronicamente em ${agora.toLocaleDateString("pt-BR")} às ${agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}

// texto pronto de uma resposta (ou "" se não foi respondida)
function valorDoCampo(campo, nome) {
    const v = dados[nome];
    switch (campo.t) {
        case "date":
            return formatarDataBR(v);
        case "escala":
            return v !== undefined && v !== "" ? `${v} / 10` : "";
        case "checks": {
            const itens = String(v || "").split(";").map(s => s.trim()).filter(Boolean);
            const outro = campo.outro ? String(dados[`${nome}_outro`] || "").trim() : "";
            if (outro) itens.push(`Outro: ${outro}`);
            return itens.join(" • ");
        }
        default:
            return String(v ?? "").trim();
    }
}

function blocoCampo(rotulo, valor) {
    return `
        <div class="campo-impresso">
            <strong>${esc(trocarNomesCasal(rotulo, nomes))}</strong>
            <span>${esc(valor)}</span>
        </div>`;
}

function htmlConflitos(item) {
    const linhas = item.areas
        .map(([chave, nomeArea]) => ({
            nomeArea,
            existe: dados[`${item.n}_${chave}`] === "Sim",
            intensidade: dados[`${item.n}Int_${chave}`]
        }))
        .filter(l => l.existe || (l.intensidade !== undefined && l.intensidade !== ""));

    if (!linhas.length) return "";

    return `
        <table class="tabela-impressa" style="margin:6px 0 16px;">
            <thead><tr><th>Área de conflito</th><th>Existe conflito?</th><th>Intensidade (0–10)</th></tr></thead>
            <tbody>
                ${linhas.map(l => `
                    <tr>
                        <td>${esc(l.nomeArea)}</td>
                        <td class="centro">${l.existe ? "Sim" : "Não"}</td>
                        <td class="centro">${l.intensidade !== undefined && l.intensidade !== "" ? esc(l.intensidade) : "-"}</td>
                    </tr>`).join("")}
            </tbody>
        </table>`;
}

function htmlPessoas(item) {
    // uma linha por pergunta: Pessoa 1 à esquerda, Pessoa 2 à direita
    const linhas = item.campos
        .map(c => ({ c, v1: valorDoCampo(c, `p1_${c.n}`), v2: valorDoCampo(c, `p2_${c.n}`) }))
        .filter(l => l.v1 || l.v2);

    if (!linhas.length) return "";

    return `
        <table class="tabela-impressa" style="margin:6px 0 16px;">
            <thead><tr><th style="width:30%">Pergunta</th><th>${esc(nomes.p1)}</th><th>${esc(nomes.p2)}</th></tr></thead>
            <tbody>
                ${linhas.map(l => `
                    <tr>
                        <td style="font-family:Arial,Helvetica,sans-serif;font-size:8.5pt;color:#666;text-transform:uppercase;">${esc(trocarNomesCasal(l.c.l, nomes))}</td>
                        <td style="white-space:pre-wrap">${esc(l.v1 || "-")}</td>
                        <td style="white-space:pre-wrap">${esc(l.v2 || "-")}</td>
                    </tr>`).join("")}
            </tbody>
        </table>`;
}

function htmlSecao(secao) {
    let corpo = "";
    let subtituloPendente = "";

    secao.itens.forEach(item => {
        let parte = "";
        if (item.t === "subtitulo") {
            subtituloPendente = `<p style="font-family:Arial,Helvetica,sans-serif;font-size:8.5pt;font-weight:700;color:#5c7a48;text-transform:uppercase;margin:10px 0 8px;">${esc(trocarNomesCasal(item.l, nomes))}</p>`;
            return;
        }
        if (item.t === "conflitos") parte = htmlConflitos(item);
        else if (item.t === "pessoas") parte = htmlPessoas(item);
        else {
            const valor = valorDoCampo(item, item.n);
            if (valor) parte = blocoCampo(item.l, valor);
        }
        if (parte) {
            corpo += subtituloPendente + parte; // subtítulo só aparece se algo abaixo dele foi respondido
            subtituloPendente = "";
        }
    });

    if (!corpo) return "";

    const titulo = secao.num ? `${secao.num}. ${secao.titulo}` : secao.titulo;
    const marca = secao.sigiloso ? " — SIGILOSO" : (secao.exclusivo ? " — uso exclusivo da psicóloga" : "");
    return `<h2 class="titulo-secao">${esc(titulo)}${esc(marca)}</h2>${corpo}`;
}

function renderizar(incluirSigiloso) {
    const nomeCompletoCasal = `${casal.p1NomeCompleto || "?"} e ${casal.p2NomeCompleto || "?"}`;
    const dataEntrevista = [formatarDataBR(dados.dataAnamnese), dados.horaAnamnese].filter(Boolean).join(" às ");

    const secoesHTML = SECOES_ANAMNESE_CASAL
        .filter(s => s.id !== "entrevista")
        .filter(s => incluirSigiloso || !s.sigiloso)
        .map(htmlSecao)
        .join("");

    container.innerHTML = `
    <div class="prontuario">

        <img class="marca-dagua" src="../assets/img/logo-marca-dagua.png" alt="">

        <div class="tag-confidencial">Confidencial</div>

        <div class="cabecalho-print">
            <div class="clinica-nome">Cláudia Bethânia — Psicóloga Clínica</div>
            <div class="subtitulo-clinica">CRP 18/9851</div>
            <h1>Anamnese de Casal — TCC</h1>
        </div>

        <div class="identificacao-grid">
            <div class="item full"><span class="rotulo">Casal:</span><span class="valor">${esc(casal.nomeCasal || nomeCompletoCasal)}</span></div>
            <div class="item"><span class="rotulo">Código:</span><span class="valor">${esc(casal.id || "-")}</span></div>
            <div class="item"><span class="rotulo">Data da entrevista:</span><span class="valor">${esc(dataEntrevista || "-")}</span></div>
        </div>

        ${secoesHTML || `<p class="sem-registro">A anamnese ainda não foi preenchida.</p>`}

        <div class="assinatura">
            <div class="linha-assinatura"></div>
            <h3>Dra. Cláudia Bethânia</h3>
            <p>Psicóloga Clínica — CRP: 18/9851</p>
        </div>

        <div class="rodape-contato">
            maclaudiabethaniapsicologa@gmail.com · (66) 99689-4144 · @psiclaudiabethania_
        </div>

        <div class="timestamp-impressao">${carimboGeracao()}</div>
    </div>`;
}

function montarBarra() {
    const barra = document.createElement("div");
    barra.className = "barra-acoes-tela";
    barra.innerHTML = `
        <label style="display:inline-flex;align-items:center;gap:6px;font-size:13px;color:#6a6a58;margin-right:auto;">
            <input type="checkbox" id="chkSigiloso"> Incluir registro sigiloso
        </label>
        <button type="button" id="btnImprimirAnamnese">🖨️ Imprimir / Salvar PDF</button>
        <button type="button" id="btnFecharAnamnese" class="secundario">Fechar</button>
    `;
    document.body.prepend(barra);

    document.getElementById("chkSigiloso").addEventListener("change", (e) => renderizar(e.target.checked));
    document.getElementById("btnImprimirAnamnese").addEventListener("click", () => window.print());
    document.getElementById("btnFecharAnamnese").addEventListener("click", () => window.close());
}

async function iniciar() {
    const casais = JSON.parse(await window.storage.getItem("casais")) || [];
    casal = casais.find(c => String(c.id) === String(idCasal));

    if (!casal) {
        container.innerHTML = "<h1>Casal não encontrado</h1>";
        return false;
    }

    nomes = nomesCurtosCasal(casal);
    dados = (casal.anamneseCasal && typeof casal.anamneseCasal === "object") ? casal.anamneseCasal : {};
    document.title = `Anamnese de Casal — ${casal.nomeCasal || casal.id}`;

    renderizar(false);
    return true;
}

iniciar().then((ok) => {
    if (!ok) return;
    if (modoVisualizar) {
        montarBarra();
    } else {
        window.print();
    }
});
