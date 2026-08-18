// =========================
// CONFLITO DE HORÁRIO — agora verifica pacientes E casais
// =========================
async function horarioJaOcupado(idAtual, data, hora) {

    const pacientes = JSON.parse(await window.storage.getItem("pacientes")) || [];
    const casais = JSON.parse(await window.storage.getItem("casais")) || [];

    const todos = [...pacientes, ...casais];

    for (let registro of todos) {

        if (registro.id == idAtual) continue;

        const nomeExibicao = registro.nomeCompleto
            || `${registro.p1NomeCompleto || "?"} e ${registro.p2NomeCompleto || "?"}`;

        // verifica conflito com a consulta inicial
        if (
            registro.consulta &&
            registro.consulta.data === data &&
            registro.consulta.hora === hora &&
            data !== "" &&
            hora !== ""
        ) {
            return nomeExibicao;
        }

        // verifica conflito com as sessões normais
        for (let s of (registro.sessoes || [])) {
            if (
                s.data === data &&
                s.hora === hora &&
                s.data !== "" &&
                s.hora !== ""
            ) {
                return nomeExibicao;
            }
        }
    }

    return null;
}

// =========================
// MONTA A TABELA DE SESSÕES DE UM REGISTRO (paciente OU casal)
// origem: "individual" | "casal"
// =========================
function montarLinhaConsulta(registro, origem) {

    const celaAtendido = origem === "casal"
        ? `<td><span class="badge-consulta" style="background-color:#eaf0e3;color:#5c7a48;">👥 Casal (ambos)</span></td>`
        : "";

    return `
        <tr class="linha-consulta">
            <td><span class="badge-consulta">📋 1ª Consulta</span></td>
            ${celaAtendido}
            <td>
                <input type="date"
                    class="input-data"
                    data-tipo="consulta"
                    data-id="${registro.id}"
                    data-origem="${origem}"
                    value="${registro.consulta.data || ""}">
            </td>

            <td>
                <input type="time"
                    class="input-horario"
                    data-tipo="consulta"
                    data-id="${registro.id}"
                    data-origem="${origem}"
                    value="${registro.consulta.hora || ""}">
            </td>

            <td>
                <select class="input-duracao"
                    data-tipo="consulta"
                    data-id="${registro.id}"
                    data-origem="${origem}">

                    <option value="30" ${registro.consulta.duracao == 30 ? "selected" : ""}>30 minutos</option>
                    <option value="45" ${registro.consulta.duracao == 45 ? "selected" : ""}>45 minutos</option>
                    <option value="50" ${(!registro.consulta.duracao || registro.consulta.duracao == 50) ? "selected" : ""}>50 minutos</option>
                    <option value="60" ${registro.consulta.duracao == 60 ? "selected" : ""}>60 minutos</option>
                    <option value="75" ${registro.consulta.duracao == 75 ? "selected" : ""}>75 minutos</option>
                    <option value="90" ${registro.consulta.duracao == 90 ? "selected" : ""}>90 minutos</option>
                    <option value="120" ${registro.consulta.duracao == 120 ? "selected" : ""}>120 minutos</option>
                </select>
            </td>

            <td>
                <select class="status"
                    data-tipo="consulta"
                    data-id="${registro.id}"
                    data-origem="${origem}">

                    <option value="agendada" ${registro.consulta.status === "agendada" ? "selected" : ""}>Agendada</option>
                    <option value="realizada" ${registro.consulta.status === "realizada" ? "selected" : ""}>Realizada</option>
                    <option value="cancelada" ${registro.consulta.status === "cancelada" ? "selected" : ""}>Cancelada</option>
                    <option value="andamento" ${registro.consulta.status === "andamento" ? "selected" : ""}>Em Andamento</option>
                </select>
            </td>

            <td>
                <button class="btn-evolucao" data-id="${registro.id}" data-origem="${origem}">
                    Prontuário
                </button>
            </td>
        </tr>
    `;
}

