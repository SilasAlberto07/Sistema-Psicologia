
const inputPaciente = document.getElementById("inputPaciente");
const listaPacientes = document.getElementById("listaPacientes");
const tipoDocumento = document.getElementById("tipoDocumento");
const camposDeclaracao = document.getElementById("camposDeclaracao");
const camposAtestado = document.getElementById("camposAtestado");
const btnGerar = document.getElementById("btnGerar");

let pacientes = [];
let casais = [];

// liga o texto exibido no campo (que o usuário digita/seleciona) ao
// registro real (paciente individual ou pessoa de um casal)
let mapaOpcoes = {};

// popula o datalist: pacientes individuais + cada pessoa de um casal, separadamente
async function iniciarDocumentos() {

    pacientes = JSON.parse(await window.storage.getItem("pacientes")) || [];
    casais = JSON.parse(await window.storage.getItem("casais")) || [];

    const pacientesAtivos = pacientes.filter(p => !p.excluido);
    const casaisAtivos = casais.filter(c => !c.excluido);

    listaPacientes.innerHTML = "";
    mapaOpcoes = {};

    pacientesAtivos.forEach(p => {

        const label = `${p.nomeCompleto} — Paciente (${p.id})`;
        mapaOpcoes[label] = { origem: "individual", id: p.id };

        const opt = document.createElement("option");
        opt.value = label;
        listaPacientes.appendChild(opt);
    });

    casaisAtivos.forEach(c => {

        if (c.p1NomeCompleto) {
            const label1 = `${c.p1NomeCompleto} — Casal com ${c.p2NomeCompleto || "?"} (${c.id})`;
            mapaOpcoes[label1] = { origem: "casal", id: c.id, pessoa: "p1" };

            const opt1 = document.createElement("option");
            opt1.value = label1;
            listaPacientes.appendChild(opt1);
        }

        if (c.p2NomeCompleto) {
            const label2 = `${c.p2NomeCompleto} — Casal com ${c.p1NomeCompleto || "?"} (${c.id})`;
            mapaOpcoes[label2] = { origem: "casal", id: c.id, pessoa: "p2" };

            const opt2 = document.createElement("option");
            opt2.value = label2;
            listaPacientes.appendChild(opt2);
        }
    });
}

// alterna campos conforme tipo de documento
tipoDocumento.addEventListener("change", () => {
    const tipo = tipoDocumento.value;
    camposDeclaracao.style.display = tipo === "declaracao" ? "block" : "none";
    camposAtestado.style.display = tipo === "atestado" ? "block" : "none";
    camposContrato.style.display = tipo === "contrato" ? "block" : "none";
    if (tipo === "contrato") preencherPacienteContrato();
});

// ==========================================
// CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE PSICOTERAPIA
// ==========================================
const camposContrato = document.getElementById("camposContrato");
const CHAVE_DADOS_CONTRATO = "contratoPadroes"; // dados da psicóloga e valores, lembrados para o próximo contrato

const PADROES_CONTRATO = {
    psiNome: "Cláudia Bethânia",
    psiCrp: "18/9851",
    psiCpf: "",
    psiEndereco: "",
    psiEmail: "maclaudiabethaniapsicologa@gmail.com",
    psiTelefone: "(66) 99689-4144",
    servicos: "Avaliação Psicológica (Vocacional)\nPsicoterapia individual para adolescentes e adultos\nIntervenções breves focadas em soluções",
    valor: "",
    formasPagamento: "transferência bancária, PIX ou dinheiro vivo",
    prazoPagamento: "até 2 horas antes da sessão",
    duracao: "",
    periodicidade: "",
    multa: "500,00",
    foro: "Sinop-MT"
};

// [chave nos dados, id do campo, obrigatório?, nome para a mensagem]
const CAMPOS_CONTRATO = [
    ["psiNome", "ctPsiNome", true, "nome da psicóloga"],
    ["psiCrp", "ctPsiCrp", true, "CRP"],
    ["psiCpf", "ctPsiCpf", true, "CPF da psicóloga"],
    ["psiEndereco", "ctPsiEndereco", true, "endereço do atendimento"],
    ["psiEmail", "ctPsiEmail", false],
    ["psiTelefone", "ctPsiTelefone", false],
    ["pacNome", "ctPacNome", true, "nome do(a) paciente"],
    ["pacCpf", "ctPacCpf", true, "CPF do(a) paciente"],
    ["pacEndereco", "ctPacEndereco", true, "endereço do(a) paciente"],
    ["pacEmail", "ctPacEmail", false],
    ["pacTelefone", "ctPacTelefone", false],
    ["servicos", "ctServicos", true, "serviços oferecidos"],
    ["valor", "ctValor", true, "valor da sessão"],
    ["formasPagamento", "ctFormasPagamento", true, "formas de pagamento"],
    ["prazoPagamento", "ctPrazoPagamento", true, "prazo do pagamento"],
    ["duracao", "ctDuracao", true, "duração da sessão"],
    ["periodicidade", "ctPeriodicidade", true, "periodicidade"],
    ["multa", "ctMulta", true, "multa por gravação"],
    ["foro", "ctForo", true, "foro"],
    ["data", "ctData", true, "data do contrato"]
];

// chaves que são lembradas para o próximo contrato (tudo, menos os dados do paciente e a data)
const CHAVES_LEMBRADAS = Object.keys(PADROES_CONTRATO);

