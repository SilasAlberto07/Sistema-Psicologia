// ═══════════════════════════════════════════════
// RECIBO DE PRESTAÇÃO DE SERVIÇOS PSICOLÓGICOS
// (tela Documentos — usa as variáveis de documentos.js:
//  inputPaciente, tipoDocumento, mapaOpcoes, pacientes, casais, hojeISO,
//  lerValorBR, formatarValorBR, marcarEdicao, encerrarEdicao,
//  destinoDaSelecao, CAMPOS_EDICAO, mostrarMensagem, mostrarConfirmacao)
//
// A descrição dos serviços é montada com a quantidade de testes e o teste
// escolhido (só o procedimento; as sessões a Dra escreve à mão quando precisar). Enquanto a Dra não mexer
// no texto, ele acompanha os campos; depois de editado, não é mais trocado
// (a não ser pelo botão "Montar o texto de novo com os campos").
// Embaixo aparece uma prévia do recibo, atualizada enquanto ela digita.
// ═══════════════════════════════════════════════

const $rc = (id) => document.getElementById(id);

// [chave nos dados, id do campo] — a lista fica em documentos.js (CAMPOS_EDICAO.recibo)
const CAMPOS_RECIBO = CAMPOS_EDICAO.recibo.filter(([chave]) => chave !== "cidadeEstado");

// ------------------------------------------
// Números por extenso (valor em reais e quantidades)
// ------------------------------------------
const EXT_UN = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze",
    "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
const EXT_DEZ = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const EXT_CEM = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos",
    "oitocentos", "novecentos"];

function extensoAte999(n) {
    if (n === 100) return "cem";
    const partes = [];
    if (n >= 100) { partes.push(EXT_CEM[Math.floor(n / 100)]); n %= 100; }
    if (n >= 20) { partes.push(EXT_DEZ[Math.floor(n / 10)]); n %= 10; }
    if (n > 0) partes.push(EXT_UN[n]);
    return partes.join(" e ");
}

function extensoInteiro(n) {
    if (n === 0) return "zero";
    const milhoes = Math.floor(n / 1000000);
    const milhares = Math.floor((n % 1000000) / 1000);
    const resto = n % 1000;
    const grupos = [];
    if (milhoes) grupos.push(milhoes === 1 ? "um milhão" : `${extensoAte999(milhoes)} milhões`);
    if (milhares) grupos.push(milhares === 1 ? "mil" : `${extensoAte999(milhares)} mil`);
    if (resto) grupos.push(extensoAte999(resto));
    if (grupos.length === 1) return grupos[0];
    const ultimo = grupos.pop();
    const usaE = resto && (resto < 100 || resto % 100 === 0);
    return grupos.join(" ") + (usaE ? " e " : " ") + ultimo;
}

// 1630 → "mil seiscentos e trinta reais"
function valorPorExtenso(valor) {
    const totalCentavos = Math.round(valor * 100);
    const reais = Math.floor(totalCentavos / 100);
    const centavos = totalCentavos % 100;
    let texto = "";
    if (reais) {
        const milhaoRedondo = reais >= 1000000 && reais % 1000000 === 0;
        texto = `${extensoInteiro(reais)}${milhaoRedondo ? " de" : ""} ${reais === 1 ? "real" : "reais"}`;
    }
    if (centavos) texto += `${texto ? " e " : ""}${extensoAte999(centavos)} ${centavos === 1 ? "centavo" : "centavos"}`;
    return texto || "zero reais";
}

// 6, "f" → "06 (seis)"; 1, "m" → "01 (um)"; 2, "f" → "02 (duas)"
function quantidadePorExtenso(n, genero) {
    let texto = extensoInteiro(n);
    if (genero === "f") {
        texto = texto.replace(/\bum\b/g, "uma").replace(/\bdois\b/g, "duas")
            .replace(/entos\b/g, "entas"); // duzentas, trezentas...
    }
    return `${String(n).padStart(2, "0")} (${texto})`;
}

// ------------------------------------------
// Mostra os campos do recibo (e o botão Visualizar)
// ------------------------------------------
function mostrarCamposRecibo() {
    const ehRecibo = tipoDocumento.value === "recibo";
    $rc("camposRecibo").style.display = ehRecibo ? "block" : "none";
    $rc("btnVisualizarRecibo").style.display = ehRecibo ? "" : "none";
    if (ehRecibo) {
        preencherPacienteRecibo();
        if (!$rc("rcDataEmissao").value) $rc("rcDataEmissao").value = hojeISO();
        montarDescricaoRecibo();
        atualizarPreviaRecibo();
    }
}

