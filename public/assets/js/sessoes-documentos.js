// ═══════════════════════════════════════════════
// SESSÕES → DOCUMENTOS DO PACIENTE
// Botão no cabeçalho de cada paciente/casal que abre a lista com tudo o que
// foi gerado (contrato, atestado, declaração) e tudo o que foi anexado no
// prontuário (testes e outros documentos), num lugar só.
// Usa as funções de documentos-paciente.js (DocsPaciente).
// ═══════════════════════════════════════════════

// conta só o que está valendo (cancelados e substituídos não entram)
function contarDocumentosValendo(registro) {
    const gerados = (registro.documentos || []).filter(d => (d.status || "ativo") === "ativo").length;
    const anexos = (registro.evolucoes || []).reduce((soma, evo) => soma + ((evo.anexos || []).length), 0);
    return gerados + anexos;
}

// chamado pelo sessoes.js ao montar o cabeçalho de cada card
function botaoDocumentosPaciente(registro, origem) {
    const total = contarDocumentosValendo(registro);
    return `
        <button type="button" class="btn-docs-paciente" data-origem="${origem}" data-id="${registro.id}"
            title="Ver os documentos deste ${origem === "casal" ? "casal" : "paciente"}">
            <i class="ti ti-folder"></i> Documentos
            <span class="btn-docs-qtd">${total}</span>
        </button>`;
}

