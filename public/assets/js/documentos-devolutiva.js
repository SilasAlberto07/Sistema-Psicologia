// ═══════════════════════════════════════════════
// RELATÓRIO DE DEVOLUTIVA DO ACOMPANHAMENTO PSICOLÓGICO
// (tela Documentos — usa as variáveis de documentos.js:
//  inputPaciente, mapaOpcoes, pacientes, casais, marcarEdicao, encerrarEdicao...)
//
// Tem os mesmos botões de IA da anamnese e do prontuário:
//  - "Gerar Prompt para IA": monta o prompt com os títulos dos campos
//  - "Preencher com Texto Colado": lê a resposta da IA e preenche cada campo pelo título
// ═══════════════════════════════════════════════

// [chave nos dados, id do campo]
const CAMPOS_DEVOLUTIVA = [
    ["paciente", "devPaciente"],
    ["inicio", "devInicio"],
    ["fim", "devFim"],
    ["modalidade", "devModalidade"],
    ["abordagem", "devAbordagem"],
    ["objetivo", "devObjetivo"],
    ["demandas", "devDemandas"],
    ["estrategias", "devEstrategias"],
    ["evolucao", "devEvolucao"],
    ["avancos", "devAvancos"],
    ["motivo", "devMotivo"],
    ["orientacoes", "devOrientacoes"],
    ["data", "devData"]
];

// títulos que a IA deve usar na resposta → campo que cada um preenche
const mapaCamposDevolutiva = [
    ["Objetivo do acompanhamento", "devObjetivo"],
    ["Demandas iniciais", "devDemandas"],
    ["Estratégias utilizadas", "devEstrategias"],
    ["Evolução observada", "devEvolucao"],
    ["Avanços identificados", "devAvancos"],
    ["Motivo do encerramento", "devMotivo"],
    ["Orientações finais", "devOrientacoes"]
];

const $dev = (id) => document.getElementById(id);

$dev("devData").value = hojeISO();

// ------------------------------------------
// Ao escolher o paciente: completa o nome e o período
// (datas da primeira e da última sessão do prontuário, só se estiverem vazias)
// ------------------------------------------
let ultimoNomeAutomaticoDev = "";

function preencherPacienteDevolutiva() {
    const selecao = mapaOpcoes[inputPaciente.value.trim()];
    if (!selecao) return;

    let registro, nome;
    if (selecao.origem === "casal") {
        registro = casais.find(c => String(c.id) === String(selecao.id));
        if (!registro) return;
        nome = registro[`${selecao.pessoa}NomeCompleto`] || "";
    } else {
        registro = pacientes.find(p => String(p.id) === String(selecao.id));
        if (!registro) return;
        nome = registro.nomeCompleto || "";
    }

    const campoNome = $dev("devPaciente");
    if (!campoNome.value.trim() || campoNome.value === ultimoNomeAutomaticoDev) {
        campoNome.value = nome;
        ultimoNomeAutomaticoDev = nome;
    }

    // sessões da pessoa (no casal: as dela e as conjuntas)
    const datas = (registro.evolucoes || [])
        .filter(e => selecao.origem !== "casal" || !e.pessoa || e.pessoa === selecao.pessoa)
        .map(e => String(e.dataSessao || "").slice(0, 10))
        .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d))
        .sort();

    if (datas.length) {
        if (!$dev("devInicio").value) $dev("devInicio").value = datas[0];
        if (!$dev("devFim").value) $dev("devFim").value = datas[datas.length - 1];
    }
}

inputPaciente.addEventListener("change", () => {
    if (tipoDocumento.value === "devolutiva") preencherPacienteDevolutiva();
});

