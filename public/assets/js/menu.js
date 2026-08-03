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