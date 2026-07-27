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
// MODAL PRINCIPAL (novo lançamento / edição)
// ==========================================

const modal = document.getElementById("modalFinanceiro");

const btnReceita = document.querySelector(".btn-receita");
const btnDespesa = document.querySelector(".btn-despesa");

const fecharModal = document.getElementById("fecharModal");
const cancelarModal = document.getElementById("cancelarModal");
const salvarModal = document.getElementById("salvarModal");


// ==========================================
// CAMPOS DO MODAL PRINCIPAL
// ==========================================

const tipoLancamento = document.getElementById("tipoModal");
const paciente = document.getElementById("pacienteModal");
const categoria = document.getElementById("categoriaModal");
const descricao = document.getElementById("descricaoModal");
const valorTotalInput = document.getElementById("valorModal");
const valorRecebidoAgoraInput = document.getElementById("valorRecebidoModal");
const canceladoModal = document.getElementById("canceladoModal");
const formaPagamento = document.getElementById("pagamentoModal");
const data = document.getElementById("dataModal");

const infoPagamentoEdicaoWrapper = document.getElementById("infoPagamentoEdicaoWrapper");
const infoPagamentoEdicao = document.getElementById("infoPagamentoEdicao");


// índice para edição

let editando = null;


// ==========================================
// MODAL DE PAGAMENTO (registrar recebimento avulso)
// ==========================================

const modalPagamento = document.getElementById("modalPagamento");
const infoPagamentoModal = document.getElementById("infoPagamentoModal");
const valorPagamentoInput = document.getElementById("valorPagamentoInput");
const dataPagamentoInput = document.getElementById("dataPagamentoInput");
const fecharModalPagamento = document.getElementById("fecharModalPagamento");
const cancelarModalPagamento = document.getElementById("cancelarModalPagamento");
const confirmarModalPagamento = document.getElementById("confirmarModalPagamento");

let indicePagamentoAtual = null;


// ==========================================
// ABRIR MODAL PRINCIPAL
// ==========================================

