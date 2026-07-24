// ================= PACIENTE / CASAL =================
const params = new URLSearchParams(window.location.search);
const idPaciente = params.get("id");

const nomePaciente = document.getElementById("nomePaciente");
const historico = document.getElementById("historico");
const textoEvolucao = document.getElementById("textoEvolucao");
const planoAcao = document.getElementById("planoAcao");
const relatoSessao = document.getElementById("relatoSessao");
const dataSessao = document.getElementById("dataSessao");

// ================= DATA/HORA MANUAL DA SESSÃO =================

// retorna a data/hora atual no formato aceito pelo input datetime-local (yyyy-MM-ddTHH:mm)
function agoraParaInputDatetime() {
    const agora = new Date();
    const local = new Date(agora.getTime() - agora.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
}

// converte o valor do input datetime-local para o formato de exibição pt-BR
function formatarDataSessaoBR(valorInput) {
    if (!valorInput) return "";
    const [dataParte, horaParte] = valorInput.split("T");
    const [ano, mes, dia] = dataParte.split("-");
    return `${dia}/${mes}/${ano} ${horaParte}`;
}

const btnSalvar = document.querySelector(".btn-salvar");
const btnVoltar = document.querySelector(".btn-voltar");
const btnImprimir = document.querySelector(".btn-imprimir-tudo");
const btnAbrirProntuario = document.querySelector(".btn-abrir");

const draftKey = `draft_evolucao_${idPaciente}`;

let pacientes = [];
let casaisLista = [];
let registro = null;   // paciente individual OU casal, o que for encontrado
let ehCasal = false;
let editandoIndex = null;

// grava de volta no storage certo (pacientes ou casais), dependendo de quem é o registro
async function salvarRegistro() {
    if (ehCasal) {
        await window.storage.setItem("casais", JSON.stringify(casaisLista));
    } else {
        await window.storage.setItem("pacientes", JSON.stringify(pacientes));
    }
}

async function iniciarEvolucao() {

    pacientes = JSON.parse(await window.storage.getItem("pacientes")) || [];
    casaisLista = JSON.parse(await window.storage.getItem("casais")) || [];

    registro = pacientes.find(p => String(p.id) === String(idPaciente));

    if (!registro) {
        registro = casaisLista.find(c => String(c.id) === String(idPaciente));
        ehCasal = !!registro;
    }

    if (!registro) {
        mostrarMensagem(
            "Paciente não encontrado!",
            "error",
            () => {
                window.location.href = "pacientes.html";
            }
        );
        return;
    }

    nomePaciente.innerText = ehCasal
        ? `${registro.p1NomeCompleto || "?"} e ${registro.p2NomeCompleto || "?"}`
        : registro.nomeCompleto;

    if (!Array.isArray(registro.evolucoes)) {
        registro.evolucoes = [];
    }

    // rascunho continua no localStorage — é dado temporário/descartável,
    // não precisa de backup nem entra no SQLite
    const draft = JSON.parse(localStorage.getItem(draftKey) || "null");
    if (draft) {
        textoEvolucao.value = draft.texto || "";
        planoAcao.value = draft.plano || "";
        relatoSessao.value = draft.relato || "";
        dataSessao.value = draft.dataSessao || agoraParaInputDatetime();
    } else {
        dataSessao.value = agoraParaInputDatetime();
    }

    renderHistorico();
}

function salvarRascunho() {
    localStorage.setItem(draftKey, JSON.stringify({
        texto: textoEvolucao.value,
        plano: planoAcao.value,
        relato: relatoSessao.value,
        dataSessao: dataSessao.value
    }));
}

textoEvolucao.addEventListener("input", salvarRascunho);
planoAcao.addEventListener("input", salvarRascunho);
relatoSessao.addEventListener("input", salvarRascunho);
dataSessao.addEventListener("input", salvarRascunho);

function renderHistorico() {
    historico.innerHTML = "";

    if (registro.evolucoes.length === 0) {
        historico.innerHTML = "<p>Nenhum registro de evolução.</p>";
        return;
    }

    registro.evolucoes.forEach((item, index) => {
        const aberta = index === registro.evolucoes.length - 1 ? "open" : "";
        historico.innerHTML += `
            <details class="card-evolucao" ${aberta}>
                <summary>
                    <span>Sessão ${String(index + 1).padStart(2, "0")}</span>
                    <small>${item.data}</small>
                </summary>
                <div class="conteudo-evolucao">
                    <p><strong>Relato da Sessão:</strong> ${item.relato}</p>
                    <p><strong>Evolução:</strong> ${item.texto}</p>
                    ${item.plano ? `<p><strong>Plano de ação:</strong> ${item.plano}</p>` : ""}
                </div>
                <div class="acoes-evolucao">
                    <button class="btn-editar-evolucao" data-index="${index}">
                        <i class="ti ti-pencil"></i> Editar
                    </button>

                    <button class="btn-excluir-evolucao" data-index="${index}">
                        <i class="ti ti-trash"></i> Excluir
                    </button>
                </div>
            </details>
        `;
    });
}

// ================= SALVAR =================
btnSalvar.addEventListener("click", async () => {

    const relato = relatoSessao.value.trim();
    const conteudo = textoEvolucao.value.trim();
    const plano = planoAcao.value.trim();
    const dataSessaoValor = dataSessao.value;

    if (!conteudo) {
        mostrarMensagem(
            "Digite algo antes de salvar!",
            "warning"
        );
        return;
    }

    if (!dataSessaoValor) {
        mostrarMensagem(
            "Selecione a data e a hora da sessão!",
            "warning"
        );
        return;
    }

    if (editandoIndex !== null) {

        // guarda qual sessão está sendo editada
        const indice = Number(editandoIndex);

        // atualiza o registro existente
        registro.evolucoes[indice].relato = relato;
        registro.evolucoes[indice].texto = conteudo;
        registro.evolucoes[indice].plano = plano;
        registro.evolucoes[indice].dataSessao = dataSessaoValor;
        registro.evolucoes[indice].data = formatarDataSessaoBR(dataSessaoValor);

        await salvarRegistro();

        // limpa os campos
        relatoSessao.value = "";
        textoEvolucao.value = "";
        planoAcao.value = "";
        dataSessao.value = agoraParaInputDatetime();
        localStorage.removeItem(draftKey);

        // atualiza a lista
        renderHistorico();

        // volta para a sessão que acabou de editar
        const cards = document.querySelectorAll(".card-evolucao");
        const card = cards[indice];

        if (card) {
            card.open = true;

            card.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });
        }

        // encerra o modo edição
        editandoIndex = null;

        mostrarMensagem(
            "Registro atualizado com sucesso!",
            "success"
        );

    } else {

        // cria um registro novo
        registro.evolucoes.push({
            data: formatarDataSessaoBR(dataSessaoValor),
            dataSessao: dataSessaoValor,
            relato: relato,
            texto: conteudo,
            plano: plano
        });

        await salvarRegistro();
        localStorage.removeItem(draftKey);

        relatoSessao.value = "";
        textoEvolucao.value = "";
        planoAcao.value = "";
        dataSessao.value = agoraParaInputDatetime();

        renderHistorico();

        mostrarMensagem(
            "Evolução salva com sucesso!",
            "success"
        );
    }
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

        registro.evolucoes.splice(index, 1);

        await salvarRegistro();

        renderHistorico();

        mostrarMensagem(
            "Evolução excluída com sucesso!",
            "success"
        );
    }
});

