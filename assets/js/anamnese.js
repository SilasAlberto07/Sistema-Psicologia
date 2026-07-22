const params = new URLSearchParams(window.location.search);
const idPaciente = params.get("id");

const nomePaciente = document.getElementById("nomePaciente");
const avisoTipo = document.getElementById("avisoTipo");
const secaoAdolescente = document.getElementById("secaoAdolescente");
const form = document.getElementById("formAnamnese");
const btnVoltar = document.getElementById("btnVoltar");
const btnImprimir = document.getElementById("btnImprimir");
const btnAbrirAnamnese = document.getElementById("btnAbrirAnamnese");

let pacientes = [];
let paciente = null;

async function iniciarAnamnese() {

    pacientes = JSON.parse(await window.storage.getItem("pacientes")) || [];

    paciente = pacientes.find(p => String(p.id) === String(idPaciente));

    if (!paciente) {
        mostrarMensagem(
            "Paciente não encontrado!",
            "error",
            () => {
                window.location.href = "pacientes.html";
            }
        );
        return;
    }

    nomePaciente.innerText = paciente.nomeCompleto;

    // mostra seção extra se for menor de idade
    const idade = Number(paciente.idade);
    const menorDeIdade = !isNaN(idade) && idade < 18;

    if (menorDeIdade) {
        secaoAdolescente.style.display = "block";
        avisoTipo.textContent = "Paciente menor de idade — Seção adicional de anamnese habilitada.";
    } else {
        avisoTipo.textContent = "Ficha de anamnese — ADULTO.";
    }

    // garante estrutura
    if (!paciente.anamnese || Array.isArray(paciente.anamnese)) {
        paciente.anamnese = {};
    }

    // preenche formulário com dados já salvos
    Object.entries(paciente.anamnese).forEach(([campo, valor]) => {
        if (form.elements[campo]) {
            form.elements[campo].value = valor;
        }
    });

    // pré-preenche a queixa principal com o que já foi informado
    // no cadastro do paciente, só se a anamnese ainda não tiver
    // uma queixa própria salva (não sobrescreve o que ela já digitou)
    if (!paciente.anamnese.queixaPrincipal && paciente.queixaPrincipal) {
        form.elements["queixaPrincipal"].value = paciente.queixaPrincipal;
    }
}


// ==========================================
// AUTO EXPANSÃO DOS TEXTAREAS
// ==========================================

function autoExpand(textarea) {

    textarea.style.height = "0px";
    textarea.style.height = textarea.scrollHeight + "px";

}

document.querySelectorAll("textarea").forEach(textarea => {

    autoExpand(textarea);

    textarea.addEventListener("input", () => {
        autoExpand(textarea);
    });

});

// salvar
form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const dados = Object.fromEntries(formData.entries());

    paciente.anamnese = {
        ...paciente.anamnese,
        ...dados,
        atualizadoEm: new Date().toLocaleString("pt-BR")
    };

    await window.storage.setItem("pacientes", JSON.stringify(pacientes));

    mostrarMensagem(
        "Ficha de anamnese salva com sucesso!",
        "success",
        () => {
            window.location.href = `anamnese.html?id=${idPaciente}`;
        }
    );
});

// abrir anamnese
btnAbrirAnamnese.addEventListener("click", () => {
    window.open(`visu-anamnese.html?id=${idPaciente}`, "_blank");
});

// imprimir
btnImprimir.addEventListener("click", async () => {
    const formData = new FormData(form);
    const dados = Object.fromEntries(formData.entries());

    paciente.anamnese = {
        ...paciente.anamnese,
        ...dados,
        atualizadoEm: new Date().toLocaleString("pt-BR")
    };

    await window.storage.setItem("pacientes", JSON.stringify(pacientes));

    window.open(`imprimir-anamnese.html?id=${idPaciente}`, "_blank");
});

btnVoltar.addEventListener("click", () => history.back());

iniciarAnamnese();

// ==========================================
// PREENCHIMENTO AUTOMÁTICO A PARTIR DE TEXTO COLADO
// ==========================================

