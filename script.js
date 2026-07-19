async function atualizarStatusAutomatico() {
    let pacientes = JSON.parse(await window.storage.getItem("pacientes")) || [];
    const agora = new Date();
    let alterou = false;

    pacientes.forEach(paciente => {
        (paciente.sessoes || []).forEach(sessao => {
            if (!sessao.data || !sessao.hora) return;
            if (sessao.status === "cancelada") return;

            const duracao = Number(sessao.duracao) || 50;
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
    return alterou;
}

document.addEventListener("DOMContentLoaded", () => {

    // SAUDAÇÃO — roda só uma vez
    const horaAtual = new Date().getHours();
    const elementoSaudacao = document.getElementById("saudacao");
    if (horaAtual >= 5 && horaAtual < 12) {
        elementoSaudacao.textContent = "Bom dia";
    } else if (horaAtual >= 12 && horaAtual < 18) {
        elementoSaudacao.textContent = "Boa tarde";
    } else {
        elementoSaudacao.textContent = "Boa noite";
    }

    // FUNÇÃO PRINCIPAL
    async function atualizarHome() {

        await atualizarStatusAutomatico(); // atualiza status antes de ler

        const pacientes = JSON.parse(await window.storage.getItem("pacientes")) || [];
        const agora = new Date();
        const hojeFormatado = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-${String(agora.getDate()).padStart(2, "0")}`;

        // TOTAL DE PACIENTES
        document.getElementById("totalPacientes").textContent =
            `${pacientes.length} cadastrados`;

        // SESSÕES HOJE
        let totalHoje = 0;
        pacientes.forEach(p => {
            (p.sessoes || []).forEach(s => {
                if (s.data === hojeFormatado && s.status !== "cancelada") totalHoje++;
            });
        });
        document.getElementById("sessoesHoje").textContent = totalHoje;

        // PRÓXIMA SESSÃO
        let proximaSessao = null;
        pacientes.forEach(paciente => {
            (paciente.sessoes || []).forEach(sessao => {
                if (!sessao.data || !sessao.hora) return;
                if ((sessao.status || "").trim().toLowerCase() !== "agendada") return;
                if (!sessao.hora.includes(":")) return;
                const dataSessao = new Date(`${sessao.data}T${sessao.hora.trim()}`);
                if (isNaN(dataSessao) || dataSessao < agora) return;
                if (!proximaSessao || dataSessao < proximaSessao.dataHora) {
                    proximaSessao = { paciente: paciente.nomeCompleto, dataHora: dataSessao };
                }
            });
        });

        const el = document.getElementById("proximaSessao");
        if (proximaSessao) {
            const dataBR = proximaSessao.dataHora.toLocaleDateString("pt-BR");
            const horaBR = proximaSessao.dataHora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
            const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
            const diaSessao = new Date(proximaSessao.dataHora); diaSessao.setHours(0, 0, 0, 0);
            const diffDias = Math.round((diaSessao - hoje) / (1000 * 60 * 60 * 24));
            const statusVisual = diffDias === 0 ? "🟢 Hoje" : diffDias === 1 ? "🟡 Amanhã" : diffDias <= 3 ? "🟡 Próximos dias" : "🔵 Agendada";
            el.innerHTML = `<strong>${proximaSessao.paciente}</strong><br>${dataBR} às ${horaBR}<br><small>${statusVisual}</small>`;
        } else {
            el.textContent = "Nenhuma";
        }

        // AGENDA DE HOJE
        const agendaHoje = [];
        pacientes.forEach(paciente => {
            (paciente.sessoes || []).forEach(sessao => {
                if (sessao.data === hojeFormatado) {
                    agendaHoje.push({ paciente: paciente.nomeCompleto, horario: sessao.hora, status: sessao.status });
                }
            });
        });
        agendaHoje.sort((a, b) => a.horario.localeCompare(b.horario));

        const agendaHojeEl = document.getElementById("agendaHoje");
        if (agendaHoje.length === 0) {
            agendaHojeEl.innerHTML = "<p>Nenhuma sessão agendada para hoje.</p>";
            return;
        }

        agendaHojeEl.innerHTML = agendaHoje.map(item => {
            const status = item.status.toLowerCase().trim();
            const mapa = {
                agendada: ["sessao-agendada", "badge-agendada", "Agendada"],
                realizada: ["sessao-realizada", "badge-realizada", "Realizada"],
                cancelada: ["sessao-cancelada", "badge-cancelada", "Cancelada"],
                andamento: ["sessao-andamento", "badge-andamento", "Em Andamento"],
            };
            const [classe, badge, textoBadge] = mapa[status] || ["", "", status];
            return `
                <div class="item-agenda ${classe}">
                    <strong>${item.horario}</strong>
                    <div class="item-agenda-info">
                        <div class="item-agenda-name">${item.paciente}</div>
                    </div>
                    <span class="item-agenda-badge ${badge}">${textoBadge}</span>
                </div>`;
        }).join("");

        // RESUMO DA SEMANA
        let realizadas = 0, agendadas = 0, andamento = 0, canceladas = 0;
        const primeiroDiaSemana = new Date(agora);
        const diff = primeiroDiaSemana.getDay() === 0 ? -6 : 1 - primeiroDiaSemana.getDay();
        primeiroDiaSemana.setDate(primeiroDiaSemana.getDate() + diff);
        primeiroDiaSemana.setHours(0, 0, 0, 0);
        const ultimoDiaSemana = new Date(primeiroDiaSemana);
        ultimoDiaSemana.setDate(ultimoDiaSemana.getDate() + 6);
        ultimoDiaSemana.setHours(23, 59, 59, 999);

        pacientes.forEach(paciente => {
            (paciente.sessoes || []).forEach(sessao => {
                if (!sessao.data) return;
                const dataSessao = new Date(sessao.data + "T00:00:00");
                if (dataSessao < primeiroDiaSemana || dataSessao > ultimoDiaSemana) return;
                const status = (sessao.status || "").trim().toLowerCase();
                if (status === "realizada") realizadas++;
                if (status === "agendada") agendadas++;
                if (status === "andamento") andamento++;
                if (status === "cancelada") canceladas++;
            });
        });

        document.getElementById("resumoRealizadas").textContent = realizadas;
        document.getElementById("resumoAgendadas").textContent = agendadas;
        document.getElementById("resumoAndamento").textContent = andamento;
        document.getElementById("resumoCanceladas").textContent = canceladas;
    }
    
    
    // RODA NA ABERTURA E A CADA 1 SEGUNDO
    async function iniciarHome() {
        await atualizarHome();
    }

    iniciarHome();

    setInterval(async () => {
        const alterou = await atualizarStatusAutomatico();
        if (alterou) await atualizarHome();
    }, 1000);

    // CARDS CLICÁVEIS
    document.querySelectorAll(".home-card").forEach(card => {
        card.addEventListener("click", () => {
            const link = card.dataset.link;
            if (link) window.location.href = link;
        });
    });

});