// ================= PACIENTE =================
const params = new URLSearchParams(window.location.search);
const idPaciente = params.get("id");

const nomePaciente = document.getElementById("nomePaciente");
const historico = document.getElementById("historico");
const textoEvolucao = document.getElementById("textoEvolucao");
const planoAcao = document.getElementById("planoAcao");
const relatoSessao = document.getElementById("relatoSessao");

const btnSalvar = document.querySelector(".btn-salvar");
const btnVoltar = document.querySelector(".btn-voltar");
const btnImprimir = document.querySelector(".btn-imprimir-tudo");
const btnAbrirProntuario = document.querySelector(".btn-abrir");

const draftKey = `draft_evolucao_${idPaciente}`;

let pacientes = [];
let paciente = null;

async function iniciarEvolucao() {

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

    if (!Array.isArray(paciente.evolucoes)) {
        paciente.evolucoes = [];
    }

    // rascunho continua no localStorage — é dado temporário/descartável,
    // não precisa de backup nem entra no SQLite
    const draft = JSON.parse(localStorage.getItem(draftKey) || "null");
    if (draft) {
        textoEvolucao.value = draft.texto || "";
        planoAcao.value = draft.plano || "";
    }

    renderHistorico();
}

function salvarRascunho() {
    localStorage.setItem(draftKey, JSON.stringify({
        texto: textoEvolucao.value,
        plano: planoAcao.value
    }));
}

textoEvolucao.addEventListener("input", salvarRascunho);
planoAcao.addEventListener("input", salvarRascunho);

function renderHistorico() {
    historico.innerHTML = "";

    if (paciente.evolucoes.length === 0) {
        historico.innerHTML = "<p>Nenhum registro de evolução.</p>";
        return;
    }

    paciente.evolucoes.forEach((item, index) => {
        const aberta = index === paciente.evolucoes.length - 1 ? "open" : "";
        historico.innerHTML += `
            <details class="card-evolucao" ${aberta}>
                <summary>
                    <span>Sessão ${String(index + 1).padStart(2, "0")}</span>
                    <small>${item.data}</small>
                </summary>
                <div class="conteudo-evolucao">
                    <strong>Relato da Sessão:</strong> ${item.relato}
                    <br><br><strong>Evolução:</strong> ${item.texto}
                    ${item.plano ? `<br><br><strong>Plano de ação:</strong> ${item.plano}` : ""}
                </div>
                <button class="btn-excluir-evolucao" data-index="${index}">
                    Excluir
                </button>
            </details>
        `;
    });
}

// ================= SALVAR =================
btnSalvar.addEventListener("click", async () => {

    const relato = relatoSessao.value.trim();
    const conteudo = textoEvolucao.value.trim();
    const plano = planoAcao.value.trim();

    if (!conteudo) {
        mostrarMensagem(
            "Digite algo antes de salvar!",
            "warning"
        );
        return;
    }

    paciente.evolucoes.push({
        data: new Date().toLocaleString("pt-BR"),
        relato: relato,
        texto: conteudo,
        plano: plano
    });

    await window.storage.setItem("pacientes", JSON.stringify(pacientes));
    localStorage.removeItem(draftKey);

    relatoSessao.value = "";
    textoEvolucao.value = "";
    planoAcao.value = "";

    renderHistorico();

    mostrarMensagem(
        "Evolução salva com sucesso!",
        "success",
        () => {
            window.location.href = `evolucao.html?id=${idPaciente}`;
        }
    );
});

// ================= EXCLUIR =================
historico.addEventListener("click", async (e) => {

    if (e.target.classList.contains("btn-excluir-evolucao")) {

        const resposta = await mostrarConfirmacao(
            "Deseja excluir esta evolução?"
        );

        if (!resposta.isConfirmed) {
            return;
        }

        const index = e.target.dataset.index;

        paciente.evolucoes.splice(index, 1);

        await window.storage.setItem(
            "pacientes",
            JSON.stringify(pacientes)
        );

        renderHistorico();

        mostrarMensagem(
            "Evolução excluída com sucesso!",
            "success"
        );
    }
});

// ================= Abrir Prontuário =================
btnAbrirProntuario.addEventListener("click", () => {
    window.open(`prontuario.html?id=${idPaciente}`, "_blank");
});

// ================= IMPRIMIR PRONTUÁRIO =================
btnImprimir.addEventListener("click", () => {

    if (!paciente.evolucoes || paciente.evolucoes.length === 0) {
        mostrarMensagem(
            "Não há evoluções registradas para imprimir!",
            "warning"
        );
        return;
    }

    window.open(`imprimir-prontuario.html?id=${idPaciente}`, "_blank");
});

// ================= VOLTAR =================
btnVoltar.addEventListener("click", () => history.back());

iniciarEvolucao();

// ==========================================
// PREENCHIMENTO AUTOMÁTICO A PARTIR DE TEXTO COLADO
// ==========================================

// mapa: [ "título exatamente como aparece no texto colado", "name do campo no form" ]
const mapaCamposEvolucao = [
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