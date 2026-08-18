const tabelaPacientes = document.getElementById("tabela-pacientes");

let pacientes = []; // registros individuais (storage: "pacientes")
let casais = [];    // registros de casal (storage: "casais")

// controla o estado atual de ordenação da tabela
let ordenacaoAtual = { campo: null, direcao: 1 }; // direcao: 1 = ascendente, -1 = descendente

// controla qual aba está ativa: "individual" ou "casal"
let abaAtual = "individual";

async function carregarPacientes() {
    pacientes = JSON.parse(await window.storage.getItem("pacientes")) || [];
    casais = JSON.parse(await window.storage.getItem("casais")) || [];
    renderizarTabela();
}

// ===============================
// UNIFICA pacientes individuais + casais em uma única lista de exibição
// ===============================
function obterRegistrosUnificados() {
    const individuais = pacientes.map((p, indice) => ({
        ...p,
        _tipo: "individual",
        _indiceOriginal: indice,
        _nomeExibicao: p.nomeCompleto || "-",
    }));

    const casaisUnificados = casais.map((c, indice) => ({
        ...c,
        _tipo: "casal",
        _indiceOriginal: indice,
        _nomeExibicao: c.nomeCasal || "-",
    }));

    return [...individuais, ...casaisUnificados].filter((r) => !r.excluido);
}

// ===============================
// TELEFONE — monta as opções do select de acordo com o tipo do registro
// ===============================
function gerarOpcoesTelefone(registro, ehCasal) {
    if (ehCasal) {
        const opcoes = [];
        if (registro.p1Telefone) opcoes.push(registro.p1Telefone);
        if (registro.p2Telefone) opcoes.push(registro.p2Telefone);

        if (opcoes.length === 0) return `<option value="-">-</option>`;

        return opcoes
            .map(
                (tel) =>
                    `<option value="${tel}" ${registro.telefoneSelecionado === tel ? "selected" : ""}>${tel}</option>`
            )
            .join("");
    }

    const tel = registro.telefone || "-";
    return `<option value="${tel}">${tel}</option>`;
}

function renderizarTabela() {
    tabelaPacientes.innerHTML = "";

    let registros = obterRegistrosUnificados().filter(r => r._tipo === abaAtual);

    if (ordenacaoAtual.campo) {
        const campo = ordenacaoAtual.campo;
        const direcao = ordenacaoAtual.direcao;

        registros.sort((a, b) => {
            let valorA, valorB;

            if (campo === "nomeCompleto") {
                valorA = a._nomeExibicao;
                valorB = b._nomeExibicao;
            } else {
                valorA = a[campo] ?? "";
                valorB = b[campo] ?? "";
            }

            const numA = Number(valorA);
            const numB = Number(valorB);

            let resultado;

            // se os dois valores forem numéricos, compara como número
            if (valorA !== "" && valorB !== "" && !isNaN(numA) && !isNaN(numB)) {
                resultado = numA - numB;
            } else {
                resultado = valorA
                    .toString()
                    .toLowerCase()
                    .localeCompare(valorB.toString().toLowerCase(), "pt-BR");
            }

            return resultado * direcao;
        });
    }

    if (registros.length === 0) {
        const mensagemVazio = abaAtual === "casal"
            ? "Nenhum casal cadastrado"
            : "Nenhum paciente individual cadastrado";

        tabelaPacientes.innerHTML = `
            <tr>
                <td colspan="7">${mensagemVazio}</td>
            </tr>
        `;
        aplicarFiltroBusca();
        return;
    }

    registros.forEach((registro) => {
        const indice = registro._indiceOriginal;
        const tipo = registro._tipo;
        const ehCasal = tipo === "casal";

        tabelaPacientes.innerHTML += `
            <tr>
                <td name="id">${registro.id}</td>
                <td class="nome-paciente" title="${registro._nomeExibicao}">
                    ${ehCasal ? '<i class="ti ti-users-group badge-casal" title="Casal"></i> ' : ""}${registro._nomeExibicao}
                </td>
                <td name="telefone">
                    <select class="input-telefone" data-index="${indice}" data-tipo="${tipo}">
                        ${gerarOpcoesTelefone(registro, ehCasal)}
                    </select>
                </td>
                <td name="dataCadastro">${registro.dataCadastro ?? "-"}</td>
                <td>
                    <input type="number"
                    class="input-sessoes"
                    data-index="${indice}"
                    data-tipo="${tipo}"
                    value="${Array.isArray(registro.sessoes) ? registro.sessoes.length : registro.sessoes ?? 0}"
                    min="0">
                </td>
                <td>
                    <select class="input-consulta" data-index="${indice}" data-tipo="${tipo}">
                        <option value="-"${registro.tipoConsulta ? "" : "selected"}>-</option>
                        <option value="Presencial" ${registro.tipoConsulta === "Presencial" ? "selected" : ""}>Presencial</option>
                        <option value="Online" ${registro.tipoConsulta === "Online" ? "selected" : ""}>Online</option>
                    </select>
                </td>

                <td>
                    ${ehCasal ? "" : `<button class="btnAnamnese" data-id="${registro.id}">Anamnese</button>`}
                    <button class="btnOpen" data-id="${registro.id}" data-tipo="${tipo}">Ficha</button>
                    <button class="btnDelete" data-indice="${indice}" data-tipo="${tipo}">Excluir</button>
                </td>
            </tr>
        `;
    });

    aplicarFiltroBusca();
}

