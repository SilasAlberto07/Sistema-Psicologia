// ═══════════════════════════════════════════════
// GERADOR DE ATIVIDADES TERAPÊUTICAS (TCC)
//
// Não existe IA ligada ao sistema: a tela monta um prompt, a Dra copia,
// cola no ChatGPT (aberto no navegador), copia a resposta e cola aqui.
// O sistema organiza a resposta no editor, e a Dra revisa antes de salvar/imprimir.
//
// Privacidade: o prompt NUNCA leva nome, CPF, telefone ou dados do prontuário.
// O paciente escolhido serve só para a folha impressa.
//
// As atividades ficam no SQLite do sistema (tabela "armazenamento",
// chave "atividadesTerapeuticas"), junto com os outros dados — entram no backup
// e só são lidas depois do login. Nada do paciente é guardado na atividade.
// ═══════════════════════════════════════════════

const CHAVE_ATIVIDADES = "atividadesTerapeuticas";
const CHAVE_IMPRESSAO = "atividadeImpressao"; // passagem temporária para a folha de impressão

// listas dos selects "Categoria" e "Tipo de atividade" — a Dra pode editar (lápis).
// Ficam salvas na chave "atividadesListas". Mudar a lista não altera as atividades já salvas.
const CHAVE_LISTAS = "atividadesListas";
const LISTAS_PADRAO = {
    categorias: [
        "Ansiedade", "Autoestima", "Autoconhecimento", "Pensamentos automáticos",
        "Regulação emocional", "Relacionamentos", "Habilidades sociais",
        "Resolução de problemas", "Ativação comportamental", "Outros"
    ],
    tipos: [
        "Perguntas reflexivas", "Exercício escrito", "Diário de acompanhamento",
        "Registro de pensamentos", "Questionário reflexivo", "Exercício prático"
    ]
};
let listas = JSON.parse(JSON.stringify(LISTAS_PADRAO));

// espaço de resposta de cada pergunta
const ESPACOS = [
    ["linhas-3", "3 linhas"],
    ["linhas-5", "5 linhas"],
    ["linhas-8", "8 linhas"],
    ["linhas-12", "12 linhas"],
    ["caixa-pequena", "Caixa pequena"],
    ["caixa-grande", "Caixa grande"],
    ["nenhum", "Sem espaço"]
];
const ESPACO_PADRAO = "linhas-5";

const $ = (id) => document.getElementById(id);

let atividades = [];
let pacientes = [];
let casais = [];
let mapaPacientes = {};       // rótulo da lista → { nome, idade }
let editando = null;          // atividade aberta no editor (cópia)
let perguntas = [];           // perguntas do editor: [{ texto, espaco }]
let alterado = false;         // tem mudança não salva no editor?

