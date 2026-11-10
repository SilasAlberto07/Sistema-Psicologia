// ═══════════════════════════════════════════════
// CONFIGURAÇÕES → limite de atestados por paciente
// (usado em Documentos e em Sessões → Documentos)
// ═══════════════════════════════════════════════
(async function () {
    const campoLimite = document.getElementById("limiteAtestados");
    const erro = document.getElementById("mensagem-erro-documentos");
    const botao = document.getElementById("btnSalvarConfigDocumentos");
    if (!campoLimite || !botao) return;

    const config = await DocsPaciente.lerConfig();
    campoLimite.value = config.limiteAtestados;

    botao.addEventListener("click", async () => {
        const limite = parseInt(campoLimite.value, 10);
        if (!limite || limite < 1 || limite > 15) {
            erro.textContent = "Informe uma quantidade de atestados entre 1 e 15.";
            erro.style.display = "block";
            return;
        }
        erro.style.display = "none";
        await DocsPaciente.salvarConfig({ limiteAtestados: limite });
        mostrarMensagem("Limite de atestados salvo!", "success");
    });
})();
