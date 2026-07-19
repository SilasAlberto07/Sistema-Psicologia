const params = new URLSearchParams(window.location.search);
const idPaciente = params.get("id");

function formatarDataBR(data) {
    if (!data) return "-";
    const partes = data.split("-");
    if (partes.length !== 3) return data;
    const [ano, mes, dia] = partes;
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

function campo(titulo, valor) {
    return `
        <div class="campo-impresso">
            <strong>${titulo}</strong>
            <span>${valor && valor.trim() ? valor : "-"}</span>
        </div>
    `;
}

const container = document.getElementById("conteudo-impressao");

async function iniciarVisualizacaoAnamnese() {


    let pacientes = JSON.parse(await window.storage.getItem("pacientes")) || [];
    const paciente = pacientes.find(p => String(p.id) === String(idPaciente));

    if (!paciente || Array.isArray(paciente.anamnese) || !paciente.anamnese) {
        container.innerHTML = "<h1>Nenhuma ficha de anamnese preenchida para este paciente</h1>";
    } else {

        const a = paciente.anamnese;
        const idade = Number(paciente.idade);
        const menorDeIdade = !isNaN(idade) && idade < 18;

        let secaoAdolescenteHTML = "";

        if (menorDeIdade) {
            secaoAdolescenteHTML = `
            <h2 class="titulo-secao">Dados Familiares e Desenvolvimento</h2>
            ${campo("Nome do Pai: ", a.nomePai)}
            ${campo("Nome da Mãe: ", a.nomeMae)}
            ${campo("Irmãos (idades): ", a.irmaos)}
            ${campo("Como a família lida com a queixa: ", a.familiaLidaQueixa)}
            ${campo("História pré/perinatal e condições do parto: ", a.desenvolvimentoParto)}
            ${campo("Desenvolvimento motor: ", a.desenvolvimentoMotor)}
            ${campo("Desenvolvimento socioemocional: ", a.desenvolvimentoSocioemocional)}

            <h2 class="titulo-secao">História Escolar</h2>
            ${campo("Adaptação e desempenho escolar: ", a.escolaDesempenho)}
            ${campo("Dificuldades de aprendizagem: ", a.escolaDificuldades)}
        `;
        }

        container.innerHTML = `
        <div class="prontuario">

            <img class="marca-dagua" src="../assets/img/logo-marca-dagua.png" alt="">

            <div class="cabecalho-print">
                <div class="clinica-nome">Cláudia Bethânia — Psicóloga Clínica</div>
                <div class="subtitulo-clinica">CRP 18/9851</div>
                <h1>Ficha de Anamnese ${menorDeIdade ? "— Adolescente" : "— Adulto"}</h1>
                
            </div>

            <div class="identificacao-grid">
                ${item("Nome: ", paciente.nomeCompleto, true)}
                ${item("Data/Hora da entrevista: ", `${formatarDataBR(a.dataAnamnese)} ${a.horaAnamnese || ""}`.trim())}
                ${item("Data de nascimento: ", formatarDataBR(paciente.dataNascimento))}
                ${item("Idade: ", paciente.idade)}
                ${item("Sexo: ", capitalizar(paciente.sexo))}
                ${item("Estado civil: ", paciente.estadoCivil)}
                ${item("Profissão: ", paciente.profissao)}
                ${item("Telefone: ", paciente.telefone)}
            </div>

            <h2 class="titulo-secao">Queixa e Diagnóstico</h2>
            ${campo("Queixa principal: ", a.queixaPrincipal)}
            ${campo("Tem diagnóstico: ", a.temDiagnostico)}
            ${campo("Faz uso de medicação: ", a.usoMedicacao)}

            <h2 class="titulo-secao">História da Queixa Atual</h2>
            ${campo("Quando os sintomas iniciaram: ", a.queixaInicio)}
            ${campo("Como os sintomas se manifestam: ", a.queixaManifestacao)}
            ${campo("Situações que intensificam ou diminuem: ", a.queixaSituacoes)}
            ${campo("Pensamentos e emoções associados: ", a.queixaPensamentos)}
            ${campo("Ajuda profissional anterior: ", a.queixaAjudaAnterior)}

            <h2 class="titulo-secao">Histórico Pessoal</h2>
            ${campo("Infância e adolescência: ", a.historicoInfancia)}
            ${campo("Autodescrição: ", a.autodescricao)}
            ${campo("Hobbies e lazer: ", a.hobbies)}
            ${campo("Doença grave ou cirurgia: ", a.doencaGrave)}
            ${campo("Medicações contínuas: ", a.medicacaoContinua)}
            ${campo("Tabagismo, álcool ou outras drogas: ", a.habitos)}

            <h2 class="titulo-secao">Histórico Familiar</h2>
            ${campo("Relação com familiares: ", a.relacaoFamiliares)}
            ${campo("Doenças psicológicas na família: ", a.doencasFamilia)}

            <h2 class="titulo-secao">Condições Socioeconômicas</h2>
            ${campo("Trabalho / Estudos: ", a.trabalhoEstudos)}
            ${campo("Situação financeira atual: ", a.situacaoFinanceira)}

            <h2 class="titulo-secao">Histórico de Saúde Mental</h2>
            ${campo("Diagnóstico psicológico anterior: ", a.diagnosticoAnterior)}
            ${campo("Acompanhamento anterior: ", a.acompanhamentoAnterior)}
            ${campo("Medicações psicotrópicas: ", a.medicacaoPsicotropica)}

            ${secaoAdolescenteHTML}

            <h2 class="titulo-secao">Observações</h2>
            ${campo("Algo mais a acrescentar: ", a.observacoesAdicionais)}
            ${campo("Observações do entrevistador: ", a.observacoesEntrevistador)}

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
}

iniciarVisualizacaoAnamnese();