// ------------------------------------------
// UTILITÁRIOS
// ------------------------------------------
function esc(texto) {
    return String(texto ?? "").replace(/[&<>"']/g, (c) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
}

function hojeISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dataCurta(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    return isNaN(d) ? "" : d.toLocaleDateString("pt-BR");
}

function novoId() {
    return "ativ-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
}

function categoriaEscolhida() {
    const cat = $("ativCategoria").value;
    if (cat === "Outros") return $("ativCategoriaOutra").value.trim() || "Outros";
    return cat;
}

async function copiarTexto(texto) {
    try {
        await navigator.clipboard.writeText(texto);
    } catch (err) {
        const temporario = document.createElement("textarea");
        temporario.value = texto;
        document.body.appendChild(temporario);
        temporario.select();
        document.execCommand("copy");
        document.body.removeChild(temporario);
    }
}

// mensagens do SweetAlert sempre por cima de tudo
const estiloSwal = document.createElement("style");
estiloSwal.innerHTML = `.swal2-container { z-index: 999999 !important; }`;
document.head.appendChild(estiloSwal);

// ------------------------------------------
// BANCO (SQLite pelo window.storage)
// ------------------------------------------
async function carregarAtividades() {
    try {
        const lista = JSON.parse(await window.storage.getItem(CHAVE_ATIVIDADES));
        atividades = Array.isArray(lista) ? lista : [];
    } catch (e) {
        atividades = [];
    }
}

async function gravarAtividades() {
    await window.storage.setItem(CHAVE_ATIVIDADES, JSON.stringify(atividades));
}

async function carregarPacientes() {
    try { pacientes = JSON.parse(await window.storage.getItem("pacientes")) || []; } catch (e) { pacientes = []; }
    try { casais = JSON.parse(await window.storage.getItem("casais")) || []; } catch (e) { casais = []; }

    const lista = $("listaPacientesAtiv");
    lista.innerHTML = "";
    mapaPacientes = {};

    const adicionar = (rotulo, nome, idade, destino) => {
        mapaPacientes[rotulo] = { nome, idade, destino };
        const opt = document.createElement("option");
        opt.value = rotulo;
        lista.appendChild(opt);
    };

    pacientes.filter(p => !p.excluido).forEach(p => {
        adicionar(`${p.nomeCompleto} — Paciente (${p.id})`, p.nomeCompleto, p.idade, { origem: "individual", id: p.id });
    });
    casais.filter(c => !c.excluido).forEach(c => {
        if (c.p1NomeCompleto) adicionar(`${c.p1NomeCompleto} — Casal (${c.id})`, c.p1NomeCompleto, c.p1Idade, { origem: "casal", id: c.id, pessoa: "p1" });
        if (c.p2NomeCompleto) adicionar(`${c.p2NomeCompleto} — Casal (${c.id})`, c.p2NomeCompleto, c.p2Idade, { origem: "casal", id: c.id, pessoa: "p2" });
    });
}

function pacienteDoCampo(id) {
    const valor = $(id).value.trim();
    if (!valor) return null;
    return mapaPacientes[valor] || { nome: valor.replace(/\s+—\s+.*$/, ""), idade: null, destino: null };
}

// ------------------------------------------
// LISTAS EDITÁVEIS (Categoria / Tipo de atividade)
// ------------------------------------------
async function carregarListas() {
    try {
        const salvo = JSON.parse(await window.storage.getItem(CHAVE_LISTAS)) || {};
        ["categorias", "tipos"].forEach(nome => {
            if (Array.isArray(salvo[nome]) && salvo[nome].length) listas[nome] = salvo[nome];
        });
    } catch (e) { /* mantém o padrão */ }
}

async function gravarListas() {
    let salvo = {};
    try { salvo = JSON.parse(await window.storage.getItem(CHAVE_LISTAS)) || {}; } catch (e) { }
    await window.storage.setItem(CHAVE_LISTAS, JSON.stringify({ ...salvo, ...listas }));
}

function preencherSelect(select, itens) {
    const atual = select.value;
    select.innerHTML = itens.map(i => `<option value="${esc(i)}">${esc(i)}</option>`).join("");
    if (itens.includes(atual)) select.value = atual;
}

function preencherSelectsDasListas() {
    preencherSelect($("ativCategoria"), listas.categorias);
    preencherSelect($("ativTipo"), listas.tipos);
    $("linhaCategoriaOutra").hidden = $("ativCategoria").value !== "Outros";
}

const NOMES_LISTA = {
    categorias: { titulo: "Categorias de atividade", novo: "Nova categoria..." },
    tipos: { titulo: "Tipos de atividade", novo: "Novo tipo de atividade..." }
};

function linhaDaLista(valor) {
    return `
        <div class="lista-edicao-item">
            <i class="ti ti-grip-vertical"></i>
            <input type="text" value="${esc(valor)}" data-original="${esc(valor)}">
            <button type="button" data-acao="subir" title="Mover para cima"><i class="ti ti-arrow-up"></i></button>
            <button type="button" data-acao="apagar" class="perigo" title="Apagar"><i class="ti ti-trash"></i></button>
        </div>`;
}

async function editarLista(nomeLista) {
    const info = NOMES_LISTA[nomeLista];
    const resultado = await Swal.fire({
        title: info.titulo,
        html: `
            <p class="lista-edicao-ajuda">Edite os nomes, apague ou acrescente. As atividades já salvas não mudam.</p>
            <div class="lista-edicao" id="listaEdicao">${listas[nomeLista].map(linhaDaLista).join("")}</div>
            <div class="lista-edicao-nova">
                <input type="text" id="listaEdicaoNovo" placeholder="${info.novo}">
                <button type="button" id="listaEdicaoAdicionar"><i class="ti ti-plus"></i> Adicionar</button>
            </div>`,
        width: 520,
        showCancelButton: true,
        confirmButtonText: "Salvar lista",
        cancelButtonText: "Cancelar",
        confirmButtonColor: "#8a9e78",
        customClass: { popup: "lista-edicao-popup" },
        didOpen: () => {
            const lista = document.getElementById("listaEdicao");
            const novo = document.getElementById("listaEdicaoNovo");
            const adicionar = () => {
                const valor = novo.value.trim();
                if (!valor) return;
                lista.insertAdjacentHTML("beforeend", linhaDaLista(valor));
                novo.value = "";
                novo.focus();
            };
            document.getElementById("listaEdicaoAdicionar").addEventListener("click", adicionar);
            novo.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); adicionar(); } });
            lista.addEventListener("click", (e) => {
                const botao = e.target.closest("button[data-acao]");
                if (!botao) return;
                const linha = botao.closest(".lista-edicao-item");
                if (botao.dataset.acao === "apagar") linha.remove();
                if (botao.dataset.acao === "subir" && linha.previousElementSibling) {
                    linha.parentNode.insertBefore(linha, linha.previousElementSibling);
                }
            });
        },
        preConfirm: () => {
            const novoPendente = document.getElementById("listaEdicaoNovo").value.trim();
            const valores = [...document.querySelectorAll("#listaEdicao input")].map(i => i.value.trim());
            if (novoPendente) valores.push(novoPendente);
            const unicos = valores.filter((v, i) => v && valores.findIndex(x => x.toLowerCase() === v.toLowerCase()) === i);
            if (!unicos.length) {
                Swal.showValidationMessage("A lista precisa ter pelo menos um item.");
                return false;
            }
            return unicos;
        }
    });

    if (!resultado.isConfirmed) return;
    listas[nomeLista] = resultado.value;
    await gravarListas();
    preencherSelectsDasListas();
    preencherFiltroCategorias();
    mostrarMensagem("Lista atualizada!", "success");
}

document.querySelectorAll(".ativ-editar-lista").forEach(botao => {
    botao.addEventListener("click", () => editarLista(botao.dataset.lista));
});

