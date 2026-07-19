let pacientes = [];

function formatarDataHora(iso) {
    if (!iso) return "-";
    const d = new Date(iso);
    return d.toLocaleString("pt-BR");
}

async function carregarLixeira() {

    pacientes = JSON.parse(await window.storage.getItem("pacientes")) || [];

    const tabela = document.getElementById("tabela-lixeira");
    tabela.innerHTML = "";

    // guarda o índice ORIGINAL de cada paciente (posição real no array),
    // pra saber depois qual restaurar/apagar de verdade
    const excluidos = pacientes
        .map((p, indice) => ({ ...p, indice }))
        .filter(p => p.excluido);

    if (excluidos.length === 0) {
        tabela.innerHTML = `<tr><td colspan="4">A lixeira está vazia.</td></tr>`;
        return;
    }

    excluidos.forEach(p => {
        tabela.innerHTML += `
            <tr>
                <td>${p.id}</td>
                <td>${p.nomeCompleto}</td>
                <td>${formatarDataHora(p.excluidoEm)}</td>
                <td>
                    <button class="btnEdit btnRestaurar" data-indice="${p.indice}">
                        <i class="ti ti-rotate"></i> Restaurar
                    </button>
                    <button class="btnDelete btnExcluirDefinitivo" data-indice="${p.indice}">
                        <i class="ti ti-trash-x"></i> Excluir Definitivamente
                    </button>
                </td>
            </tr>
        `;
    });
}

document.addEventListener("click", async (e) => {

    if (e.target.closest(".btnRestaurar")) {

        const indice = e.target.closest(".btnRestaurar").dataset.indice;

        delete pacientes[indice].excluido;
        delete pacientes[indice].excluidoEm;

        await window.storage.setItem(
            "pacientes",
            JSON.stringify(pacientes)
        );

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


        const indice = e.target.closest(".btnExcluirDefinitivo").dataset.indice;


        pacientes.splice(indice, 1);


        await window.storage.setItem(
            "pacientes",
            JSON.stringify(pacientes)
        );


        carregarLixeira();


        mostrarMensagem(
            "Paciente excluído definitivamente!",
            "success"
        );
    }
});

carregarLixeira();