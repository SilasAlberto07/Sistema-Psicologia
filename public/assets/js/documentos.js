
const inputPaciente = document.getElementById("inputPaciente");
const listaPacientes = document.getElementById("listaPacientes");
const tipoDocumento = document.getElementById("tipoDocumento");
const camposDeclaracao = document.getElementById("camposDeclaracao");
const camposAtestado = document.getElementById("camposAtestado");
const btnGerar = document.getElementById("btnGerar");

let pacientes = [];
let casais = [];

// liga o texto exibido no campo (que o usuário digita/seleciona) ao
// registro real (paciente individual ou pessoa de um casal)
let mapaOpcoes = {};

// popula o datalist: pacientes individuais + cada pessoa de um casal, separadamente
async function iniciarDocumentos() {

    pacientes = JSON.parse(await window.storage.getItem("pacientes")) || [];
    casais = JSON.parse(await window.storage.getItem("casais")) || [];

    const pacientesAtivos = pacientes.filter(p => !p.excluido);
    const casaisAtivos = casais.filter(c => !c.excluido);

    listaPacientes.innerHTML = "";
    mapaOpcoes = {};

    pacientesAtivos.forEach(p => {

        const label = `${p.nomeCompleto} — Paciente (${p.id})`;
        mapaOpcoes[label] = { origem: "individual", id: p.id };

        const opt = document.createElement("option");
        opt.value = label;
        listaPacientes.appendChild(opt);
    });

    casaisAtivos.forEach(c => {

        if (c.p1NomeCompleto) {
            const label1 = `${c.p1NomeCompleto} — Casal com ${c.p2NomeCompleto || "?"} (${c.id})`;
            mapaOpcoes[label1] = { origem: "casal", id: c.id, pessoa: "p1" };

            const opt1 = document.createElement("option");
            opt1.value = label1;
            listaPacientes.appendChild(opt1);
        }

        if (c.p2NomeCompleto) {
            const label2 = `${c.p2NomeCompleto} — Casal com ${c.p1NomeCompleto || "?"} (${c.id})`;
            mapaOpcoes[label2] = { origem: "casal", id: c.id, pessoa: "p2" };

            const opt2 = document.createElement("option");
            opt2.value = label2;
            listaPacientes.appendChild(opt2);
        }
    });
}

// alterna campos conforme tipo de documento
tipoDocumento.addEventListener("change", () => {
    const tipo = tipoDocumento.value;
    camposDeclaracao.style.display = tipo === "declaracao" ? "block" : "none";
    camposAtestado.style.display = tipo === "atestado" ? "block" : "none";
    camposContrato.style.display = tipo === "contrato" ? "block" : "none";
    document.getElementById("camposDevolutiva").style.display = tipo === "devolutiva" ? "block" : "none";
    if (tipo === "contrato") preencherPacienteContrato();
    if (tipo === "devolutiva" && typeof preencherPacienteDevolutiva === "function") preencherPacienteDevolutiva();
});

// ==========================================
// CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE PSICOTERAPIA
// ==========================================
const camposContrato = document.getElementById("camposContrato");
const CHAVE_DADOS_CONTRATO = "contratoPadroes"; // dados da psicóloga e valores, lembrados para o próximo contrato

const PADROES_CONTRATO = {
    psiNome: "Claudia Bethânia Prechedes dos Santos Rocha da Silva",
    psiCrp: "18/9851",
    psiCpf: "020.305.451-20",
    psiEndereco: "Av. Jose Teobaldo Anschsu, 64 - Jardim Barcelona - Centro Médico Kazicawa",
    psiEmail: "maclaudiabethaniapsicologa@gmail.com",
    psiTelefone: "(66) 99689-4144",
    valorAvulsa: "",
    valorSessaoPacote: "",
    qtdPacote: "4",
    valorPacote: "",
    prazoRestituicao: ""
};

