
const selectPaciente = document.getElementById("selectPaciente");
const tipoDocumento = document.getElementById("tipoDocumento");
const camposDeclaracao = document.getElementById("camposDeclaracao");
const camposAtestado = document.getElementById("camposAtestado");
const btnGerar = document.getElementById("btnGerar");

let pacientes = [];

// popula select de pacientes
async function iniciarDocumentos() {

    pacientes = JSON.parse(await window.storage.getItem("pacientes")) || [];

    pacientes.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.id;
        opt.textContent = `${p.nomeCompleto} (${p.id})`;
        selectPaciente.appendChild(opt);
    });
}

// alterna campos conforme tipo de documento
tipoDocumento.addEventListener("change", () => {
    const tipo = tipoDocumento.value;
    camposDeclaracao.style.display = tipo === "declaracao" ? "block" : "none";
    camposAtestado.style.display = tipo === "atestado" ? "block" : "none";
});

btnGerar.addEventListener("click", () => {

    const idPaciente = selectPaciente.value;

    if (!idPaciente) {
        mostrarMensagem(
            "Selecione um paciente!",
            "warning"
        );
        return;
    }

    const paciente = pacientes.find(p => p.id === idPaciente);
    const tipo = tipoDocumento.value;

    const dados = {
        tipo,
        pacienteId: idPaciente,
        nomeCompleto: paciente.nomeCompleto,
        cpf: paciente.cpf || "",
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