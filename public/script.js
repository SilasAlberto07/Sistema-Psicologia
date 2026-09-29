// ===============================
// Junta TUDO que aparece na página Sessões em uma lista só:
// a "1ª Consulta" + as sessões normais, de pacientes individuais e casais.
// Quem está na Lixeira fica de fora.
// (no caso do casal, o nome exibido é de quem foi atendido naquela sessão)
// ===============================
function obterSessoesUnificadas(pacientes, casais) {
    const sessoesUnificadas = [];

    function adicionar(sessao, nomeExibicao, isCasal) {
        if (!sessao) return;
        sessoesUnificadas.push({
            nomeExibicao,
            data: sessao.data,
            hora: sessao.hora,
            status: sessao.status,
            duracao: sessao.duracao,
            isCasal,
        });
    }

    pacientes.forEach(paciente => {
        if (paciente.excluido) return;

        adicionar(paciente.consulta, paciente.nomeCompleto, false);

        (paciente.sessoes || []).forEach(sessao => {
            adicionar(sessao, paciente.nomeCompleto, false);
        });
    });

    casais.forEach(casal => {
        if (casal.excluido) return;

        const nomeCasal = `${casal.p1NomeCompleto || "?"} e ${casal.p2NomeCompleto || "?"}`;

        adicionar(casal.consulta, `${nomeCasal} (Casal)`, true);

        (casal.sessoes || []).forEach(sessao => {
            let nomeAtendido;

            if (sessao.atendido === "p1") {
                nomeAtendido = casal.p1NomeCompleto || "Pessoa 1";
            } else if (sessao.atendido === "p2") {
                nomeAtendido = casal.p2NomeCompleto || "Pessoa 2";
            } else {
                // ainda não escolheram quem vai nessa sessão
                nomeAtendido = nomeCasal;
            }

            adicionar(sessao, `${nomeAtendido} (Casal)`, true);
        });
    });

    return sessoesUnificadas;
}

