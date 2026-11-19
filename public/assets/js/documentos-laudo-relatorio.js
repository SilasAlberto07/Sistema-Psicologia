// ═══════════════════════════════════════════════
// LAUDO PSICOLÓGICO e RELATÓRIO PSICOLÓGICO
// (tela Documentos — usa as variáveis de documentos.js:
//  inputPaciente, tipoDocumento, mapaOpcoes, pacientes, casais,
//  marcarEdicao, encerrarEdicao, destinoDaSelecao, hojeISO, CAMPOS_EDICAO...)
//
// Funcionam igual ao Relatório de Devolutiva:
//  - "Gerar Prompt para IA": monta o prompt com os títulos das seções
//  - "Preencher com Texto Colado": lê a resposta da IA e preenche cada campo pelo título
// ═══════════════════════════════════════════════

const MODELOS_LAUDO_RELATORIO = {

    laudo: {
        nome: "Laudo Psicológico",
        prefixo: "Laudo",            // sufixo dos ids das janelas
        grupo: "camposLaudo",
        campoNome: "ldNome",
        // [chave nos dados, id do campo]
        campos: [
            ["paciente", "ldNome"],
            ["idade", "ldIdade"],
            ["cpf", "ldCpf"],
            ["solicitante", "ldSolicitante"],
            ["finalidade", "ldFinalidade"],
            ["descricao", "ldDescricao"],
            ["procedimentos", "ldProcedimentos"],
            ["analise", "ldAnalise"],
            ["conclusao", "ldConclusao"],
            ["data", "ldData"]
        ],
        // títulos que a IA deve usar na resposta → campo que cada um preenche
        titulosIA: [
            ["Descrição", "ldDescricao"],
            ["Procedimentos", "ldProcedimentos"],
            ["Análise", "ldAnalise"],
            ["Conclusão", "ldConclusao"]
        ],
        rotuloResumo: "Dados da avaliação (preencha manualmente, é específico de cada caso):",
        placeholderResumo: "Cole ou digite aqui: quem solicitou, finalidade/cargo, quantas sessões, testes aplicados e resultados, observações da entrevista, conclusão (apto/inapto)...",
        tituloResumo: "Dados da avaliação",
        aviso: "Preencha os tópicos do Laudo Psicológico baseado nos dados da avaliação citados abaixo. As respostas devem estar de acordo com o Código de Ética do CFP e a Resolução CFP nº 06/2019 (elaboração de documentos psicológicos), de forma ética, técnica e revisada. Mantenha exatamente os títulos abaixo, seguidos de dois-pontos. Em \"Procedimentos\" e \"Análise\", escreva um item por linha começando com \"- \" (em \"Análise\", um item para cada teste, com o nome do teste no início)."
    },

    relatorio: {
        nome: "Relatório Psicológico",
        prefixo: "Relatorio",
        grupo: "camposRelatorio",
        campoNome: "rlPaciente",
        campos: [
            ["paciente", "rlPaciente"],
            ["nascimento", "rlNascimento"],
            ["dataAtendimento", "rlDataAtendimento"],
            ["finalidade", "rlFinalidade"],
            ["demanda", "rlDemanda"],
            ["procedimento", "rlProcedimento"],
            ["analise", "rlAnalise"],
            ["conclusao", "rlConclusao"],
            ["data", "rlData"]
        ],
        titulosIA: [
            ["Finalidade do documento", "rlFinalidade"],
            ["Descrição da demanda", "rlDemanda"],
            ["Procedimento", "rlProcedimento"],
            ["Análise", "rlAnalise"],
            ["Conclusão", "rlConclusao"]
        ],
        rotuloResumo: "Resumo do atendimento (preencha manualmente, é específico de cada caso):",
        placeholderResumo: "Cole ou digite aqui o resumo do atendimento: quem pediu o relatório, queixa/demanda, como foi o atendimento, abordagem, o que foi observado, recomendações...",
        tituloResumo: "Resumo do atendimento",
        aviso: "Preencha os tópicos do Relatório Psicológico baseado no resumo do atendimento citado abaixo. As respostas devem estar de acordo com o Código de Ética do CFP, a Resolução CFP nº 06/2019 (elaboração de documentos psicológicos) e a abordagem da TCC, de forma ética, técnica e revisada. Mantenha exatamente os títulos abaixo, seguidos de dois-pontos."
    },

    // DOCUMENTO PARA EMPRESA (Psicologia Organizacional):
    // não usa paciente e NÃO é guardado nos documentos de ninguém (não vai para Sessões)
    entrevista: {
        nome: "Relatório de Entrevista",
        empresa: true,
        prefixo: "Entrevista",
        grupo: "camposEntrevista",
        campoNome: "etCandidato",
        campos: [
            ["empresa", "etEmpresa"],
            ["cargo", "etCargo"],
            ["candidato", "etCandidato"],
            ["idade", "etIdade"],
            ["objetivo", "etObjetivo"],
            ["desenvolvimento", "etDesenvolvimento"],
            ["indicadores", "etIndicadores"],
            ["consideracoes", "etConsideracoes"],
            ["responsavel", "etResponsavel"],
            ["data", "etData"]
        ],
        titulosIA: [
            ["Objetivo do acompanhamento da entrevista", "etObjetivo"],
            ["Desenvolvimento do processo seletivo", "etDesenvolvimento"],
            ["Indicadores comportamentais identificados", "etIndicadores"],
            ["Evolução observada e considerações finais", "etConsideracoes"]
        ],
        rotuloResumo: "Dados da entrevista (preencha manualmente, é específico de cada candidato):",
        placeholderResumo: "Cole ou digite aqui: empresa, cargo, candidato(a), idade, experiências, como foi a entrevista, comportamentos observados, pontos fortes e de atenção, motivação, recomendação...",
        tituloResumo: "Dados da entrevista",
        aviso: "Preencha os tópicos do Relatório de Entrevista – Recrutamento e Seleção (Psicologia Organizacional) baseado nos dados da entrevista citados abaixo. Escreva em linguagem profissional e objetiva, de acordo com o Código de Ética do CFP e a Resolução CFP nº 06/2019, sem diagnósticos clínicos e sem expor informações íntimas do(a) candidato(a), restringindo-se ao que é relevante para a função. Mantenha exatamente os títulos abaixo, seguidos de dois-pontos."
    }
};