// [chave nos dados, id do campo, obrigatório?, nome para a mensagem]
// Campo não obrigatório vazio sai no contrato como linha para preencher à mão.
const CAMPOS_CONTRATO = [
    ["psiNome", "ctPsiNome", true, "nome da psicóloga"],
    ["psiCrp", "ctPsiCrp", true, "CRP"],
    ["psiCpf", "ctPsiCpf", false],
    ["psiEndereco", "ctPsiEndereco", false],
    ["psiEmail", "ctPsiEmail", false],
    ["psiTelefone", "ctPsiTelefone", false],
    ["pacNome", "ctPacNome", false],
    ["pacCpf", "ctPacCpf", false],
    ["pacNascimento", "ctPacNascimento", false],
    ["pacEndereco", "ctPacEndereco", false],
    ["pacEmail", "ctPacEmail", false],
    ["pacTelefone", "ctPacTelefone", false],
    ["modalidade", "ctModalidade", false],
    ["opcaoContratada", "ctOpcaoContratada", false],
    ["valorAvulsa", "ctValorAvulsa", false],
    ["valorSessaoPacote", "ctValorSessaoPacote", false],
    ["qtdPacote", "ctQtdPacote", false],
    ["valorPacote", "ctValorPacote", false],
    ["prazoRestituicao", "ctPrazoRestituicao", false],
    ["data", "ctData", false]
];

// chaves que são lembradas para o próximo contrato (tudo, menos os dados do paciente e a data)
const CHAVES_LEMBRADAS = Object.keys(PADROES_CONTRATO);