// mapa: [ "título exatamente como aparece no texto colado", "name do campo no form" ]
const mapaCampos = [
    ["Queixa principal", "queixaPrincipal"],
    ["Tem diagnóstico?", "temDiagnostico"],
    ["Faz uso de medicação?", "usoMedicacao"],
    ["Quando os sintomas iniciaram?", "queixaInicio"],
    ["Como os sintomas se manifestam?", "queixaManifestacao"],
    ["Em quais situações se intensificam ou diminuem?", "queixaSituacoes"],
    ["Que pensamentos e emoções acompanham os sintomas?", "queixaPensamentos"],
    ["Já buscou ajuda profissional para essa queixa? Qual o resultado?", "queixaAjudaAnterior"],
    ["Infância e adolescência", "historicoInfancia"],
    ["Como se descreveria?", "autodescricao"],
    ["Hobbies e atividades de lazer", "hobbies"],
    ["Doença grave ou cirurgia?", "doencaGrave"],
    ["Medicações contínuas", "medicacaoContinua"],
    ["Tabagismo, alcoolismo ou uso de outras drogas?", "habitos"],
    ["Relação com familiares (pais, irmãos, cônjuge, filhos)", "relacaoFamiliares"],
    ["Histórico de doenças psicológicas na família", "doencasFamilia"],
    ["Trabalho / Estudos", "trabalhoEstudos"],
    ["Situação financeira atual", "situacaoFinanceira"],
    ["Diagnóstico psicológico anterior", "diagnosticoAnterior"],
    ["Acompanhamento psicológico/psiquiátrico anterior (tempo, como foi)", "acompanhamentoAnterior"],
    ["Medicações psicotrópicas (já tomou ou toma)", "medicacaoPsicotropica"],
    ["Nome do Pai", "nomePai"],
    ["Nome da Mãe", "nomeMae"],
    ["Irmãos (idades)", "irmaos"],
    ["Como a família lida com a queixa?", "familiaLidaQueixa"],
    ["História pré/perinatal e condições do parto", "desenvolvimentoParto"],
    ["Desenvolvimento motor (sentou, engatinhou, andou, fala)", "desenvolvimentoMotor"],
    ["Desenvolvimento socioemocional (comportamento, amizades, agressividade)", "desenvolvimentoSocioemocional"],
    ["Adaptação e desempenho escolar", "escolaDesempenho"],
    ["Dificuldades de aprendizagem", "escolaDificuldades"],
    ["Algo mais a acrescentar?", "observacoesAdicionais"],
    ["Dados de observação do entrevistador", "observacoesEntrevistador"]
];

function preencherAutomaticamente(textoColado) {

    // ordena do título mais longo pro mais curto — evita que um título
    // curto "engula" por engano um trecho de um título mais específico
    const camposOrdenados = [...mapaCampos].sort((a, b) => b[0].length - a[0].length);

    const escapados = camposOrdenados.map(([label]) =>
        label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    );

    const regexLabels = new RegExp(`(${escapados.join("|")})\\s*:?\\s*`, "gi");

    // encontra todas as ocorrências de títulos no texto colado
    let matches = [];
    let m;
    while ((m = regexLabels.exec(textoColado)) !== null) {
        matches.push({ label: m[1], inicio: m.index, fim: regexLabels.lastIndex });
    }

    if (matches.length === 0) {
        mostrarMensagem(
            "Não encontrei nenhum título conhecido no texto colado. Confira se os títulos estão iguais aos do formulário.",
            "warning"
        );
        return;
    }

    let preenchidos = 0;

    matches.forEach((match, i) => {
        const proximaOcorrencia = matches[i + 1];
        const fimConteudo = proximaOcorrencia ? proximaOcorrencia.inicio : textoColado.length;
        const valor = textoColado.slice(match.fim, fimConteudo).trim();

        const encontrado = mapaCampos.find(
            ([label]) => label.toLowerCase() === match.label.toLowerCase()
        );

        if (encontrado && valor) {
            const [, nomeCampo] = encontrado;

            if (form.elements[nomeCampo]) {
                form.elements[nomeCampo].value = valor;
                preenchidos++;

                if (form.elements[nomeCampo].tagName === "TEXTAREA") {
                    autoExpand(form.elements[nomeCampo]);
                }
            }
        }
    });

    mostrarMensagem(`${preenchidos} campo(s) preenchido(s) automaticamente!`, "success");
}

// ==========================================
// ABRIR / FECHAR MODAL DE COLAR TEXTO
// ==========================================

const modalColar = document.getElementById("modalColarAnamnese");
const textoColadoEl = document.getElementById("textoColadoAnamnese");

document.getElementById("btnAbrirModalColar").addEventListener("click", () => {
    modalColar.classList.remove("oculto");
});

document.getElementById("fecharModalColar").addEventListener("click", () => {
    modalColar.classList.add("oculto");
});

document.getElementById("cancelarModalColar").addEventListener("click", () => {
    modalColar.classList.add("oculto");
});

document.getElementById("btnPreencherAutomatico").addEventListener("click", () => {

    const texto = textoColadoEl.value.trim();

    if (!texto) {
        mostrarMensagem("Cole o texto da anamnese antes de preencher.", "warning");
        return;
    }

    preencherAutomaticamente(texto);

    modalColar.classList.add("oculto");
    textoColadoEl.value = "";
});