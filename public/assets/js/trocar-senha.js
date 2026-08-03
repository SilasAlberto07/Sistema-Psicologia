async function gerarHash(texto) {
    const encoder = new TextEncoder();
    const dados = encoder.encode(texto);
    const hashBuffer = await crypto.subtle.digest("SHA-256", dados);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

async function trocarSenha() {
    const atual = document.getElementById("senhaAtual").value;
    const nova = document.getElementById("senhaNovaTroca").value;
    const confirmar = document.getElementById("confirmarNovaTroca").value;
    const erroDiv = document.getElementById("mensagem-erro-troca");

    const senhaSalva = await window.storage.getItem("senhaHash");
    const hashAtual = await gerarHash(atual);

    if (hashAtual !== senhaSalva) {
        erroDiv.textContent = "Senha atual incorreta.";
        erroDiv.style.display = "block";
        return;
    }

    if (nova.length < 4) {
        erroDiv.textContent = "A nova senha precisa ter pelo menos 4 caracteres.";
        erroDiv.style.display = "block";
        return;
    }

    if (nova !== confirmar) {
        erroDiv.textContent = "As senhas novas não coincidem.";
        erroDiv.style.display = "block";
        return;
    }

    const novoHash = await gerarHash(nova);
    await window.storage.setItem("senhaHash", novoHash);

    mostrarMensagem(
        "Senha alterada com sucesso!",
        "success",
        () => {
            window.location.href = "../index.html";
        }
    );
}

document.getElementById("btnSalvarSenha").addEventListener("click", trocarSenha);
document.getElementById("btnVoltar").addEventListener("click", () => history.back());