// ------------------------------------------
// GERAR E IMPRIMIR
// ------------------------------------------
async function gerarDevolutiva() {
    const dados = { tipo: "devolutiva" };
    CAMPOS_DEVOLUTIVA.forEach(([chave, id]) => { dados[chave] = $dev(id).value.trim(); });

    const campoNome = $dev("devPaciente");
    campoNome.classList.toggle("campo-faltando", !dados.paciente);
    if (!dados.paciente) {
        mostrarMensagem("Informe o paciente (escolha na lista acima ou digite a identificação).", "warning");
        return;
    }

    dados.nomeCompleto = dados.paciente;
    dados.cidadeEstado = document.getElementById("cidadeEstado").value.trim();

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
// GERAR PROMPT PRONTO PARA IA (somente perguntas)
// ==========================================
const estiloSwalDev = document.createElement("style");
estiloSwalDev.innerHTML = `.swal2-container { z-index: 999999 !important; }`;
document.head.appendChild(estiloSwalDev);

function gerarPromptDevolutiva() {
    const aviso = "Preencha os tópicos do Relatório de Devolutiva do Acompanhamento Psicológico baseado no resumo do acompanhamento citado abaixo. As respostas devem ser de acordo com o código de ética do CFP e a abordagem da TCC, de forma ética, técnica e revisada com o CFP. Mantenha exatamente os títulos abaixo, seguidos de dois-pontos. Em \"Evolução observada\", escreva um indicador por linha.\n\n";
    const campos = mapaCamposDevolutiva.map(([label]) => `${label}:`).join("\n");
    return aviso + campos;
}

const modalPromptIADev = $dev("modalPromptIADevolutiva");
const textoPromptIADev = $dev("textoPromptIA");
const relatoPacienteIADev = $dev("relatoPacienteIA");

$dev("btnGerarPromptIA").addEventListener("click", () => {
    textoPromptIADev.value = gerarPromptDevolutiva();
    relatoPacienteIADev.value = "";
    modalPromptIADev.classList.remove("oculto");
});

$dev("fecharModalPromptIA").addEventListener("click", () => modalPromptIADev.classList.add("oculto"));
$dev("cancelarModalPromptIA").addEventListener("click", () => modalPromptIADev.classList.add("oculto"));

$dev("btnCopiarPromptIA").addEventListener("click", async () => {
    const relato = relatoPacienteIADev.value.trim();
    if (!relato) {
        mostrarMensagem("Preencha o resumo do acompanhamento antes de copiar.", "warning");
        return;
    }

    const textoFinal = `${textoPromptIADev.value}\n\nResumo do acompanhamento:\n${relato}`;

    try {
        await navigator.clipboard.writeText(textoFinal);
    } catch (err) {
        const temporario = document.createElement("textarea");
        temporario.value = textoFinal;
        document.body.appendChild(temporario);
        temporario.select();
        document.execCommand("copy");
        document.body.removeChild(temporario);
    }
    modalPromptIADev.classList.add("oculto");
    mostrarMensagem("Prompt copiado! Agora é só colar no chat da IA.", "success");
});

// ==========================================
// PREENCHIMENTO AUTOMÁTICO A PARTIR DE TEXTO COLADO
// ==========================================
function preencherDevolutivaAutomaticamente(textoColado) {
    const camposOrdenados = [...mapaCamposDevolutiva].sort((a, b) => b[0].length - a[0].length);
    const escapados = camposOrdenados.map(([label]) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    // aceita o título com ou sem número / negrito na frente (ex: "4. **Evolução observada:**")
    const regexLabels = new RegExp(`(?:^|\\n)[\\s#*\\d.)-]*(${escapados.join("|")})\\s*\\**\\s*:?\\s*\\**`, "gi");

    const matches = [];
    let m;
    while ((m = regexLabels.exec(textoColado)) !== null) {
        matches.push({ label: m[1], inicio: m.index, fim: regexLabels.lastIndex });
    }

    if (matches.length === 0) {
        mostrarMensagem(
            `Não encontrei nenhum título conhecido. Confira se os títulos batem com: ${mapaCamposDevolutiva.map(([l]) => `'${l}'`).join(", ")}.`,
            "warning"
        );
        return;
    }

    let preenchidos = 0;
    matches.forEach((match, i) => {
        const proxima = matches[i + 1];
        const fimConteudo = proxima ? proxima.inicio : textoColado.length;
        let valor = textoColado.slice(match.fim, fimConteudo).trim();

        const encontrado = mapaCamposDevolutiva.find(([label]) => label.toLowerCase() === match.label.toLowerCase());
        if (!encontrado || !valor) return;

        const [, id] = encontrado;
        if (id === "devEvolucao") {
            // tira marcadores de lista ("*", "-", "•", "1.") — no relatório viram tópicos
            valor = valor.split("\n").map(l => l.replace(/^\s*(?:[*•\-–]|\d+[.)])\s*/, "").trim()).filter(Boolean).join("\n");
        }
        if (id === "devMotivo") {
            valor = valor.replace(/\s*\n+\s*/g, " ").replace(/[.]\s*$/, "");
        }
        $dev(id).value = valor;
        preenchidos++;
    });

    mostrarMensagem(`${preenchidos} campo(s) preenchido(s) automaticamente!`, "success");
}

const modalColarDev = $dev("modalColarDevolutiva");
const textoColadoDev = $dev("textoColadoDevolutiva");

$dev("instrucaoColarDevolutiva").textContent =
    `Cole abaixo a resposta da IA usando os títulos ${mapaCamposDevolutiva.map(([l]) => `"${l}:"`).join(", ")}. ` +
    "O sistema localiza cada título e preenche o campo correspondente.";

$dev("btnAbrirModalColar").addEventListener("click", () => modalColarDev.classList.remove("oculto"));
$dev("fecharModalColar").addEventListener("click", () => modalColarDev.classList.add("oculto"));
$dev("cancelarModalColar").addEventListener("click", () => modalColarDev.classList.add("oculto"));

$dev("btnPreencherAutomatico").addEventListener("click", () => {
    const texto = textoColadoDev.value.trim();
    if (!texto) {
        mostrarMensagem("Cole a resposta da IA antes de preencher.", "warning");
        return;
    }
    modalColarDev.classList.add("oculto");
    preencherDevolutivaAutomaticamente(texto);
    textoColadoDev.value = "";
});
