const params = new URLSearchParams(window.location.search);
const idPaciente = params.get("id");
const pessoaParam = params.get("pessoa"); // "p1" | "p2" | null
const nomeParam = params.get("nome");

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

async function iniciarImpressaoProntuario() {

    let pacientes = JSON.parse(await window.storage.getItem("pacientes")) || [];
    let casais = JSON.parse(await window.storage.getItem("casais")) || [];

    let paciente = pacientes.find(p => String(p.id) === String(idPaciente));
    let ehCasal = false;

    if (!paciente) {
        paciente = casais.find(c => String(c.id) === String(idPaciente));
        ehCasal = !!paciente;
    }

    if (!paciente) {
        container.innerHTML = "<h1>Paciente não encontrado</h1>";
        return;
    }

    // ----- define nome, telefone e evoluções a exibir -----

    let nomeExibicao;
    let telefoneExibicao;
    let camposExtraCasal = "";
    let evolucoesParaImprimir = paciente.evolucoes || [];

    if (ehCasal && (pessoaParam === "p1" || pessoaParam === "p2")) {

        const outraPessoa = pessoaParam === "p1" ? "p2" : "p1";

        nomeExibicao = paciente[`${pessoaParam}NomeCompleto`] || nomeParam || "-";
        telefoneExibicao = paciente[`${pessoaParam}Telefone`];

        const nomeParceiro = paciente[`${outraPessoa}NomeCompleto`];
        if (nomeParceiro) {
            camposExtraCasal = item("Cônjuge / Parceiro(a): ", nomeParceiro);
        }

        // só imprime as evoluções marcadas para essa pessoa
        evolucoesParaImprimir = evolucoesParaImprimir.filter(e => e.pessoa === pessoaParam);

    } else if (ehCasal) {

        // registro conjunto (ex.: 1ª consulta) — mostra os dois nomes e tudo que não tem pessoa marcada
        nomeExibicao = `${paciente.p1NomeCompleto || "?"} e ${paciente.p2NomeCompleto || "?"}`;
        telefoneExibicao = paciente.telefoneSelecionado || paciente.p1Telefone || paciente.p2Telefone;

    } else {
        nomeExibicao = paciente.nomeCompleto;
        telefoneExibicao = paciente.telefone;
    }

    const evolucoes = evolucoesParaImprimir;

    let sessoesHTML = "";

    evolucoes.forEach((registro, index) => {
        sessoesHTML += `
        <div class="sessao-bloco">

            <div class="sessao-cabecalho">
                <span class="sessao-numero">Sessão ${String(index + 1).padStart(2, "0")}</span>
                <span class="sessao-data">${registro.data || "-"}</span>
            </div>

            <div class="campo-impresso">
                <strong>Relato da Sessão</strong>
                <span>${registro.relato && String(registro.relato).trim() ? registro.relato : "-"}</span>
            </div>

            <div class="campo-impresso">
                <strong>Evolução / Impressão Clínica</strong>
                <span>${registro.texto && String(registro.texto).trim() ? registro.texto : "-"}</span>
            </div>

            <div class="campo-impresso">
                <strong>Plano de Ação</strong>
                <span>${registro.plano && String(registro.plano).trim() ? registro.plano : "-"}</span>
            </div>

        </div>
    `;
    });

    container.innerHTML = `
    <div class="prontuario">

        <img class="marca-dagua" src="../assets/img/logo-marca-dagua.png" alt="">

        <div class="tag-confidencial">Confidencial</div>

        <div class="cabecalho-print">
            <div class="clinica-nome">Cláudia Bethânia — Psicóloga Clínica</div>
            <div class="subtitulo-clinica">CRP 18/9851</div>
            <h1>Ficha de Prontuário Psicológica</h1>
            
        </div>

        <div class="identificacao-grid">
            ${item("Nome do paciente: ", nomeExibicao, true)}
            ${!ehCasal ? item("Data de nascimento: ", formatarDataBR(paciente.dataNascimento)) : ""}
            ${!ehCasal ? item("Idade: ", paciente.idade) : ""}
            ${!ehCasal ? item("Sexo: ", capitalizar(paciente.sexo)) : ""}
            ${!ehCasal ? item("Estado civil: ", paciente.estadoCivil) : ""}
            ${!ehCasal ? item("Profissão: ", paciente.profissao) : ""}
            ${item("Telefone: ", telefoneExibicao)}
            ${camposExtraCasal}
        </div>

        <h2 class="titulo-secao">Registro de Sessões</h2>

        ${sessoesHTML || `<p class="sem-registro">Nenhum registro de sessão até o momento.</p>`}

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

    window.print();
}

iniciarImpressaoProntuario();