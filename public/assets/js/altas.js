// ===============================
// PÁGINA "ALTAS" — pacientes e casais que receberam alta
// (marcados com alta = true na página Pacientes)
// ===============================

let abaAltas = "individual";

function formatarDataBR(data) {
    if (!data) return "-";
    // aceita "AAAA-MM-DD" (input date) ou um texto já formatado
    if (/^\d{4}-\d{2}-\d{2}/.test(data)) {
        const [ano, mes, dia] = data.slice(0, 10).split("-");
        return `${dia}/${mes}/${ano}`;
    }
    return data;
}

function escaparHTML(texto) {
    return String(texto ?? "").replace(/[&<>"']/g, (c) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
}

function nomeDoRegistro(registro, tipo) {
    if (tipo === "casal") {
        return registro.nomeCasal || `${registro.p1NomeCompleto || "?"} e ${registro.p2NomeCompleto || "?"}`;
    }
    return registro.nomeCompleto || "-";
}

function contarSessoesRealizadas(registro) {
    const todas = [registro.consulta, ...(registro.sessoes || [])].filter(Boolean);
    return todas.filter(s => s.status === "realizada").length;
}

async function carregarAltas() {

    const pacientes = JSON.parse(await window.storage.getItem("pacientes")) || [];
    const casais = JSON.parse(await window.storage.getItem("casais")) || [];

    const lista = (abaAltas === "casal" ? casais : pacientes)
        .filter(r => r.alta && !r.excluido)
        // alta mais recente primeiro
        .sort((a, b) => String(b.altaEm || "").localeCompare(String(a.altaEm || "")));

    const tabela = document.getElementById("tabela-altas");
    tabela.innerHTML = "";

    if (lista.length === 0) {
        tabela.innerHTML = `<tr><td colspan="6">${abaAltas === "casal"
            ? "Nenhum casal com alta."
            : "Nenhum paciente com alta."}</td></tr>`;
        return;
    }

    lista.forEach(registro => {
        const nome = nomeDoRegistro(registro, abaAltas);
        const ehCasal = abaAltas === "casal";

        tabela.innerHTML += `
            <tr>
                <td>${escaparHTML(registro.id)}</td>
                <td class="nome-paciente" title="${escaparHTML(nome)}">
                    ${ehCasal ? '<i class="ti ti-users-group badge-casal" title="Casal"></i> ' : ""}${escaparHTML(nome)}
                </td>
                <td>${escaparHTML(registro.dataCadastro ?? "-")}</td>
                <td>${formatarDataBR(registro.altaEm)}</td>
                <td>${contarSessoesRealizadas(registro)}</td>
                <td>
                    <button class="btnRelatorio" data-id="${escaparHTML(registro.id)}" title="Ver o relatório do tratamento e imprimir / salvar em PDF">
                        <i class="ti ti-file-text"></i> Relatório
                    </button>
                    <button class="btnReativar" data-id="${escaparHTML(registro.id)}" title="Desfazer a alta e voltar para a lista de pacientes">
                        <i class="ti ti-rotate"></i> Reativar
                    </button>
                    <button class="btnDelete btnExcluirAlta" data-id="${escaparHTML(registro.id)}">
                        <i class="ti ti-trash"></i> Excluir
                    </button>
                </td>
            </tr>
        `;
    });

    aplicarBuscaAltas();
}

// ===============================
// BUSCA
// ===============================
const campoBuscaAltas = document.getElementById("buscaAltas");

function aplicarBuscaAltas() {
    const filtro = (campoBuscaAltas.value || "").toLowerCase();
    document.querySelectorAll("#tabela-altas tr").forEach((linha) => {
        const id = linha.children[0]?.textContent.toLowerCase() || "";
        const nome = linha.children[1]?.textContent.toLowerCase() || "";
        linha.style.display = (nome.includes(filtro) || id.includes(filtro)) ? "" : "none";
    });
}

campoBuscaAltas.addEventListener("input", aplicarBuscaAltas);

// ===============================
// ABAS — Individual / Casal
// ===============================
document.querySelectorAll(".tab-tipo").forEach((botao) => {
    botao.addEventListener("click", () => {
        if (botao.dataset.tipo === abaAltas) return;
        abaAltas = botao.dataset.tipo;
        document.querySelectorAll(".tab-tipo").forEach((b) => b.classList.remove("ativa"));
        botao.classList.add("ativa");
        carregarAltas();
    });
});

// lê a lista do tipo da aba atual e acha o registro pelo ID
async function buscarRegistro(id) {
    const chave = abaAltas === "casal" ? "casais" : "pacientes";
    const lista = JSON.parse(await window.storage.getItem(chave)) || [];
    const indice = lista.findIndex(r => String(r.id) === String(id));
    return { chave, lista, indice, registro: indice >= 0 ? lista[indice] : null };
}

// ===============================
// AÇÕES
// ===============================
document.addEventListener("click", async (e) => {

    // ----- RELATÓRIO (abre para ler; lá tem o botão Imprimir / Salvar PDF) -----
    const btnRelatorio = e.target.closest(".btnRelatorio");
    if (btnRelatorio) {
        const id = btnRelatorio.dataset.id;
        const origem = abaAltas === "casal" ? "&origem=casal" : "";
        window.open(`imprimir-prontuario.html?id=${encodeURIComponent(id)}${origem}&relatorio=alta&visualizar=true`, "_blank");
        return;
    }

    // ----- REATIVAR (desfaz a alta) -----
    const btnReativar = e.target.closest(".btnReativar");
    if (btnReativar) {
        const { chave, lista, registro } = await buscarRegistro(btnReativar.dataset.id);
        if (!registro) return;

        const nome = nomeDoRegistro(registro, abaAltas);
        const resposta = await mostrarConfirmacao(
            `Desfazer a alta de ${nome}? Ele(a) volta para a lista de Pacientes e Sessões.`
        );
        if (!resposta.isConfirmed) return;

        delete registro.alta;
        delete registro.altaEm;
        delete registro.altaObs;
        delete registro.altaRegistradaEm;

        await window.storage.setItem(chave, JSON.stringify(lista));
        await carregarAltas();
        mostrarMensagem(`${nome} voltou para a lista de pacientes.`, "success");
        return;
    }

    // ----- EXCLUIR -----
    const btnExcluir = e.target.closest(".btnExcluirAlta");
    if (btnExcluir) {
        const { chave, lista, indice, registro } = await buscarRegistro(btnExcluir.dataset.id);
        if (!registro) return;

        const nome = nomeDoRegistro(registro, abaAltas);

        const escolha = await Swal.fire({
            icon: "warning",
            title: "Excluir paciente",
            html: `O que deseja fazer com <strong>${escaparHTML(nome)}</strong>?<br><br>
                <small style="color:#9a9a88;">Na <strong>Lixeira</strong> ainda dá para restaurar depois.
                <strong>Excluir definitivamente</strong> apaga o paciente e todo o prontuário, sem volta.</small>`,
            showCancelButton: true,
            showDenyButton: true,
            confirmButtonText: "Mover para a Lixeira",
            denyButtonText: "Excluir definitivamente",
            cancelButtonText: "Cancelar",
            confirmButtonColor: "#8a9e78",
            denyButtonColor: "#aa3a3a"
        });

        if (escolha.isConfirmed) {
            registro.excluido = true;
            registro.excluidoEm = new Date().toISOString();
            await window.storage.setItem(chave, JSON.stringify(lista));
            await carregarAltas();
            mostrarMensagem(`${nome} foi movido(a) para a Lixeira.`, "success");
            return;
        }

        if (escolha.isDenied) {
            const certeza = await mostrarConfirmacao(
                `Isso apaga ${nome} e todo o prontuário DEFINITIVAMENTE, sem chance de recuperar. Tem certeza?`
            );
            if (!certeza.isConfirmed) return;

            // relê antes de apagar, para não perder nada que tenha mudado nesse meio-tempo
            const atual = await buscarRegistro(btnExcluir.dataset.id);
            if (atual.indice < 0) return;
            atual.lista.splice(atual.indice, 1);
            await window.storage.setItem(atual.chave, JSON.stringify(atual.lista));

            await carregarAltas();
            mostrarMensagem(`${nome} foi excluído(a) definitivamente.`, "success");
        }
    }
});

carregarAltas();