// ------------------------------------------
// NAVEGAÇÃO ENTRE AS TELAS
// ------------------------------------------
const TELAS = ["telaInicio", "telaNova", "telaEditor", "telaBiblioteca"];

function mostrarTela(id) {
    TELAS.forEach(t => { $(t).hidden = t !== id; });
    window.scrollTo({ top: 0, behavior: "smooth" });
}

async function podeSairDoEditor() {
    if ($("telaEditor").hidden || !alterado) return true;
    const resposta = await mostrarConfirmacao("A atividade tem alterações que não foram salvas. Sair mesmo assim?");
    return resposta.isConfirmed;
}

$("btnNovaAtividade").addEventListener("click", async () => {
    if (!(await podeSairDoEditor())) return;
    alterado = false;
    limparFormulario();
    mostrarTela("telaNova");
});

$("btnBiblioteca").addEventListener("click", async () => {
    if (!(await podeSairDoEditor())) return;
    alterado = false;
    renderizarBiblioteca();
    mostrarTela("telaBiblioteca");
});

// ------------------------------------------
// LISTAS (recentes e biblioteca)
// ------------------------------------------
function cartaoAtividade(a) {
    const revisada = a.statusRevisao === "revisada";
    return `
        <div class="ativ-cartao" data-id="${esc(a.id)}">
            <div class="ativ-cartao-info">
                <div class="ativ-cartao-titulo">${esc(a.titulo || "Atividade sem título")}</div>
                <div class="ativ-cartao-meta">
                    <span class="ativ-tag">${esc(a.categoria || "-")}</span>
                    <span class="ativ-tag">${esc(a.faixaEtaria || "-")}</span>
                    <span>${(a.perguntas || []).length} pergunta(s)</span>
                    <span>· Atualizada em ${dataCurta(a.atualizadoEm)}</span>
                    <span class="ativ-status ${revisada ? "ok" : ""}">${revisada ? "Revisada" : "Em revisão"}</span>
                </div>
            </div>
            <div class="ativ-cartao-acoes">
                <button type="button" data-acao="abrir" title="Abrir / usar com um paciente"><i class="ti ti-pencil"></i> Abrir</button>
                ${revisada ? `<button type="button" data-acao="imprimir" title="Visualizar impressão"><i class="ti ti-printer"></i></button>` : ""}
                <button type="button" data-acao="duplicar" title="Duplicar"><i class="ti ti-copy"></i></button>
                <button type="button" data-acao="excluir" title="Excluir" class="perigo"><i class="ti ti-trash"></i></button>
            </div>
        </div>`;
}

function ordenadasPorData(lista) {
    return [...lista].sort((a, b) => String(b.atualizadoEm || "").localeCompare(String(a.atualizadoEm || "")));
}

function renderizarRecentes() {
    const alvo = $("listaRecentes");
    const recentes = ordenadasPorData(atividades).slice(0, 6);
    alvo.innerHTML = recentes.length
        ? recentes.map(cartaoAtividade).join("")
        : `<div class="ativ-vazio"><i class="ti ti-notebook"></i>
              <p>Nenhuma atividade criada ainda.</p>
              <p>Clique em <strong>Nova atividade</strong> para começar.</p></div>`;
}

function preencherFiltroCategorias() {
    const select = $("bibCategoria");
    const atual = select.value;
    const usadas = [...new Set([...listas.categorias, ...atividades.map(a => a.categoria).filter(Boolean)])];
    select.innerHTML = `<option value="">Todas</option>` + usadas.map(c => `<option>${esc(c)}</option>`).join("");
    select.value = atual;

    $("listaCategorias").innerHTML = usadas.map(c => `<option value="${esc(c)}"></option>`).join("");
}

function renderizarBiblioteca() {
    preencherFiltroCategorias();
    const busca = $("bibBusca").value.trim().toLowerCase();
    const categoria = $("bibCategoria").value;
    const faixa = $("bibFaixa").value;

    const filtradas = ordenadasPorData(atividades).filter(a =>
        (!busca || String(a.titulo || "").toLowerCase().includes(busca)) &&
        (!categoria || a.categoria === categoria) &&
        (!faixa || a.faixaEtaria === faixa)
    );

    $("listaBiblioteca").innerHTML = filtradas.length
        ? filtradas.map(cartaoAtividade).join("")
        : `<div class="ativ-vazio"><i class="ti ti-search"></i><p>${atividades.length ? "Nenhuma atividade encontrada com esses filtros." : "A biblioteca ainda está vazia."}</p></div>`;
}

["bibBusca", "bibCategoria", "bibFaixa"].forEach(id => {
    $(id).addEventListener("input", renderizarBiblioteca);
    $(id).addEventListener("change", renderizarBiblioteca);
});

