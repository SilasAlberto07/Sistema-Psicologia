
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
});

btnGerar.addEventListener("click", () => {

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