function montarLinhaSessao(registro, sessao, i, origem) {

    if (!sessao.duracao) {
        sessao.duracao = 50;
    }

    const celaAtendido = origem === "casal"
        ? `
            <td>
                <select class="input-atendido"
                    data-id="${registro.id}"
                    data-index="${i}"
                    data-origem="casal">
                    <option value="" ${!sessao.atendido ? "selected" : ""}>Selecionar...</option>
                    <option value="p1" ${sessao.atendido === "p1" ? "selected" : ""}>${registro.p1NomeCompleto || "Pessoa 1"}</option>
                    <option value="p2" ${sessao.atendido === "p2" ? "selected" : ""}>${registro.p2NomeCompleto || "Pessoa 2"}</option>
                </select>
            </td>
        `
        : "";

    return `
        <tr>
            <td>#${String(i + 1).padStart(3, "0")}</td>
            ${celaAtendido}

            <td>
                <input type="date"
                    class="input-data"
                    data-id="${registro.id}"
                    data-index="${i}"
                    data-origem="${origem}"
                    value="${sessao.data || ""}">
            </td>

            <td>
                <input type="time"
                    class="input-horario"
                    data-id="${registro.id}"
                    data-index="${i}"
                    data-origem="${origem}"
                    value="${sessao.hora || ""}">
            </td>

            <td>
                <select class="input-duracao"
                    data-id="${registro.id}"
                    data-index="${i}"
                    data-origem="${origem}">

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
                    data-id="${registro.id}"
                    data-index="${i}"
                    data-origem="${origem}">

                    <option value="agendada" ${sessao.status === "agendada" ? "selected" : ""}>Agendada</option>
                    <option value="realizada" ${sessao.status === "realizada" ? "selected" : ""}>Realizada</option>
                    <option value="cancelada" ${sessao.status === "cancelada" ? "selected" : ""}>Cancelada</option>
                    <option value="andamento" ${sessao.status === "andamento" ? "selected" : ""}>Em Andamento</option>
                </select>
            </td>

            <td>
                <button class="btn-evolucao"
                    data-id="${registro.id}"
                    data-index="${i}"
                    data-origem="${origem}">
                    Prontuário
                </button>

                <button class="btn-excluir-sessao"
                    data-id="${registro.id}"
                    data-index="${i}"
                    data-origem="${origem}">
                    Excluir
                </button>
            </td>
        </tr>
    `;
}