function abrirModal(tipo) {

    limparCampos();

    tipoLancamento.value = tipo;
    tipoLancamento.disabled = true;

    document.getElementById("tituloModal").textContent =
        tipo === "Receita" ? "Nova Receita" : "Nova Despesa";

    data.value = new Date().toISOString().split("T")[0];

    atualizarCategorias();

    infoPagamentoEdicaoWrapper.style.display = "none";

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

    valorTotalInput.value = "";

    valorRecebidoAgoraInput.value = "";

    canceladoModal.checked = false;

    formaPagamento.value = "Pix";

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
// EVENTOS — MODAL PRINCIPAL
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
        fecharModalPagamentoFn();

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
// CÁLCULO DE VALOR TOTAL / PAGO / RESTANTE
// ==========================================
// Compatível com registros antigos que só tinham
// "valor" + "status" (sem pagamentos parciais).

function valorTotalDe(item) {
    return Number(item.valorTotal ?? item.valor ?? 0);
}

function pagamentosDe(item) {

    if (Array.isArray(item.pagamentos)) {
        return item.pagamentos;
    }

    // registro antigo: se já estava marcado como recebido/pago,
    // considera que o valor total inteiro já tinha sido pago
    if (item.status === "Recebido" || item.status === "Pago") {
        return [{
            data: item.data,
            dataISO: item.dataISO,
            valor: valorTotalDe(item)
        }];
    }

    return [];
}

function valorPagoDe(item) {
    return pagamentosDe(item).reduce((soma, p) => soma + Number(p.valor || 0), 0);
}

function valorRestanteDe(item) {
    return Math.max(valorTotalDe(item) - valorPagoDe(item), 0);
}

function estaCancelado(item) {
    return item.cancelado === true || item.status === "Cancelado";
}

function statusCalculado(item) {

    if (estaCancelado(item)) {
        return "Cancelado";
    }

    const restante = valorRestanteDe(item);
    const pago = valorPagoDe(item);

    if (restante <= 0 && pago > 0) {
        return item.tipo === "Receita" ? "Recebido" : "Pago";
    }

    if (pago > 0) {
        return "Parcial";
    }

    return "Pendente";

}


// ==========================================
// SALVAR (novo lançamento ou edição)
// ==========================================

salvarModal.addEventListener("click", async () => {

    if (valorTotalInput.value === "") {
        mostrarMensagem(
            "Informe o valor total.",
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

    const valorTotalNum = Number(valorTotalInput.value);
    const recebidoAgoraNum = valorRecebidoAgoraInput.value === ""
        ? 0
        : Number(valorRecebidoAgoraInput.value);

    if (recebidoAgoraNum < 0) {
        mostrarMensagem(
            "O valor recebido não pode ser negativo.",
            "warning"
        );
        return;
    }

    if (editando === null) {

        // ----- novo lançamento -----

        const pagamentos = [];

        if (recebidoAgoraNum > 0) {
            pagamentos.push({
                data: formatarData(data.value),
                dataISO: data.value,
                valor: recebidoAgoraNum
            });
        }

        const registro = {
            tipo: tipoLancamento.value,
            paciente: paciente.value.trim(),
            categoria: categoria.value,
            descricao: descricao.value.trim(),
            valorTotal: valorTotalNum,
            pagamentos,
            pagamento: formaPagamento.value,
            cancelado: canceladoModal.checked,
            data: formatarData(data.value),
            dataISO: data.value,
            mes: obterMes(data.value)
        };

        financeiro.push(registro);

    } else {

        // ----- editando um lançamento existente -----
        // mantém o histórico de pagamentos já registrado;
        // se informar um novo "valor recebido agora", isso
        // conta como mais um pagamento adicionado ao histórico

        const registroAtual = financeiro[editando];
        const pagamentosExistentes = pagamentosDe(registroAtual).slice();

        if (recebidoAgoraNum > 0) {
            pagamentosExistentes.push({
                data: formatarData(data.value),
                dataISO: data.value,
                valor: recebidoAgoraNum
            });
        }

        financeiro[editando] = {
            ...registroAtual,
            tipo: tipoLancamento.value,
            paciente: paciente.value.trim(),
            categoria: categoria.value,
            descricao: descricao.value.trim(),
            valorTotal: valorTotalNum,
            pagamentos: pagamentosExistentes,
            pagamento: formaPagamento.value,
            cancelado: canceladoModal.checked,
            data: formatarData(data.value),
            dataISO: data.value,
            mes: obterMes(data.value)
        };

    }

    await window.storage.setItem(
        "financeiro",
        JSON.stringify(financeiro)
    );

    fechar();
    atualizarFinanceiro();
});

// ======================================================
// SISTEMA FINANCEIRO
// Parte 2
// Cards, filtros e tabela
// ======================================================


// ==========================================
// ATUALIZAR CARDS
// ==========================================
// "Receitas" e "Despesas" mostram o que já entrou/saiu de fato
// (soma dos pagamentos recebidos), não o valor total contratado.

function atualizarCards() {

    let receitas = 0;
    let despesas = 0;
    let qtdPendentes = 0;

    financeiro.forEach(item => {

        if (estaCancelado(item)) {
            return;
        }

        const pago = valorPagoDe(item);
        const restante = valorRestanteDe(item);

        if (item.tipo === "Receita") {
            receitas += pago;
        } else {
            despesas += pago;
        }

        if (restante > 0) {
            qtdPendentes++;
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

        const total = valorTotalDe(item);
        const pago = valorPagoDe(item);
        const restante = valorRestanteDe(item);
        const cancelado = estaCancelado(item);
        const statusFinal = statusCalculado(item);

        tabela.innerHTML += `

        <tr>

            <td>${item.data}</td>
            <td>${item.tipo}</td>
            <td>${item.paciente || "-"}</td>
            <td>${item.descricao}</td>
            <td>
                <div class="valor-info">
                    <strong>${moeda(total)}</strong>
                    ${(!cancelado && pago > 0 && restante > 0) ? `<small class="valor-restante">Falta ${moeda(restante)}</small>` : ""}
                </div>
            </td>
            <td>${item.pagamento}</td>

            <td>
                <span class="status ${statusFinal.toLowerCase()}">
                    ${statusFinal}
                </span>
            </td>

            <td>

                ${(!cancelado && restante > 0) ? `
                <button
                    class="btn-receber-financeiro"
                    onclick="abrirModalPagamento(${index})">
                    Receber
                </button>` : ""}

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

            <td colspan="8">
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
// Editar • Excluir • Registrar Pagamento • LocalStorage
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
    valorTotalInput.value = valorTotalDe(item);
    valorRecebidoAgoraInput.value = "";
    canceladoModal.checked = estaCancelado(item);
    formaPagamento.value = item.pagamento;
    data.value = item.dataISO;

    const total = valorTotalDe(item);
    const pago = valorPagoDe(item);
    const restante = valorRestanteDe(item);

    infoPagamentoEdicao.innerHTML =
        `Total: <strong>${moeda(total)}</strong> &nbsp;·&nbsp; ` +
        `Já pago: <strong>${moeda(pago)}</strong> &nbsp;·&nbsp; ` +
        `Falta: <strong>${moeda(restante)}</strong>`;

    infoPagamentoEdicaoWrapper.style.display = "block";

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


// ==========================================
// MODAL DE PAGAMENTO (registrar recebimento avulso)
// ==========================================

function abrirModalPagamento(index) {

    indicePagamentoAtual = index;
    const item = financeiro[index];

    const total = valorTotalDe(item);
    const pago = valorPagoDe(item);
    const restante = valorRestanteDe(item);

    infoPagamentoModal.innerHTML =
        `Total: <strong>${moeda(total)}</strong> &nbsp;·&nbsp; ` +
        `Já pago: <strong>${moeda(pago)}</strong> &nbsp;·&nbsp; ` +
        `Falta: <strong>${moeda(restante)}</strong>`;

    valorPagamentoInput.value = "";
    dataPagamentoInput.value = new Date().toISOString().split("T")[0];

    modalPagamento.classList.add("ativo");

}

function fecharModalPagamentoFn() {

    modalPagamento.classList.remove("ativo");
    indicePagamentoAtual = null;

}

fecharModalPagamento.addEventListener("click", fecharModalPagamentoFn);
cancelarModalPagamento.addEventListener("click", fecharModalPagamentoFn);

modalPagamento.addEventListener("click", (e) => {

    if (e.target === modalPagamento) {
        fecharModalPagamentoFn();
    }

});

confirmarModalPagamento.addEventListener("click", async () => {

    if (indicePagamentoAtual === null) {
        return;
    }

    const valorRecebido = Number(valorPagamentoInput.value);

    if (!valorRecebido || valorRecebido <= 0) {
        mostrarMensagem(
            "Informe um valor válido.",
            "warning"
        );
        return;
    }

    if (dataPagamentoInput.value === "") {
        mostrarMensagem(
            "Informe a data do pagamento.",
            "warning"
        );
        return;
    }

    const item = financeiro[indicePagamentoAtual];
    const restanteAtual = valorRestanteDe(item);

    if (valorRecebido > restanteAtual) {
        mostrarMensagem(
            `Esse valor é maior que o restante (${moeda(restanteAtual)}). Ajuste o valor.`,
            "warning"
        );
        return;
    }

    if (!Array.isArray(item.pagamentos)) {
        item.pagamentos = pagamentosDe(item);
    }

    item.pagamentos.push({
        data: formatarData(dataPagamentoInput.value),
        dataISO: dataPagamentoInput.value,
        valor: valorRecebido
    });

    // garante que o valorTotal fique explícito no registro
    // (registros antigos usavam só o campo "valor")
    item.valorTotal = valorTotalDe(item);

    await salvarFinanceiro();

    fecharModalPagamentoFn();

    mostrarMensagem(
        "Pagamento registrado com sucesso!",
        "success"
    );

});


iniciarFinanceiro();
