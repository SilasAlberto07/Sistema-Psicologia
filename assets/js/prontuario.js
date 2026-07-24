const params = new URLSearchParams(window.location.search);
const idPaciente = params.get("id");

function formatarDataBR(data) {
    if (!data) return "-";
    const [ano, mes, dia] = data.split("-");
    return `${dia}/${mes}/${ano}`;
}

function carimboGeracao() {
    const agora = new Date();
    const data = agora.toLocaleDateString("pt-BR");
    const hora = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return `Documento gerado eletronicamente em ${data} às ${hora}`;
}

function capitalizar(texto) {
    if (!texto) return texto;
    return String(texto).charAt(0).toUpperCase() + String(texto).slice(1);
}

function item(rotulo, valor, full = false) {
    return `
        <div class="item${full ? " full" : ""}">
            <span class="rotulo">${rotulo}</span>
            <span class="valor">${valor && String(valor).trim() ? valor : "-"}</span>
        </div>
    `;
}

const container = document.getElementById("conteudo-impressao");

async function iniciarVisualizacaoProntuario() {

    let pacientes = JSON.parse(await window.storage.getItem("pacientes")) || [];
    let casais = JSON.parse(await window.storage.getItem("casais")) || [];

    const paciente = pacientes.find(p => String(p.id) === String(idPaciente));
    const casal = casais.find(c => String(c.id) === String(idPaciente));

    const registro = paciente || casal;
    const ehCasal = !!casal;

    if (!registro) {
        container.innerHTML = "<h1>Paciente não encontrado</h1>";
        return;
    }

    const evolucoes = registro.evolucoes || [];

    let linhasHTML = "";

    evolucoes.forEach((evolucao, index) => {
        linhasHTML += `
        <tr>
            <td class="centro">${String(index + 1).padStart(2, "0")}</td>
            <td class="centro">${evolucao.data}</td>
            <td>${evolucao.texto || "-"}</td>
            <td>${evolucao.plano || "-"}</td>
        </tr>
    `;
    });

    // ===== Identificação: individual ou casal =====
    const identificacaoHTML = ehCasal
        ? `
            ${item("Pessoa 1: ", registro.p1NomeCompleto, true)}
            ${item("Data de nascimento (P1): ", formatarDataBR(registro.p1DataNascimento))}
            ${item("Idade (P1): ", registro.p1Idade)}
            ${item("Telefone (P1): ", registro.p1Telefone)}

            ${item("Pessoa 2: ", registro.p2NomeCompleto, true)}
            ${item("Data de nascimento (P2): ", formatarDataBR(registro.p2DataNascimento))}
            ${item("Idade (P2): ", registro.p2Idade)}
            ${item("Telefone (P2): ", registro.p2Telefone)}

            ${item("Tipo de relacionamento: ", registro.tipoRelacionamento)}
            ${item("Início do relacionamento: ", formatarDataBR(registro.inicioRelacionamento))}
        `
        : `
            ${item("Nome do paciente: ", registro.nomeCompleto, true)}
            ${item("Data de nascimento: ", formatarDataBR(registro.dataNascimento))}
            ${item("Idade: ", registro.idade)}
            ${item("Sexo: ", capitalizar(registro.sexo))}
            ${item("Estado civil: ", registro.estadoCivil)}
            ${item("Profissão: ", registro.profissao)}
            ${item("Telefone: ", registro.telefone)}
        `;

    const tituloFicha = ehCasal
        ? "Ficha de Prontuário Psicológica — Casal"
        : "Ficha de Prontuário Psicológica";

    container.innerHTML = `
        <div class="prontuario">

            <img class="marca-dagua" src="../assets/img/logo-marca-dagua.png" alt="">

            <div class="cabecalho-print">
                <div class="clinica-nome">Cláudia Bethânia — Psicóloga Clínica</div>
                <div class="subtitulo-clinica">CRP 18/9851</div>
                <h1>${tituloFicha}</h1>

            </div>

            <div class="identificacao-grid">
                ${identificacaoHTML}
            </div>

            <h2 class="titulo-secao">Evolução das Sessões</h2>

            <table class="tabela-impressa">
                <thead>
                    <tr>
                        <th style="width:60px">Sessão</th>
                        <th style="width:100px">Data/Hora</th>
                        <th>Evolução da sessão</th>
                        <th>Plano de ação</th>
                    </tr>
                </thead>
                <tbody>
                    ${linhasHTML || `<tr><td colspan="4" class="centro">Nenhum registro de evolução</td></tr>`}
                </tbody>
            </table>

            <div class="assinatura">
                <div class="linha-assinatura"></div>
                <h3>Dra. Cláudia Bethânia</h3>
                <p>Psicóloga Clínica — CRP: 18/9851</p>
            </div>

            <div class="rodape-contato">
                maclaudiabethaniapsicologa@gmail.com · (66) 99689-4144 · @psiclaudiabethania_
            </div>

            <div class="timestamp-impressao">${carimboGeracao()}</div>
        </div>
    `;
}

iniciarVisualizacaoProntuario();