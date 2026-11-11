// ═══════════════════════════════════════════════
// FOLHA PADRÃO — monta qualquer folha de impressão no mesmo modelo do contrato
// (faixa verde com o título no topo, rodapé com logo e contato).
//
// As páginas continuam gerando o mesmo HTML de sempre (<div class="prontuario">...).
// Depois disso, basta chamar:
//     FolhaPadrao.aplicar(container).then(() => window.print());
// Para documento curto de uma página (atestado, declaração):
//     FolhaPadrao.aplicar(container, { centralizar: true })
// A função troca o cabeçalho antigo pela faixa do topo, tira a marca d'água e o
// rodapé de texto, e coloca o conteúdo entre topo e rodapé (que repetem em cada página).
// O retorno é uma promessa que termina quando fontes e logo já carregaram.
// ═══════════════════════════════════════════════
const FolhaPadrao = (() => {

    const PSICOLOGA = {
        nome: "Cláudia Bethânia Prechedes dos Santos Rocha da Silva",
        crp: "18/9851",
        telefone: "(66) 99689-4144",
        email: "maclaudiabethaniapsicologa@gmail.com"
    };

    const ICONE_TELEFONE = `<svg viewBox="0 0 24 24" fill="none" stroke="#7a8e69" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>`;
    const ICONE_EMAIL = `<svg viewBox="0 0 24 24" fill="none" stroke="#7a8e69" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>`;

    function esc(texto) {
        return String(texto ?? "").replace(/[&<>"']/g, (c) => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        }[c]));
    }

    function esperarCarregar(raiz) {
        const fontes = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
        const imagens = [...raiz.querySelectorAll("img")].map(img => img.complete
            ? Promise.resolve()
            : new Promise(ok => { img.onload = img.onerror = ok; }));
        return Promise.all([fontes, ...imagens]).then(() => undefined);
    }

    // opcoes.centralizar = true → folha de uma página, conteúdo no meio (atestado, declaração)
    function aplicar(container, opcoes = {}) {
        const antiga = container && container.querySelector(".prontuario");
        if (!antiga) return Promise.resolve(); // mensagens como "Paciente não encontrado"

        // título: o <h1> do cabeçalho antigo
        const cabecalho = antiga.querySelector(".cabecalho-print");
        const titulo = cabecalho && cabecalho.querySelector("h1")
            ? cabecalho.querySelector("h1").textContent.replace(/\s+/g, " ").trim()
            : document.title;

        // selo "Confidencial" vai para a faixa do topo
        const selo = antiga.querySelector(".tag-confidencial");

        // peças substituídas pelo topo e rodapé do modelo
        antiga.querySelectorAll(".cabecalho-print, .marca-dagua, .rodape-contato, .tag-confidencial")
            .forEach(el => el.remove());

        const folha = document.createElement("div");
        folha.className = opcoes.centralizar ? "folha folha-centralizada" : "folha";
        folha.innerHTML = `
            <div class="topo">
                <h1 class="${titulo.length > 46 ? "longo" : ""}">${esc(titulo)}</h1>
                <div class="traco"></div>
            </div>

            <div class="rodape">
                <div class="contato">
                    <div class="logo"><img src="../assets/img/logo-contrato-verde.png" alt="Cláudia Bethânia Psicóloga"></div>
                    <div class="separador"></div>
                    <div class="dados">
                        <strong>${esc(PSICOLOGA.nome)} · CRP ${esc(PSICOLOGA.crp)}</strong>
                        <span>${ICONE_TELEFONE}${esc(PSICOLOGA.telefone)}</span>
                        <span>${ICONE_EMAIL}${esc(PSICOLOGA.email)}</span>
                    </div>
                </div>
                <div class="faixa"></div>
            </div>

            <table class="layout">
                <thead><tr><td><div class="espaco-topo"></div></td></tr></thead>
                <tfoot><tr><td><div class="espaco-rodape"></div></td></tr></tfoot>
                <tbody><tr><td><div class="texto"></div></td></tr></tbody>
            </table>
        `;

        if (selo) folha.querySelector(".topo").appendChild(selo);

        // move o conteúdo (mantém os mesmos elementos, sem recriar)
        const texto = folha.querySelector(".texto");
        while (antiga.firstChild) texto.appendChild(antiga.firstChild);

        antiga.replaceWith(folha);
        return esperarCarregar(folha);
    }

    return { aplicar, PSICOLOGA };
})();
