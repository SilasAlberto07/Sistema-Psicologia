const tabelaPacientes = document.getElementById("tabela-pacientes");
let pacientes = []; // agora é "let" e fica no escopo do módulo, não dentro da função

// controla o estado atual de ordenação da tabela
let ordenacaoAtual = { campo: null, direcao: 1 }; // direcao: 1 = ascendente, -1 = descendente

async function carregarPacientes() {
    pacientes = JSON.parse(await window.storage.getItem("pacientes")) || [];
    renderizarTabela();
}

function renderizarTabela() {
    tabelaPacientes.innerHTML = "";

    // mantém o índice original de cada paciente (usado por excluir/editar sessões)
    // e remove os que estão na lixeira
    let pacientesAtivos = pacientes
        .map((p, indice) => ({ ...p, _indiceOriginal: indice }))
        .filter((p) => !p.excluido);

    if (ordenacaoAtual.campo) {
        const campo = ordenacaoAtual.campo;
        const direcao = ordenacaoAtual.direcao;

        pacientesAtivos.sort((a, b) => {
            const valorA = a[campo] ?? "";
            const valorB = b[campo] ?? "";

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

    if (pacientesAtivos.length === 0) {
        tabelaPacientes.innerHTML = `
            <tr>
                <td colspan="7">Nenhum paciente cadastrado</td>
            </tr>
        `;
        return;
    }

    pacientesAtivos.forEach((paciente) => {
        const indice = paciente._indiceOriginal;

        tabelaPacientes.innerHTML += `
            <tr>
                <td name="id">${paciente.id}</td>
                <td class="nome-paciente" title="${paciente.nomeCompleto}">
                    ${paciente.nomeCompleto}
                </td>
                <td name="telefone">${paciente.telefone ?? "-"}</td>            
                <td name="dataCadastro">${paciente.dataCadastro ?? "-"}</td>
                <td>
                    <input type="number"
                    class="input-sessoes"
                    data-index="${indice}"
                    value="${Array.isArray(paciente.sessoes) ? paciente.sessoes.length : paciente.sessoes ?? 0}"
                    min="0">
                </td>
                <td>
                    <select class="input-consulta" data-index="${indice}">
                        <option value="-"${paciente.consulta ? "" : "selected"}>-</option>
                        <option value="Presencial" ${paciente.tipoConsulta === "Presencial" ? "selected" : ""}>Presencial</option>
                        <option value="Online" ${paciente.tipoConsulta === "Online" ? "selected" : ""}>Online</option>
                    </select>
                </td>

                <td>
                    <button class="btnAnamnese" data-id="${paciente.id}">Anamnese</button>
                    <button class="btnOpen" data-id="${paciente.id}">Ficha</button>
                    <button class="btnDelete" data-indice="${indice}">Excluir</button>
                </td>
            </tr>
        `;
    });
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

document.addEventListener("click", async function (event) {

    if (event.target.classList.contains("btnDelete")) {

        const resposta = await mostrarConfirmacao(
            "Mover este paciente para a lixeira?"
        );

        if (!resposta.isConfirmed) return;

        const indice = event.target.dataset.indice;

        pacientes[indice].excluido = true;
        pacientes[indice].excluidoEm = new Date().toISOString();

        await window.storage.setItem(
            "pacientes",
            JSON.stringify(pacientes)
        );

        renderizarTabela();

    }
});

document.addEventListener("click", function (event) {

    if (event.target.classList.contains("btnOpen")) {

        const id = event.target.dataset.id;

        window.location.href = `ficha.html?id=${id}`;
    }

}); document.addEventListener("click", function (event) {

    if (event.target.classList.contains("btnAnamnese")) {

        const id = event.target.dataset.id;

        window.location.href = `anamnese.html?id=${id}`;
    }

});

document.addEventListener("input", async (e) => {

    if (e.target.classList.contains("input-sessoes")) {

        const index = e.target.dataset.index;

        let pacientesAtualizados = JSON.parse(await window.storage.getItem("pacientes")) || [];

        const paciente = pacientesAtualizados[index];

        const novoValor = Number(e.target.value);

        if (!Array.isArray(paciente.sessoes)) {
            paciente.sessoes = Array.from({ length: novoValor }, () => ({
                data: "", hora: "", status: "agendada"
            }));
        } else {
            const diff = novoValor - paciente.sessoes.length;
            if (diff > 0) {
                for (let i = 0; i < diff; i++) {
                    paciente.sessoes.push({ data: "", hora: "", status: "agendada" });
                }
            }
            if (diff < 0) {
                paciente.sessoes.splice(novoValor);
            }
        }

        // atualiza também o array local para não perder a alteração ao reordenar
        pacientes = pacientesAtualizados;

        await window.storage.setItem("pacientes", JSON.stringify(pacientesAtualizados));
    }
});


document.addEventListener("change", async (e) => {

    if (e.target.classList.contains("input-consulta")) {

        const index = e.target.dataset.index;

        pacientes[index].tipoConsulta = e.target.value;

        await window.storage.setItem(
            "pacientes",
            JSON.stringify(pacientes)
        );
    }

});

//pesquisar
const inputSearch = document.querySelector(".search-box");

inputSearch.addEventListener("input", function () {
    const filtro = this.value.toLowerCase();
    const linhas = document.querySelectorAll("#tabela-pacientes tr");

    linhas.forEach((linha) => {
        const nome = linha.children[1]?.textContent.toLowerCase();
        const id = linha.children[0]?.textContent.toLowerCase();

        if (nome.includes(filtro) || id.includes(filtro)) {
            linha.style.display = "";
        } else {
            linha.style.display = "none";
        }
    });
});



carregarPacientes();