async function acaoNaLista(evento) {
    const botao = evento.target.closest("button[data-acao]");
    if (!botao) return;
    const id = botao.closest(".ativ-cartao").dataset.id;
    const atividade = atividades.find(a => a.id === id);
    if (!atividade) return;

    const acao = botao.dataset.acao;
    if (acao === "abrir") {
        abrirNoEditor(atividade);
    } else if (acao === "imprimir") {
        if (atividade.statusRevisao !== "revisada") {
            mostrarMensagem("Abra a atividade e marque a revisão antes de imprimir.", "warning");
            return;
        }
        abrirImpressao(atividade, true);
    } else if (acao === "duplicar") {
        const copia = JSON.parse(JSON.stringify(atividade));
        copia.id = novoId();
        copia.titulo = `${atividade.titulo || "Atividade"} (cópia)`;
        copia.criadoEm = copia.atualizadoEm = new Date().toISOString();
        copia.statusRevisao = "em_revisao";
        atividades.push(copia);
        await gravarAtividades();
        atualizarListas();
        mostrarMensagem("Atividade duplicada! A cópia está na biblioteca.", "success");
    } else if (acao === "excluir") {
        const resposta = await mostrarConfirmacao(`Excluir a atividade "${atividade.titulo || "sem título"}"? Esta ação não pode ser desfeita.`);
        if (!resposta.isConfirmed) return;
        atividades = atividades.filter(a => a.id !== id);
        await gravarAtividades();
        atualizarListas();
        mostrarMensagem("Atividade excluída.", "success");
    }
}

$("listaRecentes").addEventListener("click", acaoNaLista);
$("listaBiblioteca").addEventListener("click", acaoNaLista);

function atualizarListas() {
    renderizarRecentes();
    if (!$("telaBiblioteca").hidden) renderizarBiblioteca();
}

// ------------------------------------------
// FORMULÁRIO DE NOVA ATIVIDADE
// ------------------------------------------
function limparFormulario() {
    ["ativPaciente", "ativObjetivo", "ativOrientacoesPsi", "ativCategoriaOutra", "textoPrompt", "textoColado"]
        .forEach(id => { $(id).value = ""; });
    $("ativFaixa").value = "Adulto";
    preencherSelectsDasListas();
    $("ativCategoria").selectedIndex = 0;
    $("ativTipo").selectedIndex = 0;
    $("ativQuantidade").value = 6;
    $("linhaCategoriaOutra").hidden = $("ativCategoria").value !== "Outros";
    $("secaoPrompt").hidden = true;
    $("secaoColar").hidden = true;
}

$("ativCategoria").addEventListener("change", () => {
    $("linhaCategoriaOutra").hidden = $("ativCategoria").value !== "Outros";
});

// faixa etária sugerida pela idade do paciente (só preenche; a Dra pode trocar)
$("ativPaciente").addEventListener("change", () => {
    const p = pacienteDoCampo("ativPaciente");
    const idade = p ? Number(p.idade) : NaN;
    if (!isNaN(idade) && idade > 0) {
        $("ativFaixa").value = idade < 12 ? "Criança" : (idade < 18 ? "Adolescente" : "Adulto");
    }
});

// ------------------------------------------
// PROMPT PARA O CHATGPT (somente dados da atividade, nada do paciente)
// ------------------------------------------
function linguagemPorFaixa(faixa) {
    if (faixa === "Criança") return "linguagem simples, concreta, acolhedora e lúdica, com frases curtas, adequada a crianças";
    if (faixa === "Adolescente") return "linguagem clara, próxima e respeitosa, adequada a adolescentes, sem infantilizar";
    return "linguagem clara, acolhedora e acessível a adultos, sem termos técnicos desnecessários";
}

function montarPrompt() {
    const faixa = $("ativFaixa").value;
    const quantidade = Math.max(1, Math.min(30, Number($("ativQuantidade").value) || 6));
    const orientacoes = $("ativOrientacoesPsi").value.trim();

    return [
        "Você é um assistente que ajuda uma psicóloga clínica a elaborar uma ficha de atividade terapêutica escrita, para o paciente responder à mão, fundamentada na Terapia Cognitivo-Comportamental (TCC).",
        "",
        "DADOS DA ATIVIDADE",
        `- Faixa etária do paciente: ${faixa}`,
        `- Abordagem: ${$("ativAbordagem").value} (Terapia Cognitivo-Comportamental)`,
        `- Objetivo terapêutico: ${$("ativObjetivo").value.trim() || "(não informado)"}`,
        `- Categoria: ${categoriaEscolhida()}`,
        `- Tipo de atividade: ${$("ativTipo").value}`,
        `- Quantidade aproximada de perguntas: ${quantidade}`,
        orientacoes ? `- Orientações adicionais da psicóloga: ${orientacoes}` : "",
        "",
        "INSTRUÇÕES",
        "- Utilize conceitos e técnicas fundamentados na TCC, relacionados ao objetivo informado.",
        "- Crie perguntas abertas e reflexivas.",
        `- Use ${linguagemPorFaixa(faixa)}.`,
        "- Evite perguntas indutivas, julgadoras ou que pressuponham acontecimentos, sentimentos ou experiências que o paciente não relatou.",
        "- Organize as perguntas em uma sequência lógica (do mais simples ao mais aprofundado).",
        "- As respostas serão escritas à mão: ao final de cada pergunta indique o espaço sugerido para a resposta entre colchetes: [curta], [média] ou [longa]. Não desenhe linhas.",
        "- Inclua orientações simples para o paciente sobre como fazer a atividade, deixando claro que não existem respostas certas ou erradas e que ele pode responder no seu ritmo.",
        "- Não elabore diagnósticos, não prescreva tratamentos e não apresente a atividade como obrigatória.",
        "- Não afirme que a atividade é aprovada, validada ou certificada pelo Conselho Federal de Psicologia (CFP).",
        "- Não invente dados sobre o paciente.",
        "",
        "FORMATO DA RESPOSTA (use exatamente estes títulos, em texto simples, sem tabelas):",
        "TÍTULO: (título curto e acolhedor da atividade)",
        "OBJETIVO DA ATIVIDADE: (1 a 2 frases, em linguagem acessível ao paciente)",
        "ORIENTAÇÕES AO PACIENTE: (como fazer a atividade)",
        "PERGUNTAS:",
        "1. (pergunta) [média]",
        "2. (pergunta) [longa]",
        "ORIENTAÇÕES FINAIS: (mensagem final breve e acolhedora)"
    ].filter((linha, i, todas) => !(linha === "" && todas[i - 1] === "")).join("\n").replace(/\n{3,}/g, "\n\n");
}

