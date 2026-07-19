function formatarDataBR(data) {
    if (!data) return "";
    const [ano, mes, dia] = data.split("-");
    return `${dia}/${mes}/${ano}`;
}

const params = new URLSearchParams(window.location.search);
const idPaciente = params.get("id");

const dadosPaciente = document.getElementById("dadosPaciente");
let paciente = null;

async function carregarFicha() {

    const pacientes = JSON.parse(await window.storage.getItem("pacientes")) || [];

    paciente = pacientes.find(p => p.id === idPaciente);

    if (!paciente) {
        dadosPaciente.innerHTML = "<p>Paciente não encontrado</p>";
        return;
    }

    dadosPaciente.innerHTML = `
        <h2>${paciente.nomeCompleto}</h2>

        <hr>

        <h3>📌 Dados Pessoais</h3>
        <p><strong>ID:</strong> ${paciente.id}</p>
        <p><strong>Data Nascimento:</strong> ${formatarDataBR(paciente.dataNascimento)}</p>
        <p><strong>Idade:</strong> ${paciente.idade ?? "-"}</p>
        <p><strong>Sexo:</strong> ${paciente.sexo ?? "-"}</p>
        <p><strong>Estado Civil:</strong> ${paciente.estadoCivil ?? "-"}</p>
        <p><strong>Profissão:</strong> ${paciente.profissao ?? "-"}</p>
        <p><strong>Responsável:</strong> ${paciente.responsavel ?? "-"}</p>

        <hr>

        <h3>📞 Contato</h3>
        <p><strong>Telefone:</strong> ${paciente.telefone ?? "-"}</p>
        <p><strong>Emergência:</strong> ${paciente.cntEmergencia ?? "-"}</p>
        <p><strong>Email:</strong> ${paciente.email ?? "-"}</p>

        <hr>

        <h3>🏠 Endereço</h3>
        <p><strong>CEP:</strong> ${paciente.cep ?? "-"}</p>
        <p><strong>Rua:</strong> ${paciente.endereco ?? "-"}</p>
        <p><strong>Número:</strong> ${paciente.numero ?? "-"}</p>
        <p><strong>Complemento:</strong> ${paciente.complemento ?? "-"}</p>
        <p><strong>Bairro:</strong> ${paciente.bairro ?? "-"}</p>
        <p><strong>Cidade/UF:</strong> ${paciente.cidadeUf ?? "-"}</p>

        <hr>

        <h3>🧠 Relato Inicial</h3>
        <p>${paciente.queixaPrincipal ?? "-"}</p>
    `;
}
document.getElementById("btnEditar").addEventListener("click", function () {
    window.location.href = `novopaciente.html?id=${idPaciente}`;
});

document.getElementById("btnVoltar").addEventListener("click", function () {
    window.history.back();
});

carregarFicha();