const form = document.querySelector("form");
const bntSalvar = document.getElementById("salvar");
const idInput = document.getElementById("id");
const IdadeInput = document.getElementById("idade")
const ResponsavelInput = document.getElementById("responsavel")
const btnLimpar = document.getElementById("limpar");
const params = new URLSearchParams(window.location.search);
const idEdit = params.get("id");

// ===============================
// GERAR ID
// ===============================
function gerarIdPaciente(lista) {
    if (!lista || lista.length === 0) {
        return "PAC0001";
    }

    let maior = 0;

    lista.forEach(p => {
        if (p.id) {
            const num = parseInt(p.id.replace("PAC", ""));
            if (num > maior) maior = num;
        }
    });

    return "PAC" + String(maior + 1).padStart(4, "0");
}

//VERIFICAÇÃO DE IDADE//
function verificarIdade() {

    const idade = Number(IdadeInput.value);

    if (!idade || idade < 18) {

        ResponsavelInput.disabled = false;
        ResponsavelInput.classList.remove("input-desabilitado");

        if (ResponsavelInput.value === "") {
            ResponsavelInput.value = "";
        }

    } else {

        ResponsavelInput.disabled = true;
        ResponsavelInput.classList.add("input-desabilitado");
        ResponsavelInput.value = "";

    }
}

IdadeInput.addEventListener("input", verificarIdade);


async function iniciarFormulario() {

    pacientes = JSON.parse(await window.storage.getItem("pacientes")) || [];

    // ATUALIZAR ID (SÓ NOVO)
    if (!idEdit) {
        idInput.value = gerarIdPaciente(pacientes);
    }

    // CARREGAR PACIENTE (EDITAR)
    const pacienteEdit = pacientes.find(p => p.id === idEdit);

    if (pacienteEdit) {

        idInput.value = pacienteEdit.id;

        form.nomeCompleto.value = pacienteEdit.nomeCompleto || "";
        form.cpf.value = pacienteEdit.cpf || "";
        form.rg.value = pacienteEdit.rg || "";
        form.dataNascimento.value = pacienteEdit.dataNascimento || "";
        form.idade.value = pacienteEdit.idade || "";
        form.ondeNasceu.value = pacienteEdit.ondeNasceu || "";
        form.sexo.value = pacienteEdit.sexo || "";
        form.estadoCivil.value = pacienteEdit.estadoCivil || "";
        form.profissao.value = pacienteEdit.profissao || "";
        form.responsavel.value = pacienteEdit.responsavel || "";
        form.pai.value = pacienteEdit.pai || "";
        form.mae.value = pacienteEdit.mae || "";

        form.telefone.value = pacienteEdit.telefone || "";
        form.cntEmergencia.value = pacienteEdit.cntEmergencia || "";
        form.email.value = pacienteEdit.email || "";

        form.cep.value = pacienteEdit.cep || "";
        form.endereco.value = pacienteEdit.endereco || "";
        form.numero.value = pacienteEdit.numero || "";
        form.complemento.value = pacienteEdit.complemento || "";
        form.bairro.value = pacienteEdit.bairro || "";
        form.cidadeUf.value = pacienteEdit.cidadeUf || "";

        form.queixaPrincipal.value = pacienteEdit.queixaPrincipal || "";

        verificarIdade();
    }
}


// ===============================
// SALVAR (CRIAR + EDITAR)
// ===============================
bntSalvar.addEventListener("click", async function (event) {
    event.preventDefault();

    const formData = new FormData(form);
    const dados = Object.fromEntries(formData.entries());

    if (!dados.nomeCompleto || !dados.dataNascimento || !dados.telefone) {
        mostrarMensagem(
            "Preencha pelo menos Nome, Data de Nascimento e Telefone!",
            "warning"
        );
        return;
    }

    if (idEdit) {
        const index = pacientes.findIndex(p => p.id === idEdit);
        pacientes[index] = { ...pacientes[index], ...dados };

        await window.storage.setItem("pacientes", JSON.stringify(pacientes));

        mostrarMensagem(
            "Paciente atualizado com sucesso!",
            "success",
            () => {
                window.location.href = "pacientes.html";
            }
        );

    } else {
        dados.id = gerarIdPaciente(pacientes);
        dados.dataCadastro = new Date().toLocaleDateString("pt-BR");
        pacientes.push(dados);

        await window.storage.setItem("pacientes", JSON.stringify(pacientes));

        mostrarMensagem(
            "Paciente cadastrado com sucesso!",
            "success",
            () => {
                window.location.href = "pacientes.html";
            }
        );
    }
});


// ===============================
// LIMPAR
// ===============================
btnLimpar.addEventListener("click", () => {

    document.getElementById("nomeCompleto").value = "";
    document.getElementById("dataNascimento").value = "";
    document.getElementById("idade").value = "";
    document.getElementById("sexo").value = "Masculino";
    document.getElementById("estadoCivil").value = "Solteiro(a)";
    document.getElementById("profissao").value = "";
    document.getElementById("responsavel").value = "";

    document.getElementById("telefone").value = "";
    document.getElementById("cntEmergencia").value = "";
    document.getElementById("email").value = "";

    document.getElementById("cep").value = "";
    document.getElementById("endereco").value = "";
    document.getElementById("numero").value = "";
    document.getElementById("complemento").value = "";
    document.getElementById("bairro").value = "";
    document.getElementById("cidadeUf").value = "";

    document.getElementById("queixaPrincipal").value = "";

    verificarIdade();

});

iniciarFormulario();