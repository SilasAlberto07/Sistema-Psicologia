const caminho = window.location.pathname.includes("/Pages/")
    ? "../components/menu.html"
    : "./components/menu.html";

fetch(caminho)
    .then(response => response.text())
    .then(html => {
        document.getElementById("menu").innerHTML = html;
        marcarLinkAtivo();
    });

// Destaca no menu o item correspondente à página atual
function marcarLinkAtivo() {
    const linkAtual = window.location.pathname.split("/").pop() || "index.html";

    document.querySelectorAll(".menu ul li a").forEach(link => {
        const linkPagina = link.getAttribute("href").split("/").pop();

        if (linkPagina === linkAtual) {
            link.parentElement.classList.add("ativo");
        }
    });
}
function encerrarSessao() {

    // encerra a sessão
    sessionStorage.removeItem("logado");

    // se quiser apagar outras informações da sessão
    // sessionStorage.clear();

    // detecta em qual pasta está
    if (window.location.pathname.includes("/Pages/")) {

        window.location.href = "../login.html";

    } else {

        window.location.href = "login.html";

    }

}

// ================================
// Aviso quando chegam dados do outro computador
// ================================
if (window.sincronizacao) {
    window.sincronizacao.aoAtualizarDados((info) => {
        const pagina = window.location.pathname.split("/").pop() || "index.html";
        const campoEmUso = document.activeElement &&
            ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName);

        // telas só de consulta: atualiza sozinha (se ninguém estiver digitando)
        const atualizaSozinha = ["index.html", "pacientes.html", "agenda.html", "lixeira.html", "configuracoes.html", "altas.html"];
        if (atualizaSozinha.includes(pagina) && !campoEmUso && !(info && info.renumerados && info.renumerados.length)) {
            window.location.reload();
            return;
        }

        mostrarAvisoSincronizacao(info);
    });
}

function mostrarAvisoSincronizacao(info) {
    let aviso = document.getElementById("aviso-sincronizacao");
    if (!aviso) {
        aviso = document.createElement("div");
        aviso.id = "aviso-sincronizacao";
        aviso.className = "aviso-sincronizacao";
        document.body.appendChild(aviso);
    }

    let texto = "Chegaram novidades do outro computador.";
    if (info && info.renumerados && info.renumerados.length) {
        const lista = info.renumerados.map(r => `${r.nome}: ${r.de} → ${r.para}`).join("; ");
        texto = `Dois cadastros tinham o mesmo código e um foi renumerado (${lista}).`;
    }

    aviso.innerHTML = `
        <i class="ti ti-arrows-exchange"></i>
        <span>${texto}</span>
        <button type="button" id="aviso-sincronizacao-atualizar">Atualizar tela</button>
        <button type="button" class="fechar" id="aviso-sincronizacao-fechar" title="Fechar">&times;</button>
    `;
    document.getElementById("aviso-sincronizacao-atualizar").onclick = () => window.location.reload();
    document.getElementById("aviso-sincronizacao-fechar").onclick = () => aviso.remove();
}
