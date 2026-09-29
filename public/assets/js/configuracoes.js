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
