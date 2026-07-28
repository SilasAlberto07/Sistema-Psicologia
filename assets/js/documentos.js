
const selectPaciente = document.getElementById("selectPaciente");
const buscaPacienteDoc = document.getElementById("buscaPacienteDoc");
const tipoDocumento = document.getElementById("tipoDocumento");
const camposDeclaracao = document.getElementById("camposDeclaracao");
const camposAtestado = document.getElementById("camposAtestado");
const btnGerar = document.getElementById("btnGerar");

let pacientes = [];
let casais = [];
let pacientesAtivos = [];
let casaisAtivos = [];

// monta (ou remonta, filtrado) as opções do select de paciente
function renderOpcoesPaciente(filtro = "") {

    const termo = filtro.trim().toLowerCase();
    const valorAnterior = selectPaciente.value;

    selectPaciente.innerHTML = `<option value="">Selecione um paciente...</option>`;

    const pacientesFiltrados = pacientesAtivos.filter(p =>
        !termo || p.nomeCompleto.toLowerCase().includes(termo)
    );

    if (pacientesFiltrados.length > 0) {
        const grupoPacientes = document.createElement("optgroup");
        grupoPacientes.label = "Pacientes Individuais";

        pacientesFiltrados.forEach(p => {
            const opt = document.createElement("option");
            opt.value = `individual:${p.id}`;
            opt.textContent = `${p.nomeCompleto} (${p.id})`;
            grupoPacientes.appendChild(opt);
        });

        selectPaciente.appendChild(grupoPacientes);
    }

    const casaisComMatch = casaisAtivos
        .map(c => ({
            casal: c,
            p1Match: !termo || (c.p1NomeCompleto && c.p1NomeCompleto.toLowerCase().includes(termo)),
            p2Match: !termo || (c.p2NomeCompleto && c.p2NomeCompleto.toLowerCase().includes(termo)),
        }))
        .filter(({ p1Match, p2Match }) => p1Match || p2Match);

    if (casaisComMatch.length > 0) {
        const grupoCasais = document.createElement("optgroup");
        grupoCasais.label = "Casais (individualmente)";

        casaisComMatch.forEach(({ casal: c, p1Match, p2Match }) => {

            if (c.p1NomeCompleto && p1Match) {
                const opt1 = document.createElement("option");
                opt1.value = `casal:${c.id}:p1`;
                opt1.textContent = `${c.p1NomeCompleto} — casal com ${c.p2NomeCompleto || "?"} (${c.id})`;
                grupoCasais.appendChild(opt1);
            }

            if (c.p2NomeCompleto && p2Match) {
                const opt2 = document.createElement("option");
                opt2.value = `casal:${c.id}:p2`;
                opt2.textContent = `${c.p2NomeCompleto} — casal com ${c.p1NomeCompleto || "?"} (${c.id})`;
                grupoCasais.appendChild(opt2);
            }
        });

        selectPaciente.appendChild(grupoCasais);
    }

    // mantém a seleção atual se ela ainda estiver visível após o filtro
    if (valorAnterior && selectPaciente.querySelector(`option[value="${valorAnterior}"]`)) {
        selectPaciente.value = valorAnterior;
    }
}

// popula select de pacientes (individuais + cada pessoa de um casal, separadamente)
async function iniciarDocumentos() {

    pacientes = JSON.parse(await window.storage.getItem("pacientes")) || [];
    casais = JSON.parse(await window.storage.getItem("casais")) || [];

    pacientesAtivos = pacientes.filter(p => !p.excluido);
    casaisAtivos = casais.filter(c => !c.excluido);

    renderOpcoesPaciente();
}

buscaPacienteDoc.addEventListener("input", () => {
    renderOpcoesPaciente(buscaPacienteDoc.value);
});

// alterna campos conforme tipo de documento
tipoDocumento.addEventListener("change", () => {
    const tipo = tipoDocumento.value;
    camposDeclaracao.style.display = tipo === "declaracao" ? "block" : "none";
    camposAtestado.style.display = tipo === "atestado" ? "block" : "none";
});

btnGerar.addEventListener("click", () => {

    const valorSelecionado = selectPaciente.value;

    if (!valorSelecionado) {
        mostrarMensagem(
            "Selecione um paciente!",
            "warning"
        );
        return;
    }

    const [origem, id, pessoa] = valorSelecionado.split(":");

    let nomeCompleto = "";
    let cpf = "";

    if (origem === "casal") {

        const casal = casais.find(c => String(c.id) === String(id));

        if (!casal) {
            mostrarMensagem("Casal não encontrado!", "error");
            return;
        }

        nomeCompleto = pessoa === "p1"
            ? (casal.p1NomeCompleto || "-")
            : (casal.p2NomeCompleto || "-");

        cpf = (pessoa === "p1" ? casal.p1Cpf : casal.p2Cpf) || "";

    } else {

        const paciente = pacientes.find(p => String(p.id) === String(id));

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
        pacienteId: id,
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