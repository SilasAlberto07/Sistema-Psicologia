// A conferência da senha é feita no processo principal (app/auth.js)
async function trocarSenha() {
    const erroDiv = document.getElementById("mensagem-erro-troca");
    erroDiv.style.display = "none";

    const resultado = await window.auth.trocar(
        document.getElementById("senhaAtual").value,
        document.getElementById("senhaNovaTroca").value,
        document.getElementById("confirmarNovaTroca").value
    );

    if (!resultado.ok) {
        erroDiv.textContent = resultado.erro;
        erroDiv.style.display = "block";
        return;
    }

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