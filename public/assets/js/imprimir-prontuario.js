const params = new URLSearchParams(window.location.search);
const idPaciente = params.get("id");
const pessoaParam = params.get("pessoa"); // "p1" | "p2" | null
const nomeParam = params.get("nome");
const tipoParam = params.get("tipo");     // "consulta" quando é o registro da 1ª Consulta
const modoRelatorioAlta = params.get("relatorio") === "alta"; // aberto pela página "Altas"

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

    if (modoRelatorioAlta) {

        // RELATÓRIO DE ALTA: o tratamento inteiro, com todos os registros
        if (ehCasal) {
            nomeExibicao = `${paciente.p1NomeCompleto || "?"} e ${paciente.p2NomeCompleto || "?"}`;
            const telefones = [paciente.p1Telefone, paciente.p2Telefone].filter(Boolean);
            telefoneExibicao = telefones.join(" / ");
        } else {
            nomeExibicao = paciente.nomeCompleto;
            telefoneExibicao = paciente.telefone;
        }

    } else if (ehCasal && (pessoaParam === "p1" || pessoaParam === "p2")) {

        const outraPessoa = pessoaParam === "p1" ? "p2" : "p1";

        nomeExibicao = paciente[`${pessoaParam}NomeCompleto`] || nomeParam || "-";
        telefoneExibicao = paciente[`${pessoaParam}Telefone`];

        const nomeParceiro = paciente[`${outraPessoa}NomeCompleto`];
        if (nomeParceiro) {
            camposExtraCasal = item("Cônjuge / Parceiro(a): ", nomeParceiro);
        }

        // imprime as evoluções dessa pessoa + a 1ª Consulta (compartilhada entre os dois)
        evolucoesParaImprimir = evolucoesParaImprimir.filter(e =>
            e.pessoa === pessoaParam || e.tipo === "consulta" || (!e.pessoa && !e.tipo)
        );

    } else if (ehCasal) {

        // registro conjunto (ex.: 1ª consulta) — mostra os dois nomes e
        // SOMENTE as evoluções que não têm pessoa marcada (não mistura
        // com as sessões individuais de p1/p2)
        nomeExibicao = `${paciente.p1NomeCompleto || "?"} e ${paciente.p2NomeCompleto || "?"}`;
        telefoneExibicao = paciente.telefoneSelecionado || paciente.p1Telefone || paciente.p2Telefone;

        evolucoesParaImprimir = evolucoesParaImprimir.filter(e => e.tipo === "consulta" || (!e.pessoa && !e.tipo));

    } else {
        nomeExibicao = paciente.nomeCompleto;
        telefoneExibicao = paciente.telefone;

        if (tipoParam === "consulta") {
            // veio da linha da 1ª Consulta: mostra só ela, nada das sessões numeradas
            evolucoesParaImprimir = evolucoesParaImprimir.filter(e => e.tipo === "consulta");
        }
        // senão (veio de uma sessão normal): mostra tudo, incluindo a 1ª consulta compartilhada
    }

    const evolucoes = evolucoesParaImprimir;

    let sessoesHTML = "";
    let contador = 0;

    evolucoes.forEach((registro) => {

        const ehConsulta = registro.tipo === "consulta" || (!registro.pessoa && !registro.tipo && ehCasal);

        let rotuloHTML = ehConsulta
            ? `<span class="sessao-numero" style="background:#5c7a48;">📋 1ª Consulta</span>`
            : `<span class="sessao-numero">Sessão ${String(++contador).padStart(2, "0")}</span>`;

        // no relatório de alta do casal, mostra de quem é cada sessão individual
        if (modoRelatorioAlta && ehCasal && (registro.pessoa === "p1" || registro.pessoa === "p2")) {
            const nomePessoa = paciente[`${registro.pessoa}NomeCompleto`] || (registro.pessoa === "p1" ? "Pessoa 1" : "Pessoa 2");
            rotuloHTML += ` <span class="sessao-data">— ${nomePessoa}</span>`;
        }

        sessoesHTML += `
        <div class="sessao-bloco">

            <div class="sessao-cabecalho">
                ${rotuloHTML}
                <span class="sessao-data">${registro.data || "-"}</span>
            </div>

            <div class="campo-impresso">
                <strong>Relato da Sessão</strong>
                <span>${registro.relato && String(registro.relato).trim() ? registro.relato : "-"}</span>
            </div>

            <div class="campo-impresso">
                <strong>Evolução da Sessão</strong>
                <span>${registro.texto && String(registro.texto).trim() ? registro.texto : "-"}</span>
            </div>

            <div class="campo-impresso">
                <strong>Plano de Ação</strong>
                <span>${registro.plano && String(registro.plano).trim() ? registro.plano : "-"}</span>
            </div>

        </div>
    `;
    });

    // ----- resumo do tratamento (só no relatório de alta) -----
    let resumoAltaHTML = "";
    if (modoRelatorioAlta) {
        const todasSessoes = [paciente.consulta, ...(paciente.sessoes || [])].filter(Boolean);
        const realizadas = todasSessoes.filter(s => s.status === "realizada").length;
        const canceladas = todasSessoes.filter(s => s.status === "cancelada").length;

        resumoAltaHTML = `
        <h2 class="titulo-secao">Resumo do Tratamento</h2>
        <div class="identificacao-grid">
            ${item("Início do atendimento: ", paciente.dataCadastro || formatarDataBR(paciente.consulta && paciente.consulta.data))}
            ${item("Data da alta: ", paciente.altaEm ? formatarDataBR(paciente.altaEm) : "")}
            ${item("Sessões realizadas: ", String(realizadas))}
            ${item("Sessões canceladas: ", String(canceladas))}
            ${item("Modalidade: ", paciente.tipoConsulta && paciente.tipoConsulta !== "-" ? paciente.tipoConsulta : "")}
            ${item("Registros no prontuário: ", String(evolucoes.length))}
            ${item("Motivo / observações da alta: ", paciente.altaObs, true)}
        </div>
        `;
    }

    container.innerHTML = `
    <div class="prontuario">

        <img class="marca-dagua" src="../assets/img/logo-marca-dagua.png" alt="">

        <div class="tag-confidencial">Confidencial</div>

        <div class="cabecalho-print">
            <div class="clinica-nome">Cláudia Bethânia — Psicóloga Clínica</div>
            <div class="subtitulo-clinica">CRP 18/9851</div>
            <h1>${modoRelatorioAlta ? "Relatório de Alta" : "Ficha de Prontuário Psicológica"}</h1>
            
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

        ${resumoAltaHTML}

        <h2 class="titulo-secao">${modoRelatorioAlta ? "O que foi trabalhado nas sessões" : "Registro de Sessões"}</h2>

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
}

iniciarImpressaoProntuario().then(() => {

    const visualizar = params.get("visualizar");

    if (visualizar !== "true") {
        window.print();
    } else if (modoRelatorioAlta) {
        // barra com o botão de imprimir / salvar PDF (não sai na impressão)
        document.title = "Relatório de Alta";
        const barra = document.createElement("div");
        barra.className = "barra-acoes-tela";
        barra.innerHTML = `
            <button type="button" id="btnImprimirRelatorio">🖨️ Imprimir / Salvar PDF</button>
            <button type="button" id="btnFecharRelatorio" class="secundario">Fechar</button>
        `;
        document.body.prepend(barra);
        document.getElementById("btnImprimirRelatorio").addEventListener("click", () => window.print());
        document.getElementById("btnFecharRelatorio").addEventListener("click", () => window.close());
    }

});