function hojeISO() {
    const agora = new Date();
    return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-${String(agora.getDate()).padStart(2, "0")}`;
}

async function carregarPadroesContrato() {
    let salvos = {};
    try { salvos = JSON.parse(await window.storage.getItem(CHAVE_DADOS_CONTRATO)) || {}; } catch (e) { }
    const valores = { ...PADROES_CONTRATO };
    // usa o que já estava guardado (só se não estiver vazio)
    Object.keys(PADROES_CONTRATO).forEach(chave => {
        if (salvos[chave]) valores[chave] = salvos[chave];
    });
    CAMPOS_CONTRATO.forEach(([chave, id]) => {
        if (valores[chave] !== undefined) document.getElementById(id).value = valores[chave];
    });
    document.getElementById("ctData").value = hojeISO();
    calcularValorPacote();
    mostrarCamposOpcao();
}

// ------------------------------------------
// Valor do pacote = valor da sessão avulsa × quantidade de sessões
// (recalcula ao mudar a sessão avulsa ou a quantidade; dá para ajustar à mão depois)
// ------------------------------------------
function lerValorBR(texto) {
    let limpo = String(texto || "").replace(/R\$|\s/gi, "");
    if (limpo.includes(",")) limpo = limpo.replace(/\./g, "").replace(",", ".");
    const numero = parseFloat(limpo);
    return isNaN(numero) ? null : numero;
}

function formatarValorBR(numero) {
    return numero.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function calcularValorPacote() {
    const valorSessao = lerValorBR(document.getElementById("ctValorSessaoPacote").value);
    const qtd = parseInt(document.getElementById("ctQtdPacote").value, 10);
    document.getElementById("ctValorPacote").value =
        (valorSessao === null || !qtd || qtd < 1) ? "" : formatarValorBR(valorSessao * qtd);
}

document.getElementById("ctValorSessaoPacote").addEventListener("input", calcularValorPacote);
document.getElementById("ctQtdPacote").addEventListener("input", calcularValorPacote);

// mostra só os campos da opção escolhida (avulsa ou pacote)
function mostrarCamposOpcao() {
    const opcao = document.getElementById("ctOpcaoContratada").value;
    document.getElementById("grupoAvulsa").style.display = opcao === "avulsa" ? "" : "none";
    document.getElementById("grupoPacote").style.display = opcao === "pacote" ? "" : "none";
    document.getElementById("avisoPacote").style.display = opcao === "pacote" ? "" : "none";
}

document.getElementById("ctOpcaoContratada").addEventListener("change", mostrarCamposOpcao);

// "2026-11-10" → "10/11/2026"
function dataParaBR(valor) {
    const texto = String(valor || "").trim();
    const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return iso ? `${iso[3]}/${iso[2]}/${iso[1]}` : texto;
}

function montarEndereco(r, prefixo = "") {
    const pegar = (campo) => String(r[`${prefixo}${campo}`] || r[campo] || "").trim();
    const rua = [pegar("endereco"), pegar("numero")].filter(Boolean).join(", ");
    return [rua, pegar("complemento"), pegar("bairro"), pegar("cidadeUf"), pegar("cep") ? `CEP ${pegar("cep")}` : ""]
        .filter(Boolean).join(" - ");
}

// ao escolher o paciente, completa nome / CPF / endereço / e-mail / telefone do contrato
function preencherPacienteContrato() {
    const selecao = mapaOpcoes[inputPaciente.value.trim()];
    if (!selecao) return;

    let dados;
    if (selecao.origem === "casal") {
        const casal = casais.find(c => String(c.id) === String(selecao.id));
        if (!casal) return;
        const p = selecao.pessoa;
        dados = {
            pacNome: casal[`${p}NomeCompleto`],
            pacCpf: casal[`${p}Cpf`],
            pacNascimento: dataParaBR(casal[`${p}DataNascimento`]),
            pacEndereco: montarEndereco(casal),
            pacEmail: casal[`${p}Email`],
            pacTelefone: casal[`${p}Telefone`]
        };
    } else {
        const paciente = pacientes.find(p => String(p.id) === String(selecao.id));
        if (!paciente) return;
        dados = {
            pacNome: paciente.nomeCompleto,
            pacCpf: paciente.cpf,
            pacNascimento: dataParaBR(paciente.dataNascimento),
            pacEndereco: montarEndereco(paciente),
            pacEmail: paciente.email,
            pacTelefone: paciente.telefone
        };
    }

    CAMPOS_CONTRATO.forEach(([chave, id]) => {
        if (chave in dados) document.getElementById(id).value = dados[chave] || "";
    });
}

inputPaciente.addEventListener("change", () => {
    if (tipoDocumento.value === "contrato") preencherPacienteContrato();
});

async function gerarContrato() {
    const dados = { tipo: "contrato" };
    const faltando = [];

    CAMPOS_CONTRATO.forEach(([chave, id, obrigatorio, nome]) => {
        const campo = document.getElementById(id);
        dados[chave] = campo.value.trim();
        campo.classList.toggle("campo-faltando", obrigatorio && !dados[chave]);
        if (obrigatorio && !dados[chave]) faltando.push(nome);
    });

    if (faltando.length) {
        mostrarMensagem(`Preencha os campos obrigatórios: ${faltando.join(", ")}.`, "warning");
        return;
    }

    // guarda os dados da psicóloga e os valores para o próximo contrato
    // (mescla com o que já estava salvo, para não apagar nenhuma informação antiga)
    let jaSalvos = {};
    try { jaSalvos = JSON.parse(await window.storage.getItem(CHAVE_DADOS_CONTRATO)) || {}; } catch (e) { }
    const lembrar = { ...jaSalvos };
    CHAVES_LEMBRADAS.forEach(chave => { lembrar[chave] = dados[chave]; });
    await window.storage.setItem(CHAVE_DADOS_CONTRATO, JSON.stringify(lembrar));

    dados.cidadeEstado = document.getElementById("cidadeEstado").value.trim();

    // paciente escolhido na lista → o PDF fica guardado nos documentos dele
    const selecao = mapaOpcoes[inputPaciente.value.trim()];
    if (selecao) dados.destino = destinoDaSelecao(selecao);
    marcarEdicao(dados);

    localStorage.setItem("contratoTemp", JSON.stringify(dados));
    window.open("imprimir-contrato.html", "_blank");
    encerrarEdicao();
}

btnGerar.addEventListener("click", async () => {

    if (tipoDocumento.value === "contrato") {
        gerarContrato();
        return;
    }

    if (tipoDocumento.value === "devolutiva") {
        gerarDevolutiva();
        return;
    }

    const selecao = mapaOpcoes[inputPaciente.value.trim()];

    if (!selecao) {
        mostrarMensagem(
            "Selecione um paciente da lista de sugestões (digite o nome e clique numa opção).",
            "warning"
        );
        return;
    }

    let nomeCompleto = "";
    let cpf = "";

    if (selecao.origem === "casal") {

        const casal = casais.find(c => String(c.id) === String(selecao.id));

        if (!casal) {
            mostrarMensagem("Casal não encontrado!", "error");
            return;
        }

        nomeCompleto = selecao.pessoa === "p1"
            ? (casal.p1NomeCompleto || "-")
            : (casal.p2NomeCompleto || "-");

        cpf = (selecao.pessoa === "p1" ? casal.p1Cpf : casal.p2Cpf) || "";

    } else {

        const paciente = pacientes.find(p => String(p.id) === String(selecao.id));

        if (!paciente) {
            mostrarMensagem("Paciente não encontrado!", "error");
            return;
        }

        nomeCompleto = paciente.nomeCompleto;
        cpf = paciente.cpf || "";
    }

    const tipo = tipoDocumento.value;

    // atestado: avisa quando já chegou no limite (a Dra decide se gera mesmo assim)
    if (tipo === "atestado") {
        const situacao = await situacaoAtestados(selecao);
        if (situacao && situacao.usados >= situacao.limite) {
            const resposta = await mostrarConfirmacao(
                `${situacao.nome} já tem ${situacao.usados} de ${situacao.limite} atestados. Deseja gerar mesmo assim?`
            );
            if (!resposta.isConfirmed) return;
        }
    }

    const dados = {
        tipo,
        pacienteId: selecao.id,
        destino: destinoDaSelecao(selecao),
        nomeCompleto,
        cpf,
        cidadeEstado: document.getElementById("cidadeEstado").value.trim(),
    };

    if (tipo === "declaracao") {
        dados.data = document.getElementById("declData").value;
        dados.hora = document.getElementById("declHora").value;
        dados.endereco = document.getElementById("declEndereco").value.trim();
        dados.previsao = document.getElementById("declPrevisao").value.trim();
        dados.texto = document.getElementById("declTexto").value.trim();
    } else {
        dados.data = document.getElementById("atestData").value;
        dados.duracao = document.getElementById("atestDuracao").value.trim();
        dados.motivo = document.getElementById("atestMotivo").value.trim();
    }

    marcarEdicao(dados);

    localStorage.setItem("documentoTemp", JSON.stringify(dados));

    window.open("imprimir-documento.html", "_blank");
    encerrarEdicao();
    atualizarInfoAtestados();
});

// ==========================================
// DOCUMENTOS DO PACIENTE
// (o PDF gerado fica guardado no cadastro e aparece em Sessões → Documentos)
// ==========================================
function destinoDaSelecao(selecao) {
    return { origem: selecao.origem, id: selecao.id, pessoa: selecao.pessoa || null };
}

// quantos atestados a pessoa já tem dentro do limite configurado
async function situacaoAtestados(selecao) {
    const lista = selecao.origem === "casal" ? casais : pacientes;
    const registro = lista.find(r => String(r.id) === String(selecao.id));
    if (!registro) return null;
    const config = await DocsPaciente.lerConfig();
    let usados = DocsPaciente.contarAtestados(registro, selecao.pessoa || null, config);
    // editando um atestado: a versão nova substitui a antiga, não soma
    if (edicao && edicao.doc.tipo === "atestado" && edicao.doc.status === "ativo") usados = Math.max(0, usados - 1);
    return {
        usados,
        limite: Number(config.limiteAtestados) || 0,
        nome: DocsPaciente.nomeDaPessoa(registro, selecao.origem, selecao.pessoa) || "Este paciente"
    };
}

const infoAtestados = document.getElementById("infoAtestados");

async function atualizarInfoAtestados() {
    if (!infoAtestados) return;
    const selecao = mapaOpcoes[inputPaciente.value.trim()];
    if (tipoDocumento.value !== "atestado" || !selecao) {
        infoAtestados.style.display = "none";
        return;
    }
    const s = await situacaoAtestados(selecao);
    if (!s) { infoAtestados.style.display = "none"; return; }
    const resta = s.limite - s.usados;
    infoAtestados.className = "info-atestados" + (resta <= 0 ? " limite" : "");
    infoAtestados.innerHTML = `<i class="ti ti-info-circle"></i> Atestados de <strong>${escaparTexto(s.nome)}</strong>:
        <strong>${s.usados} de ${s.limite}</strong> gerados · ` +
        (resta > 0 ? `ainda pode gerar <strong>${resta}</strong>` : `<strong>limite atingido</strong> (você ainda pode gerar, com confirmação)`);
    infoAtestados.style.display = "";
}

function escaparTexto(texto) {
    return String(texto ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

inputPaciente.addEventListener("change", atualizarInfoAtestados);
tipoDocumento.addEventListener("change", atualizarInfoAtestados);

// ---------- EDITAR um documento já gerado (aberto pela tela Sessões) ----------
// Documentos.html?editarDoc=<id>&origem=individual|casal&id=<id do cadastro>
let edicao = null; // { doc, origem, id }
const avisoEdicao = document.getElementById("avisoEdicao");

function marcarEdicao(dados) {
    if (edicao) dados.substitui = edicao.doc.id;
}

function encerrarEdicao() {
    edicao = null;
    if (avisoEdicao) avisoEdicao.style.display = "none";
    history.replaceState(null, "", window.location.pathname);
}

// campos de cada tipo: [chave nos dados, id do campo]
const CAMPOS_EDICAO = {
    declaracao: [["data", "declData"], ["hora", "declHora"], ["endereco", "declEndereco"], ["previsao", "declPrevisao"], ["texto", "declTexto"], ["cidadeEstado", "cidadeEstado"]],
    atestado: [["data", "atestData"], ["duracao", "atestDuracao"], ["motivo", "atestMotivo"], ["cidadeEstado", "cidadeEstado"]],
    contrato: [...CAMPOS_CONTRATO.map(([chave, id]) => [chave, id]), ["cidadeEstado", "cidadeEstado"]],
    devolutiva: [
        ["paciente", "devPaciente"], ["inicio", "devInicio"], ["fim", "devFim"], ["modalidade", "devModalidade"],
        ["abordagem", "devAbordagem"], ["objetivo", "devObjetivo"], ["demandas", "devDemandas"],
        ["estrategias", "devEstrategias"], ["evolucao", "devEvolucao"], ["avancos", "devAvancos"],
        ["motivo", "devMotivo"], ["orientacoes", "devOrientacoes"], ["data", "devData"],
        ["cidadeEstado", "cidadeEstado"]
    ]
};

function abrirEdicaoDaURL() {
    const params = new URLSearchParams(window.location.search);

    // "Novo documento" pela tela Sessões: já deixa o paciente escolhido
    const paciente = params.get("paciente");
    if (paciente) {
        const [origemP, idP, pessoaP] = paciente.split(":");
        const rotuloP = Object.keys(mapaOpcoes).find(r => {
            const s = mapaOpcoes[r];
            return s.origem === origemP && String(s.id) === String(idP) && (!pessoaP || s.pessoa === pessoaP);
        });
        if (rotuloP && (origemP !== "casal" || pessoaP)) {
            inputPaciente.value = rotuloP;
            inputPaciente.dispatchEvent(new Event("change"));
        }
        history.replaceState(null, "", window.location.pathname);
        return;
    }

    const idDoc = params.get("editarDoc");
    if (!idDoc) return;

    const origem = params.get("origem") === "casal" ? "casal" : "individual";
    const lista = origem === "casal" ? casais : pacientes;
    const registro = lista.find(r => String(r.id) === String(params.get("id")));
    const doc = registro && (registro.documentos || []).find(d => d.id === idDoc);

    if (!doc || !CAMPOS_EDICAO[doc.tipo]) {
        mostrarMensagem("Documento não encontrado para editar.", "warning");
        return;
    }

    // escolhe o paciente certo na lista
    const rotulo = Object.keys(mapaOpcoes).find(r => {
        const s = mapaOpcoes[r];
        return s.origem === origem && String(s.id) === String(registro.id) && (s.pessoa || null) === (doc.pessoa || null);
    });
    if (rotulo) inputPaciente.value = rotulo;

    tipoDocumento.value = doc.tipo;
    tipoDocumento.dispatchEvent(new Event("change"));

    // preenche com o que estava no documento
    const dados = doc.dados || {};
    CAMPOS_EDICAO[doc.tipo].forEach(([chave, id]) => {
        const campo = document.getElementById(id);
        if (campo && dados[chave] !== undefined) campo.value = dados[chave];
    });
    // documento salvo sem cidade: usa a cidade fixa
    if (!campoCidadeEstado.value.trim()) campoCidadeEstado.value = cidadeEstadoSalva;
    // declaração sem endereço: usa o endereço fixo do consultório
    if (doc.tipo === "declaracao" && !document.getElementById("declEndereco").value.trim()) {
        document.getElementById("declEndereco").value = document.getElementById("ctPsiEndereco").value;
    }
    // declaração antiga (de antes do texto editável): monta o texto com os campos dela
    if (doc.tipo === "declaracao" && !dados.texto) montarTextoDeclaracao(true);
    if (doc.tipo === "contrato") {
        mostrarCamposOpcao();
        calcularValorPacote();
    }

    edicao = { doc, origem, id: registro.id };
    if (avisoEdicao) {
        const quando = new Date(doc.criadoEm).toLocaleDateString("pt-BR");
        avisoEdicao.innerHTML = `<i class="ti ti-pencil"></i> Editando <strong>${escaparTexto(doc.titulo)}</strong> de ${quando}.
            Ao gerar, a versão anterior fica guardada como <strong>substituída</strong>.
            <button type="button" id="btnSairEdicao">Sair da edição</button>`;
        avisoEdicao.style.display = "";
        document.getElementById("btnSairEdicao").onclick = () => window.location.href = "documentos.html";
    }
    atualizarInfoAtestados();
}

// ==========================================
// DECLARAÇÃO DE COMPARECIMENTO — texto inteiro editável
// O texto é montado com o paciente e os campos. Enquanto a Dra não mexer
// no texto, ele acompanha os campos; depois de editado, não é mais trocado
// (a não ser pelo botão "Montar o texto de novo com os campos").
// ==========================================
const declTexto = document.getElementById("declTexto");
let ultimoTextoDeclAutomatico = "";

function nomeDaSelecaoDecl() {
    const selecao = mapaOpcoes[inputPaciente.value.trim()];
    if (!selecao) return "";
    if (selecao.origem === "casal") {
        const casal = casais.find(c => String(c.id) === String(selecao.id));
        return casal ? (casal[`${selecao.pessoa}NomeCompleto`] || "") : "";
    }
    const paciente = pacientes.find(p => String(p.id) === String(selecao.id));
    return paciente ? (paciente.nomeCompleto || "") : "";
}

function textoPadraoDeclaracao() {
    const valor = (id) => document.getElementById(id).value.trim();
    const data = valor("declData");
    const dataBR = /^\d{4}-\d{2}-\d{2}$/.test(data) ? data.split("-").reverse().join("/") : "____/____/______";

    return [
        `Declaro para os devidos fins que ${nomeDaSelecaoDecl() || "________________________"}, está sendo submetida a acompanhamento psicológico, sob meus cuidados profissionais, comparecendo às sessões do dia ${dataBR}, no horário ${valor("declHora") || "____:____"}, no endereço ${valor("declEndereco") || "________________________"}.`,
        valor("declPrevisao") || "Até o presente momento sem data de previsão para o término do acompanhamento.",
        "Este documento é emitido nos termos da legislação vigente e das normas do Conselho Federal de Psicologia, sendo válido para os fins a que se destina."
    ].join("\n\n");
}

// forcar = true → troca mesmo se o texto já foi editado
function montarTextoDeclaracao(forcar = false) {
    const atual = declTexto.value.trim();
    const foiEditado = atual && atual !== ultimoTextoDeclAutomatico.trim();
    if (foiEditado && !forcar) return;
    ultimoTextoDeclAutomatico = textoPadraoDeclaracao();
    declTexto.value = ultimoTextoDeclAutomatico;
}

["declData", "declHora", "declEndereco", "declPrevisao"].forEach(id => {
    document.getElementById(id).addEventListener("input", () => montarTextoDeclaracao());
    document.getElementById(id).addEventListener("change", () => montarTextoDeclaracao());
});
inputPaciente.addEventListener("change", () => montarTextoDeclaracao());
tipoDocumento.addEventListener("change", () => {
    if (tipoDocumento.value === "declaracao") montarTextoDeclaracao();
});

document.getElementById("btnRefazerTextoDecl").addEventListener("click", async () => {
    if (declTexto.value.trim() && declTexto.value.trim() !== ultimoTextoDeclAutomatico.trim()) {
        const resposta = await mostrarConfirmacao("O texto que você editou será trocado pelo texto montado com os campos. Continuar?");
        if (!resposta.isConfirmed) return;
    }
    montarTextoDeclaracao(true);
});

// ==========================================
// ENDEREÇO DO ATENDIMENTO (declaração) — fixo, o mesmo do contrato.
// Fica travado; o lápis libera para editar. Ao confirmar, o novo endereço
// passa a ser o padrão (vale para a próxima declaração e para o contrato).
// ==========================================
const declEndereco = document.getElementById("declEndereco");
const btnEditarEnderecoDecl = document.getElementById("btnEditarEnderecoDecl");

function enderecoFixoDecl() {
    return document.getElementById("ctPsiEndereco").value.trim() || PADROES_CONTRATO.psiEndereco;
}

function travarEnderecoDecl(travar) {
    declEndereco.readOnly = travar;
    btnEditarEnderecoDecl.innerHTML = travar ? '<i class="ti ti-pencil"></i>' : '<i class="ti ti-check"></i>';
    btnEditarEnderecoDecl.title = travar ? "Editar endereço" : "Confirmar endereço";
    btnEditarEnderecoDecl.classList.toggle("editando", !travar);
}

async function salvarEnderecoPadrao(endereco) {
    // mescla com o que já estava salvo, sem apagar nenhuma outra informação
    let salvos = {};
    try { salvos = JSON.parse(await window.storage.getItem(CHAVE_DADOS_CONTRATO)) || {}; } catch (e) { }
    salvos.psiEndereco = endereco;
    await window.storage.setItem(CHAVE_DADOS_CONTRATO, JSON.stringify(salvos));
    document.getElementById("ctPsiEndereco").value = endereco;
}

btnEditarEnderecoDecl.addEventListener("click", async () => {
    if (declEndereco.readOnly) {
        travarEnderecoDecl(false);
        declEndereco.focus();
        declEndereco.select();
        return;
    }
    const novo = declEndereco.value.trim();
    if (!novo) {
        declEndereco.value = enderecoFixoDecl();
    } else if (novo !== enderecoFixoDecl()) {
        await salvarEnderecoPadrao(novo);
        mostrarMensagem("Endereço atualizado! Ele será usado nas próximas declarações e no contrato.", "success");
    }
    travarEnderecoDecl(true);
    montarTextoDeclaracao();
});

declEndereco.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !declEndereco.readOnly) {
        e.preventDefault();
        btnEditarEnderecoDecl.click();
    }
});

// ==========================================
// CIDADE / ESTADO — fixo em "Sinop, MT".
// Se a Dra mudar à mão, o novo valor fica guardado para os próximos documentos.
// ==========================================
const CHAVE_CIDADE_ESTADO = "cidadeEstadoPadrao";
const CIDADE_ESTADO_PADRAO = "Sinop, MT";
const campoCidadeEstado = document.getElementById("cidadeEstado");
let cidadeEstadoSalva = CIDADE_ESTADO_PADRAO;

async function carregarCidadeEstado() {
    try {
        const salvo = await window.storage.getItem(CHAVE_CIDADE_ESTADO);
        if (salvo && String(salvo).trim()) cidadeEstadoSalva = String(salvo).trim();
    } catch (e) { }
    campoCidadeEstado.value = cidadeEstadoSalva;
}

campoCidadeEstado.addEventListener("change", async () => {
    const valor = campoCidadeEstado.value.trim();
    if (!valor) {
        campoCidadeEstado.value = cidadeEstadoSalva; // apagou tudo → volta o que estava
        return;
    }
    if (valor === cidadeEstadoSalva) return;
    cidadeEstadoSalva = valor;
    try { await window.storage.setItem(CHAVE_CIDADE_ESTADO, valor); } catch (e) { }
});

(async () => {
    await iniciarDocumentos();
    await carregarCidadeEstado();
    await carregarPadroesContrato();
    declEndereco.value = enderecoFixoDecl();
    abrirEdicaoDaURL();
    if (tipoDocumento.value === "declaracao") montarTextoDeclaracao();
})();