function hojeISO() {
    const agora = new Date();
    return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-${String(agora.getDate()).padStart(2, "0")}`;
}

async function carregarPadroesContrato() {
    let salvos = {};
    try { salvos = JSON.parse(await window.storage.getItem(CHAVE_DADOS_CONTRATO)) || {}; } catch (e) { }
    const valores = { ...PADROES_CONTRATO, ...salvos };
    CAMPOS_CONTRATO.forEach(([chave, id]) => {
        if (valores[chave] !== undefined) document.getElementById(id).value = valores[chave];
    });
    document.getElementById("ctData").value = hojeISO();
}

function montarEndereco(r, prefixo = "") {
    const pegar = (campo) => String(r[`${prefixo}${campo}`] || r[campo] || "").trim();
    const rua = [pegar("endereco"), pegar("numero")].filter(Boolean).join(", ");
    return [rua, pegar("complemento"), pegar("bairro"), pegar("cidadeUf"), pegar("cep") ? `CEP ${pegar("cep")}` : ""]
        .filter(Boolean).join(" - ");
}

// ao escolher o paciente, completa nome / CPF / endereço / e-mail / telefone do contrato
function preencherPacienteContrato() {
    const selecao = mapaOpcoes[inputPaciente.value.trim()];
    if (!selecao) return;

    let dados;
    if (selecao.origem === "casal") {
        const casal = casais.find(c => String(c.id) === String(selecao.id));
        if (!casal) return;
        const p = selecao.pessoa;
        dados = {
            pacNome: casal[`${p}NomeCompleto`],
            pacCpf: casal[`${p}Cpf`],
            pacEndereco: montarEndereco(casal),
            pacEmail: casal[`${p}Email`],
            pacTelefone: casal[`${p}Telefone`]
        };
    } else {
        const paciente = pacientes.find(p => String(p.id) === String(selecao.id));
        if (!paciente) return;
        dados = {
            pacNome: paciente.nomeCompleto,
            pacCpf: paciente.cpf,
            pacEndereco: montarEndereco(paciente),
            pacEmail: paciente.email,
            pacTelefone: paciente.telefone
        };
    }

    CAMPOS_CONTRATO.forEach(([chave, id]) => {
        if (chave in dados) document.getElementById(id).value = dados[chave] || "";
    });
}

inputPaciente.addEventListener("change", () => {
    if (tipoDocumento.value === "contrato") preencherPacienteContrato();
});

async function gerarContrato() {
    const dados = { tipo: "contrato" };
    const faltando = [];

    CAMPOS_CONTRATO.forEach(([chave, id, obrigatorio, nome]) => {
        const campo = document.getElementById(id);
        dados[chave] = campo.value.trim();
        campo.classList.toggle("campo-faltando", obrigatorio && !dados[chave]);
        if (obrigatorio && !dados[chave]) faltando.push(nome);
    });

    if (faltando.length) {
        mostrarMensagem(`Preencha os campos obrigatórios: ${faltando.join(", ")}.`, "warning");
        return;
    }

    // guarda os dados da psicóloga e os valores para o próximo contrato
    const lembrar = {};
    CHAVES_LEMBRADAS.forEach(chave => { lembrar[chave] = dados[chave]; });
    await window.storage.setItem(CHAVE_DADOS_CONTRATO, JSON.stringify(lembrar));

    dados.cidadeEstado = document.getElementById("cidadeEstado").value.trim() || dados.foro;

    localStorage.setItem("contratoTemp", JSON.stringify(dados));
    window.open("imprimir-contrato.html", "_blank");
}

btnGerar.addEventListener("click", () => {

    if (tipoDocumento.value === "contrato") {
        gerarContrato();
        return;
    }

    const selecao = mapaOpcoes[inputPaciente.value.trim()];

    if (!selecao) {
        mostrarMensagem(
            "Selecione um paciente da lista de sugestões (digite o nome e clique numa opção).",
            "warning"
        );
        return;
    }

    let nomeCompleto = "";
    let cpf = "";

    if (selecao.origem === "casal") {

        const casal = casais.find(c => String(c.id) === String(selecao.id));

        if (!casal) {
            mostrarMensagem("Casal não encontrado!", "error");
            return;
        }

        nomeCompleto = selecao.pessoa === "p1"
            ? (casal.p1NomeCompleto || "-")
            : (casal.p2NomeCompleto || "-");

        cpf = (selecao.pessoa === "p1" ? casal.p1Cpf : casal.p2Cpf) || "";

    } else {

        const paciente = pacientes.find(p => String(p.id) === String(selecao.id));

        if (!paciente) {
            mostrarMensagem("Paciente não encontrado!", "error");
            return;
        }

        nomeCompleto = paciente.nomeCompleto;
        cpf = paciente.cpf || "";
    }

    const tipo = tipoDocumento.value;

    const dados = {
        tipo,
        pacienteId: selecao.id,
        nomeCompleto,
        cpf,
        cidadeEstado: document.getElementById("cidadeEstado").value.trim(),
    };

    if (tipo === "declaracao") {
        dados.data = document.getElementById("declData").value;
        dados.hora = document.getElementById("declHora").value;
        dados.endereco = document.getElementById("declEndereco").value.trim();
        dados.previsao = document.getElementById("declPrevisao").value.trim();
    } else {
        dados.data = document.getElementById("atestData").value;
        dados.duracao = document.getElementById("atestDuracao").value.trim();
        dados.motivo = document.getElementById("atestMotivo").value.trim();
    }

    localStorage.setItem("documentoTemp", JSON.stringify(dados));

    window.open("imprimir-documento.html", "_blank");
});

iniciarDocumentos();
carregarPadroesContrato();