const $lr = (id) => document.getElementById(id);

// pede para a IA devolver tudo numa caixa de código (botão de copiar)
const OBS_CAIXA_COPIAR_LR = "\n\nOBSERVAÇÃO: Coloque a resposta inteira dentro de UM ÚNICO bloco de código (caixa de código do tipo texto), para que possa ser copiada clicando apenas no ícone de copiar. Dentro da caixa coloque somente os títulos acima com as respostas preenchidas, usando exatamente os mesmos títulos, cada um no começo de uma linha e seguido de dois-pontos. Não use negrito, asteriscos, # ou qualquer outra formatação dentro da caixa, e não escreva nenhum outro comentário dentro dela.";

// datas iniciais
$lr("ldData").value = hojeISO();
$lr("rlData").value = hojeISO();
$lr("rlDataAtendimento").value = hojeISO();
$lr("etData").value = hojeISO();

// campos usados ao editar um documento já gerado (aberto pela tela Sessões)
Object.entries(MODELOS_LAUDO_RELATORIO).forEach(([tipo, modelo]) => {
    CAMPOS_EDICAO[tipo] = [...modelo.campos, ["cidadeEstado", "cidadeEstado"]];
});

// ------------------------------------------
// Mostra os campos do tipo escolhido
// ------------------------------------------
function mostrarCamposLaudoRelatorio() {
    const tipo = tipoDocumento.value;
    Object.entries(MODELOS_LAUDO_RELATORIO).forEach(([t, modelo]) => {
        $lr(modelo.grupo).style.display = t === tipo ? "block" : "none";
    });
    if (MODELOS_LAUDO_RELATORIO[tipo]) preencherPacienteLaudoRelatorio();

    // documento para empresa não usa paciente: esconde o campo "Paciente"
    const ehEmpresa = !!(MODELOS_LAUDO_RELATORIO[tipo] && MODELOS_LAUDO_RELATORIO[tipo].empresa);
    $lr("grupoInputPaciente").style.display = ehEmpresa ? "none" : "";
}

tipoDocumento.addEventListener("change", mostrarCamposLaudoRelatorio);

