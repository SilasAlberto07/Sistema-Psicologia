// ======================================================
// SISTEMA FINANCEIRO
// Parte 1
// Estrutura principal
// ======================================================

let financeiro = [];

// ----------------------------
// Elementos
// ----------------------------

const tabela = document.getElementById("listaFinanceiro");

const receitaMes = document.getElementById("receitaMes");
const despesasMes = document.getElementById("despesasMes");
const lucroMes = document.getElementById("lucroMes");
const pendentes = document.getElementById("pendentes");

const pesquisa = document.getElementById("pesquisa");
const filtroMes = document.getElementById("filtroMes");


// ==========================================
// MODAL
// ==========================================

const modal = document.getElementById("modalFinanceiro");

const btnReceita = document.querySelector(".btn-receita");
const btnDespesa = document.querySelector(".btn-despesa");

const fecharModal = document.getElementById("fecharModal");
const cancelarModal = document.getElementById("cancelarModal");
const salvarModal = document.getElementById("salvarModal");


// ==========================================
// CAMPOS
// ==========================================

const tipoLancamento = document.getElementById("tipoModal");
const paciente = document.getElementById("pacienteModal");
const categoria = document.getElementById("categoriaModal");
const descricao = document.getElementById("descricaoModal");
const valor = document.getElementById("valorModal");
const formaPagamento = document.getElementById("pagamentoModal");
const status = document.getElementById("statusModal");
const data = document.getElementById("dataModal");


// índice para edição

let editando = null;


// ==========================================
// ABRIR MODAL
// ==========================================

function abrirModal(tipo) {

    limparCampos();

    tipoLancamento.value = tipo;
    tipoLancamento.disabled = true;

    document.getElementById("tituloModal").textContent =
        tipo === "Receita" ? "Nova Receita" : "Nova Despesa";

    data.value = new Date().toISOString().split("T")[0];

    atualizarCategorias();

    modal.classList.add("ativo");

}

// ==========================================
// FECHAR
// ==========================================

function fechar() {

    modal.classList.remove("ativo");

    editando = null;

}


// ==========================================
// LIMPAR
// ==========================================

function limparCampos() {

    paciente.value = "";

    categoria.value = "";

    descricao.value = "";

    valor.value = "";

    formaPagamento.value = "Pix";

    status.value = "Recebido";

}


// ==========================================
// CATEGORIAS AUTOMÁTICAS
// ==========================================

function atualizarCategorias() {

    categoria.innerHTML = "";

    if (tipoLancamento.value === "Receita") {

        categoria.innerHTML += `
        <option>Sessão</option>
        <option>Consulta</option>
        <option>Avaliação</option>
        <option>Laudo</option>
        <option>Outro</option>
        `;

    } else {

        categoria.innerHTML += `
        <option>Aluguel</option>
        <option>Internet</option>
        <option>Funcionário</option>
        <option>Limpeza</option>
        <option>Outro</option>
        `;

    }

}


// ==========================================
// EVENTOS
// ==========================================

btnReceita.addEventListener("click", () => {

    abrirModal("Receita");

});

btnDespesa.addEventListener("click", () => {

    abrirModal("Despesa");

});

fecharModal.addEventListener("click", fechar);

cancelarModal.addEventListener("click", fechar);

modal.addEventListener("click", (e) => {

    if (e.target === modal) {

        fechar();

    }

});

document.addEventListener("keydown", (e) => {

    if (e.key === "Escape") {

        fechar();

    }

});

tipoLancamento.addEventListener("change", atualizarCategorias);


// ==========================================
// FORMATOS
// ==========================================

function moeda(valor) {

    return Number(valor).toLocaleString("pt-BR", {

        style: "currency",

        currency: "BRL"

    });

}

function formatarData(dataISO) {

    const p = dataISO.split("-");

    return `${p[2]}/${p[1]}/${p[0]}`;

}

function obterMes(dataISO) {

    const meses = [

        "Janeiro", "Fevereiro", "Março", "Abril",

        "Maio", "Junho", "Julho", "Agosto",

        "Setembro", "Outubro", "Novembro", "Dezembro"

    ];

    return meses[new Date(dataISO).getMonth()];

}


// ==========================================
// SALVAR
// ==========================================

salvarModal.addEventListener("click", async () => {

    if (valor.value === "") {
        mostrarMensagem(
            "Informe o valor.",
            "warning"
        );
        return;
    }

    if (data.value === "") {
        mostrarMensagem(
            "Informe a data.",
            "warning"
        );
        return;
    }

    const registro = {
        tipo: tipoLancamento.value,
        paciente: paciente.value.trim(),
        categoria: categoria.value,
        descricao: descricao.value.trim(),
        valor: Number(valor.value),
        pagamento: formaPagamento.value,
        status: status.value,
        data: formatarData(data.value),
        dataISO: data.value,
        mes: obterMes(data.value)
    };

    if (editando === null) {
        financeiro.push(registro);
    } else {
        financeiro[editando] = registro;
    }

    await window.storage.setItem(
        "financeiro",
        JSON.stringify(financeiro)
    );

    fechar();
    atualizarCards();
    carregarTabela();
});

