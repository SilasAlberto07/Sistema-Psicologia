// ═══════════════════════════════════════════════
// EMPRESAS — acompanhamento (no estilo da tela Sessões)
// Cada empresa é um card: no cabeçalho os contadores (documentos, contrato,
// status do contrato e tempo de contrato); ao clicar abre tudo o que foi feito na empresa.
// ═══════════════════════════════════════════════

const escEmp = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[c]));

let abaEmpresas = "ativas";
let empresasCarregadas = [];
const cardsAbertosEmpresas = new Set();
const CHAVE_ESTADO_EMPRESAS = "estadoTelaEmpresas";

const container = document.getElementById("containerEmpresas");
const campoBusca = document.getElementById("pesquisaEmpresa");

// ---------------- helpers ----------------
function dataHoraBR(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d)) return Empresas.dataBR(iso);
    return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function normalizar(t) {
    return String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function linhaInfo(rotulo, valor, icone) {
    if (valor === undefined || valor === null || String(valor).trim() === "") return "";
    return `<div class="emp-info-item"><i class="ti ${icone}"></i><span><small>${rotulo}</small>${escEmp(valor)}</span></div>`;
}

// ---------------- cabeçalho do card ----------------
function badgeContrato(empresa, sit) {
    const periodo = Empresas.textoPeriodo(empresa);
    return `
        ${periodo ? `<span class="contador-badge total"><i class="ti ti-file-certificate"></i> Contrato: ${escEmp(periodo)}</span>` : ""}
        <span class="contador-badge contrato ${sit.status}"><i class="ti ti-circle-check"></i> ${escEmp(sit.texto)}</span>`;
}

function montarCard(empresa) {
    const chave = String(empresa.id);
    const aberto = cardsAbertosEmpresas.has(chave);
    const sit = Empresas.situacaoContrato(empresa);
    const docs = Empresas.documentosValendo(empresa);
    const entrevistas = docs.filter(d => d.tipo === "entrevista").length;
    const nome = Empresas.nome(empresa);
    const subtitulo = [empresa.cnpj ? `CNPJ ${empresa.cnpj}` : "", empresa.ramo, empresa.cidadeEstado].filter(Boolean).join(" · ");

    return `
        <div class="paciente-sessao-card empresa-card ${empresa.arquivada ? "arquivada" : ""}" data-id="${escEmp(empresa.id)}">

            <div class="paciente-header empresa-header" data-card-key="${escEmp(chave)}">
                <div class="titulo-paciente">
                    <h2>
                        ${escEmp(nome)}
                        <span class="codigo-empresa">${escEmp(empresa.codigo || "")}</span>
                        ${empresa.arquivada ? `<span class="tag-arquivada">Arquivada</span>` : ""}
                    </h2>
                    <small>${subtitulo ? escEmp(subtitulo) + " · " : ""}📅 Início: ${escEmp(Empresas.dataBR(empresa.dataInicio) || "-")}</small>
                </div>

                <div class="contadores-sessao">
                    <span class="contador-badge realizada"><i class="ti ti-folder"></i> ${docs.length} documento${docs.length === 1 ? "" : "s"}</span>
                    ${entrevistas ? `<span class="contador-badge agendada"><i class="ti ti-users"></i> ${entrevistas} entrevista${entrevistas === 1 ? "" : "s"}</span>` : ""}
                    ${badgeContrato(empresa, sit)}
                </div>

                <i class="ti ti-chevron-down seta-expandir-sessao ${aberto ? "aberta" : ""}"></i>
            </div>

            <div class="corpo-sessoes corpo-empresa" style="display:${aberto ? "block" : "none"}">
                ${aberto ? montarCorpo(empresa, sit) : ""}
            </div>
        </div>`;
}

// ---------------- corpo do card (aberto) ----------------
function montarCorpo(empresa, sit) {
    return `
        <div class="emp-corpo-grid">

            <section class="emp-bloco emp-contrato">
                <h3><i class="ti ti-file-certificate"></i> Contrato</h3>
                <p class="emp-contrato-status ${sit.status}">${escEmp(sit.texto)}</p>
                <div class="emp-info-lista">
                    ${linhaInfo("Tempo de contrato", Empresas.textoPeriodo(empresa), "ti-file-certificate")}
                    ${linhaInfo("Vigência", sit.vigencia, "ti-calendar")}
                    ${linhaInfo("Acompanhamento do projeto", empresa.respProjeto, "ti-user-check")}
                </div>
                ${empresa.escopo ? `<div class="emp-escopo"><small>Objeto e escopo do serviço</small><p>${escEmp(empresa.escopo)}</p></div>` : ""}
            </section>

            <section class="emp-bloco">
                <h3><i class="ti ti-id"></i> Dados da empresa</h3>
                <div class="emp-info-lista">
                    ${linhaInfo("Razão social", empresa.razaoSocial, "ti-building")}
                    ${linhaInfo("Responsável", [empresa.respNome, empresa.respCargo].filter(Boolean).join(" – "), "ti-user")}
                    ${linhaInfo("Telefone/WhatsApp", empresa.respTelefone, "ti-phone")}
                    ${linhaInfo("E-mail", empresa.respEmail, "ti-mail")}
                    ${linhaInfo("Colaboradores", empresa.totalColaboradores, "ti-users")}
                    ${linhaInfo("Setores", empresa.qtdSetores, "ti-sitemap")}
                    ${linhaInfo("RH/Administrativo", empresa.respRH, "ti-user-cog")}
                    ${linhaInfo("Endereço", [empresa.endereco, empresa.cidadeEstado, empresa.cep].filter(Boolean).join(" · "), "ti-map-pin")}
                </div>
                ${empresa.observacoes ? `<div class="emp-escopo"><small>Observações</small><p>${escEmp(empresa.observacoes)}</p></div>` : ""}
            </section>
        </div>

        <section class="emp-bloco emp-docs">
            <div class="emp-docs-topo">
                <h3><i class="ti ti-folder"></i> Realizado na empresa</h3>
                <button type="button" class="btn-adicionar-sessoes" data-acao-empresa="novo-relatorio" data-id="${escEmp(empresa.id)}">
                    <i class="ti ti-plus"></i> Novo relatório
                </button>
            </div>
            ${montarListaDocumentos(empresa)}
        </section>

        <div class="emp-acoes">
            <button type="button" class="btn-emp" data-acao-empresa="editar" data-id="${escEmp(empresa.id)}"><i class="ti ti-pencil"></i> Editar cadastro</button>
            <button type="button" class="btn-emp" data-acao-empresa="ficha" data-id="${escEmp(empresa.id)}"><i class="ti ti-printer"></i> Imprimir ficha cadastral</button>
            ${empresa.arquivada
                ? `<button type="button" class="btn-emp" data-acao-empresa="reativar" data-id="${escEmp(empresa.id)}"><i class="ti ti-archive-off"></i> Reativar empresa</button>`
                : `<button type="button" class="btn-emp discreto" data-acao-empresa="arquivar" data-id="${escEmp(empresa.id)}"><i class="ti ti-archive"></i> Arquivar empresa</button>`}
        </div>`;
}

function montarListaDocumentos(empresa) {
    const docs = [...(empresa.documentos || [])].sort((a, b) => String(b.criadoEm).localeCompare(String(a.criadoEm)));
    if (!docs.length) {
        return `<div class="docs-vazio"><i class="ti ti-folder-off"></i>
            <p>Nenhum relatório ainda. Clique em <strong>Novo relatório</strong> para gerar o primeiro.</p></div>`;
    }

    return `<div class="emp-docs-lista">${docs.map(doc => {
        const tipo = DocsPaciente.TIPOS[doc.tipo] || DocsPaciente.TIPOS.anexo;
        const status = doc.status || "ativo";
        const ativo = status === "ativo";
        const candidato = doc.dados && (doc.dados.candidato || doc.dados.nomeCompleto);
        const cargo = doc.dados && doc.dados.cargo;

        let etiqueta = "";
        if (status === "cancelado") etiqueta = `<span class="docs-status cancelado">Cancelado em ${escEmp(dataHoraBR(doc.canceladoEm))}${doc.motivoCancelamento ? ` · ${escEmp(doc.motivoCancelamento)}` : ""}</span>`;
        if (status === "substituido") etiqueta = `<span class="docs-status substituido">Substituído por uma versão editada em ${escEmp(dataHoraBR(doc.substituidoEm))}</span>`;

        return `
            <div class="docs-item tipo-${escEmp(doc.tipo)} ${ativo ? "" : "inativo"}" data-doc="${escEmp(doc.id)}" data-empresa="${escEmp(empresa.id)}">
                <div class="docs-item-icone"><i class="ti ${tipo.icone}"></i></div>
                <div class="docs-item-info">
                    <div class="docs-item-linha1">
                        <span class="docs-tipo">${escEmp(tipo.nome)}</span>
                        <strong class="docs-item-titulo">${escEmp(candidato || doc.titulo)}</strong>
                        ${cargo ? `<span class="docs-pessoa-tag">${escEmp(cargo)}</span>` : ""}
                    </div>
                    <div class="docs-item-linha2">
                        <span><i class="ti ti-calendar"></i> ${escEmp(dataHoraBR(doc.criadoEm))}</span>
                        <span><i class="ti ti-file-text"></i> ${escEmp(doc.titulo)}${doc.substitui ? " (versão editada)" : ""}</span>
                    </div>
                    ${etiqueta}
                </div>
                <div class="docs-item-acoes">
                    ${doc.pdf ? `<button type="button" data-acao-doc="abrir" title="Abrir"><i class="ti ti-eye"></i> Abrir</button>` : ""}
                    ${doc.pdf ? `<button type="button" data-acao-doc="baixar" title="Baixar"><i class="ti ti-download"></i></button>` : ""}
                    ${ativo && tipo.editavel ? `<button type="button" data-acao-doc="editar" title="Editar"><i class="ti ti-pencil"></i></button>` : ""}
                    ${ativo ? `<button type="button" data-acao-doc="cancelar" class="perigo" title="Cancelar documento"><i class="ti ti-ban"></i></button>` : ""}
                    <button type="button" data-acao-doc="excluir" class="perigo" title="Excluir documento"><i class="ti ti-trash"></i></button>
                </div>
            </div>`;
    }).join("")}</div>`;
}

// ---------------- desenhar a tela ----------------
async function renderEmpresas() {
    empresasCarregadas = await Empresas.lerTodas();

    const ativas = empresasCarregadas.filter(e => !e.arquivada);
    const arquivadas = empresasCarregadas.filter(e => e.arquivada);
    document.getElementById("qtdAtivas").textContent = ativas.length;
    document.getElementById("qtdArquivadas").textContent = arquivadas.length;

    const busca = normalizar(campoBusca.value.trim());
    let lista = abaEmpresas === "arquivadas" ? arquivadas : ativas;
    if (busca) {
        lista = lista.filter(e => normalizar([e.nomeFantasia, e.razaoSocial, e.cnpj, e.codigo, e.ramo].join(" ")).includes(busca)
            || String(e.cnpj || "").replace(/\D/g, "").includes(busca.replace(/\D/g, "") || "§"));
    }
    lista.sort((a, b) => Empresas.nome(a).localeCompare(Empresas.nome(b), "pt-BR"));

    if (!lista.length) {
        container.innerHTML = `
            <div class="placeholder-sessoes">
                <h3>${busca ? "Nenhuma empresa encontrada" : abaEmpresas === "arquivadas" ? "Nenhuma empresa arquivada" : "Nenhuma empresa cadastrada"}</h3>
                <p>${busca ? "Confira o nome digitado." : abaEmpresas === "arquivadas" ? "Empresas arquivadas aparecem aqui." :
                    `Cadastre a primeira em <a href="novaempresa.html">Cadastrar Empresa</a>.`}</p>
            </div>`;
        return;
    }

    container.innerHTML = lista.map(montarCard).join("");
}

// ---------------- abrir / fechar card ----------------
container.addEventListener("click", async (ev) => {
    // ações dos documentos
    const botaoDoc = ev.target.closest("button[data-acao-doc]");
    if (botaoDoc) {
        const linha = botaoDoc.closest(".docs-item");
        await acaoDocumento(botaoDoc.dataset.acaoDoc, linha.dataset.empresa, linha.dataset.doc);
        return;
    }

    // ações da empresa
    const botaoEmp = ev.target.closest("[data-acao-empresa]");
    if (botaoEmp) {
        await acaoEmpresa(botaoEmp.dataset.acaoEmpresa, botaoEmp.dataset.id);
        return;
    }

    const header = ev.target.closest(".empresa-header");
    if (!header) return;
    const chave = header.dataset.cardKey;
    if (cardsAbertosEmpresas.has(chave)) cardsAbertosEmpresas.delete(chave);
    else cardsAbertosEmpresas.add(chave);
    renderEmpresas();
});

// ---------------- abas e busca ----------------
document.querySelectorAll(".tab-tipo[data-aba]").forEach(botao => {
    botao.addEventListener("click", () => {
        document.querySelectorAll(".tab-tipo[data-aba]").forEach(b => b.classList.remove("ativa"));
        botao.classList.add("ativa");
        abaEmpresas = botao.dataset.aba;
        renderEmpresas();
    });
});

campoBusca.addEventListener("input", renderEmpresas);

// ---------------- ações da empresa ----------------
function guardarEstadoEmpresas(idAberto) {
    sessionStorage.setItem(CHAVE_ESTADO_EMPRESAS, JSON.stringify({ aberta: idAberto, aba: abaEmpresas }));
}

async function acaoEmpresa(acao, id) {
    const empresa = empresasCarregadas.find(e => String(e.id) === String(id));
    if (!empresa) return;

    if (acao === "editar") {
        guardarEstadoEmpresas(id);
        window.location.href = `novaempresa.html?id=${encodeURIComponent(id)}`;
        return;
    }

    if (acao === "novo-relatorio") {
        guardarEstadoEmpresas(id);
        window.location.href = `documentos.html?empresa=${encodeURIComponent(id)}`;
        return;
    }

    if (acao === "ficha") {
        // ficha cadastral na folha padrão (só imprime, não fica guardada)
        const dados = { ...empresa, tipo: "fichaEmpresa" };
        delete dados.documentos;
        localStorage.setItem("documentoTemp", JSON.stringify(dados));
        window.open("imprimir-documento.html", "_blank");
        return;
    }

    if (acao === "arquivar" || acao === "reativar") {
        const arquivar = acao === "arquivar";
        const r = await Swal.fire({
            icon: "question",
            title: arquivar ? "Arquivar empresa?" : "Reativar empresa?",
            html: arquivar
                ? `<p><strong>${escEmp(Empresas.nome(empresa))}</strong> vai para a aba <strong>Arquivadas</strong>.</p>
                   <p style="font-size:13px;color:#777;margin-top:8px">Nada é apagado: o cadastro e todos os relatórios continuam guardados.</p>`
                : `<p><strong>${escEmp(Empresas.nome(empresa))}</strong> volta para a aba <strong>Ativas</strong>.</p>`,
            showCancelButton: true,
            confirmButtonText: arquivar ? "Arquivar" : "Reativar",
            cancelButtonText: "Voltar"
        });
        if (!r.isConfirmed) return;

        const lista = await Empresas.lerTodas();
        const atual = lista.find(e => String(e.id) === String(id));
        if (!atual) return;
        atual.arquivada = arquivar;
        atual.arquivadaEm = arquivar ? new Date().toISOString() : "";
        await Empresas.salvarTodas(lista);
        cardsAbertosEmpresas.delete(String(id));
        await renderEmpresas();
    }
}

// ---------------- ações dos documentos ----------------
let urlVisorEmpresa = null;
const visorEmp = document.getElementById("visorEmpresa");

function fecharVisorEmpresa() {
    visorEmp.classList.add("oculto");
    document.getElementById("visorEmpresaCorpo").innerHTML = "";
    if (urlVisorEmpresa) { URL.revokeObjectURL(urlVisorEmpresa); urlVisorEmpresa = null; }
}

document.getElementById("visorEmpresaFechar").addEventListener("click", fecharVisorEmpresa);
visorEmp.addEventListener("click", (ev) => { if (ev.target === visorEmp) fecharVisorEmpresa(); });
document.addEventListener("keydown", (ev) => { if (ev.key === "Escape" && !visorEmp.classList.contains("oculto")) fecharVisorEmpresa(); });

function nomeArquivoDoc(empresa, doc) {
    const quem = doc.dados && doc.dados.candidato ? ` - ${doc.dados.candidato}` : "";
    return `${doc.titulo}${quem} - ${Empresas.nome(empresa)} ${String(doc.criadoEm || "").slice(0, 10)}.pdf`.replace(/[\\/:*?"<>|]/g, "-");
}

async function acaoDocumento(acao, idEmpresa, idDoc) {
    const empresa = empresasCarregadas.find(e => String(e.id) === String(idEmpresa));
    const doc = empresa && (empresa.documentos || []).find(d => d.id === idDoc);
    if (!doc) return;

    if (acao === "abrir") {
        urlVisorEmpresa = DocsPaciente.dataURLParaBlobURL(doc.pdf);
        document.getElementById("visorEmpresaTitulo").textContent = doc.titulo;
        document.getElementById("visorEmpresaCorpo").innerHTML = `<iframe src="${urlVisorEmpresa}"></iframe>`;
        visorEmp.classList.remove("oculto");
        return;
    }

    if (acao === "baixar") {
        const url = DocsPaciente.dataURLParaBlobURL(doc.pdf);
        const a = document.createElement("a");
        a.href = url;
        a.download = nomeArquivoDoc(empresa, doc);
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        return;
    }

    if (acao === "editar") {
        guardarEstadoEmpresas(idEmpresa);
        const params = new URLSearchParams({ editarDoc: doc.id, origem: "empresa", id: idEmpresa });
        window.location.href = `documentos.html?${params}`;
        return;
    }

    if (acao === "cancelar") {
        const r = await Swal.fire({
            icon: "warning",
            title: "Cancelar documento?",
            html: `<p style="margin-bottom:10px"><strong>${escEmp(doc.titulo)}</strong> de ${escEmp(dataHoraBR(doc.criadoEm))}</p>
                   <p style="font-size:13px;color:#777">O documento continua na lista marcado como <strong>cancelado</strong>.</p>`,
            input: "text",
            inputPlaceholder: "Motivo (opcional)",
            showCancelButton: true,
            confirmButtonText: "Cancelar documento",
            cancelButtonText: "Voltar",
            confirmButtonColor: "#b05a4a"
        });
        if (!r.isConfirmed) return;
        const ok = await DocsPaciente.cancelarDocumento("empresa", idEmpresa, doc.id, (r.value || "").trim());
        if (!ok) mostrarMensagem("Não foi possível cancelar o documento.", "error");
        await renderEmpresas();
        return;
    }

    if (acao === "excluir") {
        const r = await Swal.fire({
            icon: "warning",
            title: "Excluir documento?",
            html: `<p style="margin-bottom:10px"><strong>${escEmp(doc.titulo)}</strong> de ${escEmp(dataHoraBR(doc.criadoEm))}</p>
                   <p style="font-size:13px;color:#777">O documento sai da lista de vez e <strong>não dá para desfazer</strong>.
                   Se quiser manter o registro, use <strong>Cancelar</strong>.</p>`,
            showCancelButton: true,
            confirmButtonText: "Excluir",
            cancelButtonText: "Voltar",
            confirmButtonColor: "#b05a4a",
            focusCancel: true
        });
        if (!r.isConfirmed) return;
        const ok = await DocsPaciente.excluirDocumento("empresa", idEmpresa, doc.id);
        if (!ok) mostrarMensagem("Não foi possível excluir o documento.", "error");
        await renderEmpresas();
    }
}

// ---------------- início ----------------
(async function iniciarEmpresas() {
    // voltando de Documentos / Editar: reabre a mesma empresa
    try {
        const estado = JSON.parse(sessionStorage.getItem(CHAVE_ESTADO_EMPRESAS) || "null");
        sessionStorage.removeItem(CHAVE_ESTADO_EMPRESAS);
        if (estado) {
            if (estado.aberta) cardsAbertosEmpresas.add(String(estado.aberta));
            if (estado.aba === "arquivadas") document.querySelector('.tab-tipo[data-aba="arquivadas"]').click();
        }
    } catch (e) { /* sem estado guardado */ }

    // abrir direto uma empresa: empresas.html?abrir=<id>
    const abrir = new URLSearchParams(window.location.search).get("abrir");
    if (abrir) cardsAbertosEmpresas.add(String(abrir));

    await renderEmpresas();

    const aberta = [...cardsAbertosEmpresas][0];
    if (aberta) {
        const card = container.querySelector(`.empresa-card[data-id="${CSS.escape(aberta)}"]`);
        if (card) {
            card.scrollIntoView({ behavior: "smooth", block: "start" });
            card.classList.add("card-voltou");
            setTimeout(() => card.classList.remove("card-voltou"), 2500);
        }
    }
})();
