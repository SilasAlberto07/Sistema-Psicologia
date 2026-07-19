async function horarioJaOcupado(idPacienteAtual, data, hora) {

    const pacientes = JSON.parse(await window.storage.getItem("pacientes")) || [];

    for (let p of pacientes) {
        for (let s of (p.sessoes || [])) {
            if (
                p.id != idPacienteAtual &&
                s.data === data &&
                s.hora === hora &&
                s.data !== "" &&
                s.hora !== ""
            ) {
                return p.nomeCompleto;
            }
        }
    }

    return null;
}

// =========================
// SESSÕES - CONTROLE GERAL
// =========================
async function renderSessoes() {

    const container = document.querySelector(".page-container-sessoes");
    let pacientes = JSON.parse(await window.storage.getItem("pacientes")) || [];

    container.innerHTML = "<h1 class=\"page-title\"><i class=\"ti ti-clipboard-list\" style=\"color:#8a9e78\"></i> Sessões</h1>";

    // ... TODO O RESTO DO CONTEÚDO DA FUNÇÃO CONTINUA EXATAMENTE IGUAL,
    // desde o "if (pacientes.length === 0)" até o fechamento da função.
    // Só a linha de cima (JSON.parse(...)) e a palavra "async" na frente
    // de "function" mudaram.

    if (pacientes.length === 0) {
        container.innerHTML += `
            <div class="placeholder-sessoes">
                <h3>Nenhuma sessão registrada</h3>
                <p>Cadastre um paciente e defina a quantidade de sessões.</p>
            </div>
        `;
        return;
    }

    pacientes.forEach(paciente => {

        let sessoes = paciente.sessoes || [];

        let sessoesHTML = "";

        sessoes.forEach((sessao, i) => {

            if (!sessao.duracao) {
                sessao.duracao = 60;
            }

            sessoesHTML += `
                <tr>
                    <td>#${String(i + 1).padStart(3, "0")}</td>

                    <td>
                        <input type="date"
                            class="input-data"
                            data-id="${paciente.id}"
                            data-index="${i}"
                            value="${sessao.data || ""}">
                    </td>

                    <td>
                        <input type="time"
                            class="input-horario"
                            data-id="${paciente.id}"
                            data-index="${i}"
                            value="${sessao.hora || ""}">
                    </td>

                    <td>
                        <select class="input-duracao"
                            data-id="${paciente.id}"
                            data-index="${i}">

                            <option value="30" ${sessao.duracao == 30 ? "selected" : ""}>30 minutos</option>
                            <option value="45" ${sessao.duracao == 45 ? "selected" : ""}>45 minutos</option>
                            <option value="50" ${(!sessao.duracao || sessao.duracao == 50) ? "selected" : ""}>50 minutos</option>
                            <option value="60" ${sessao.duracao == 60 ? "selected" : ""}>60 minutos</option>
                            <option value="75" ${sessao.duracao == 75 ? "selected" : ""}>75 minutos</option>
                            <option value="90" ${sessao.duracao == 90 ? "selected" : ""}>90 minutos</option>
                            <option value="120" ${sessao.duracao == 120 ? "selected" : ""}>120 minutos</option>
                        </select>
                    </td>

                    <td>
                        <select class="status"
                            data-id="${paciente.id}"
                            data-index="${i}">

                            <option value="agendada" ${sessao.status === "agendada" ? "selected disabled hidden" : ""}>Agendada</option>
                            <option value="realizada" ${sessao.status === "realizada" ? "selected" : ""}>Realizada</option>
                            <option value="cancelada" ${sessao.status === "cancelada" ? "selected" : ""}>Cancelada</option>
                            <option value="andamento" ${sessao.status === "andamento" ? "selected" : ""}>Em Andamento</option>

                        </select>
                    </td>

                    <td>                    
                        <button class="btn-evolucao"
                            data-id="${paciente.id}"
                            data-index="${i}">
                            Prontuário
                        </button>

                        <button class="btn-excluir-sessao"
                            data-id="${paciente.id}"
                            data-index="${i}">
                            Excluir
                        </button>
                    </td>
                </tr>
            `;
        });

        container.innerHTML += `
            <div class="paciente-sessao-card">

                <div class="paciente-header">
                    <h2>${paciente.nomeCompleto}</h2>
                    <small>📅 Início: ${paciente.dataCadastro ?? "-"}</small>
                </div>

                <table class="tabela-sessoes">
                    <thead>
                        <tr>
                            <th>Sessão</th>
                            <th>Data</th>
                            <th>Horário</th>
                            <th>Duração</th>
                            <th>Status</th>
                            <th>Ação</th>
                        </tr>
                    </thead>

                    <tbody>
                        ${sessoesHTML}
                    </tbody>
                </table>

            </div>
        `;
    });
}
renderSessoes();

