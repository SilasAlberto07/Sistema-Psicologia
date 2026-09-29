// ================================
// CONFIGURAÇÕES — Atualizações
// ================================
// As janelas de aviso ("já está atualizado", "nova versão disponível",
// barra de download etc.) são abertas pelo próprio programa (main.js).

const campoVersao = document.getElementById("versao-app");
const btnVerificar = document.getElementById("btnVerificarAtualizacao");

// Mostra a versão instalada
if (window.atualizacao) {
    window.atualizacao.versao()
        .then(versao => { campoVersao.textContent = versao; })
        .catch(() => { campoVersao.textContent = "desconhecida"; });
} else {
    campoVersao.textContent = "indisponível";
    btnVerificar.disabled = true;
}

// No Mac a atualização é manual (o macOS exige assinatura paga da Apple
// para o app se atualizar sozinho), então escondemos o botão lá.
if (window.atualizacao && window.atualizacao.plataforma === "darwin") {
    document.getElementById("texto-atualizacao").textContent =
        "No Mac, as atualizações são instaladas manualmente: " +
        "feche o programa e abra o instalador .pkg da nova versão. " +
        "Ele substitui a versão antiga e seus dados continuam salvos.";
    document.getElementById("botoes-atualizacao").style.display = "none";
}

btnVerificar.addEventListener("click", async () => {
    if (!window.atualizacao || btnVerificar.classList.contains("verificando")) return;

    const textoOriginal = btnVerificar.innerHTML;
    btnVerificar.classList.add("verificando");
    btnVerificar.innerHTML = '<i class="ti ti-refresh"></i> Verificando...';

    try {
        await window.atualizacao.verificar();
    } catch (erro) {
        mostrarMensagem("Não foi possível verificar se há atualizações.", "error");
    } finally {
        btnVerificar.classList.remove("verificando");
        btnVerificar.innerHTML = textoOriginal;
    }
});


