async function horarioJaOcupado(idPacienteAtual, data, hora) {

    const pacientes = JSON.parse(await window.storage.getItem("pacientes")) || [];

    for (let p of pacientes) {

        if (p.id == idPacienteAtual) continue;

        // verifica conflito com a consulta inicial
        if (
            p.consulta &&
            p.consulta.data === data &&
            p.consulta.hora === hora &&
            data !== "" &&
            hora !== ""
        ) {
            return p.nomeCompleto;
        }

        // verifica conflito com as sessões normais
        for (let s of (p.sessoes || [])) {
            if (
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

    const container = document.getElementById("containerSessoes");
    let pacientes = JSON.parse(await window.storage.getItem("pacientes")) || [];

    if (pacientes.length === 0) {
        container.innerHTML = `
            <div class="placeholder-sessoes">
                <h3>Nenhuma sessão registrada</h3>
                <p>Cadastre um paciente e defina a quantidade de sessões.</p>
            </div>
        `;
        return;
    }

    let precisaSalvar = false;

    // garante a "1ª Consulta" e a duração padrão para todos os pacientes,
    // mesmo os que estiverem escondidos pelo filtro de busca no momento
    pacientes.forEach(paciente => {
        if (!paciente.consulta) {
            paciente.consulta = {
                data: paciente.dataCadastro || "",
                hora: "",
                duracao: 50,
                status: "realizada"
            };
            precisaSalvar = true;
        }
        if (!paciente.consulta.duracao) {
            paciente.consulta.duracao = 50;
        }
    });

    if (precisaSalvar) {
        await window.storage.setItem("pacientes", JSON.stringify(pacientes));
    }

    // ===== filtro de pesquisa por nome do paciente =====
    const campoBusca = document.getElementById("pesquisaPaciente");
    const termoBusca = (campoBusca?.value || "").trim().toLowerCase();

    const pacientesFiltrados = termoBusca
        ? pacientes.filter(p => (p.nomeCompleto || "").toLowerCase().includes(termoBusca))
        : pacientes;

    container.innerHTML = "";

    if (pacientesFiltrados.length === 0) {
        container.innerHTML = `
            <div class="placeholder-sessoes">
                <h3>Nenhum paciente encontrado</h3>
                <p>Verifique se o nome digitado está correto.</p>
            </div>
        `;
        return;
    }

    pacientesFiltrados.forEach(paciente => {

        let sessoes = paciente.sessoes || [];

        // linha da 1ª consulta — sempre aparece primeiro, não entra na contagem de sessões
        let linhaConsulta = `
            <tr class="linha-consulta">
                <td><span class="badge-consulta">📋 1ª Consulta</span></td>

                <td>
                    <input type="date"
                        class="input-data"
                        data-tipo="consulta"
                        data-id="${paciente.id}"
                        value="${paciente.consulta.data || ""}">
                </td>

                <td>
                    <input type="time"
                        class="input-horario"
                        data-tipo="consulta"
                        data-id="${paciente.id}"
                        value="${paciente.consulta.hora || ""}">
                </td>

                <td>
                    <select class="input-duracao"
                        data-tipo="consulta"
                        data-id="${paciente.id}">

                        <option value="30" ${paciente.consulta.duracao == 30 ? "selected" : ""}>30 minutos</option>
                        <option value="45" ${paciente.consulta.duracao == 45 ? "selected" : ""}>45 minutos</option>
                        <option value="50" ${(!paciente.consulta.duracao || paciente.consulta.duracao == 50) ? "selected" : ""}>50 minutos</option>
                        <option value="60" ${paciente.consulta.duracao == 60 ? "selected" : ""}>60 minutos</option>
                        <option value="75" ${paciente.consulta.duracao == 75 ? "selected" : ""}>75 minutos</option>
                        <option value="90" ${paciente.consulta.duracao == 90 ? "selected" : ""}>90 minutos</option>
                        <option value="120" ${paciente.consulta.duracao == 120 ? "selected" : ""}>120 minutos</option>
                    </select>
                </td>

                <td>
                    <select class="status"
                        data-tipo="consulta"
                        data-id="${paciente.id}">

                        <option value="agendada" ${paciente.consulta.status === "agendada" ? "selected disabled hidden" : ""}>Agendada</option>
                        <option value="realizada" ${paciente.consulta.status === "realizada" ? "selected" : ""}>Realizada</option>
                        <option value="cancelada" ${paciente.consulta.status === "cancelada" ? "selected" : ""}>Cancelada</option>
                        <option value="andamento" ${paciente.consulta.status === "andamento" ? "selected" : ""}>Em Andamento</option>

                    </select>
                </td>

                <td>
                    <button class="btn-evolucao" data-id="${paciente.id}">
                        Prontuário
                    </button>
                </td>
            </tr>
        `;

        let sessoesHTML = linhaConsulta;

        sessoes.forEach((sessao, i) => {

            if (!sessao.duracao) {
                sessao.duracao = 50;
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
                    <div class="titulo-paciente">
                        <h2>
                            ${paciente.nomeCompleto}
                            <span class="tipo-consulta ${paciente.tipoConsulta?.toLowerCase()}">
                                ${paciente.tipoConsulta || "-"}
                            </span>
                        </h2>
                    </div>

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

    function calcularNovoStatus(item) {
        if (!item.data || !item.hora) return null;
        if (item.status === "cancelada") return null; // respeita status manual

        const duracao = Number(item.duracao) || 60;
        const inicio = new Date(`${item.data}T${item.hora}`);
        const fim = new Date(inicio);
        fim.setMinutes(fim.getMinutes() + duracao);

        if (agora < inicio) return "agendada";
        if (agora >= inicio && agora < fim) return "andamento";
        return "realizada";
    }

    pacientes.forEach(paciente => {

        // atualiza status da 1ª consulta também
        if (paciente.consulta) {
            const novoStatus = calcularNovoStatus(paciente.consulta);
            if (novoStatus && paciente.consulta.status !== novoStatus) {
                paciente.consulta.status = novoStatus;
                alterou = true;
            }
        }

        (paciente.sessoes || []).forEach(sessao => {
            const novoStatus = calcularNovoStatus(sessao);
            if (novoStatus && sessao.status !== novoStatus) {
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
    const tipo = e.target.dataset.tipo; // "consulta" quando é a 1ª consulta

    const paciente = pacientes.find(p => p.id == id);
    if (!paciente) return;

    // ===== edição da 1ª consulta =====
    if (tipo === "consulta") {

        if (!paciente.consulta) paciente.consulta = {};
        if (!paciente.consulta.duracao) paciente.consulta.duracao = 50;

        if (e.target.classList.contains("input-data")) {
            paciente.consulta.data = e.target.value;
        }

        if (e.target.classList.contains("input-horario")) {
            paciente.consulta.hora = e.target.value;
        }

        if (e.target.classList.contains("input-duracao")) {
            paciente.consulta.duracao = Number(e.target.value);
        }

        if (e.target.classList.contains("status")) {
            paciente.consulta.status = e.target.value;
        }

        const data = paciente.consulta.data;
        const hora = paciente.consulta.hora;

        if (data && hora) {

            const conflito = await horarioJaOcupado(id, data, hora);

            if (conflito) {

                mostrarMensagem(
                    `Horário já ocupado por ${conflito}`,
                    "warning"
                );

                paciente.consulta.hora = "";

                await window.storage.setItem(
                    "pacientes",
                    JSON.stringify(pacientes)
                );

                renderSessoes();

                return;
            }
        }

        await window.storage.setItem("pacientes", JSON.stringify(pacientes));
        return;
    }

    // ===== edição de sessões normais (comportamento original) =====

    const index = e.target.dataset.index;

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

            mostrarMensagem(
                `Horário já ocupado por ${conflito}`,
                "warning"
            );

            paciente.sessoes[index].hora = "";

            await window.storage.setItem(
                "pacientes",
                JSON.stringify(pacientes)
            );

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

        const resposta = await mostrarConfirmacao(
            "Deseja realmente excluir esta sessão?"
        );

        if (!resposta.isConfirmed) {
            return;
        }

        const id = e.target.dataset.id;
        const index = e.target.dataset.index;

        let pacientes = JSON.parse(await window.storage.getItem("pacientes")) || [];

        const paciente = pacientes.find(p => p.id == id);

        if (!paciente) return;

        paciente.sessoes.splice(index, 1);

        await window.storage.setItem(
            "pacientes",
            JSON.stringify(pacientes)
        );

        renderSessoes();

        mostrarMensagem(
            "Sessão excluída com sucesso!",
            "success"
        );
    }
});

async function iniciarSessoes() {
    await atualizarStatusAutomatico();
    await renderSessoes();
}

iniciarSessoes();

// =========================
// PESQUISA DE PACIENTE
// =========================

document.addEventListener("input", (e) => {
    if (e.target && e.target.id === "pesquisaPaciente") {
        renderSessoes();
    }
});

setInterval(async () => {
    await atualizarStatusAutomatico();
    await renderSessoes();
}, 60000);