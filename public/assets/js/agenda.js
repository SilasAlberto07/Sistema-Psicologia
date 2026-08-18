document.addEventListener("DOMContentLoaded", () => {

    function formatarDataBR(data) {
        const [ano, mes, dia] = data.split("-");
        return `${dia}/${mes}/${ano}`;
    }

    /* =========================
       ELEMENTOS
    ========================= */

    const calendarioEl = document.getElementById("calendario");
    const mesAnoEl = document.getElementById("mesAno");
    const agendaEl = document.querySelector(".agendaDia");
    const dataSelecionadaEl = document.getElementById("dataSelecionada");
    const qtdPacientesEl = document.getElementById("quantidadePacientes");

    const btnAnterior = document.getElementById("btnAnterior");
    const btnProximo = document.getElementById("btnProximo");


    /* =========================
       ESTADO
    ========================= */

    let dataAtual = new Date();
    let diaSelecionado = null;

    let datasComSessao = new Set(); // 👈 IMPORTANTE

    const meses = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    /* =========================
       BUSCAR SESSÕES
    ========================= */

    async function getDatasComSessao() {
        const pacientes = JSON.parse(await window.storage.getItem("pacientes")) || [];

        const datas = new Set();

        pacientes.forEach(p => {
            // 1ª Consulta também conta como dia com sessão
            if (p.consulta && p.consulta.data) {
                datas.add(p.consulta.data);
            }

            (p.sessoes || []).forEach(s => {
                if (s.data) {
                    datas.add(s.data);
                }
            });
        });

        return datas;
    }

    /* =========================
       GERAR CALENDÁRIO
    ========================= */

    async function renderCalendario() {

        calendarioEl.innerHTML = "";

        const ano = dataAtual.getFullYear();
        const mes = dataAtual.getMonth();

        mesAnoEl.textContent = `${meses[mes]} ${ano}`;

        const primeiroDia = new Date(ano, mes, 1);
        const ultimoDia = new Date(ano, mes + 1, 0);

        const inicioSemana = primeiroDia.getDay();
        const totalDias = ultimoDia.getDate();

        // atualiza datas com sessão
        datasComSessao = await getDatasComSessao();

        // espaços vazios
        for (let i = 0; i < inicioSemana; i++) {
            const vazio = document.createElement("div");
            vazio.classList.add("dia-vazio");
            calendarioEl.appendChild(vazio);
        }

        // dias
        for (let dia = 1; dia <= totalDias; dia++) {

            const div = document.createElement("div");
            div.classList.add("dia");
            div.textContent = dia;

            const dataFormatada =
                `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;

            if (datasComSessao.has(dataFormatada)) {
                div.classList.add("dia-com-sessao");
            }

            div.addEventListener("click", async () => {

                document.querySelectorAll(".dia")
                    .forEach(d => d.classList.remove("dia-selecionado"));

                div.classList.add("dia-selecionado");

                diaSelecionado = dataFormatada;

                await renderAgendaDia(dataFormatada);
            });

            calendarioEl.appendChild(div);
        }
    }

    /* =========================
       GERAR HORÁRIOS
    ========================= */

    function gerarHorarios(inicio, fim, intervalo) {

        const horarios = [];

        const [h1, m1] = inicio.split(":").map(Number);
        const [h2, m2] = fim.split(":").map(Number);

        const atual = new Date();
        atual.setHours(h1, m1, 0, 0);

        const limite = new Date();
        limite.setHours(h2, m2, 0, 0);

        while (atual <= limite) {

            const h = String(atual.getHours()).padStart(2, "0");
            const m = String(atual.getMinutes()).padStart(2, "0");

            horarios.push(`${h}:${m}`);

            atual.setMinutes(atual.getMinutes() + intervalo);
        }

        return horarios;
    }

    /* =========================
       RENDER AGENDA DO DIA
    ========================= */

    async function renderAgendaDia(data) {

        agendaEl.innerHTML = "";

        const pacientes = JSON.parse(await window.storage.getItem("pacientes")) || [];

        let sessoes = [];

        pacientes.forEach(p => {

            // 1ª Consulta também aparece na agenda do dia
            if (p.consulta && p.consulta.data && p.consulta.hora) {
                sessoes.push({
                    paciente: p.nomeCompleto,
                    data: p.consulta.data,
                    horario: p.consulta.hora,
                    tipo: "consulta"
                });
            }

            (p.sessoes || []).forEach(s => {
                if (s.data && s.hora) {
                    sessoes.push({
                        paciente: p.nomeCompleto,
                        data: s.data,
                        horario: s.hora,
                        tipo: "sessao"
                    });
                }
            });
        });

        const sessoesDoDia = sessoes.filter(s => s.data === data);

        dataSelecionadaEl.textContent = formatarDataBR(data);
        qtdPacientesEl.textContent = sessoesDoDia.length;

        const horarios = gerarHorarios("07:00", "20:00", 15);

        horarios.forEach(horario => {

            const sessao = sessoesDoDia.find(s => s.horario === horario);

            const div = document.createElement("div");
            div.classList.add("horario-item");

            if (sessao) {
                div.classList.add("ocupado-bg");
                const rotulo = sessao.tipo === "consulta"
                    ? `${sessao.paciente} <span class="badge-consulta-mini">1ª Consulta</span>`
                    : sessao.paciente;
                div.innerHTML = `<span>${horario}</span><span>${rotulo}</span>`;
            } else {
                div.classList.add("livre-bg");
                div.innerHTML = `<span>${horario}</span><span>Livre</span>`;
            }

            agendaEl.appendChild(div);
        });
    }

    /* =========================
       MUDAR MÊS
    ========================= */

    btnAnterior.addEventListener("click", async () => {
        dataAtual.setMonth(dataAtual.getMonth() - 1);
        await renderCalendario();
    });

    btnProximo.addEventListener("click", async () => {
        dataAtual.setMonth(dataAtual.getMonth() + 1);
        await renderCalendario();
    });
    mesAnoEl.addEventListener("click", () => {

        // 1. TOGGLE: se o seletor já existe na tela, remove e para aqui.
        //    getElementById retorna null se não achar — por isso o "if"
        const jaExiste = document.getElementById("seletorMes");
        if (jaExiste) {
            jaExiste.remove(); // remove do DOM
            return;           // para aqui (não recria)
        }

        // 2. CRIA o container do seletor (ainda não aparece na tela)
        const seletor = document.createElement("div");
        seletor.id = "seletorMes";
        seletor.className = "seletor-mes-popup"; // classe pro CSS

        // 3. CRIA o input do ANO
        //    O valor inicial é o ano que está sendo exibido no calendário
        const inputAno = document.createElement("input");
        inputAno.type = "number";
        inputAno.value = dataAtual.getFullYear(); // pega o ano atual
        inputAno.className = "seletor-ano-input";
        seletor.appendChild(inputAno);

        // 4. CRIA os 12 botões de mês
        //    meses[] já existe no teu código — aqui iteramos com forEach
        const gridMeses = document.createElement("div");
        gridMeses.className = "seletor-grid";

        meses.forEach((nomeMes, indice) => {

            const btn = document.createElement("button");
            btn.textContent = nomeMes.slice(0, 3); // "Jan", "Fev"...
            btn.className = "seletor-btn-mes";

            // destaca o mês que está selecionado agora
            if (indice === dataAtual.getMonth()) {
                btn.classList.add("ativo");
            }

            // quando clicar num mês:
            //   1. pega o ano que está no input
            //   2. atualiza o dataAtual
            //   3. redesenha o calendário
            //   4. fecha o seletor
            btn.addEventListener("click", async () => {
                dataAtual.setFullYear(Number(inputAno.value));
                dataAtual.setMonth(indice);
                await renderCalendario();
                seletor.remove();
            });

            gridMeses.appendChild(btn);
        });

        seletor.appendChild(gridMeses);

        // 5. INSERE o seletor logo depois do h2 (calendário-header já é o pai)
        mesAnoEl.parentElement.appendChild(seletor);
    });



    async function iniciarAgenda() {
        await renderCalendario();

        const hoje = new Date();
        const hojeFormatado =
            `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;

        await renderAgendaDia(hojeFormatado);
    }

    iniciarAgenda();
});