// =========================
// SESSÕES - CONTROLE GERAL
// =========================
async function renderSessoes() {

    const container = document.getElementById("containerSessoes");
    let pacientes = JSON.parse(await window.storage.getItem("pacientes")) || [];
    let casais = JSON.parse(await window.storage.getItem("casais")) || [];

    if (pacientes.length === 0 && casais.length === 0) {
        container.innerHTML = `
            <div class="placeholder-sessoes">
                <h3>Nenhuma sessão registrada</h3>
                <p>Cadastre um paciente e defina a quantidade de sessões.</p>
            </div>
        `;
        return;
    }

    let precisaSalvarPacientes = false;
    let precisaSalvarCasais = false;

    // garante a "1ª Consulta" e a duração padrão para todos os pacientes
    pacientes.forEach(paciente => {
        if (!paciente.consulta) {
            paciente.consulta = {
                data: paciente.dataCadastro || "",
                hora: "",
                duracao: 50,
                status: "agendada"
            };
            precisaSalvarPacientes = true;
        }
        if (!paciente.consulta.duracao) {
            paciente.consulta.duracao = 50;
        }
    });

    // garante a "1ª Consulta" automática para os casais também
    casais.forEach(casal => {
        if (!casal.consulta) {
            casal.consulta = {
                data: casal.dataCadastro || "",
                hora: "",
                duracao: 50,
                status: "agendada"
            };
            precisaSalvarCasais = true;
        }
        if (!casal.consulta.duracao) {
            casal.consulta.duracao = 50;
        }
    });

    if (precisaSalvarPacientes) {
        await window.storage.setItem("pacientes", JSON.stringify(pacientes));
    }
    if (precisaSalvarCasais) {
        await window.storage.setItem("casais", JSON.stringify(casais));
    }

    // ===== filtro de pesquisa por nome (paciente ou casal) =====
    const campoBusca = document.getElementById("pesquisaPaciente");
    const termoBusca = (campoBusca?.value || "").trim().toLowerCase();

    const pacientesFiltrados = termoBusca
        ? pacientes.filter(p => (p.nomeCompleto || "").toLowerCase().includes(termoBusca))
        : pacientes;

    const casaisFiltrados = termoBusca
        ? casais.filter(c =>
            (c.p1NomeCompleto || "").toLowerCase().includes(termoBusca) ||
            (c.p2NomeCompleto || "").toLowerCase().includes(termoBusca) ||
            (c.nomeCasal || "").toLowerCase().includes(termoBusca)
        )
        : casais;

    container.innerHTML = "";

    if (pacientesFiltrados.length === 0 && casaisFiltrados.length === 0) {
        container.innerHTML = `
            <div class="placeholder-sessoes">
                <h3>Nenhum paciente encontrado</h3>
                <p>Verifique se o nome digitado está correto.</p>
            </div>
        `;
        return;
    }

    // ===== cards de pacientes individuais (comportamento igual ao original) =====
    pacientesFiltrados.forEach(paciente => {

        let sessoes = paciente.sessoes || [];

        let sessoesHTML = montarLinhaConsulta(paciente, "individual");

        sessoes.forEach((sessao, i) => {
            sessoesHTML += montarLinhaSessao(paciente, sessao, i, "individual");
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
                <div class="tabela-wrapper">
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
            </div>
        `;
    });

    // ===== cards de casais (coluna extra "Atendido(a)") =====
    casaisFiltrados.forEach(casal => {

        let sessoes = casal.sessoes || [];

        let sessoesHTML = montarLinhaConsulta(casal, "casal");

        sessoes.forEach((sessao, i) => {
            sessoesHTML += montarLinhaSessao(casal, sessao, i, "casal");
        });

        container.innerHTML += `
            <div class="paciente-sessao-card">

                <div class="paciente-header">
                    <div class="titulo-paciente">
                        <h2>
                            <i class="ti ti-users-group" style="color:#7a8e69"></i>
                            ${casal.nomeCasal || "?"}
                            <span class="tipo-consulta ${casal.tipoConsulta?.toLowerCase()}">
                                ${casal.tipoConsulta || "-"}
                            </span>
                        </h2>
                    </div>

                    <small>📅 Início: ${casal.dataCadastro ?? "-"}</small>
                </div>
                <div class="tabela-wrapper">
                    <table class="tabela-sessoes">
                        <thead>
                            <tr>
                                <th>Sessão</th>
                                <th>Atendido(a)</th>
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
    let casais = JSON.parse(await window.storage.getItem("casais")) || [];

    const agora = new Date();
    let alterouPacientes = false;
    let alterouCasais = false;

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

        if (paciente.consulta) {
            const novoStatus = calcularNovoStatus(paciente.consulta);
            if (novoStatus && paciente.consulta.status !== novoStatus) {
                paciente.consulta.status = novoStatus;
                alterouPacientes = true;
            }
        }

        (paciente.sessoes || []).forEach(sessao => {
            const novoStatus = calcularNovoStatus(sessao);
            if (novoStatus && sessao.status !== novoStatus) {
                sessao.status = novoStatus;
                alterouPacientes = true;
            }
        });

    });

    casais.forEach(casal => {

        if (casal.consulta) {
            const novoStatus = calcularNovoStatus(casal.consulta);
            if (novoStatus && casal.consulta.status !== novoStatus) {
                casal.consulta.status = novoStatus;
                alterouCasais = true;
            }
        }

        (casal.sessoes || []).forEach(sessao => {
            const novoStatus = calcularNovoStatus(sessao);
            if (novoStatus && sessao.status !== novoStatus) {
                sessao.status = novoStatus;
                alterouCasais = true;
            }
        });

    });

    if (alterouPacientes) {
        await window.storage.setItem("pacientes", JSON.stringify(pacientes));
    }
    if (alterouCasais) {
        await window.storage.setItem("casais", JSON.stringify(casais));
    }
}

// =========================
// SALVAR DATA / HORA / STATUS / DURAÇÃO
// =========================

document.addEventListener("input", async (e) => {

    const origem = e.target.dataset.origem === "casal" ? "casal" : "individual";
    const chave = origem === "casal" ? "casais" : "pacientes";

    let lista = JSON.parse(await window.storage.getItem(chave)) || [];

    const id = e.target.dataset.id;
    const tipo = e.target.dataset.tipo; // "consulta" quando é a 1ª consulta

    const registro = lista.find(r => r.id == id);
    if (!registro) return;

    // ===== edição da 1ª consulta (individual ou casal) =====
    if (tipo === "consulta") {

        if (!registro.consulta) registro.consulta = {};
        if (!registro.consulta.duracao) registro.consulta.duracao = 50;

        if (e.target.classList.contains("input-data")) {
            registro.consulta.data = e.target.value;
        }

        if (e.target.classList.contains("input-horario")) {
            registro.consulta.hora = e.target.value;
        }

        if (e.target.classList.contains("input-duracao")) {
            registro.consulta.duracao = Number(e.target.value);
        }

        if (e.target.classList.contains("status")) {
            registro.consulta.status = e.target.value;
        }

        const data = registro.consulta.data;
        const hora = registro.consulta.hora;

        if (data && hora) {

            const conflito = await horarioJaOcupado(id, data, hora);

            if (conflito) {

                mostrarMensagem(
                    `Horário já ocupado por ${conflito}`,
                    "warning"
                );

                registro.consulta.hora = "";

                await window.storage.setItem(chave, JSON.stringify(lista));
                renderSessoes();
                return;
            }
        }

        await window.storage.setItem(chave, JSON.stringify(lista));
        return;
    }

    // ===== edição de sessões normais =====

    const index = e.target.dataset.index;

    if (!registro.sessoes) registro.sessoes = [];

    if (!registro.sessoes[index]) {
        registro.sessoes[index] = {};
    }

    if (!registro.sessoes[index].duracao) {
        registro.sessoes[index].duracao = 60;
    }

    if (e.target.classList.contains("input-data")) {
        registro.sessoes[index].data = e.target.value;
    }

    if (e.target.classList.contains("input-horario")) {
        registro.sessoes[index].hora = e.target.value;
    }

    if (e.target.classList.contains("input-duracao")) {
        registro.sessoes[index].duracao = Number(e.target.value);
    }

    const data = registro.sessoes[index].data;
    const hora = registro.sessoes[index].hora;

    if (data && hora) {

        const conflito = await horarioJaOcupado(id, data, hora);

        if (conflito) {

            mostrarMensagem(
                `Horário já ocupado por ${conflito}`,
                "warning"
            );

            registro.sessoes[index].hora = "";

            await window.storage.setItem(chave, JSON.stringify(lista));
            renderSessoes();
            return;
        }
    }

    if (e.target.classList.contains("status")) {
        registro.sessoes[index].status = e.target.value;
    }

    await window.storage.setItem(chave, JSON.stringify(lista));
});

// =========================
// ATENDIDO(A) — só existe para sessões de casal (quem vai naquele dia)
// =========================
document.addEventListener("change", async (e) => {

    if (e.target.classList.contains("input-atendido")) {

        const id = e.target.dataset.id;
        const index = e.target.dataset.index;

        let casais = JSON.parse(await window.storage.getItem("casais")) || [];
        const casal = casais.find(c => c.id == id);
        if (!casal) return;

        if (!casal.sessoes[index]) casal.sessoes[index] = {};
        casal.sessoes[index].atendido = e.target.value; // "p1" ou "p2"

        await window.storage.setItem("casais", JSON.stringify(casais));
    }
});

// =========================
// PRONTUÁRIO
// =========================

document.addEventListener("click", async function (event) {

    if (!event.target.classList.contains("btn-evolucao")) return;

    const id = event.target.dataset.id;
    const origem = event.target.dataset.origem === "casal" ? "casal" : "individual";

    // a linha da 1ª Consulta nunca tem data-index (só as sessões numeradas têm)
    const ehConsulta = event.target.dataset.index === undefined;

    // sessão de paciente individual
    if (origem === "individual") {
        window.location.href = `evolucao.html?id=${id}${ehConsulta ? "&tipo=consulta" : ""}`;
        return;
    }

    // 1ª Consulta do casal: registro conjunto, sem seleção de "atendido"
    if (ehConsulta) {
        window.location.href = `evolucao.html?id=${id}&origem=casal&tipo=consulta`;
        return;
    }

    // sessão normal de casal: descobre para quem é essa sessão específica
    const linha = event.target.closest("tr");
    const selectAtendido = linha ? linha.querySelector(".input-atendido") : null;
    const atendido = selectAtendido ? selectAtendido.value : "";

    if (!atendido) {
        mostrarMensagem(
            "Selecione para quem é essa sessão em \"Atendido(a)\" antes de abrir o prontuário.",
            "warning"
        );
        return;
    }

    const casais = JSON.parse(await window.storage.getItem("casais")) || [];
    const casal = casais.find(c => c.id == id);

    const nomePessoa = atendido === "p1"
        ? (casal?.p1NomeCompleto || "Pessoa 1")
        : (casal?.p2NomeCompleto || "Pessoa 2");

    window.location.href =
        `evolucao.html?id=${id}&origem=casal&pessoa=${atendido}&nome=${encodeURIComponent(nomePessoa)}`;
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
        const origem = e.target.dataset.origem === "casal" ? "casal" : "individual";
        const chave = origem === "casal" ? "casais" : "pacientes";

        let lista = JSON.parse(await window.storage.getItem(chave)) || [];

        const registro = lista.find(r => r.id == id);

        if (!registro) return;

        registro.sessoes.splice(index, 1);

        await window.storage.setItem(chave, JSON.stringify(lista));

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