tipoDocumento.addEventListener("change", mostrarCamposRecibo);

// ------------------------------------------
// Ao escolher o paciente: completa nome e CPF
// (só troca o que estiver vazio ou o que o próprio sistema colocou)
// ------------------------------------------
const ultimoAutomaticoRecibo = {};

function completarCampoRecibo(id, valor) {
    const campo = $rc(id);
    if (!campo.value.trim() || campo.value === ultimoAutomaticoRecibo[id]) {
        campo.value = valor || "";
        ultimoAutomaticoRecibo[id] = campo.value;
    }
}

function preencherPacienteRecibo() {
    const selecao = mapaOpcoes[inputPaciente.value.trim()];
    if (!selecao) return;
    let nome = "", cpf = "";
    if (selecao.origem === "casal") {
        const casal = casais.find(c => String(c.id) === String(selecao.id));
        if (!casal) return;
        nome = casal[`${selecao.pessoa}NomeCompleto`];
        cpf = casal[`${selecao.pessoa}Cpf`];
    } else {
        const paciente = pacientes.find(p => String(p.id) === String(selecao.id));
        if (!paciente) return;
        nome = paciente.nomeCompleto;
        cpf = paciente.cpf;
    }
    completarCampoRecibo("rcNome", nome);
    completarCampoRecibo("rcCpf", cpf);
    atualizarPreviaRecibo();
}

inputPaciente.addEventListener("change", () => {
    if (tipoDocumento.value === "recibo") preencherPacienteRecibo();
});

// ------------------------------------------
// Valor por extenso
// ------------------------------------------
function atualizarExtensoRecibo() {
    const valor = lerValorBR($rc("rcValor").value);
    $rc("rcValorExtenso").value = valor === null ? "" : valorPorExtenso(valor);
}

// ------------------------------------------
// Texto da descrição — montado com os campos, editável
// ------------------------------------------
const rcDescricao = $rc("rcDescricao");
let ultimaDescricaoAutomatica = "";

function textoPadraoDescricaoRecibo() {
    const qtdTeste = parseInt($rc("rcQtdTeste").value, 10) > 0 ? parseInt($rc("rcQtdTeste").value, 10) : 1;
    const teste = $rc("rcTipoTeste").value;
    const procedimento = qtdTeste === 1 ? "procedimento" : "procedimentos";
    return `${quantidadePorExtenso(qtdTeste, "m")} ${procedimento} de avaliação psicológica complementar, com utilização do instrumento ${teste}, mediante indicação técnica.`;
}

// forcar = true → troca mesmo se o texto já foi editado
function montarDescricaoRecibo(forcar = false) {
    const atual = rcDescricao.value.trim();
    const foiEditado = atual && atual !== ultimaDescricaoAutomatica.trim();
    if (foiEditado && !forcar) return;
    ultimaDescricaoAutomatica = textoPadraoDescricaoRecibo();
    rcDescricao.value = ultimaDescricaoAutomatica;
}

["rcQtdTeste", "rcTipoTeste"].forEach(id => {
    $rc(id).addEventListener("input", () => { montarDescricaoRecibo(); atualizarPreviaRecibo(); });
    $rc(id).addEventListener("change", () => { montarDescricaoRecibo(); atualizarPreviaRecibo(); });
});

$rc("btnRefazerTextoRecibo").addEventListener("click", async () => {
    if (rcDescricao.value.trim() && rcDescricao.value.trim() !== ultimaDescricaoAutomatica.trim()) {
        const resposta = await mostrarConfirmacao("O texto que você editou será trocado pelo texto montado com os campos. Continuar?");
        if (!resposta.isConfirmed) return;
    }
    montarDescricaoRecibo(true);
    atualizarPreviaRecibo();
});