// =========================
// STATUS AUTOMÁTICO
// =========================

async function atualizarStatusAutomatico() {

    let pacientes = JSON.parse(await window.storage.getItem("pacientes")) || [];

    const agora = new Date();
    let alterou = false;

    pacientes.forEach(paciente => {
        (paciente.sessoes || []).forEach(sessao => {

            if (!sessao.data || !sessao.hora) return;

            // respeita status definidos manualmente (ex: cancelada)
            if (sessao.status === "cancelada") return;

            const duracao = Number(sessao.duracao) || 60;

            const inicio = new Date(`${sessao.data}T${sessao.hora}`);
            const fim = new Date(inicio);

            fim.setMinutes(fim.getMinutes() + duracao);

            let novoStatus = "";

            if (agora < inicio) {
                novoStatus = "agendada";
            } else if (agora >= inicio && agora < fim) {
                novoStatus = "andamento";
            } else {
                novoStatus = "realizada";
            }

            if (sessao.status !== novoStatus) {
                sessao.status = novoStatus;
                alterou = true;
            }

        });

    });

    if (alterou) {
        await window.storage.setItem("pacientes", JSON.stringify(pacientes));
    }

}

// =========================
// SALVAR DATA / HORA / STATUS
// =========================

document.addEventListener("input", async (e) => {

    let pacientes = JSON.parse(await window.storage.getItem("pacientes")) || [];

    const id = e.target.dataset.id;
    const index = e.target.dataset.index;

    const paciente = pacientes.find(p => p.id == id);
    if (!paciente) return;

    if (!paciente.sessoes) paciente.sessoes = [];

    if (!paciente.sessoes[index]) {
        paciente.sessoes[index] = {};
    }

    if (!paciente.sessoes[index].duracao) {
        paciente.sessoes[index].duracao = 60;
    }

    if (e.target.classList.contains("input-data")) {
        paciente.sessoes[index].data = e.target.value;
    }

    if (e.target.classList.contains("input-horario")) {
        paciente.sessoes[index].hora = e.target.value;
    }

    if (e.target.classList.contains("input-duracao")) {
        paciente.sessoes[index].duracao = Number(e.target.value);
    }
    const data = paciente.sessoes[index].data;
    const hora = paciente.sessoes[index].hora;

    if (data && hora) {

        const conflito = await horarioJaOcupado(id, data, hora);

        if (conflito) {
            alert(`⚠️ Horário já ocupado por ${conflito}`);
            paciente.sessoes[index].hora = "";
            await window.storage.setItem("pacientes", JSON.stringify(pacientes));
            renderSessoes();
            return;
        }
    }

    if (e.target.classList.contains("status")) {
        paciente.sessoes[index].status = e.target.value;
    }

    await window.storage.setItem("pacientes", JSON.stringify(pacientes));
});

// =========================
// ADICIONAR SESSÃO
// =========================

document.addEventListener("click", function (event) {

    if (event.target.classList.contains("btn-evolucao")) {
        const id = event.target.dataset.id;
        window.location.href = `evolucao.html?id=${id}`;
    }
});

// =========================
// EXCLUIR SESSÃO
// =========================

document.addEventListener("click", async (e) => {

    if (e.target.classList.contains("btn-excluir-sessao")) {

        const id = e.target.dataset.id;
        const index = e.target.dataset.index;

        let pacientes = JSON.parse(await window.storage.getItem("pacientes")) || [];

        const paciente = pacientes.find(p => p.id == id);
        if (!paciente) return;

        paciente.sessoes.splice(index, 1);

        await window.storage.setItem("pacientes", JSON.stringify(pacientes));
        renderSessoes();
    }
});

async function iniciarSessoes() {
    await atualizarStatusAutomatico();
    await renderSessoes();
}

iniciarSessoes();

setInterval(async () => {
    await atualizarStatusAutomatico();
    await renderSessoes();
}, 60000);