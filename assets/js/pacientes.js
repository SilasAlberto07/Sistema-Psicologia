const tabelaPacientes = document.getElementById("tabela-pacientes");
let pacientes = []; // agora é "let" e fica no escopo do módulo, não dentro da função

async function carregarPacientes() {
    pacientes = JSON.parse(await window.storage.getItem("pacientes")) || [];

    tabelaPacientes.innerHTML = "";

    const pacientesAtivos = pacientes.filter(p => !p.excluido);

    if (pacientesAtivos.length === 0) {
        tabelaPacientes.innerHTML = `
            <tr>
                <td colspan="6">Nenhum paciente cadastrado</td>
            </tr>
        `;
        return;
    }

    pacientes.forEach((paciente, indice) => {

        if (paciente.excluido) return; // não mostra quem está na lixeira

        tabelaPacientes.innerHTML += `
            <tr>
                <td name="id">${paciente.id}</td>
                <td name="nomeCompleto">${paciente.nomeCompleto}</td>
                <td name="telefone">${paciente.telefone}</td>
                <td name="dataCadastro">${paciente.dataCadastro ?? "-"}</td>
                <td>
                    <input type="number"
                    class="input-sessoes"
                    data-index="${indice}"
                    value="${Array.isArray(paciente.sessoes) ? paciente.sessoes.length : paciente.sessoes ?? 0}"
                    min="0">
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

document.addEventListener("click", async function (event) {
    if (event.target.classList.contains("btnDelete")) {

        if (!confirm("Mover este paciente para a lixeira?")) return;

        const indice = event.target.dataset.indice;

        pacientes[indice].excluido = true;
        pacientes[indice].excluidoEm = new Date().toISOString();

        await window.storage.setItem("pacientes", JSON.stringify(pacientes));
        carregarPacientes();
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

        await window.storage.setItem("pacientes", JSON.stringify(pacientesAtualizados));
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