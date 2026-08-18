function mostrarMensagem(texto, tipo = "success", callback = null) {

    Swal.fire({
        icon: tipo,
        title:
            tipo === "success" ? "Sucesso" :
            tipo === "error" ? "Erro" :
            tipo === "warning" ? "Atenção" :
            "Informação",
        text: texto,
        confirmButtonText: "OK"
    }).then(() => {

        if (callback) {
            callback();
        }

    });
}


function mostrarConfirmacao(texto) {

    return Swal.fire({
        icon: "warning",
        title: "Atenção",
        text: texto,
        showCancelButton: true,
        confirmButtonText: "Sim, continuar",
        cancelButtonText: "Cancelar"
    });
}