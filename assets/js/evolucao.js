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