function formatarDataBR(data) {
    if (!data) return "";
    const [ano, mes, dia] = data.split("-");
    return `${dia}/${mes}/${ano}`;
}

const params = new URLSearchParams(window.location.search);
const idPaciente = params.get("id");

const dadosPaciente = document.getElementById("dadosPaciente");
let registro = null;
let ehCasal = false;

async function carregarFicha() {

    const pacientes = JSON.parse(await window.storage.getItem("pacientes")) || [];
    const casais = JSON.parse(await window.storage.getItem("casais")) || [];

    registro = pacientes.find(p => p.id === idPaciente);

    if (!registro) {
        registro = casais.find(c => c.id === idPaciente);
        ehCasal = !!registro;
    }

    if (!registro) {
        dadosPaciente.innerHTML = "<p>Paciente não encontrado</p>";
        return;
    }

    if (ehCasal) {
        renderizarFichaCasal();
    } else {
        renderizarFichaIndividual();
    }
}

function renderizarFichaIndividual() {
    const paciente = registro;

    dadosPaciente.innerHTML = `
        <h2>${paciente.nomeCompleto}</h2>

        <hr>

        <h3>📌 Dados Pessoais</h3>
        <p><strong>ID:</strong> ${paciente.id}</p>
        <p><strong>CPF:</strong> ${paciente.cpf ?? "-"}</p>
        <p><strong>RG:</strong> ${paciente.rg ?? "-"}</p>
        <p><strong>Data Nascimento:</strong> ${formatarDataBR(paciente.dataNascimento)}</p>
        <p><strong>Idade:</strong> ${paciente.idade ?? "-"}</p>
        <p><strong>Onde Nasceu:</strong> ${paciente.ondeNasceu ?? "-"}</p>
        <p><strong>Sexo:</strong> ${paciente.sexo ?? "-"}</p>
        <p><strong>Estado Civil:</strong> ${paciente.estadoCivil ?? "-"}</p>
        <p><strong>Profissão:</strong> ${paciente.profissao ?? "-"}</p>
        <p><strong>Responsável:</strong> ${paciente.responsavel ?? "-"}</p>
        <p><strong>Nome do Pai:</strong> ${paciente.pai ?? "-"}</p>
        <p><strong>Nome da Mãe:</strong> ${paciente.mae ?? "-"}</p>

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

function renderizarFichaCasal() {
    const casal = registro;

    dadosPaciente.innerHTML = `
        <h2><i class="ti ti-users-group" style="color:#7a8e69"></i> ${casal.p1NomeCompleto ?? "?"} e ${casal.p2NomeCompleto ?? "?"}</h2>

        <hr>

        <h3>📌 Dados do Casal</h3>
        <p><strong>ID:</strong> ${casal.id}</p>
        <p><strong>Tipo de Relacionamento:</strong> ${casal.tipoRelacionamento ?? "-"}</p>
        <p><strong>Início do Relacionamento:</strong> ${formatarDataBR(casal.inicioRelacionamento) || "-"}</p>

        <hr>

        <h3>👤 Pessoa 1</h3>
        <p><strong>Nome Completo:</strong> ${casal.p1NomeCompleto ?? "-"}</p>
        <p><strong>CPF:</strong> ${casal.p1Cpf ?? "-"}</p>
        <p><strong>RG:</strong> ${casal.p1Rg ?? "-"}</p>
        <p><strong>Data Nascimento:</strong> ${formatarDataBR(casal.p1DataNascimento) || "-"}</p>
        <p><strong>Idade:</strong> ${casal.p1Idade ?? "-"}</p>
        <p><strong>Sexo:</strong> ${casal.p1Sexo ?? "-"}</p>
        <p><strong>Profissão:</strong> ${casal.p1Profissao ?? "-"}</p>
        <p><strong>Telefone:</strong> ${casal.p1Telefone ?? "-"}</p>
        <p><strong>Email:</strong> ${casal.p1Email ?? "-"}</p>

        <hr>

        <h3>👤 Pessoa 2</h3>
        <p><strong>Nome Completo:</strong> ${casal.p2NomeCompleto ?? "-"}</p>
        <p><strong>CPF:</strong> ${casal.p2Cpf ?? "-"}</p>
        <p><strong>RG:</strong> ${casal.p2Rg ?? "-"}</p>
        <p><strong>Data Nascimento:</strong> ${formatarDataBR(casal.p2DataNascimento) || "-"}</p>
        <p><strong>Idade:</strong> ${casal.p2Idade ?? "-"}</p>
        <p><strong>Sexo:</strong> ${casal.p2Sexo ?? "-"}</p>
        <p><strong>Profissão:</strong> ${casal.p2Profissao ?? "-"}</p>
        <p><strong>Telefone:</strong> ${casal.p2Telefone ?? "-"}</p>
        <p><strong>Email:</strong> ${casal.p2Email ?? "-"}</p>

        <hr>

        <h3>🏠 Endereço</h3>
        <p><strong>CEP:</strong> ${casal.cep ?? "-"}</p>
        <p><strong>Rua:</strong> ${casal.endereco ?? "-"}</p>
        <p><strong>Número:</strong> ${casal.numero ?? "-"}</p>
        <p><strong>Complemento:</strong> ${casal.complemento ?? "-"}</p>
        <p><strong>Bairro:</strong> ${casal.bairro ?? "-"}</p>
        <p><strong>Cidade/UF:</strong> ${casal.cidadeUf ?? "-"}</p>

        <hr>

        <h3>🧠 Relato Inicial</h3>
        <p>${casal.queixaPrincipal ?? "-"}</p>
    `;
}

document.getElementById("btnEditar").addEventListener("click", function () {
    // abre a tela de edição certa, dependendo se é paciente individual ou casal
    const pagina = ehCasal ? "novocasal.html" : "novopaciente.html";
    window.location.href = `${pagina}?id=${idPaciente}`;
});

document.getElementById("btnVoltar").addEventListener("click", function () {
    window.history.back();
});

carregarFicha();