// ================= EDITAR =================
historico.addEventListener("click", (e) => {

    if (e.target.closest(".btn-editar-evolucao")) {

        const index = e.target.closest(".btn-editar-evolucao").dataset.index;
        const item = registro.evolucoes[index];

        relatoSessao.value = item.relato || "";
        textoEvolucao.value = item.texto || "";
        planoAcao.value = item.plano || "";
        // registros antigos não têm "dataSessao" salvo (só o texto já formatado) — nesse caso mantém a data/hora atual
        dataSessao.value = item.dataSessao || agoraParaInputDatetime();

        textoEvolucao.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

        textoEvolucao.focus();

        editandoIndex = index;

        mostrarMensagem("Editando registro. Altere os campos acima e clique em Salvar.", "info");

        window.scrollTo({ top: 0, behavior: "smooth" });
    }
});

// ================= Abrir Prontuário =================
btnAbrirProntuario.addEventListener("click", () => {
    window.open(`prontuario.html?id=${idPaciente}`, "_blank");
});

// ================= IMPRIMIR PRONTUÁRIO =================
btnImprimir.addEventListener("click", () => {

    if (!registro.evolucoes || registro.evolucoes.length === 0) {
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

const mapaCamposEvolucao = [
    ["Relato da Sessão", "relatoSessao"],
    ["Evolução da sessão", "textoEvolucao"],
    ["Plano de ação", "planoAcao"]
];

function preencherEvolucaoAutomaticamente(textoColado) {

    const camposOrdenados = [...mapaCamposEvolucao].sort((a, b) => b[0].length - a[0].length);

    const escapados = camposOrdenados.map(([label]) =>
        label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    );

    const regexLabels = new RegExp(`(${escapados.join("|")})\\s*:?\\s*`, "gi");

    let matches = [];
    let m;
    while ((m = regexLabels.exec(textoColado)) !== null) {
        matches.push({ label: m[1], inicio: m.index, fim: regexLabels.lastIndex });
    }

    if (matches.length === 0) {
        mostrarMensagem(
            "Não encontrei nenhum título conhecido. Confira se os títulos batem com 'Relato da Sessão', 'Evolução da sessão' e 'Plano de ação'.",
            "warning"
        );
        return;
    }

    const camposElemento = {
        relatoSessao,
        textoEvolucao,
        planoAcao
    };

    let preenchidos = 0;

    matches.forEach((match, i) => {
        const proximaOcorrencia = matches[i + 1];
        const fimConteudo = proximaOcorrencia ? proximaOcorrencia.inicio : textoColado.length;
        const valor = textoColado.slice(match.fim, fimConteudo).trim();

        const encontrado = mapaCamposEvolucao.find(
            ([label]) => label.toLowerCase() === match.label.toLowerCase()
        );

        if (encontrado && valor) {
            const [, nomeCampo] = encontrado;
            camposElemento[nomeCampo].value = valor;
            preenchidos++;
        }
    });

    salvarRascunho(); // já aproveita e atualiza o rascunho com o que foi preenchido

    mostrarMensagem(`${preenchidos} campo(s) preenchido(s) automaticamente!`, "success");
}

// ==========================================
// ABRIR / FECHAR MODAL DE COLAR TEXTO
// ==========================================

const modalColarEvolucao = document.getElementById("modalColarEvolucao");
const textoColadoEvolucao = document.getElementById("textoColadoEvolucao");

document.getElementById("btnAbrirModalColar").addEventListener("click", () => {
    modalColarEvolucao.classList.remove("oculto");
});

document.getElementById("fecharModalColar").addEventListener("click", () => {
    modalColarEvolucao.classList.add("oculto");
});

document.getElementById("cancelarModalColar").addEventListener("click", () => {
    modalColarEvolucao.classList.add("oculto");
});

document.getElementById("btnPreencherAutomatico").addEventListener("click", () => {

    const texto = textoColadoEvolucao.value.trim();

    if (!texto) {
        mostrarMensagem("Cole o texto da sessão antes de preencher.", "warning");
        return;
    }

    preencherEvolucaoAutomaticamente(texto);

    modalColarEvolucao.classList.add("oculto");
    textoColadoEvolucao.value = "";
});
// ==========================================
// GERAR PROMPT PRONTO PARA IA (somente perguntas)
// ==========================================
const estiloSwal = document.createElement('style');
estiloSwal.innerHTML = `.swal2-container { z-index: 999999 !important; }`;
document.head.appendChild(estiloSwal);

function gerarPromptEvolucao() {
    const aviso = "Preencha as perguntas baseado com o relato do paciente citado abaixo, a responda deve ser de acordo com o código de ética CFP e a abordagem da TCC::\n\n";

    const campos = mapaCamposEvolucao.map(([label]) => `${label}:`).join("\n");

    return aviso + campos;
}

const modalPromptIAEvolucao = document.getElementById("modalPromptIAEvolucao");
const textoPromptIAEvolucao = document.getElementById("textoPromptIA");
const relatoPacienteIAEvolucao = document.getElementById("relatoPacienteIA");

document.getElementById("btnGerarPromptIA").addEventListener("click", () => {
    textoPromptIAEvolucao.value = gerarPromptEvolucao();
    relatoPacienteIAEvolucao.value = "";
    modalPromptIAEvolucao.classList.remove("oculto");
});

document.getElementById("fecharModalPromptIA").addEventListener("click", () => {
    modalPromptIAEvolucao.classList.add("oculto");
});

document.getElementById("cancelarModalPromptIA").addEventListener("click", () => {
    modalPromptIAEvolucao.classList.add("oculto");
});

document.getElementById("btnCopiarPromptIA").addEventListener("click", async () => {

    const relato = relatoPacienteIAEvolucao.value.trim();

    if (!relato) {
        mostrarMensagem("Preencha o relato da sessão antes de copiar.", "warning");
        return;
    }

    const textoFinal = `${textoPromptIAEvolucao.value}\n\nRelato da sessão:\n${relato}`;

    try {
        await navigator.clipboard.writeText(textoFinal);
        mostrarMensagem("Prompt copiado! Agora é só colar no chat da IA.", "success");
    } catch (err) {
        const temporario = document.createElement("textarea");
        temporario.value = textoFinal;
        document.body.appendChild(temporario);
        temporario.select();
        document.execCommand("copy");
        document.body.removeChild(temporario);
        mostrarMensagem("Prompt copiado! Agora é só colar no chat da IA.", "success");
    }
});