// ------------------------------------------
// Ao escolher o paciente: completa nome, CPF, idade / nascimento
// (só troca o que estiver vazio ou o que o próprio sistema colocou)
// ------------------------------------------
const ultimoAutomaticoLR = {};

function completarCampoLR(id, valor) {
    const campo = $lr(id);
    if (!campo || !valor) return;
    if (!campo.value.trim() || campo.value === ultimoAutomaticoLR[id]) {
        campo.value = valor;
        ultimoAutomaticoLR[id] = valor;
    }
}

function calcularIdade(dataNascimento) {
    const m = String(dataNascimento || "").match(/^(\d{4})-(\d{2})-(\d{2})/)
        || String(dataNascimento || "").match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (!m) return "";
    const [ano, mes, dia] = m[0].includes("/") ? [m[3], m[2], m[1]] : [m[1], m[2], m[3]];
    const hoje = new Date();
    let idade = hoje.getFullYear() - Number(ano);
    if (hoje.getMonth() + 1 < Number(mes) || (hoje.getMonth() + 1 === Number(mes) && hoje.getDate() < Number(dia))) idade--;
    return idade >= 0 && idade < 130 ? `${idade} anos` : "";
}

function preencherPacienteLaudoRelatorio() {
    const selecao = mapaOpcoes[inputPaciente.value.trim()];
    if (!selecao) return;

    let nome = "", cpf = "", nascimento = "";
    if (selecao.origem === "casal") {
        const casal = casais.find(c => String(c.id) === String(selecao.id));
        if (!casal) return;
        nome = casal[`${selecao.pessoa}NomeCompleto`] || "";
        cpf = casal[`${selecao.pessoa}Cpf`] || "";
        nascimento = casal[`${selecao.pessoa}DataNascimento`] || "";
    } else {
        const paciente = pacientes.find(p => String(p.id) === String(selecao.id));
        if (!paciente) return;
        nome = paciente.nomeCompleto || "";
        cpf = paciente.cpf || "";
        nascimento = paciente.dataNascimento || "";
    }

    if (tipoDocumento.value === "laudo") {
        completarCampoLR("ldNome", nome);
        completarCampoLR("ldCpf", cpf);
        completarCampoLR("ldIdade", calcularIdade(nascimento));
    }
    if (tipoDocumento.value === "relatorio") {
        completarCampoLR("rlPaciente", nome);
        completarCampoLR("rlNascimento", dataParaBR(nascimento));
    }
}

inputPaciente.addEventListener("change", () => {
    if (MODELOS_LAUDO_RELATORIO[tipoDocumento.value]) preencherPacienteLaudoRelatorio();
});

// ------------------------------------------
// GERAR E IMPRIMIR
// ------------------------------------------
function gerarLaudoRelatorio(tipo) {
    const modelo = MODELOS_LAUDO_RELATORIO[tipo];
    const dados = { tipo };
    modelo.campos.forEach(([chave, id]) => { dados[chave] = $lr(id).value.trim(); });

    const campoNome = $lr(modelo.campoNome);
    const nome = campoNome.value.trim();
    campoNome.classList.toggle("campo-faltando", !nome);
    if (!nome) {
        mostrarMensagem(modelo.empresa
            ? "Informe o nome do(a) candidato(a)."
            : "Informe o paciente (escolha na lista acima ou digite o nome).", "warning");
        return;
    }

    dados.nomeCompleto = nome;
    dados.cidadeEstado = document.getElementById("cidadeEstado").value.trim();

    // documento para empresa: não vai para Sessões nem para nenhum paciente.
    // Com empresa cadastrada escolhida, o PDF fica guardado na empresa (tela Empresas).
    if (modelo.empresa) {
        const idEmpresa = $lr("etEmpresaCadastrada") ? $lr("etEmpresaCadastrada").value : "";
        if (idEmpresa) {
            dados.empresaId = idEmpresa;
            dados.destino = { origem: "empresa", id: idEmpresa };
            if (edicaoEmpresa && String(edicaoEmpresa.id) === String(idEmpresa)) dados.substitui = edicaoEmpresa.doc.id;
        }
        localStorage.setItem("documentoTemp", JSON.stringify(dados));
        window.open("imprimir-documento.html", "_blank");
        if (edicaoEmpresa) encerrarEdicaoEmpresa();
        return;
    }

    // paciente escolhido na lista → o PDF fica guardado nos documentos dele
    const selecao = mapaOpcoes[inputPaciente.value.trim()];
    if (selecao) {
        dados.pacienteId = selecao.id;
        dados.destino = destinoDaSelecao(selecao);
    }
    marcarEdicao(dados);

    localStorage.setItem("documentoTemp", JSON.stringify(dados));
    window.open("imprimir-documento.html", "_blank");
    encerrarEdicao();
}