async function atualizarStatusAutomatico() {
    let pacientes = JSON.parse(await window.storage.getItem("pacientes")) || [];
    let casais = JSON.parse(await window.storage.getItem("casais")) || [];
    const agora = new Date();
    let alterouPacientes = false;
    let alterouCasais = false;

    function calcularNovoStatus(sessao) {
        if (!sessao.data || !sessao.hora) return null;
        if (sessao.status === "cancelada") return null;

        const duracao = Number(sessao.duracao) || 60; // mesmo padrão da página Sessões
        const inicio = new Date(`${sessao.data}T${sessao.hora}`);
        const fim = new Date(inicio);
        fim.setMinutes(fim.getMinutes() + duracao);

        if (agora < inicio) return "agendada";
        if (agora >= inicio && agora < fim) return "andamento";
        return "realizada";
    }

    pacientes.forEach(paciente => {
        [paciente.consulta, ...(paciente.sessoes || [])].forEach(sessao => {
            if (!sessao) return;
            const novoStatus = calcularNovoStatus(sessao);
            if (novoStatus && sessao.status !== novoStatus) {
                sessao.status = novoStatus;
                alterouPacientes = true;
            }
        });
    });

    casais.forEach(casal => {
        [casal.consulta, ...(casal.sessoes || [])].forEach(sessao => {
            if (!sessao) return;
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

    return alterouPacientes || alterouCasais;
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
        const casais = JSON.parse(await window.storage.getItem("casais")) || [];
        const agora = new Date();
        const hojeFormatado = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-${String(agora.getDate()).padStart(2, "0")}`;

        // TOTAL DE PACIENTES
        document.getElementById("totalPacientes").textContent =
            pacientes.filter(p => !p.excluido).length;

        // TOTAL DE CASAIS
        document.getElementById("totalCasais").textContent =
            casais.filter(c => !c.excluido).length;

        // junta tudo (pacientes + casais) numa lista só de sessões
        const todasSessoes = obterSessoesUnificadas(pacientes, casais);

        // SESSÕES HOJE
        let totalHoje = 0;
        todasSessoes.forEach(s => {
            if (s.data === hojeFormatado && s.status !== "cancelada") totalHoje++;
        });
        document.getElementById("sessoesHoje").textContent = totalHoje;

        // PRÓXIMA SESSÃO
        let proximaSessao = null;
        todasSessoes.forEach(sessao => {
            if (!sessao.data || !sessao.hora) return;
            if ((sessao.status || "").trim().toLowerCase() !== "agendada") return;
            if (!sessao.hora.includes(":")) return;
            const dataSessao = new Date(`${sessao.data}T${sessao.hora.trim()}`);
            if (isNaN(dataSessao) || dataSessao < agora) return;
            if (!proximaSessao || dataSessao < proximaSessao.dataHora) {
                proximaSessao = { nomeExibicao: sessao.nomeExibicao, dataHora: dataSessao };
            }
        });

        const el = document.getElementById("proximaSessao");
        if (proximaSessao) {
            const dataBR = proximaSessao.dataHora.toLocaleDateString("pt-BR");
            const horaBR = proximaSessao.dataHora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
            const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
            const diaSessao = new Date(proximaSessao.dataHora); diaSessao.setHours(0, 0, 0, 0);
            const diffDias = Math.round((diaSessao - hoje) / (1000 * 60 * 60 * 24));
            const statusVisual = diffDias === 0 ? "🟢 Hoje" : diffDias === 1 ? "🟡 Amanhã" : diffDias <= 3 ? "🟡 Próximos dias" : "🔵 Agendada";
            el.innerHTML = `<strong>${proximaSessao.nomeExibicao}</strong><br>${dataBR} às ${horaBR}<br><small>${statusVisual}</small>`;
        } else {
            el.textContent = "Nenhuma";
        }

        // AGENDA DE HOJE
        const agendaHoje = todasSessoes
            .filter(s => s.data === hojeFormatado)
            .map(s => ({ nomeExibicao: s.nomeExibicao, horario: s.hora, status: s.status }));

        agendaHoje.sort((a, b) => (a.horario || "").localeCompare(b.horario || ""));

        const agendaHojeEl = document.getElementById("agendaHoje");
        if (agendaHoje.length === 0) {
            // Antes havia um "return" aqui, o que interrompia a função inteira
            // e impedia o cálculo do "Resumo da Semana" logo abaixo sempre que
            // não houvesse sessões marcadas para hoje. Trocado por if/else.
            agendaHojeEl.innerHTML = "<p>Nenhuma sessão agendada para hoje.</p>";
        } else {
            agendaHojeEl.innerHTML = agendaHoje.map(item => {
                const status = (item.status || "").toLowerCase().trim();
                const mapa = {
                    agendada: ["sessao-agendada", "badge-agendada", "Agendada"],
                    realizada: ["sessao-realizada", "badge-realizada", "Realizada"],
                    cancelada: ["sessao-cancelada", "badge-cancelada", "Cancelada"],
                    andamento: ["sessao-andamento", "badge-andamento", "Em Andamento"],
                };
                const [classe, badge, textoBadge] = mapa[status] || ["", "", status];
                return `
                    <div class="item-agenda ${classe}">
                        <strong>${item.horario || "--:--"}</strong>
                        <div class="item-agenda-info">
                            <div class="item-agenda-name">${item.nomeExibicao}</div>
                        </div>
                        <span class="item-agenda-badge ${badge}">${textoBadge}</span>
                    </div>`;
            }).join("");
        }

        // RESUMO DO MÊS — mesmas sessões e status da página Sessões,
        // contando tudo que tem data dentro do mês atual
        let realizadas = 0, agendadas = 0, andamento = 0, canceladas = 0, semData = 0;
        const mesAtual = hojeFormatado.slice(0, 7); // "AAAA-MM"

        todasSessoes.forEach(sessao => {
            const status = (sessao.status || "").trim().toLowerCase();

            if (!sessao.data) {
                // sessão ainda sem data marcada: não dá para saber de que mês é
                if (status === "agendada") semData++;
                return;
            }
            if (!sessao.data.startsWith(mesAtual)) return;

            if (status === "realizada") realizadas++;
            else if (status === "agendada") agendadas++;
            else if (status === "andamento") andamento++;
            else if (status === "cancelada") canceladas++;
        });

        const nomeMes = agora.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
        document.getElementById("resumoMesNome").textContent =
            nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1); // "Setembro de 2026"
        document.getElementById("resumoRealizadas").textContent = realizadas;
        document.getElementById("resumoAgendadas").textContent = agendadas;
        document.getElementById("resumoAndamento").textContent = andamento;
        document.getElementById("resumoCanceladas").textContent = canceladas;

        const avisoSemData = document.getElementById("resumoSemData");
        if (semData > 0) {
            avisoSemData.textContent = semData === 1
                ? "+ 1 sessão agendada ainda sem data definida."
                : `+ ${semData} sessões agendadas ainda sem data definida.`;
            avisoSemData.style.display = "block";
        } else {
            avisoSemData.style.display = "none";
        }
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