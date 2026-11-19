// ═══════════════════════════════════════════════
// CADASTRO INSTITUCIONAL – PSICOLOGIA ORGANIZACIONAL
// novaempresa.html            → nova empresa
// novaempresa.html?id=<id>    → editar empresa (os documentos dela são mantidos)
// ═══════════════════════════════════════════════

const formEmpresa = document.getElementById("formEmpresa");
const idEditEmpresa = new URLSearchParams(window.location.search).get("id");
const $e = (id) => document.getElementById(id);

// campos do formulário = mesmas chaves salvas na empresa
const CAMPOS_EMPRESA = [
    "razaoSocial", "nomeFantasia", "cnpj", "ramo", "endereco", "cidadeEstado", "cep",
    "respNome", "respCargo", "respTelefone", "respEmail",
    "totalColaboradores", "qtdSetores", "respRH",
    "escopo", "dataInicio", "periodoQtd", "periodoUnidade", "dataTermino", "respProjeto",
    "dataCadastro", "observacoes"
];

// ---------------- máscaras simples ----------------
function mascaraCNPJ(v) {
    const d = v.replace(/\D/g, "").slice(0, 14);
    return d
        .replace(/^(\d{2})(\d)/, "$1.$2")
        .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/\.(\d{3})(\d)/, ".$1/$2")
        .replace(/(\d{4})(\d)/, "$1-$2");
}

function mascaraCEP(v) {
    const d = v.replace(/\D/g, "").slice(0, 8);
    return d.replace(/^(\d{5})(\d)/, "$1-$2");
}

function mascaraTelefone(v) {
    const d = v.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 10) return d.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
    return d.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}

$e("cnpj").addEventListener("input", (ev) => { ev.target.value = mascaraCNPJ(ev.target.value); });
$e("cep").addEventListener("input", (ev) => { ev.target.value = mascaraCEP(ev.target.value); });
$e("respTelefone").addEventListener("input", (ev) => { ev.target.value = mascaraTelefone(ev.target.value); });

// ---------------- término previsto (início + período) ----------------
// recalcula sozinho, a não ser que a Dra tenha mudado o término à mão
let terminoManual = false;
$e("dataTermino").addEventListener("input", () => { terminoManual = !!$e("dataTermino").value; });

function recalcularTermino() {
    if (terminoManual) return;
    $e("dataTermino").value = Empresas.calcularTermino($e("dataInicio").value, $e("periodoQtd").value, $e("periodoUnidade").value);
}

["dataInicio", "periodoQtd", "periodoUnidade"].forEach(id => {
    $e(id).addEventListener("input", () => { terminoManual = false; recalcularTermino(); });
    $e(id).addEventListener("change", () => { terminoManual = false; recalcularTermino(); });
});

// ---------------- carregar ----------------
async function iniciarCadastroEmpresa() {
    const lista = await Empresas.lerTodas();

    if (idEditEmpresa) {
        const empresa = lista.find(e => String(e.id) === String(idEditEmpresa));
        if (!empresa) {
            mostrarMensagem("Empresa não encontrada.", "warning", () => window.location.href = "empresas.html");
            return;
        }
        $e("codigo").value = empresa.codigo || "";
        CAMPOS_EMPRESA.forEach(c => { if (empresa[c] !== undefined && $e(c)) $e(c).value = empresa[c]; });
        if (!empresa.periodoUnidade) $e("periodoUnidade").value = "meses";
        // término diferente do calculado = foi ajustado à mão: não recalcula por cima
        terminoManual = !!empresa.dataTermino &&
            empresa.dataTermino !== Empresas.calcularTermino(empresa.dataInicio, empresa.periodoQtd, empresa.periodoUnidade);
        $e("tituloPagina").textContent = `Editar Empresa – ${Empresas.nome(empresa)}`;
        $e("textoSalvar").textContent = "Salvar Alterações";
        document.title = "Editar Empresa";
    } else {
        $e("codigo").value = Empresas.proximoCodigo(lista);
        $e("dataCadastro").value = Empresas.hojeISO();
    }
}

// ---------------- salvar ----------------
formEmpresa.addEventListener("submit", async (ev) => {
    ev.preventDefault();

    const razao = $e("razaoSocial").value.trim();
    const fantasia = $e("nomeFantasia").value.trim();
    if (!razao && !fantasia) {
        $e("razaoSocial").focus();
        mostrarMensagem("Informe a razão social ou o nome fantasia da empresa.", "warning");
        return;
    }

    const dados = {};
    CAMPOS_EMPRESA.forEach(c => { dados[c] = ($e(c).value || "").trim(); });

    // lê a lista na hora de salvar (para não apagar nada que mudou enquanto a tela estava aberta)
    const lista = await Empresas.lerTodas();
    const agora = new Date().toISOString();

    if (idEditEmpresa) {
        const empresa = lista.find(e => String(e.id) === String(idEditEmpresa));
        if (!empresa) {
            mostrarMensagem("Empresa não encontrada. Nada foi alterado.", "error");
            return;
        }
        // só troca os campos do formulário — documentos e o resto ficam como estão
        Object.assign(empresa, dados, { atualizadoEm: agora });
    } else {
        lista.push({
            id: Empresas.novoId(),
            codigo: Empresas.proximoCodigo(lista),
            criadoEm: agora,
            atualizadoEm: agora,
            arquivada: false,
            ...dados,
            documentos: []
        });
    }

    await Empresas.salvarTodas(lista);

    mostrarMensagem(idEditEmpresa ? "Cadastro da empresa atualizado!" : "Empresa cadastrada com sucesso!", "success",
        () => window.location.href = "empresas.html");
});

// ---------------- limpar ----------------
$e("limpar").addEventListener("click", async () => {
    const r = await mostrarConfirmacao("Limpar todos os campos do formulário?");
    if (!r.isConfirmed) return;
    CAMPOS_EMPRESA.forEach(c => { if ($e(c)) $e(c).value = ""; });
    $e("periodoUnidade").value = "meses";
    if (!idEditEmpresa) $e("dataCadastro").value = Empresas.hojeISO();
    terminoManual = false;
});

iniciarCadastroEmpresa();