// ================================
// CONFIGURAÇÕES — Trocar senha
// ================================
async function gerarHash(texto) {
    const encoder = new TextEncoder();
    const dados = encoder.encode(texto);
    const hashBuffer = await crypto.subtle.digest("SHA-256", dados);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

const campoSenhaAtual = document.getElementById("senhaAtual");
const campoSenhaNova = document.getElementById("senhaNovaTroca");
const campoConfirmar = document.getElementById("confirmarNovaTroca");
const erroSenha = document.getElementById("mensagem-erro-troca");
const btnSalvarSenha = document.getElementById("btnSalvarSenha");

function mostrarErroSenha(texto) {
    erroSenha.textContent = texto;
    erroSenha.style.display = "block";
}

async function trocarSenha() {
    erroSenha.style.display = "none";

    const atual = campoSenhaAtual.value;
    const nova = campoSenhaNova.value;
    const confirmar = campoConfirmar.value;

    const senhaSalva = await window.storage.getItem("senhaHash");
    const hashAtual = await gerarHash(atual);

    if (hashAtual !== senhaSalva) {
        mostrarErroSenha("Senha atual incorreta.");
        return;
    }

    if (nova.length < 4) {
        mostrarErroSenha("A nova senha precisa ter pelo menos 4 caracteres.");
        return;
    }

    if (nova !== confirmar) {
        mostrarErroSenha("As senhas novas não coincidem.");
        return;
    }

    const novoHash = await gerarHash(nova);
    await window.storage.setItem("senhaHash", novoHash);

    campoSenhaAtual.value = "";
    campoSenhaNova.value = "";
    campoConfirmar.value = "";

    mostrarMensagem("Senha alterada com sucesso!", "success");
}

btnSalvarSenha.addEventListener("click", trocarSenha);

// Enter em qualquer campo de senha também salva
[campoSenhaAtual, campoSenhaNova, campoConfirmar].forEach(campo => {
    campo.addEventListener("keydown", (e) => {
        if (e.key === "Enter") trocarSenha();
    });
});


// ================================
// CONFIGURAÇÕES — Sincronização entre computadores
// ================================
const syncEls = {
    bolinha: document.getElementById("syncBolinha"),
    texto: document.getElementById("syncStatusTexto"),
    detalhes: document.getElementById("syncDetalhes"),
    este: document.getElementById("syncEste"),
    pasta: document.getElementById("syncPasta"),
    outros: document.getElementById("syncOutros"),
    ultima: document.getElementById("syncUltima"),
    erro: document.getElementById("syncErro"),
    btnGoogle: document.getElementById("btnSyncGoogleDrive"),
    btnEscolher: document.getElementById("btnSyncEscolher"),
    btnAgora: document.getElementById("btnSyncAgora"),
    btnDesativar: document.getElementById("btnSyncDesativar"),
};

function tempoAtras(iso) {
    if (!iso) return "nunca";
    const segundos = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
    if (segundos < 60) return "agora há pouco";
    const minutos = Math.round(segundos / 60);
    if (minutos < 60) return `há ${minutos} min`;
    const horas = Math.round(minutos / 60);
    if (horas < 24) return `há ${horas} h`;
    return new Date(iso).toLocaleString("pt-BR");
}

function mostrarStatusSync(st) {
    if (!st || st.indisponivel) {
        syncEls.bolinha.className = "sync-bolinha erro";
        syncEls.texto.textContent = "Sincronização indisponível neste computador.";
        document.getElementById("syncBotoes").style.display = "none";
        return;
    }

    syncEls.erro.style.display = st.ultimoErro ? "block" : "none";
    syncEls.erro.textContent = st.ultimoErro || "";

    if (!st.ativa) {
        syncEls.bolinha.className = "sync-bolinha";
        syncEls.texto.textContent = "Desativada";
        syncEls.detalhes.style.display = "none";
        syncEls.btnGoogle.style.display = st.pastaSugerida ? "" : "none";
        syncEls.btnEscolher.style.display = "";
        syncEls.btnAgora.style.display = "none";
        syncEls.btnDesativar.style.display = "none";
        return;
    }

    syncEls.bolinha.className = "sync-bolinha " +
        (st.ultimoErro ? "erro" : st.sincronizando ? "trabalhando" : "ativa");
    syncEls.texto.textContent = st.ultimoErro ? "Ativa, com problema"
        : st.sincronizando ? "Sincronizando..." : "Ativa";

    syncEls.detalhes.style.display = "";
    syncEls.este.textContent = st.esteComputador;
    syncEls.pasta.textContent = st.pasta;
    syncEls.outros.innerHTML = st.outrosComputadores.length
        ? st.outrosComputadores.map(o =>
            `${o.nome} <span style="color:#9a9a88">(atualizado ${tempoAtras(o.atualizadoEm)})</span>`).join("<br>")
        : '<span style="color:#9a9a88">Nenhum ainda. Ative a sincronização no outro computador usando a mesma pasta.</span>';
    syncEls.ultima.textContent = tempoAtras(st.ultimaRecepcao);

    syncEls.btnGoogle.style.display = "none";
    syncEls.btnEscolher.style.display = "none";
    syncEls.btnAgora.style.display = "";
    syncEls.btnDesativar.style.display = "";
}

async function executarSync(acao, botao) {
    if (!window.sincronizacao) return;
    const original = botao.innerHTML;
    botao.disabled = true;
    botao.innerHTML = '<i class="ti ti-loader-2"></i> Aguarde...';
    try {
        mostrarStatusSync(await acao());
    } catch (e) {
        mostrarMensagem("Não foi possível concluir a sincronização.", "error");
    } finally {
        botao.disabled = false;
        botao.innerHTML = original;
    }
}

if (window.sincronizacao) {
    window.sincronizacao.status().then(mostrarStatusSync);
    setInterval(() => window.sincronizacao.status().then(mostrarStatusSync), 5000);

    syncEls.btnGoogle.addEventListener("click", () =>
        executarSync(() => window.sincronizacao.usarPastaSugerida(), syncEls.btnGoogle));

    syncEls.btnEscolher.addEventListener("click", () =>
        executarSync(() => window.sincronizacao.escolherPasta(), syncEls.btnEscolher));

    syncEls.btnAgora.addEventListener("click", () =>
        executarSync(() => window.sincronizacao.sincronizarAgora(), syncEls.btnAgora));

    syncEls.btnDesativar.addEventListener("click", async () => {
        const resposta = await mostrarConfirmacao(
            "Desativar a sincronização? Os dados deste computador continuam aqui, mas deixam de ser enviados e recebidos."
        );
        if (resposta.isConfirmed) {
            executarSync(() => window.sincronizacao.desativar(), syncEls.btnDesativar);
        }
    });
} else {
    mostrarStatusSync(null);
}
