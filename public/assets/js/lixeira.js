let pacientes = [];
let casais = [];

function formatarDataHora(iso) {
    if (!iso) return "-";
    const d = new Date(iso);
    return d.toLocaleString("pt-BR");
}

async function carregarLixeira() {

    pacientes = JSON.parse(await window.storage.getItem("pacientes")) || [];
    casais = JSON.parse(await window.storage.getItem("casais")) || [];

    const tabela = document.getElementById("tabela-lixeira");
    tabela.innerHTML = "";

    // guarda o índice ORIGINAL de cada registro (posição real no array de origem),
    // pra saber depois qual restaurar/apagar de verdade
    const pacientesExcluidos = pacientes
        .map((p, indice) => ({
            ...p,
            indice,
            tipo: "individual",
            _nomeExibicao: p.nomeCompleto || "-",
        }))
        .filter(p => p.excluido);

    const casaisExcluidos = casais
        .map((c, indice) => ({
            ...c,
            indice,
            tipo: "casal",
            _nomeExibicao: `${c.p1NomeCompleto || "?"} e ${c.p2NomeCompleto || "?"}`,
        }))
        .filter(c => c.excluido);

    const excluidos = [...pacientesExcluidos, ...casaisExcluidos];

    if (excluidos.length === 0) {
        tabela.innerHTML = `<tr><td colspan="4">A lixeira está vazia.</td></tr>`;
        return;
    }

    excluidos.forEach(item => {
        tabela.innerHTML += `
            <tr>
                <td>${item.id}</td>
                <td>
                    ${item.tipo === "casal" ? '<i class="ti ti-users-group badge-casal" title="Casal"></i> ' : ""}${item._nomeExibicao}
                </td>
                <td>${formatarDataHora(item.excluidoEm)}</td>
                <td>
                    <button class="btnEdit btnRestaurar" data-indice="${item.indice}" data-tipo="${item.tipo}">
                        <i class="ti ti-rotate"></i> Restaurar
                    </button>
                    <button class="btnDelete btnExcluirDefinitivo" data-indice="${item.indice}" data-tipo="${item.tipo}">
                        <i class="ti ti-trash-x"></i> Excluir Definitivamente
                    </button>
                </td>
            </tr>
        `;
    });
}

document.addEventListener("click", async (e) => {

    if (e.target.closest(".btnRestaurar")) {

        const btn = e.target.closest(".btnRestaurar");
        const indice = btn.dataset.indice;
        const tipo = btn.dataset.tipo;

        if (tipo === "casal") {
            delete casais[indice].excluido;
            delete casais[indice].excluidoEm;
            await window.storage.setItem("casais", JSON.stringify(casais));
        } else {
            delete pacientes[indice].excluido;
            delete pacientes[indice].excluidoEm;
            await window.storage.setItem("pacientes", JSON.stringify(pacientes));
        }

        carregarLixeira();

        mostrarMensagem(
            "Paciente restaurado com sucesso!",
            "success"
        );
    }


    if (e.target.closest(".btnExcluirDefinitivo")) {


        const resposta = await mostrarConfirmacao(
            "Isso apaga o paciente DEFINITIVAMENTE, sem chance de recuperar. Tem certeza?"
        );


        if (!resposta.isConfirmed) {
            return;
        }


        const btn = e.target.closest(".btnExcluirDefinitivo");
        const indice = btn.dataset.indice;
        const tipo = btn.dataset.tipo;

        if (tipo === "casal") {
            casais.splice(indice, 1);
            await window.storage.setItem("casais", JSON.stringify(casais));
        } else {
            pacientes.splice(indice, 1);
            await window.storage.setItem("pacientes", JSON.stringify(pacientes));
        }


        carregarLixeira();


        mostrarMensagem(
            "Paciente excluído definitivamente!",
            "success"
        );
    }
});

carregarLixeira();