// avisa se o nome do paciente escolhido aparece no texto que vai para a IA
function nomeDoPacienteNoTexto(texto) {
    const p = pacienteDoCampo("ativPaciente");
    if (!p || !p.nome) return null;
    const partes = p.nome.split(/\s+/).filter(n => n.length >= 3);
    const normal = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    const alvo = normal(texto);
    return partes.find(n => new RegExp(`\\b${normal(n).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(alvo)) || null;
}

$("btnGerarPrompt").addEventListener("click", () => {
    if (!$("ativObjetivo").value.trim()) {
        $("ativObjetivo").classList.add("campo-faltando");
        mostrarMensagem("Descreva o objetivo terapêutico da atividade.", "warning");
        return;
    }
    $("ativObjetivo").classList.remove("campo-faltando");
    $("textoPrompt").value = montarPrompt();
    $("secaoPrompt").hidden = false;
    $("secaoColar").hidden = false;
    $("secaoPrompt").scrollIntoView({ behavior: "smooth", block: "start" });
});

$("btnCopiarPrompt").addEventListener("click", async () => {
    const texto = $("textoPrompt").value.trim();
    if (!texto) return;

    const nome = nomeDoPacienteNoTexto(texto);
    if (nome) {
        const resposta = await mostrarConfirmacao(
            `O prompt parece conter o nome "${nome}" do paciente. Para preservar o sigilo, retire nomes e dados identificáveis antes de enviar para a IA. Copiar mesmo assim?`
        );
        if (!resposta.isConfirmed) return;
    }

    await copiarTexto(texto);
    mostrarMensagem("Prompt copiado! Agora abra o ChatGPT, cole e envie.", "success");
});

$("btnAbrirChatGPT").addEventListener("click", async () => {
    // abre no navegador do computador (fora do programa)
    if (window.linksExternos && window.linksExternos.abrirChatGPT) {
        const ok = await window.linksExternos.abrirChatGPT();
        if (!ok) mostrarMensagem("Não foi possível abrir o navegador. Acesse https://chatgpt.com manualmente.", "warning");
    } else {
        mostrarMensagem("Feche e abra o sistema novamente para ativar o botão do ChatGPT. Enquanto isso, acesse https://chatgpt.com no navegador.", "info");
    }
});

// ------------------------------------------
// LER A RESPOSTA COLADA DO CHATGPT
// ------------------------------------------
const TAMANHO_PARA_ESPACO = { curta: "linhas-3", media: "linhas-5", longa: "linhas-8" };

function semAcento(t) {
    return t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function interpretarResposta(texto) {
    const resultado = { titulo: "", objetivoPaciente: "", introducao: "", perguntas: [], orientacoesFinais: "" };
    const secoes = {
        "titulo": "titulo",
        "objetivo da atividade": "objetivoPaciente",
        "objetivo": "objetivoPaciente",
        "orientacoes ao paciente": "introducao",
        "orientacoes": "introducao",
        "introducao": "introducao",
        "instrucoes": "introducao",
        "perguntas": "perguntas",
        "orientacoes finais": "orientacoesFinais",
        "mensagem final": "orientacoesFinais",
        "consideracoes finais": "orientacoesFinais"
    };
    const nomesOrdenados = Object.keys(secoes).sort((a, b) => b.length - a.length);

    let atual = null;
    let encontrouTitulo = false;

    const linhas = String(texto).replace(/\r/g, "").split("\n");
    linhas.forEach(bruta => {
        // tira negrito, títulos markdown e espaços
        let linha = bruta.replace(/\*\*|__/g, "").replace(/^\s*#+\s*/, "").trim();
        if (!linha) {
            if (atual && atual !== "perguntas" && resultado[atual]) resultado[atual] += "\n";
            return;
        }

        // é um título de seção? (ex: "TÍTULO: ...", "Perguntas:")
        const normal = semAcento(linha);
        const nome = nomesOrdenados.find(n => normal.startsWith(n) && /^[\s:–—-]*/.test(normal.slice(n.length)) &&
            (normal.length === n.length || /^[\s]*[:–—-]/.test(normal.slice(n.length))));
        if (nome) {
            atual = secoes[nome];
            encontrouTitulo = true;
            const resto = linha.slice(nome.length).replace(/^[\s:–—-]+/, "").trim();
            if (resto) {
                if (atual === "perguntas") adicionarPergunta(resto, true);
                else resultado[atual] += (resultado[atual] ? "\n" : "") + resto;
            }
            return;
        }

        // pergunta numerada (1. / 1) / 1 -)
        const numerada = linha.match(/^\(?(\d{1,2})[.)\-–]\s*(.+)$/);
        if (numerada && (atual === "perguntas" || !encontrouTitulo || atual === null)) {
            atual = "perguntas";
            adicionarPergunta(numerada[2], true);
            return;
        }

        if (atual === "perguntas") {
            adicionarPergunta(linha, false); // continuação da pergunta anterior
        } else if (atual) {
            resultado[atual] += (resultado[atual] && !resultado[atual].endsWith("\n") ? "\n" : "") + linha;
        } else {
            resultado.introducao += (resultado.introducao ? "\n" : "") + linha;
        }
    });

    function adicionarPergunta(textoPergunta, nova) {
        let espaco = null;
        let limpo = textoPergunta.replace(/\[\s*(curta|m[ée]dia|longa)\s*\]/i, (m, tamanho) => {
            espaco = TAMANHO_PARA_ESPACO[semAcento(tamanho)];
            return "";
        }).replace(/\s+$/, "").trim();
        if (!limpo && !espaco) return;

        if (nova || !resultado.perguntas.length) {
            resultado.perguntas.push({ texto: limpo, espaco: espaco || ESPACO_PADRAO });
        } else {
            const ultima = resultado.perguntas[resultado.perguntas.length - 1];
            if (limpo) ultima.texto = `${ultima.texto}\n${limpo}`.trim();
            if (espaco) ultima.espaco = espaco;
        }
    }

    Object.keys(resultado).forEach(k => {
        if (typeof resultado[k] === "string") resultado[k] = resultado[k].replace(/\n{3,}/g, "\n\n").trim();
    });
    return resultado;
}

$("btnLevarEditor").addEventListener("click", () => {
    const texto = $("textoColado").value.trim();
    if (!texto) {
        mostrarMensagem("Cole a atividade gerada pelo ChatGPT antes de continuar.", "warning");
        return;
    }
    const lido = interpretarResposta(texto);
    const agora = new Date().toISOString();

    abrirNoEditor({
        id: null,
        titulo: lido.titulo,
        categoria: categoriaEscolhida(),
        faixaEtaria: $("ativFaixa").value,
        abordagem: $("ativAbordagem").value,
        tipo: $("ativTipo").value,
        objetivoTerapeutico: $("ativObjetivo").value.trim(),
        objetivoPaciente: lido.objetivoPaciente,
        introducao: lido.introducao,
        perguntas: lido.perguntas,
        orientacoesFinais: lido.orientacoesFinais,
        conteudoOriginal: texto,
        statusRevisao: "em_revisao",
        criadoEm: agora,
        atualizadoEm: agora
    }, $("ativPaciente").value);
    alterado = true;

    if (!lido.perguntas.length) {
        mostrarMensagem("Não encontrei perguntas numeradas no texto. Confira o conteúdo no editor e adicione as perguntas.", "info");
    }
});

// ------------------------------------------
// EDITOR
// ------------------------------------------
function abrirNoEditor(atividade, rotuloPaciente = "") {
    editando = JSON.parse(JSON.stringify(atividade));
    perguntas = (editando.perguntas || []).map(p => ({ texto: p.texto || "", espaco: p.espaco || ESPACO_PADRAO }));

    preencherFiltroCategorias();
    $("edTitulo").value = editando.titulo || "";
    $("edCategoria").value = editando.categoria || "";
    $("edFaixa").value = editando.faixaEtaria || "Adulto";
    $("edObjetivoTerapeutico").value = editando.objetivoTerapeutico || "";
    $("edObjetivoPaciente").value = editando.objetivoPaciente || "";
    $("edIntroducao").value = editando.introducao || "";
    $("edOrientacoesFinais").value = editando.orientacoesFinais || "";
    $("edRevisada").checked = editando.statusRevisao === "revisada";

    $("impPaciente").value = rotuloPaciente || "";
    $("impData").value = hojeISO();
    $("impMostrarNome").checked = true;

    atualizarSelo();
    atualizarRevisao();
    renderizarPerguntas();
    alterado = false;
    mostrarTela("telaEditor");
}

function atualizarSelo() {
    const selo = $("seloStatus");
    const revisada = $("edRevisada").checked;
    selo.textContent = editando && editando.id ? (revisada ? "Revisada" : "Em revisão") : "Nova — ainda não salva";
    selo.className = "ativ-selo" + (revisada ? " ok" : "");
}

function renderizarPerguntas() {
    const alvo = $("listaPerguntas");
    if (!perguntas.length) {
        alvo.innerHTML = `<p class="ativ-ajuda">Nenhuma pergunta ainda. Clique em "Adicionar pergunta".</p>`;
        return;
    }
    alvo.innerHTML = perguntas.map((p, i) => `
        <div class="ativ-pergunta" data-indice="${i}">
            <div class="ativ-pergunta-numero">${i + 1}</div>
            <div class="ativ-pergunta-corpo">
                <textarea rows="2" data-campo="texto" placeholder="Escreva a pergunta...">${esc(p.texto)}</textarea>
                <div class="ativ-pergunta-opcoes">
                    <label>Espaço para resposta:
                        <select data-campo="espaco">
                            ${ESPACOS.map(([valor, nome]) => `<option value="${valor}" ${p.espaco === valor ? "selected" : ""}>${nome}</option>`).join("")}
                        </select>
                    </label>
                </div>
            </div>
            <div class="ativ-pergunta-acoes">
                <button type="button" data-acao="subir" title="Mover para cima" ${i === 0 ? "disabled" : ""}><i class="ti ti-arrow-up"></i></button>
                <button type="button" data-acao="descer" title="Mover para baixo" ${i === perguntas.length - 1 ? "disabled" : ""}><i class="ti ti-arrow-down"></i></button>
                <button type="button" data-acao="remover" title="Remover pergunta" class="perigo"><i class="ti ti-x"></i></button>
            </div>
        </div>`).join("");

    // ajusta a altura das caixas ao texto
    alvo.querySelectorAll("textarea").forEach(ajustarAltura);
}

function ajustarAltura(textarea) {
    textarea.style.height = "auto";
    textarea.style.height = Math.max(52, textarea.scrollHeight + 2) + "px";
}

$("listaPerguntas").addEventListener("input", (e) => {
    const bloco = e.target.closest(".ativ-pergunta");
    if (!bloco) return;
    const indice = Number(bloco.dataset.indice);
    const campo = e.target.dataset.campo;
    if (campo) perguntas[indice][campo] = e.target.value;
    if (e.target.tagName === "TEXTAREA") ajustarAltura(e.target);
    alterado = true;
});

$("listaPerguntas").addEventListener("change", (e) => {
    const bloco = e.target.closest(".ativ-pergunta");
    if (bloco && e.target.dataset.campo === "espaco") {
        perguntas[Number(bloco.dataset.indice)].espaco = e.target.value;
        alterado = true;
    }
});

$("listaPerguntas").addEventListener("click", async (e) => {
    const botao = e.target.closest("button[data-acao]");
    if (!botao) return;
    const i = Number(botao.closest(".ativ-pergunta").dataset.indice);
    const acao = botao.dataset.acao;

    if (acao === "subir" && i > 0) {
        [perguntas[i - 1], perguntas[i]] = [perguntas[i], perguntas[i - 1]];
    } else if (acao === "descer" && i < perguntas.length - 1) {
        [perguntas[i + 1], perguntas[i]] = [perguntas[i], perguntas[i + 1]];
    } else if (acao === "remover") {
        if (perguntas[i].texto.trim()) {
            const resposta = await mostrarConfirmacao(`Remover a pergunta ${i + 1}?`);
            if (!resposta.isConfirmed) return;
        }
        perguntas.splice(i, 1);
    }
    alterado = true;
    renderizarPerguntas();
});

$("btnAdicionarPergunta").addEventListener("click", () => {
    perguntas.push({ texto: "", espaco: ESPACO_PADRAO });
    alterado = true;
    renderizarPerguntas();
    const campos = $("listaPerguntas").querySelectorAll("textarea");
    if (campos.length) campos[campos.length - 1].focus();
});

["edTitulo", "edCategoria", "edFaixa", "edObjetivoTerapeutico", "edObjetivoPaciente", "edIntroducao", "edOrientacoesFinais"]
    .forEach(id => $(id).addEventListener("input", () => { alterado = true; }));
$("edRevisada").addEventListener("change", () => { alterado = true; atualizarSelo(); atualizarRevisao(); });

// o card "Salvar e imprimir" só aparece depois que a Dra marca a revisão
function atualizarRevisao() {
    const revisada = $("edRevisada").checked;
    $("cardImpressao").hidden = !revisada;
    $("botoesSemRevisao").hidden = revisada;
    $("caixaRevisao").classList.toggle("aprovada", revisada);
}

function exigirRevisao() {
    if ($("edRevisada").checked) return true;
    $("caixaRevisao").classList.add("alerta");
    $("caixaRevisao").scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => $("caixaRevisao").classList.remove("alerta"), 1500);
    mostrarMensagem("Revise as perguntas e marque a aprovação antes de salvar, visualizar ou imprimir.", "warning");
    return false;
}

// junta o que está no editor
function atividadeDoEditor() {
    return {
        ...editando,
        titulo: $("edTitulo").value.trim(),
        categoria: $("edCategoria").value.trim() || "Outros",
        faixaEtaria: $("edFaixa").value,
        objetivoTerapeutico: $("edObjetivoTerapeutico").value.trim(),
        objetivoPaciente: $("edObjetivoPaciente").value.trim(),
        introducao: $("edIntroducao").value.trim(),
        perguntas: perguntas
            .map(p => ({ texto: String(p.texto || "").trim(), espaco: p.espaco || ESPACO_PADRAO }))
            .filter(p => p.texto),
        orientacoesFinais: $("edOrientacoesFinais").value.trim(),
        statusRevisao: $("edRevisada").checked ? "revisada" : "em_revisao"
    };
}

$("btnSalvar").addEventListener("click", async () => {
    if (!exigirRevisao()) return;
    const atividade = atividadeDoEditor();
    if (!atividade.titulo) {
        $("edTitulo").classList.add("campo-faltando");
        mostrarMensagem("Dê um título para a atividade antes de salvar.", "warning");
        return;
    }
    $("edTitulo").classList.remove("campo-faltando");

    // o "conteúdo" guardado é o texto final revisado (para consulta e reutilização)
    atividade.conteudo = textoCompleto(atividade);
    atividade.atualizadoEm = new Date().toISOString();

    if (!atividade.id) {
        atividade.id = novoId();
        atividade.criadoEm = atividade.criadoEm || atividade.atualizadoEm;
        atividades.push(atividade);
    } else {
        const indice = atividades.findIndex(a => a.id === atividade.id);
        if (indice >= 0) atividades[indice] = atividade;
        else atividades.push(atividade);
    }

    await gravarAtividades();
    editando = JSON.parse(JSON.stringify(atividade));
    alterado = false;
    atualizarSelo();
    renderizarRecentes();

    // com paciente escolhido: guarda o PDF nos Documentos do paciente (tela Sessões)
    const paciente = pacienteDoCampo("impPaciente");
    if (paciente && paciente.destino && atividade.perguntas.length) {
        guardarNosDocumentos(atividade, paciente);
    } else {
        mostrarMensagem(
            $("impPaciente").value.trim() && !(paciente && paciente.destino)
                ? "Atividade salva na biblioteca! O paciente digitado não foi encontrado no cadastro, por isso ela não foi guardada nos documentos."
                : "Atividade salva na biblioteca!",
            $("impPaciente").value.trim() && !(paciente && paciente.destino) ? "info" : "success"
        );
    }
});

// abre a folha em uma janela que gera o PDF, guarda nos documentos do paciente e fecha
function guardarNosDocumentos(atividade, paciente) {
    const opcoes = opcoesDeImpressao();
    const dados = {
        atividade,
        paciente: opcoes.mostrarNome ? paciente.nome : "",
        data: opcoes.data || hojeISO(),
        destino: paciente.destino
    };
    localStorage.removeItem(CHAVE_RESULTADO_DOCS);
    localStorage.setItem(CHAVE_IMPRESSAO, JSON.stringify(dados));
    window.open("imprimir-atividade.html?guardar=true", "_blank", "width=900,height=700");
    aguardarResultadoDocs(paciente.nome);
}

const CHAVE_RESULTADO_DOCS = "atividadeGuardadaResultado";

function aguardarResultadoDocs(nome) {
    let tentativas = 0;
    const timer = setInterval(() => {
        tentativas++;
        const bruto = localStorage.getItem(CHAVE_RESULTADO_DOCS);
        if (!bruto && tentativas < 60) return;
        clearInterval(timer);
        localStorage.removeItem(CHAVE_RESULTADO_DOCS);
        let r = null;
        try { r = JSON.parse(bruto); } catch (e) { }
        if (r && r.ok) {
            mostrarMensagem(`Atividade salva na biblioteca e guardada nos Documentos de ${nome}${r.substituiu ? " (a versão anterior ficou como substituída)" : ""}!`, "success");
        } else {
            mostrarMensagem(`Atividade salva na biblioteca, mas não foi possível guardar nos Documentos de ${nome}${r && r.erro ? `: ${r.erro}` : "."}`, "warning");
        }
    }, 500);
}

function textoCompleto(a) {
    return [
        a.titulo,
        a.objetivoPaciente && `Objetivo: ${a.objetivoPaciente}`,
        a.introducao,
        ...a.perguntas.map((p, i) => `${i + 1}. ${p.texto}`),
        a.orientacoesFinais
    ].filter(Boolean).join("\n\n");
}

$("btnVoltarEditor").addEventListener("click", () => $("btnCancelarEditor").click());

$("btnCancelarEditor").addEventListener("click", async () => {
    if (!(await podeSairDoEditor())) return;
    alterado = false;
    renderizarRecentes();
    mostrarTela("telaInicio");
});

// ------------------------------------------
// IMPRESSÃO
// ------------------------------------------
function abrirImpressao(atividade, visualizar, opcoes = {}) {
    if (!atividade.perguntas || !atividade.perguntas.length) {
        mostrarMensagem("A atividade não tem perguntas para imprimir.", "warning");
        return;
    }
    const dados = {
        atividade,
        paciente: opcoes.mostrarNome && opcoes.paciente ? opcoes.paciente : "",
        data: opcoes.data || hojeISO()
    };
    localStorage.setItem(CHAVE_IMPRESSAO, JSON.stringify(dados));
    window.open(`imprimir-atividade.html${visualizar ? "?visualizar=true" : ""}`, "_blank");
}

function opcoesDeImpressao() {
    const p = pacienteDoCampo("impPaciente");
    return {
        paciente: p ? p.nome : "",
        mostrarNome: $("impMostrarNome").checked,
        data: $("impData").value
    };
}

$("btnVisualizar").addEventListener("click", () => { if (exigirRevisao()) abrirImpressao(atividadeDoEditor(), true, opcoesDeImpressao()); });
$("btnImprimir").addEventListener("click", () => { if (exigirRevisao()) abrirImpressao(atividadeDoEditor(), false, opcoesDeImpressao()); });

// avisa antes de fechar a página com alterações não salvas
window.addEventListener("beforeunload", (e) => {
    if (!$("telaEditor").hidden && alterado) {
        e.preventDefault();
        e.returnValue = "";
    }
});

// ------------------------------------------
// INÍCIO
// ------------------------------------------
(async () => {
    await Promise.all([carregarAtividades(), carregarPacientes(), carregarListas()]);
    preencherSelectsDasListas();
    preencherFiltroCategorias();
    renderizarRecentes();
})();
