// ═══════════════════════════════════════════════
// MÁSCARAS — coloca pontos, barra, traço e parênteses enquanto digita
// Uso no HTML:  <input data-mascara="cpf">   (cpf | telefone | cep | cnpj)
//
// Só formata quando a Dra digita ou cola no campo. Ao abrir um cadastro
// antigo para editar, o que já estava salvo aparece do jeito que estava.
// ═══════════════════════════════════════════════

const Mascaras = (() => {

    const so = (v, max) => String(v || "").replace(/\D/g, "").slice(0, max);

    const formatos = {
        cpf(v) {
            const d = so(v, 11);
            return d
                .replace(/^(\d{3})(\d)/, "$1.$2")
                .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
                .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
        },
        telefone(v) {
            const d = so(v, 11);
            if (!d) return "";
            if (d.length <= 2) return `(${d}`;
            if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
            if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
            return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
        },
        cep(v) {
            return so(v, 8).replace(/^(\d{5})(\d)/, "$1-$2");
        },
        cnpj(v) {
            const d = so(v, 14);
            return d
                .replace(/^(\d{2})(\d)/, "$1.$2")
                .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
                .replace(/\.(\d{3})(\d)/, ".$1/$2")
                .replace(/(\d{4})(\d)/, "$1-$2");
        }
    };

    const tamanhos = { cpf: 14, telefone: 15, cep: 9, cnpj: 18 };

    function aplicar(campo) {
        const tipo = campo.dataset.mascara;
        const formatar = formatos[tipo];
        if (!formatar || campo.dataset.mascaraLigada) return;
        campo.dataset.mascaraLigada = "1";
        if (!campo.getAttribute("maxlength")) campo.setAttribute("maxlength", tamanhos[tipo]);
        campo.setAttribute("inputmode", "numeric");

        campo.addEventListener("input", (ev) => {
            campo.dataset.mascaraDigitou = "1";
            // apagando: não força a máscara (deixa apagar o traço/parêntese)
            if (ev.inputType && ev.inputType.startsWith("delete")) return;
            const antes = campo.value;
            const depois = formatar(antes);
            if (antes !== depois) campo.value = depois;
        });
        campo.addEventListener("blur", () => {
            // só arruma se a Dra digitou neste campo (cadastro antigo fica como estava)
            if (campo.dataset.mascaraDigitou && campo.value.trim()) campo.value = formatar(campo.value);
        });
    }

    function ligarTodos(raiz = document) {
        raiz.querySelectorAll("[data-mascara]").forEach(aplicar);
    }

    ligarTodos();
    return { formatos, aplicar, ligarTodos };
})();