// ==========================================
// JANELAS DE IA (uma dupla para cada documento, no mesmo visual da Devolutiva)
// ==========================================
function gerarPromptLaudoRelatorio(modelo) {
    const campos = modelo.titulosIA.map(([label]) => `${label}:`).join("\n");
    return `${modelo.aviso}\n\n${campos}${OBS_CAIXA_COPIAR_LR}`;
}

function preencherLaudoRelatorioAutomaticamente(modelo, textoColado) {
    // título mais comprido primeiro (ex: "Procedimentos" antes de "Procedimento")
    const camposOrdenados = [...modelo.titulosIA].sort((a, b) => b[0].length - a[0].length);
    const escapados = camposOrdenados.map(([label]) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    // título no começo da linha, com ou sem número / negrito na frente (ex: "4) **Análise:**"),
    // e com os dois-pontos obrigatórios (para não confundir com uma frase que começa com a mesma palavra)
    const regexLabels = new RegExp(`(?:^|\\n)[\\s#*\\d.)-]*(${escapados.join("|")})\\s*\\**\\s*:\\s*\\**`, "gi");

    const matches = [];
    let m;
    while ((m = regexLabels.exec(textoColado)) !== null) {
        matches.push({ label: m[1], inicio: m.index, fim: regexLabels.lastIndex });
    }

    if (matches.length === 0) {
        mostrarMensagem(
            `Não encontrei nenhum título conhecido. Confira se os títulos batem com: ${modelo.titulosIA.map(([l]) => `'${l}:'`).join(", ")}.`,
            "warning"
        );
        return;
    }

    let preenchidos = 0;
    matches.forEach((match, i) => {
        const proxima = matches[i + 1];
        const fimConteudo = proxima ? proxima.inicio : textoColado.length;
        const valor = textoColado.slice(match.fim, fimConteudo).replace(/```/g, "").trim();

        const encontrado = modelo.titulosIA.find(([label]) => label.toLowerCase() === match.label.toLowerCase());
        if (!encontrado || !valor) return;

        $lr(encontrado[1]).value = valor;
        preenchidos++;
    });

    mostrarMensagem(`${preenchidos} campo(s) preenchido(s) automaticamente!`, "success");
}

async function copiarTextoLR(texto) {
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

function montarJanelasIA(modelo) {
    const p = modelo.prefixo;
    const grupo = $lr(modelo.grupo);

    const janelas = document.createElement("div");
    janelas.innerHTML = `
        <div class="modal-colar oculto" id="modalPromptIA${p}">
            <div class="modal-colar-box">
                <div class="modal-colar-header">
                    <h2><i class="ti ti-robot"></i> Prompt Pronto para IA — ${modelo.nome}</h2>
                    <button type="button" data-fechar><i class="ti ti-x"></i></button>
                </div>
                <div class="modal-colar-body">
                    <p style="color:#9a9a88; font-size:13px; margin-bottom:10px;">
                        Este é o modelo de perguntas. Clique em "Copiar Prompt", cole em um chat de IA
                        e cole a resposta da IA no botão "Preencher com Texto Colado".
                    </p>
                    <textarea id="textoPromptIA${p}" rows="12" readonly></textarea>

                    <label for="relatoIA${p}" style="font-size:13px; font-weight:500; color:#3d3a28; margin:14px 0 6px; display:block;">
                        ${modelo.rotuloResumo}
                    </label>
                    <textarea id="relatoIA${p}" rows="6" placeholder="${modelo.placeholderResumo}"></textarea>
                </div>
                <div class="modal-colar-footer">
                    <button type="button" class="btn-cancelar" data-fechar>Fechar</button>
                    <button type="button" class="btn-abrir-chatgpt" data-abrir-chatgpt>
                        <i class="ti ti-external-link"></i> Abrir ChatGPT
                    </button>
                    <button type="button" class="btn-preencher" id="btnCopiarPromptIA${p}">
                        <i class="ti ti-copy"></i> Copiar Prompt
                    </button>
                </div>
            </div>
        </div>

        <div class="modal-colar oculto" id="modalColar${p}">
            <div class="modal-colar-box">
                <div class="modal-colar-header">
                    <h2><i class="ti ti-clipboard-text"></i> Colar ${modelo.nome} Pronto</h2>
                    <button type="button" data-fechar><i class="ti ti-x"></i></button>
                </div>
                <div class="modal-colar-body">
                    <p style="color:#9a9a88; font-size:13px; margin-bottom:10px;">
                        Cole abaixo a resposta da IA usando os títulos ${modelo.titulosIA.map(([l]) => `"${l}:"`).join(", ")}.
                        O sistema localiza cada título e preenche o campo correspondente.
                    </p>
                    <textarea id="textoColado${p}" rows="1" placeholder="Cole aqui a resposta da IA..."></textarea>
                </div>
                <div class="modal-colar-footer">
                    <button type="button" class="btn-cancelar" data-fechar>Cancelar</button>
                    <button type="button" class="btn-preencher" id="btnPreencherAutomatico${p}">
                        <i class="ti ti-wand"></i> Preencher Automaticamente
                    </button>
                </div>
            </div>
        </div>
    `;
    // as janelas ficam logo depois dos campos do documento
    grupo.after(...janelas.children);

    const modalPrompt = $lr(`modalPromptIA${p}`);
    const modalColar = $lr(`modalColar${p}`);
    const textoPrompt = $lr(`textoPromptIA${p}`);
    const relato = $lr(`relatoIA${p}`);
    const textoColado = $lr(`textoColado${p}`);

    [modalPrompt, modalColar].forEach(modal => {
        modal.querySelectorAll("[data-fechar]").forEach(b => b.addEventListener("click", () => modal.classList.add("oculto")));
    });

    grupo.querySelector("[data-ia-prompt]").addEventListener("click", () => {
        textoPrompt.value = gerarPromptLaudoRelatorio(modelo);
        relato.value = "";
        modalPrompt.classList.remove("oculto");
    });

    grupo.querySelector("[data-ia-colar]").addEventListener("click", () => modalColar.classList.remove("oculto"));

    $lr(`btnCopiarPromptIA${p}`).addEventListener("click", async () => {
        const resumo = relato.value.trim();
        if (!resumo) {
            mostrarMensagem(`Preencha o campo "${modelo.tituloResumo}" antes de copiar.`, "warning");
            return;
        }
        await copiarTextoLR(`${textoPrompt.value}\n\n${modelo.tituloResumo}:\n${resumo}`);
        modalPrompt.classList.add("oculto");
        mostrarMensagem("Prompt copiado! Agora é só colar no chat da IA.", "success");
    });

    $lr(`btnPreencherAutomatico${p}`).addEventListener("click", () => {
        const texto = textoColado.value.trim();
        if (!texto) {
            mostrarMensagem("Cole a resposta da IA antes de preencher.", "warning");
            return;
        }
        modalColar.classList.add("oculto");
        preencherLaudoRelatorioAutomaticamente(modelo, texto);
        textoColado.value = "";
    });
}

Object.values(MODELOS_LAUDO_RELATORIO).forEach(montarJanelasIA);


// ==========================================
// EMPRESAS (Psicologia Organizacional) no Relatório de Entrevista
//  - "Empresa cadastrada": escolhendo, o relatório fica guardado na empresa
//  - documentos.html?empresa=<id>                       → já abre com a empresa escolhida
//  - documentos.html?editarDoc=<id>&origem=empresa&id=<id da empresa> → editar
// ==========================================
let empresasDocs = [];
let edicaoEmpresa = null; // { doc, id }

function nomeEmpresaParaRelatorio(empresa) {
    // nome que vai no campo "Empresa" do relatório (ex: "Via Tributária – Escritório de Contabilidade")
    const nome = Empresas.nome(empresa);
    return empresa.ramo && !nome.toLowerCase().includes(empresa.ramo.toLowerCase()) ? `${nome} – ${empresa.ramo}` : nome;
}

function encerrarEdicaoEmpresa() {
    edicaoEmpresa = null;
    const aviso = document.getElementById("avisoEdicao");
    if (aviso) aviso.style.display = "none";
    history.replaceState(null, "", window.location.pathname);
}

async function iniciarEmpresasNosDocumentos() {
    const select = $lr("etEmpresaCadastrada");
    if (!select || typeof Empresas === "undefined") return;

    empresasDocs = await Empresas.lerTodas();
    const ativas = empresasDocs.filter(e => !e.arquivada)
        .sort((a, b) => Empresas.nome(a).localeCompare(Empresas.nome(b), "pt-BR"));
    ativas.forEach(e => {
        const op = document.createElement("option");
        op.value = e.id;
        op.textContent = `${Empresas.nome(e)}${e.cnpj ? ` · CNPJ ${e.cnpj}` : ""}`;
        select.appendChild(op);
    });

    // escolheu a empresa: completa o campo "Empresa" (se estiver vazio ou foi o sistema que colocou)
    let ultimoNomeAuto = "";
    select.addEventListener("change", () => {
        const empresa = empresasDocs.find(e => String(e.id) === String(select.value));
        const campo = $lr("etEmpresa");
        if (empresa && (!campo.value.trim() || campo.value === ultimoNomeAuto)) {
            campo.value = nomeEmpresaParaRelatorio(empresa);
            ultimoNomeAuto = campo.value;
        }
    });

    const params = new URLSearchParams(window.location.search);
    const abrirEntrevista = () => {
        tipoDocumento.value = "entrevista";
        tipoDocumento.dispatchEvent(new Event("change"));
    };
    // empresa arquivada também pode ser escolhida quando vem da tela Empresas
    const garantirOpcao = (empresa) => {
        if (![...select.options].some(o => o.value === String(empresa.id))) {
            const op = document.createElement("option");
            op.value = empresa.id;
            op.textContent = `${Empresas.nome(empresa)} (arquivada)`;
            select.appendChild(op);
        }
    };

    // "Novo relatório" pela tela Empresas
    const idEmpresa = params.get("empresa");
    if (idEmpresa) {
        const empresa = empresasDocs.find(e => String(e.id) === String(idEmpresa));
        abrirEntrevista();
        if (empresa) {
            garantirOpcao(empresa);
            select.value = empresa.id;
            select.dispatchEvent(new Event("change"));
        }
        history.replaceState(null, "", window.location.pathname);
        return;
    }

    // "Editar" pela tela Empresas
    if (params.get("origem") === "empresa" && params.get("editarDoc")) {
        const empresa = empresasDocs.find(e => String(e.id) === String(params.get("id")));
        const doc = empresa && (empresa.documentos || []).find(d => d.id === params.get("editarDoc"));
        if (!doc || !CAMPOS_EDICAO[doc.tipo]) {
            mostrarMensagem("Documento não encontrado para editar.", "warning");
            history.replaceState(null, "", window.location.pathname);
            return;
        }
        abrirEntrevista();
        garantirOpcao(empresa);
        select.value = empresa.id;
        const dados = doc.dados || {};
        CAMPOS_EDICAO[doc.tipo].forEach(([chave, id]) => {
            const campo = document.getElementById(id);
            if (campo && dados[chave] !== undefined) campo.value = dados[chave];
        });
        ultimoNomeAuto = "";
        edicaoEmpresa = { doc, id: empresa.id };

        const aviso = document.getElementById("avisoEdicao");
        if (aviso) {
            const quando = new Date(doc.criadoEm).toLocaleDateString("pt-BR");
            aviso.innerHTML = `<i class="ti ti-pencil"></i> Editando <strong>${escaparTexto(doc.titulo)}</strong>
                de ${escaparTexto(dados.candidato || "")} (${quando}). Ao gerar, a versão anterior fica guardada como <strong>substituída</strong>.
                <button type="button" id="btnSairEdicao">Sair da edição</button>`;
            aviso.style.display = "";
            document.getElementById("btnSairEdicao").onclick = () => window.location.href = "documentos.html";
        }
    }
}

iniciarEmpresasNosDocumentos();
