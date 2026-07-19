const params = new URLSearchParams(window.location.search);
const idPaciente = params.get("id");

const nomePaciente = document.getElementById("nomePaciente");
const avisoTipo = document.getElementById("avisoTipo");
const secaoAdolescente = document.getElementById("secaoAdolescente");
const form = document.getElementById("formAnamnese");
const btnVoltar = document.getElementById("btnVoltar");
const btnImprimir = document.getElementById("btnImprimir");
const btnAbrirAnamnese = document.getElementById("btnAbrirAnamnese");

let pacientes = [];
let paciente = null;

async function iniciarAnamnese() {

    pacientes = JSON.parse(await window.storage.getItem("pacientes")) || [];

    console.log("ID buscado na URL:", idPaciente);
    console.log("Lista de pacientes carregada:", pacientes);

    paciente = pacientes.find(p => String(p.id) === String(idPaciente));

    if (!paciente) {
        alert("Paciente não encontrado!");
        window.location.href = "pacientes.html";
        return;
    }

    nomePaciente.innerText = paciente.nomeCompleto;

    // mostra seção extra se for menor de idade
    const idade = Number(paciente.idade);
    const menorDeIdade = !isNaN(idade) && idade < 18;

    if (menorDeIdade) {
        secaoAdolescente.style.display = "block";
        avisoTipo.textContent = "Paciente menor de idade — seção adicional de anamnese habilitada.";
    } else {
        avisoTipo.textContent = "Ficha de anamnese — adulto.";
    }

    // garante estrutura
    if (!paciente.anamnese || Array.isArray(paciente.anamnese)) {
        paciente.anamnese = {};
    }

    // preenche formulário com dados já salvos
    Object.entries(paciente.anamnese).forEach(([campo, valor]) => {
        if (form.elements[campo]) {
            form.elements[campo].value = valor;
        }
    });

    // pré-preenche a queixa principal com o que já foi informado
    // no cadastro do paciente, só se a anamnese ainda não tiver
    // uma queixa própria salva (não sobrescreve o que ela já digitou)
    if (!paciente.anamnese.queixaPrincipal && paciente.queixaPrincipal) {
        form.elements["queixaPrincipal"].value = paciente.queixaPrincipal;
    }
}


// ==========================================
// AUTO EXPANSÃO DOS TEXTAREAS
// ==========================================

function autoExpand(textarea) {
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + "px";
}

document.querySelectorAll("textarea").forEach(textarea => {

    autoExpand(textarea);

    textarea.addEventListener("input", () => {
        autoExpand(textarea);
    });

});

// salvar
form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const dados = Object.fromEntries(formData.entries());

    paciente.anamnese = {
        ...paciente.anamnese,
        ...dados,
        atualizadoEm: new Date().toLocaleString("pt-BR")
    };

    await window.storage.setItem("pacientes", JSON.stringify(pacientes));

    alert("Ficha de anamnese salva com sucesso!");

    window.location.href = `anamnese.html?id=${idPaciente}`;
});

// abrir anamnese
btnAbrirAnamnese.addEventListener("click", () => {
    window.open(`visu-anamnese.html?id=${idPaciente}`, "_blank");
});

// imprimir
btnImprimir.addEventListener("click", async () => {
    const formData = new FormData(form);
    const dados = Object.fromEntries(formData.entries());

    paciente.anamnese = {
        ...paciente.anamnese,
        ...dados,
        atualizadoEm: new Date().toLocaleString("pt-BR")
    };

    await window.storage.setItem("pacientes", JSON.stringify(pacientes));

    window.open(`imprimir-anamnese.html?id=${idPaciente}`, "_blank");
});

btnVoltar.addEventListener("click", () => history.back());

iniciarAnamnese();