// clique nos cabeçalhos ordenáveis (ID, Nome, Data de Cadastro)
document.querySelectorAll(".th-sortavel").forEach((th) => {
    th.addEventListener("click", () => {
        const campo = th.dataset.sort;

        if (ordenacaoAtual.campo === campo) {
            // já está ordenando por esse campo -> inverte a direção
            ordenacaoAtual.direcao *= -1;
        } else {
            // novo campo -> começa ascendente
            ordenacaoAtual.campo = campo;
            ordenacaoAtual.direcao = 1;
        }

        atualizarIconesOrdenacao();
        renderizarTabela();
    });
});

function atualizarIconesOrdenacao() {
    document.querySelectorAll(".th-sortavel .icone-ordem").forEach((icone) => {
        icone.className = "ti ti-arrows-sort icone-ordem";
    });

    if (!ordenacaoAtual.campo) return;

    const thAtivo = document.querySelector(
        `.th-sortavel[data-sort="${ordenacaoAtual.campo}"] .icone-ordem`
    );

    if (thAtivo) {
        thAtivo.className =
            ordenacaoAtual.direcao === 1
                ? "ti ti-arrow-narrow-up icone-ordem icone-ordem-ativo"
                : "ti ti-arrow-narrow-down icone-ordem icone-ordem-ativo";
    }
}

// ===============================
// EXCLUIR (envia para lixeira) — precisa saber em qual storage mexer
// ===============================
document.addEventListener("click", async function (event) {

    if (event.target.classList.contains("btnDelete")) {

        const resposta = await mostrarConfirmacao(
            "Mover este paciente para a lixeira?"
        );

        if (!resposta.isConfirmed) return;

        const indice = event.target.dataset.indice;
        const tipo = event.target.dataset.tipo;

        if (tipo === "casal") {
            casais[indice].excluido = true;
            casais[indice].excluidoEm = new Date().toISOString();
            await window.storage.setItem("casais", JSON.stringify(casais));
        } else {
            pacientes[indice].excluido = true;
            pacientes[indice].excluidoEm = new Date().toISOString();
            await window.storage.setItem("pacientes", JSON.stringify(pacientes));
        }

        renderizarTabela();

    }
});

// ===============================
// ABRIR FICHA — passa o tipo na URL para a ficha.html saber como exibir
// ===============================
document.addEventListener("click", function (event) {

    if (event.target.classList.contains("btnOpen")) {

        const id = event.target.dataset.id;
        const tipo = event.target.dataset.tipo;

        window.location.href = `ficha.html?id=${id}&tipo=${tipo}`;
    }

});