// ------------------------------------------
// Prévia do recibo (mesmo texto que sai na impressão)
// ------------------------------------------
function escRecibo(texto) {
    return String(texto ?? "").replace(/[&<>"']/g, (c) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
}

function dadosDoRecibo() {
    const dados = { tipo: "recibo" };
    CAMPOS_RECIBO.forEach(([chave, id]) => { dados[chave] = $rc(id).value.trim(); });
    dados.valorExtenso = $rc("rcValorExtenso").value.trim();
    dados.cidadeEstado = document.getElementById("cidadeEstado").value.trim();
    return dados;
}

function atualizarPreviaRecibo() {
    atualizarExtensoRecibo();
    if (tipoDocumento.value !== "recibo") return;
    $rc("previaRecibo").innerHTML = `<div class="previa-recibo-folha">${ReciboModelo.corpoHTML(dadosDoRecibo())}
        <div class="previa-recibo-assinatura">
            <div class="linha"></div>
            ${ReciboModelo.ASSINATURA}
        </div></div>`;
}

["rcNome", "rcCpf", "rcValor", "rcDescricao", "rcFormaPagamento", "rcDataPagamento", "rcDataEmissao", "cidadeEstado"].forEach(id => {
    $rc(id).addEventListener("input", atualizarPreviaRecibo);
    $rc(id).addEventListener("change", atualizarPreviaRecibo);
});

// chamado por documentos.js depois de abrir um recibo para editar
function aposAbrirReciboParaEditar() {
    ultimaDescricaoAutomatica = textoPadraoDescricaoRecibo();
    atualizarPreviaRecibo();
}

// ------------------------------------------
// Gerar e imprimir / Visualizar
// visualizar = true → abre a folha com os botões, sem imprimir
// (só guarda nos documentos do paciente quando clicar em Imprimir)
// ------------------------------------------
function gerarRecibo(visualizar) {
    const dados = dadosDoRecibo();

    const selecao = mapaOpcoes[inputPaciente.value.trim()];
    if (selecao) {
        dados.pacienteId = selecao.id;
        dados.destino = destinoDaSelecao(selecao);
    }
    if (!visualizar) marcarEdicao(dados);
    else if (typeof edicao !== "undefined" && edicao) dados.substitui = edicao.doc.id;

    localStorage.setItem("documentoTemp", JSON.stringify(dados));
    window.open(`imprimir-documento.html${visualizar ? "?visualizar=true" : ""}`, "_blank");
    if (!visualizar) encerrarEdicao();
}

$rc("btnVisualizarRecibo").addEventListener("click", () => gerarRecibo(true));

// abre já com a quantidade de teste em 1
if (!$rc("rcQtdTeste").value) $rc("rcQtdTeste").value = "1";

// se a página já abriu com o recibo escolhido (ex.: editar pela tela Sessões),
// mostra os campos e a prévia com o que já estava preenchido
if (tipoDocumento.value === "recibo") {
    mostrarCamposRecibo();
    aposAbrirReciboParaEditar();
}

// ═══════════════════════════════════════════════
// RECIBOS EMITIDOS — lista com todos os recibos guardados
//  - sem cadastro: lista "recibos" (sincronizada entre os computadores)
//  - paciente cadastrado: guardado no cadastro dele (também aparece em Sessões)
// Recibo não é apagado: quando precisar, é cancelado (fica no histórico).
// ═══════════════════════════════════════════════
let recibosEmitidos = [];
let urlVisorRecibo = null;

function dataHoraRecibo(iso) {
    const d = new Date(iso);
    if (!iso || isNaN(d)) return "";
    return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function dataEmissaoRecibo(item) {
    const m = String((item.doc.dados || {}).dataEmissao || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : dataHoraRecibo(item.doc.criadoEm).slice(0, 10);
}

async function carregarRecibosEmitidos() {
    try { recibosEmitidos = await DocsPaciente.listarRecibos(); }
    catch (e) { recibosEmitidos = []; }
    desenharRecibosEmitidos();
}

function desenharRecibosEmitidos() {
    const caixa = $rc("listaRecibosEmitidos");
    const filtro = $rc("rcFiltro").value;
    const busca = $rc("rcBusca").value.trim().toLowerCase();
    const soNumeros = busca.replace(/\D/g, "");

    const visiveis = recibosEmitidos.filter(item => {
        const status = item.doc.status || "ativo";
        if (filtro === "ativos" && status !== "ativo") return false;
        if (filtro === "cancelados" && status !== "cancelado") return false;
        if (!busca) return true;
        const d = item.doc.dados || {};
        const texto = `${d.nomeCompleto || item.doc.nomePessoa || ""} ${d.cpf || ""} ${d.valor || ""}`.toLowerCase();
        return texto.includes(busca) || (soNumeros && texto.replace(/\D/g, "").includes(soNumeros));
    });

    if (!visiveis.length) {
        caixa.innerHTML = `<div class="recibos-vazio"><i class="ti ti-receipt-off"></i>
            ${recibosEmitidos.length ? "Nenhum recibo encontrado com esse filtro." : "Nenhum recibo emitido ainda."}</div>`;
        caixa._itens = [];
        return;
    }

    caixa.innerHTML = visiveis.map((item, i) => {
        const doc = item.doc;
        const d = doc.dados || {};
        const status = doc.status || "ativo";
        const cadastrado = item.origem !== "recibo";
        let etiqueta = "";
        if (status === "cancelado") {
            etiqueta = `<span class="recibo-status cancelado">Cancelado em ${escRecibo(dataHoraRecibo(doc.canceladoEm))}${doc.motivoCancelamento ? ` · ${escRecibo(doc.motivoCancelamento)}` : ""}</span>`;
        } else if (status === "substituido") {
            etiqueta = `<span class="recibo-status substituido">Versão antiga — substituída em ${escRecibo(dataHoraRecibo(doc.substituidoEm))}</span>`;
        }
        const numero = lerValorBR(d.valor);
        const valor = d.valor ? `R$ ${escRecibo(numero === null ? d.valor : formatarValorBR(numero))}` : "—";
        return `
            <div class="recibo-item ${status !== "ativo" ? "inativo" : ""}" data-indice="${i}">
                <div class="recibo-item-icone"><i class="ti ti-receipt"></i></div>
                <div class="recibo-item-info">
                    <div class="recibo-item-linha1">
                        <strong>${escRecibo(d.nomeCompleto || doc.nomePessoa || "Sem nome")}</strong>
                        <span class="recibo-tag ${cadastrado ? "cadastrado" : "avulso"}">${cadastrado ? "Paciente cadastrado" : "Sem cadastro"}</span>
                    </div>
                    <div class="recibo-item-linha2">
                        <span><i class="ti ti-calendar"></i> ${escRecibo(dataEmissaoRecibo(item))}</span>
                        <span><i class="ti ti-cash"></i> ${valor}</span>
                        ${d.formaPagamento ? `<span><i class="ti ti-credit-card"></i> ${escRecibo(d.formaPagamento)}</span>` : ""}
                        ${d.cpf ? `<span>CPF ${escRecibo(d.cpf)}</span>` : ""}
                    </div>
                    ${etiqueta}
                </div>
                <div class="recibo-item-acoes">
                    ${doc.pdf ? `<button type="button" data-acao="abrir" title="Abrir"><i class="ti ti-eye"></i> Abrir</button>` : ""}
                    ${doc.pdf ? `<button type="button" data-acao="baixar" title="Baixar PDF"><i class="ti ti-download"></i></button>` : ""}
                    ${status === "ativo" ? `<button type="button" data-acao="editar" title="Editar"><i class="ti ti-pencil"></i></button>` : ""}
                    ${status === "ativo" ? `<button type="button" data-acao="cancelar" class="perigo" title="Cancelar recibo"><i class="ti ti-ban"></i></button>` : ""}
                </div>
            </div>`;
    }).join("");
    caixa._itens = visiveis;
}

$rc("rcBusca").addEventListener("input", desenharRecibosEmitidos);
$rc("rcFiltro").addEventListener("change", desenharRecibosEmitidos);

$rc("listaRecibosEmitidos").addEventListener("click", async (e) => {
    const botao = e.target.closest("button[data-acao]");
    if (!botao) return;
    const linha = botao.closest(".recibo-item");
    const item = ($rc("listaRecibosEmitidos")._itens || [])[Number(linha.dataset.indice)];
    if (!item) return;
    const acao = botao.dataset.acao;
    if (acao === "abrir") abrirReciboEmitido(item);
    if (acao === "baixar") baixarReciboEmitido(item);
    if (acao === "editar") editarReciboEmitido(item);
    if (acao === "cancelar") await cancelarReciboEmitido(item);
});

function nomePdfRecibo(item) {
    const d = item.doc.dados || {};
    const nome = d.nomeCompleto || item.doc.nomePessoa || "";
    return `Recibo${nome ? ` - ${nome}` : ""} ${String(item.doc.criadoEm || "").slice(0, 10)}.pdf`.replace(/[\\/:*?"<>|]/g, "-");
}

function abrirReciboEmitido(item) {
    $rc("visorReciboTitulo").textContent = nomePdfRecibo(item).replace(/\.pdf$/, "");
    urlVisorRecibo = DocsPaciente.dataURLParaBlobURL(item.doc.pdf);
    $rc("visorReciboCorpo").innerHTML = `<iframe src="${urlVisorRecibo}"></iframe>`;
    $rc("visorRecibo").classList.remove("oculto");
}

function fecharVisorRecibo() {
    $rc("visorRecibo").classList.add("oculto");
    $rc("visorReciboCorpo").innerHTML = "";
    if (urlVisorRecibo) { URL.revokeObjectURL(urlVisorRecibo); urlVisorRecibo = null; }
}

$rc("fecharVisorRecibo").addEventListener("click", fecharVisorRecibo);
$rc("visorRecibo").addEventListener("click", (e) => { if (e.target === $rc("visorRecibo")) fecharVisorRecibo(); });

function baixarReciboEmitido(item) {
    const url = DocsPaciente.dataURLParaBlobURL(item.doc.pdf);
    const a = document.createElement("a");
    a.href = url;
    a.download = nomePdfRecibo(item);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function editarReciboEmitido(item) {
    // paciente cadastrado: usa a edição normal (igual pela tela Sessões)
    const params = item.origem === "recibo"
        ? new URLSearchParams({ editarRecibo: item.doc.id })
        : new URLSearchParams({ editarDoc: item.doc.id, origem: item.origem, id: item.idRegistro });
    window.location.href = `documentos.html?${params}`;
}

async function cancelarReciboEmitido(item) {
    const d = item.doc.dados || {};
    const resposta = await Swal.fire({
        icon: "warning",
        title: "Cancelar recibo?",
        html: `<p style="margin-bottom:10px"><strong>${escRecibo(d.nomeCompleto || item.doc.nomePessoa || "")}</strong>
               ${d.valor ? ` · R$ ${escRecibo(lerValorBR(d.valor) === null ? d.valor : formatarValorBR(lerValorBR(d.valor)))}` : ""} · ${escRecibo(dataEmissaoRecibo(item))}</p>
               <p style="font-size:13px;color:#777">O recibo continua guardado, marcado como <strong>cancelado</strong>.</p>`,
        input: "text",
        inputPlaceholder: "Motivo (opcional)",
        showCancelButton: true,
        confirmButtonText: "Cancelar recibo",
        cancelButtonText: "Voltar",
        confirmButtonColor: "#c0392b"
    });
    if (!resposta.isConfirmed) return;
    const motivo = String(resposta.value || "").trim();
    const ok = item.origem === "recibo"
        ? await DocsPaciente.cancelarReciboAvulso(item.doc.id, motivo)
        : await DocsPaciente.cancelarDocumento(item.origem, item.idRegistro, item.doc.id, motivo);
    if (ok) mostrarMensagem("Recibo cancelado.", "success");
    else mostrarMensagem("Não foi possível cancelar o recibo.", "error");
    await carregarRecibosEmitidos();
}

// abre um recibo sem cadastro para editar (chamado por documentos.js com ?editarRecibo=)
async function abrirReciboAvulsoParaEditar(idRecibo) {
    const lista = await DocsPaciente.lerRecibosAvulsos();
    const doc = lista.find(d => d.id === idRecibo);
    history.replaceState(null, "", window.location.pathname);
    if (!doc) {
        mostrarMensagem("Recibo não encontrado para editar.", "warning");
        return;
    }
    inputPaciente.value = "";
    tipoDocumento.value = "recibo";
    tipoDocumento.dispatchEvent(new Event("change"));
    const dados = doc.dados || {};
    CAMPOS_EDICAO.recibo.forEach(([chave, id]) => {
        const campo = document.getElementById(id);
        if (campo && dados[chave] !== undefined) campo.value = dados[chave];
    });
    aposAbrirReciboParaEditar();

    edicao = { doc, origem: "recibo", id: null };
    if (avisoEdicao) {
        avisoEdicao.innerHTML = `<i class="ti ti-pencil"></i> Editando o recibo de <strong>${escRecibo(dados.nomeCompleto || "")}</strong>
            de ${new Date(doc.criadoEm).toLocaleDateString("pt-BR")}.
            Ao gerar, a versão anterior fica guardada como <strong>substituída</strong>.
            <button type="button" id="btnSairEdicao">Sair da edição</button>`;
        avisoEdicao.style.display = "";
        document.getElementById("btnSairEdicao").onclick = () => window.location.href = "documentos.html";
    }
}

// a lista aparece só com o Recibo escolhido; atualiza ao voltar para esta janela
// (depois de imprimir um recibo na outra janela)
function mostrarListaRecibos() {
    const ehRecibo = tipoDocumento.value === "recibo";
    $rc("secaoRecibosEmitidos").style.display = ehRecibo ? "" : "none";
    if (ehRecibo) carregarRecibosEmitidos();
}

tipoDocumento.addEventListener("change", mostrarListaRecibos);
window.addEventListener("focus", () => { if (tipoDocumento.value === "recibo") carregarRecibosEmitidos(); });
if (tipoDocumento.value === "recibo") mostrarListaRecibos();