// ======================================================
// SISTEMA FINANCEIRO
// Parte 2
// Cards, filtros e tabela
// ======================================================


// ==========================================
// ATUALIZAR CARDS
// ==========================================

function atualizarCards() {

    let receitas = 0;
    let despesas = 0;
    let qtdPendentes = 0;

    financeiro.forEach(item => {

        if (item.status === "Pendente") {
            qtdPendentes++;
        } else {
            // só entra na soma se estiver "Recebido" ou "Pago"
            if (item.tipo === "Receita") {
                receitas += Number(item.valor);
            } else {
                despesas += Number(item.valor);
            }
        }

    });

    receitaMes.textContent = moeda(receitas);
    despesasMes.textContent = moeda(despesas);
    lucroMes.textContent = moeda(receitas - despesas);
    pendentes.textContent = qtdPendentes;

}

// ==========================================
// CARREGAR TABELA
// ==========================================

function carregarTabela() {
    tabela.innerHTML = "";
    const textoPesquisa = pesquisa.value.toLowerCase();
    financeiro.forEach((item, index) => {

        if (

            textoPesquisa !== "" &&
            !item.paciente.toLowerCase().includes(textoPesquisa) &&
            !item.tipo.toLowerCase().includes(textoPesquisa) &&
            !item.descricao.toLowerCase().includes(textoPesquisa)
        ) {
            return;
        }

        if (

            filtroMes.value !== "" &&
            item.mes !== filtroMes.value

        ) {
            return;

        }

        tabela.innerHTML += `

        <tr>

            <td>${item.data}</td>
            <td>${item.tipo}</td>
            <td>${item.paciente || "-"}</td>
            <td>${item.descricao}</td>
            <td>${moeda(item.valor)}</td>
            <td>${item.pagamento}</td>

            <td>
                <span class="status ${item.status.toLowerCase()}">
                    ${item.status}
                </span>
            </td>

            <td>

                <button
                    class="btn-editar-financeiro"
                    onclick="editarRegistro(${index})">
                    Editar
                </button>

                <button
                    class="btn-excluir-financeiro"
                    onclick="excluirRegistro(${index})">
                    Excluir
                </button>
            </td>
        </tr>
        `;
    });


    if (tabela.innerHTML === "") {
        tabela.innerHTML = `

        <tr>

            <td colspan="9">
                Nenhum lançamento encontrado.
            </td>

        </tr>
        `;
    }

}



// ==========================================
// PESQUISA
// ==========================================

pesquisa.addEventListener("input", () => {
    carregarTabela();
});



// ==========================================
// FILTRO MÊS
// ==========================================

filtroMes.addEventListener("change", () => {
    carregarTabela();
});



// ==========================================
// ORDENAÇÃO POR DATA
// ==========================================

function ordenarPorData() {
    financeiro.sort((a, b) => {
        return new Date(a.dataISO) - new Date(b.dataISO);
    });

}



// ==========================================
// RECARREGAR TUDO
// ==========================================

function atualizarFinanceiro() {
    ordenarPorData();
    atualizarCards();
    carregarTabela();

}

async function iniciarFinanceiro() {
    financeiro = JSON.parse(await window.storage.getItem("financeiro")) || [];
    atualizarFinanceiro();
}


// ======================================================
// SISTEMA FINANCEIRO
// Parte 3
// Editar • Excluir • LocalStorage
// ======================================================


// ==========================================
// EDITAR
// ==========================================

function editarRegistro(index) {

    const item = financeiro[index];
    editando = index;

    abrirModal(item.tipo);
    tipoLancamento.value = item.tipo;
    atualizarCategorias();

    paciente.value = item.paciente;
    categoria.value = item.categoria;
    descricao.value = item.descricao;
    valor.value = item.valor;
    formaPagamento.value = item.pagamento;
    status.value = item.status;
    data.value = item.dataISO;


}


// ==========================================
// EXCLUIR
// ==========================================

async function excluirRegistro(index) {

    const resposta = await mostrarConfirmacao(
        "Deseja realmente excluir este lançamento?"
    );

    if (!resposta.isConfirmed) {
        return;
    }

    financeiro.splice(index, 1);

    await salvarFinanceiro();

    mostrarMensagem(
        "Lançamento excluído com sucesso!",
        "success"
    );
}


async function salvarFinanceiro() {

    await window.storage.setItem(
        "financeiro",
        JSON.stringify(financeiro)
    );

    atualizarFinanceiro();
}

iniciarFinanceiro();