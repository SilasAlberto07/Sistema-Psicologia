// ===============================
// SAUDAÇÃO DINÂMICA
// ===============================
function gerarSaudacao() {
    const hora = new Date().getHours();
    if (hora < 12) return "Bom dia";
    if (hora < 18) return "Boa tarde";
    return "Boa noite";
}

const saudacaoEl = document.getElementById("saudacaoCadastro");
if (saudacaoEl) {
    saudacaoEl.textContent = `${gerarSaudacao()}, Dra. Cláudia Bethânia`;
}

// ===============================
// DATA ATUAL POR EXTENSO
// ===============================
const dataEl = document.getElementById("dataAtualCadastro");
if (dataEl) {
    const hoje = new Date();
    const dataFormatada = hoje.toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    });
    dataEl.textContent = dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1);
}
