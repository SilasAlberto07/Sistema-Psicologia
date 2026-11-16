// ═══════════════════════════════════════════════
// BOTÃO "ABRIR CHATGPT" (Anamnese, Anamnese de Casal, Prontuário e Devolutiva)
// Abre o ChatGPT no navegador do computador, igual ao botão das Atividades.
// Qualquer botão com o atributo data-abrir-chatgpt usa esta função.
// ═══════════════════════════════════════════════
document.addEventListener("click", async (e) => {
    const botao = e.target.closest("[data-abrir-chatgpt]");
    if (!botao) return;

    if (window.linksExternos && window.linksExternos.abrirChatGPT) {
        const ok = await window.linksExternos.abrirChatGPT();
        if (!ok) mostrarMensagem("Não foi possível abrir o navegador. Acesse https://chatgpt.com manualmente.", "warning");
    } else {
        mostrarMensagem("Feche e abra o sistema novamente para ativar o botão do ChatGPT. Enquanto isso, acesse https://chatgpt.com no navegador.", "info");
    }
});