(function () {

    const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));

    // filtros da lista
    const FILTROS = [
        { id: "todos", nome: "Todos" },
        { id: "contrato", nome: "Contratos" },
        { id: "atestado", nome: "Atestados" },
        { id: "declaracao", nome: "Declarações" },
        { id: "devolutiva", nome: "Devolutivas" },
        { id: "teste", nome: "Testes" },
        { id: "anexo", nome: "Outros anexos" }
    ];

    let estado = null; // { origem, id, filtro, pessoa }
    let urlAberta = null;

    // ---------- monta as janelas uma vez só ----------
    const modal = document.createElement("div");
    modal.className = "modal-docs oculto";
    modal.innerHTML = `
        <div class="modal-docs-box" role="dialog" aria-modal="true">
            <div class="modal-docs-header">
                <h2><i class="ti ti-folder"></i> <span id="docsTitulo">Documentos</span></h2>
                <button type="button" class="modal-docs-fechar" id="docsFechar" title="Fechar"><i class="ti ti-x"></i></button>
            </div>
            <div class="modal-docs-resumo" id="docsResumo"></div>
            <div class="modal-docs-filtros">
                <div class="docs-chips" id="docsChips"></div>
                <select id="docsPessoa" class="docs-pessoa" style="display:none"></select>
            </div>
            <div class="modal-docs-lista" id="docsLista"></div>
            <div class="modal-docs-rodape">
                <span>Documentos gerados em <strong>Documentos</strong> e anexos do <strong>prontuário</strong> aparecem aqui sozinhos.</span>
                <button type="button" class="btn-docs-novo" id="docsNovo"><i class="ti ti-plus"></i> Novo documento</button>
            </div>
        </div>`;
    document.body.appendChild(modal);

    const visor = document.createElement("div");
    visor.className = "modal-docs-visor oculto";
    visor.innerHTML = `
        <div class="modal-docs-visor-box">
            <div class="modal-docs-header">
                <h2 id="visorTitulo"></h2>
                <button type="button" class="modal-docs-fechar" id="visorFechar" title="Fechar"><i class="ti ti-x"></i></button>
            </div>
            <div class="modal-docs-visor-corpo" id="visorCorpo"></div>
        </div>`;
    document.body.appendChild(visor);

    const $ = (id) => document.getElementById(id);

    // ---------- abrir / fechar ----------
    document.addEventListener("click", (e) => {
        const botao = e.target.closest(".btn-docs-paciente");
        if (!botao) return;
        e.preventDefault();
        abrir(botao.dataset.origem, botao.dataset.id);
    });

    function fechar() {
        modal.classList.add("oculto");
        estado = null;
    }

    $("docsFechar").addEventListener("click", fechar);
    modal.addEventListener("click", (e) => { if (e.target === modal) fechar(); });
    document.addEventListener("keydown", (e) => {
        if (e.key !== "Escape") return;
        if (!visor.classList.contains("oculto")) fecharVisor();
        else if (!modal.classList.contains("oculto")) fechar();
    });

    async function abrir(origem, id) {
        estado = { origem, id, filtro: "todos", pessoa: "todos" };
        modal.classList.remove("oculto");
        await desenhar();
    }

    async function lerRegistro() {
        const lista = await DocsPaciente.lerLista(estado.origem);
        return lista.find(r => String(r.id) === String(estado.id)) || null;
    }

    // ---------- desenha a janela ----------
    async function desenhar() {
        const registro = await lerRegistro();
        if (!registro) {
            $("docsLista").innerHTML = `<div class="docs-vazio">Cadastro não encontrado.</div>`;
            return;
        }

        const ehCasal = estado.origem === "casal";
        const nome = ehCasal ? (registro.nomeCasal || "Casal") : registro.nomeCompleto;
        $("docsTitulo").textContent = `Documentos de ${nome}`;

        // resumo dos atestados (um por pessoa no casal)
        const config = await DocsPaciente.lerConfig();
        const limite = Number(config.limiteAtestados) || 0;
        const pessoas = ehCasal
            ? [["p1", registro.p1NomeCompleto], ["p2", registro.p2NomeCompleto]].filter(([, n]) => n)
            : [[null, registro.nomeCompleto]];

        $("docsResumo").innerHTML = pessoas.map(([pessoa, nomePessoa]) => {
            const usados = DocsPaciente.contarAtestados(registro, pessoa, config);
            const resta = limite - usados;
            return `
                <div class="docs-resumo-item ${resta <= 0 ? "limite" : ""}">
                    <i class="ti ti-stethoscope"></i>
                    <span>${ehCasal ? `<strong>${esc(primeiroNome(nomePessoa))}</strong> · ` : ""}Atestados:
                    <strong>${usados} de ${limite}</strong> ·
                    ${resta > 0 ? `ainda pode gerar <strong>${resta}</strong>` : `<strong>limite atingido</strong>`}</span>
                </div>`;
        }).join("");

        // escolha da pessoa (só casal)
        const selPessoa = $("docsPessoa");
        if (ehCasal) {
            selPessoa.style.display = "";
            selPessoa.innerHTML = `
                <option value="todos">Os dois</option>
                ${pessoas.map(([p, n]) => `<option value="${p}">${esc(n)}</option>`).join("")}
                <option value="casal">Do casal (sessão conjunta)</option>`;
            selPessoa.value = estado.pessoa;
        } else {
            selPessoa.style.display = "none";
        }

        let itens = DocsPaciente.listarTudo(registro, estado.origem);
        if (ehCasal && estado.pessoa !== "todos") {
            itens = itens.filter(i => estado.pessoa === "casal" ? !i.pessoa : i.pessoa === estado.pessoa);
        }

        // chips com a quantidade de cada tipo
        $("docsChips").innerHTML = FILTROS.map(f => {
            const qtd = f.id === "todos" ? itens.length : itens.filter(i => i.tipo === f.id).length;
            return `<button type="button" class="docs-chip ${estado.filtro === f.id ? "ativo" : ""}" data-filtro="${f.id}">
                ${f.nome} <span>${qtd}</span></button>`;
        }).join("");

        const visiveis = estado.filtro === "todos" ? itens : itens.filter(i => i.tipo === estado.filtro);

        if (!visiveis.length) {
            $("docsLista").innerHTML = `
                <div class="docs-vazio">
                    <i class="ti ti-folder-off"></i>
                    <p>Nenhum documento ${estado.filtro === "todos" ? "" : "deste tipo "}ainda.</p>
                </div>`;
            return;
        }

        $("docsLista").innerHTML = visiveis.map((item, i) => montarItem(item, ehCasal, i)).join("");
        $("docsLista")._itens = visiveis;
    }

    function primeiroNome(nome) {
        return String(nome || "").trim().split(/\s+/)[0] || "";
    }

    function dataHora(iso) {
        if (!iso) return "";
        const d = new Date(iso);
        if (isNaN(d)) return DocsPaciente.formatarDataBR(iso) || "";
        return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    }

    function montarItem(item, ehCasal, indice) {
        const tipo = DocsPaciente.TIPOS[item.tipo] || DocsPaciente.TIPOS.anexo;
        const status = item.status || "ativo";
        const doc = item.doc;

        let etiquetaStatus = "";
        if (status === "cancelado") {
            etiquetaStatus = `<span class="docs-status cancelado">Cancelado em ${esc(dataHora(doc.canceladoEm))}${doc.motivoCancelamento ? ` · ${esc(doc.motivoCancelamento)}` : ""}</span>`;
        } else if (status === "substituido") {
            etiquetaStatus = `<span class="docs-status substituido">Substituído por uma versão editada em ${esc(dataHora(doc.substituidoEm))}</span>`;
        }

        const podeMexer = item.fonte === "gerado" && status === "ativo";
        const temArquivo = item.arquivo && item.arquivo.dados;

        return `
            <div class="docs-item tipo-${item.tipo} ${status !== "ativo" ? "inativo" : ""}" data-indice="${indice}">
                <div class="docs-item-icone"><i class="ti ${tipo.icone}"></i></div>
                <div class="docs-item-info">
                    <div class="docs-item-linha1">
                        <span class="docs-tipo">${esc(tipo.nome)}</span>
                        <strong class="docs-item-titulo">${esc(item.titulo)}</strong>
                        ${ehCasal ? `<span class="docs-pessoa-tag">${esc(item.pessoa ? primeiroNome(item.nomePessoa) : "Casal")}</span>` : ""}
                    </div>
                    <div class="docs-item-linha2">
                        <span><i class="ti ti-calendar"></i> ${esc(dataHora(item.data))}</span>
                        <span><i class="ti ti-arrow-right"></i> ${esc(item.origemTexto)}</span>
                    </div>
                    ${etiquetaStatus}
                </div>
                <div class="docs-item-acoes">
                    ${temArquivo ? `<button type="button" data-acao="abrir" title="Abrir"><i class="ti ti-eye"></i> Abrir</button>` : ""}
                    ${temArquivo ? `<button type="button" data-acao="baixar" title="Baixar"><i class="ti ti-download"></i></button>` : ""}
                    ${podeMexer && tipo.editavel ? `<button type="button" data-acao="editar" title="Editar"><i class="ti ti-pencil"></i></button>` : ""}
                    ${podeMexer ? `<button type="button" data-acao="cancelar" class="perigo" title="Cancelar documento"><i class="ti ti-ban"></i></button>` : ""}
                    ${item.fonte === "gerado" ? `<button type="button" data-acao="excluir" class="perigo" title="Excluir documento"><i class="ti ti-trash"></i></button>` : ""}
                </div>
            </div>`;
    }

    // ---------- filtros ----------
    $("docsChips").addEventListener("click", (e) => {
        const chip = e.target.closest(".docs-chip");
        if (!chip || !estado) return;
        estado.filtro = chip.dataset.filtro;
        desenhar();
    });

    $("docsPessoa").addEventListener("change", (e) => {
        if (!estado) return;
        estado.pessoa = e.target.value;
        desenhar();
    });

    // ---------- ações de cada documento ----------
    $("docsLista").addEventListener("click", async (e) => {
        const botao = e.target.closest("button[data-acao]");
        if (!botao || !estado) return;
        const linha = botao.closest(".docs-item");
        const item = ($("docsLista")._itens || [])[Number(linha.dataset.indice)];
        if (!item) return;

        const acao = botao.dataset.acao;
        if (acao === "abrir") abrirArquivo(item);
        if (acao === "baixar") baixarArquivo(item);
        if (acao === "editar") editar(item);
        if (acao === "cancelar") await cancelar(item);
        if (acao === "excluir") await excluir(item);
    });

    function abrirArquivo(item) {
        const arq = item.arquivo;
        $("visorTitulo").textContent = item.titulo;
        if (arq.tipo === "imagem") {
            $("visorCorpo").innerHTML = `<img src="${arq.dados}" alt="">`;
        } else {
            urlAberta = DocsPaciente.dataURLParaBlobURL(arq.dados);
            $("visorCorpo").innerHTML = `<iframe src="${urlAberta}"></iframe>`;
        }
        visor.classList.remove("oculto");
    }

    function fecharVisor() {
        visor.classList.add("oculto");
        $("visorCorpo").innerHTML = "";
        if (urlAberta) { URL.revokeObjectURL(urlAberta); urlAberta = null; }
    }

    $("visorFechar").addEventListener("click", fecharVisor);
    visor.addEventListener("click", (e) => { if (e.target === visor) fecharVisor(); });

    function nomeArquivo(item) {
        const base = item.arquivo.nome || item.titulo || "documento";
        const quem = item.nomePessoa ? ` - ${item.nomePessoa}` : "";
        if (item.fonte === "gerado") {
            const data = (item.data || "").slice(0, 10);
            return `${item.titulo}${quem} ${data}.pdf`.replace(/[\\/:*?"<>|]/g, "-");
        }
        return base.replace(/[\\/:*?"<>|]/g, "-");
    }

    function baixarArquivo(item) {
        const url = DocsPaciente.dataURLParaBlobURL(item.arquivo.dados);
        const a = document.createElement("a");
        a.href = url;
        a.download = nomeArquivo(item);
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
    }

    function editar(item) {
        // volta para este mesmo paciente aberto quando sair da tela Documentos
        if (typeof guardarEstadoSessoes === "function") guardarEstadoSessoes(`${estado.origem}-${estado.id}`);
        const params = new URLSearchParams({ editarDoc: item.doc.id, origem: estado.origem, id: estado.id });
        window.location.href = `documentos.html?${params}`;
    }

    async function cancelar(item) {
        const resposta = await Swal.fire({
            icon: "warning",
            title: "Cancelar documento?",
            html: `<p style="margin-bottom:10px"><strong>${esc(item.titulo)}</strong> de ${esc(dataHora(item.data))}</p>
                   <p style="font-size:13px;color:#777">O documento continua na lista marcado como <strong>cancelado</strong>
                   e deixa de contar no limite de atestados.</p>`,
            input: "text",
            inputPlaceholder: "Motivo (opcional)",
            showCancelButton: true,
            confirmButtonText: "Cancelar documento",
            cancelButtonText: "Voltar",
            confirmButtonColor: "#b05a4a"
        });
        if (!resposta.isConfirmed) return;

        const ok = await DocsPaciente.cancelarDocumento(estado.origem, estado.id, item.doc.id, (resposta.value || "").trim());
        if (!ok) {
            mostrarMensagem("Não foi possível cancelar o documento.", "error");
            return;
        }
        await desenhar();
        if (typeof renderSessoes === "function") renderSessoes();
    }

    async function excluir(item) {
        const resposta = await Swal.fire({
            icon: "warning",
            title: "Excluir documento?",
            html: `<p style="margin-bottom:10px"><strong>${esc(item.titulo)}</strong> de ${esc(dataHora(item.data))}</p>
                   <p style="font-size:13px;color:#777">O documento sai da lista de vez e <strong>não dá para desfazer</strong>.
                   Se quiser manter o registro, use <strong>Cancelar</strong>.</p>`,
            showCancelButton: true,
            confirmButtonText: "Excluir",
            cancelButtonText: "Voltar",
            confirmButtonColor: "#b05a4a",
            focusCancel: true
        });
        if (!resposta.isConfirmed) return;

        const ok = await DocsPaciente.excluirDocumento(estado.origem, estado.id, item.doc.id);
        if (!ok) {
            mostrarMensagem("Não foi possível excluir o documento.", "error");
            return;
        }
        await desenhar();
        if (typeof renderSessoes === "function") renderSessoes();
    }

    // ---------- novo documento: abre a tela Documentos já com o paciente ----------
    $("docsNovo").addEventListener("click", () => {
        if (!estado) return;
        if (typeof guardarEstadoSessoes === "function") guardarEstadoSessoes(`${estado.origem}-${estado.id}`);
        const pessoa = estado.origem === "casal" && ["p1", "p2"].includes(estado.pessoa) ? estado.pessoa : "";
        const params = new URLSearchParams({ paciente: `${estado.origem}:${estado.id}${pessoa ? ":" + pessoa : ""}` });
        window.location.href = `documentos.html?${params}`;
    });
})();