document.addEventListener("click", function (event) {

    if (event.target.classList.contains("btnAnamnese")) {

        const id = event.target.dataset.id;

        window.location.href = `anamnese.html?id=${id}`;
    }

});

// ===============================
// SESSÕES — grava no storage certo (pacientes ou casais)
// ===============================
document.addEventListener("input", async (e) => {

    if (e.target.classList.contains("input-sessoes")) {

        const index = e.target.dataset.index;
        const tipo = e.target.dataset.tipo;
        const novoValor = Number(e.target.value);

        const chave = tipo === "casal" ? "casais" : "pacientes";
        let lista = JSON.parse(await window.storage.getItem(chave)) || [];

        const registro = lista[index];

        if (!Array.isArray(registro.sessoes)) {
            registro.sessoes = Array.from({ length: novoValor }, () => ({
                data: "", hora: "", status: "agendada"
            }));
        } else {
            const diff = novoValor - registro.sessoes.length;
            if (diff > 0) {
                for (let i = 0; i < diff; i++) {
                    registro.sessoes.push({ data: "", hora: "", status: "agendada" });
                }
            }
            if (diff < 0) {
                registro.sessoes.splice(novoValor);
            }
        }

        // atualiza também o array local para não perder a alteração ao reordenar
        if (tipo === "casal") {
            casais = lista;
        } else {
            pacientes = lista;
        }

        await window.storage.setItem(chave, JSON.stringify(lista));
    }
});

// ===============================
// TIPO DE CONSULTA — grava no storage certo (pacientes ou casais)
// ===============================
document.addEventListener("change", async (e) => {

    if (e.target.classList.contains("input-consulta")) {

        const index = e.target.dataset.index;
        const tipo = e.target.dataset.tipo;

        if (tipo === "casal") {
            casais[index].tipoConsulta = e.target.value;
            await window.storage.setItem("casais", JSON.stringify(casais));
        } else {
            pacientes[index].tipoConsulta = e.target.value;
            await window.storage.setItem("pacientes", JSON.stringify(pacientes));
        }
    }

});

// ===============================
// TELEFONE — grava qual telefone foi selecionado (pacientes ou casais)
// ===============================
document.addEventListener("change", async (e) => {

    if (e.target.classList.contains("input-telefone")) {

        const index = e.target.dataset.index;
        const tipo = e.target.dataset.tipo;

        if (tipo === "casal") {
            casais[index].telefoneSelecionado = e.target.value;
            await window.storage.setItem("casais", JSON.stringify(casais));
        } else {
            pacientes[index].telefoneSelecionado = e.target.value;
            await window.storage.setItem("pacientes", JSON.stringify(pacientes));
        }
    }

});

//pesquisar
const inputSearch = document.querySelector(".search-box");

function aplicarFiltroBusca() {
    const filtro = (inputSearch.value || "").toLowerCase();
    const linhas = document.querySelectorAll("#tabela-pacientes tr");

    linhas.forEach((linha) => {
        const nome = linha.children[1]?.textContent.toLowerCase() || "";
        const id = linha.children[0]?.textContent.toLowerCase() || "";

        if (nome.includes(filtro) || id.includes(filtro)) {
            linha.style.display = "";
        } else {
            linha.style.display = "none";
        }
    });
}

inputSearch.addEventListener("input", aplicarFiltroBusca);

// ===============================
// ABAS — Individual / Casal
// ===============================
document.querySelectorAll(".tab-tipo").forEach((botao) => {
    botao.addEventListener("click", () => {
        if (botao.dataset.tipo === abaAtual) return;

        abaAtual = botao.dataset.tipo;

        document.querySelectorAll(".tab-tipo").forEach((b) => b.classList.remove("ativa"));
        botao.classList.add("ativa");

        // troca de aba não deve manter ordenação de coluna que não faz sentido no outro tipo
        renderizarTabela();
    });
});

carregarPacientes();
