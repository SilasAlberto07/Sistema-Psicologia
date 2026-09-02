const form = document.querySelector("form");
const btnSalvar = document.getElementById("salvar");
const idInput = document.getElementById("id");
const btnLimpar = document.getElementById("limpar");
const params = new URLSearchParams(window.location.search);
const idEdit = params.get("id");

let casais = [];

// ===============================
// GERAR ID
// ===============================
function gerarIdCasal(lista) {
    if (!lista || lista.length === 0) {
        return "CAS0001";
    }

    let maior = 0;

    lista.forEach(c => {
        if (c.id) {
            const num = parseInt(c.id.replace("CAS", ""));
            if (num > maior) maior = num;
        }
    });

    return "CAS" + String(maior + 1).padStart(4, "0");
}

// ===============================
// CALCULAR TEMPO JUNTOS (automático a partir de "Início do Relacionamento")
// ===============================
function calcularTempoJuntos(dataInicioStr) {

    if (!dataInicioStr) return "";

    const inicio = new Date(dataInicioStr + "T00:00:00");
    const hoje = new Date();

    if (isNaN(inicio.getTime()) || inicio > hoje) return "";

    let anos = hoje.getFullYear() - inicio.getFullYear();
    let meses = hoje.getMonth() - inicio.getMonth();
    let dias = hoje.getDate() - inicio.getDate();

    if (dias < 0) {
        meses--;
    }

    if (meses < 0) {
        anos--;
        meses += 12;
    }

    // Se já completou pelo menos 1 ano,
    // mostra SOMENTE os anos.
    if (anos > 0) {
        return `${anos} ${anos === 1 ? "ano" : "anos"}`;
    }

    // Menos de 1 ano: mostra os meses
    if (meses > 0) {
        return `${meses} ${meses === 1 ? "mês" : "meses"}`;
    }

    // Menos de 1 mês: mostra os dias
    if (dias <= 0) {
        return "Hoje";
    }

    return `${dias} ${dias === 1 ? "dia" : "dias"}`;
}

function atualizarTempoJuntos() {
    form.tempoJuntos.value = calcularTempoJuntos(
        form.inicioRelacionamento.value
    );
}

form.inicioRelacionamento.addEventListener("input", atualizarTempoJuntos);
form.inicioRelacionamento.addEventListener("change", atualizarTempoJuntos);

async function iniciarFormulario() {

    casais = JSON.parse(await window.storage.getItem("casais")) || [];

    // ATUALIZAR ID (SÓ NOVO)
    if (!idEdit) {
        idInput.value = gerarIdCasal(casais);
    }

    // CARREGAR CASAL (EDITAR)
    const casalEdit = casais.find(c => c.id === idEdit);

    if (casalEdit) {

        idInput.value = casalEdit.id;

        form.nomeCasal.value = casalEdit.nomeCasal || "";
        form.tipoRelacionamento.value = casalEdit.tipoRelacionamento || "";
        form.inicioRelacionamento.value = casalEdit.inicioRelacionamento || "";

        form.p1NomeCompleto.value = casalEdit.p1NomeCompleto || "";
        form.p1Cpf.value = casalEdit.p1Cpf || "";
        form.p1Rg.value = casalEdit.p1Rg || "";
        form.p1DataNascimento.value = casalEdit.p1DataNascimento || "";
        form.p1Idade.value = casalEdit.p1Idade || "";
        form.p1Sexo.value = casalEdit.p1Sexo || "";
        form.p1Profissao.value = casalEdit.p1Profissao || "";
        form.p1Telefone.value = casalEdit.p1Telefone || "";
        form.p1Email.value = casalEdit.p1Email || "";
        form.p1ContatoConf.value = casalEdit.p1ContatoConf || "";

        form.p2NomeCompleto.value = casalEdit.p2NomeCompleto || "";
        form.p2Cpf.value = casalEdit.p2Cpf || "";
        form.p2Rg.value = casalEdit.p2Rg || "";
        form.p2DataNascimento.value = casalEdit.p2DataNascimento || "";
        form.p2Idade.value = casalEdit.p2Idade || "";
        form.p2Sexo.value = casalEdit.p2Sexo || "";
        form.p2Profissao.value = casalEdit.p2Profissao || "";
        form.p2Telefone.value = casalEdit.p2Telefone || "";
        form.p2Email.value = casalEdit.p2Email || "";
        form.p2ContatoConf.value = casalEdit.p2ContatoConf || "";

        form.cep.value = casalEdit.cep || "";
        form.endereco.value = casalEdit.endereco || "";
        form.numero.value = casalEdit.numero || "";
        form.complemento.value = casalEdit.complemento || "";
        form.bairro.value = casalEdit.bairro || "";
        form.cidadeUf.value = casalEdit.cidadeUf || "";

        form.queixaPrincipal.value = casalEdit.queixaPrincipal || "";
    }

    // calcula o tempo juntos com base na data carregada (novo ou edição)
    atualizarTempoJuntos();
}

// ===============================
// SALVAR (CRIAR + EDITAR)
// ===============================
btnSalvar.addEventListener("click", async function (event) {
    event.preventDefault();

    const formData = new FormData(form);
    const dados = Object.fromEntries(formData.entries());

    if (!dados.p1NomeCompleto || !dados.p2NomeCompleto) {
        mostrarMensagem(
            "Preencha pelo menos o nome completo das duas pessoas!",
            "warning"
        );
        return;
    }

    if (idEdit) {
        const index = casais.findIndex(c => c.id === idEdit);
        casais[index] = { ...casais[index], ...dados };

        await window.storage.setItem("casais", JSON.stringify(casais));

        mostrarMensagem(
            "Casal atualizado com sucesso!",
            "success",
            () => {
                window.location.href = "pacientes.html";
            }
        );

    } else {
        dados.id = gerarIdCasal(casais);
        dados.dataCadastro = new Date().toLocaleDateString("pt-BR");
        casais.push(dados);

        await window.storage.setItem("casais", JSON.stringify(casais));

        mostrarMensagem(
            "Casal cadastrado com sucesso!",
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

    form.nomeCasal.value = "";
    form.tipoRelacionamento.value = "Namoro";
    form.inicioRelacionamento.value = "";

    form.tempoJuntos.value = "";

    form.p1NomeCompleto.value = "";
    form.p1Cpf.value = "";
    form.p1Rg.value = "";
    form.p1DataNascimento.value = "";
    form.p1Idade.value = "";
    form.p1Sexo.value = "Masculino";
    form.p1Profissao.value = "";
    form.p1Telefone.value = "";
    form.p1Email.value = "";
    form.p1ContatoConf.value = "";

    form.p2NomeCompleto.value = "";
    form.p2Cpf.value = "";
    form.p2Rg.value = "";
    form.p2DataNascimento.value = "";
    form.p2Idade.value = "";
    form.p2Sexo.value = "Masculino";
    form.p2Profissao.value = "";
    form.p2Telefone.value = "";
    form.p2Email.value = "";
    form.p2ContatoConf.value = "";

    form.cep.value = "";
    form.endereco.value = "";
    form.numero.value = "";
    form.complemento.value = "";
    form.bairro.value = "";
    form.cidadeUf.value = "";

    form.queixaPrincipal.value = "";
});

iniciarFormulario();
