// ═══════════════════════════════════════════════
// ANAMNESE DE CASAL — ficha (Pages/anamnese-casal.html)
// As perguntas ficam em anamnese-casal-campos.js
// Os dados ficam salvos em casal.anamneseCasal (tudo como texto)
// ═══════════════════════════════════════════════

const params = new URLSearchParams(window.location.search);
const idCasal = params.get("id");

const form = document.getElementById("formAnamneseCasal");
const containerSecoes = document.getElementById("secoesAnamnese");
const indice = document.getElementById("indiceAnamnese");
const avisoRascunho = document.getElementById("avisoRascunho");

const chaveRascunho = `draft_anamnese_casal_${idCasal}`;

let casal = null;
let nomes = { p1: "Pessoa 1", p2: "Pessoa 2" };

function escaparHTML(texto) {
    return String(texto ?? "").replace(/[&<>"']/g, (c) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
}

function rotulo(texto) {
    return escaparHTML(trocarNomesCasal(texto, nomes));
}

// ==========================================
// MONTAGEM DO FORMULÁRIO
// ==========================================

function htmlCampo(campo, nome) {
    const id = `campo_${nome}`;
    const label = rotulo(campo.l);

    switch (campo.t) {
        case "text":
        case "date":
        case "time":
            return `
                <div class="form-group w-100">
                    <label for="${id}">${label}</label>
                    <input type="${campo.t}" id="${id}" name="${nome}">
                </div>`;

        case "textarea":
            return `
                <div class="form-group w-100">
                    <label for="${id}">${label}</label>
                    <textarea id="${id}" name="${nome}" rows="1"></textarea>
                </div>`;

        case "radio":
            return `
                <div class="form-group w-100">
                    <label class="label-grupo">${label}</label>
                    <div class="opcoes-linha">
                        ${campo.o.map(op => {
                            const valor = trocarNomesCasal(op, nomes);
                            return `<label class="opcao"><input type="radio" name="${nome}" value="${escaparHTML(valor)}"> ${escaparHTML(valor)}</label>`;
                        }).join("")}
                    </div>
                </div>`;

        case "checks":
            return `
                <div class="form-group w-100">
                    <label class="label-grupo">${label}</label>
                    <div class="opcoes-linha">
                        ${campo.o.map(op =>
                            `<label class="opcao"><input type="checkbox" data-grupo="${nome}" value="${escaparHTML(op)}"> ${escaparHTML(op)}</label>`
                        ).join("")}
                        ${campo.outro ? `
                            <label class="opcao opcao-outro">Outro:
                                <input type="text" name="${nome}_outro" placeholder="descreva...">
                            </label>` : ""}
                    </div>
                </div>`;

        case "escala":
            return `
                <div class="form-group w-100">
                    <label class="label-grupo">${label}</label>
                    <div class="escala" data-escala="${nome}">
                        ${Array.from({ length: 11 }, (_, i) =>
                            `<label class="escala-num"><input type="radio" name="${nome}" value="${i}"><span>${i}</span></label>`
                        ).join("")}
                    </div>
                </div>`;

        default:
            return "";
    }
}

function htmlConflitos(item) {
    const opcoesIntensidade = `<option value="">—</option>` +
        Array.from({ length: 11 }, (_, i) => `<option value="${i}">${i}</option>`).join("");

    return `
        <div class="tabela-conflitos-wrapper">
            <table class="tabela-conflitos">
                <thead>
                    <tr><th>Área</th><th>Existe conflito?</th><th>Intensidade (0–10)</th></tr>
                </thead>
                <tbody>
                    ${item.areas.map(([chave, nomeArea]) => `
                        <tr>
                            <td>${escaparHTML(nomeArea)}</td>
                            <td><input type="checkbox" name="${item.n}_${chave}" value="Sim" aria-label="Conflito em ${escaparHTML(nomeArea)}"></td>
                            <td><select name="${item.n}Int_${chave}" aria-label="Intensidade em ${escaparHTML(nomeArea)}">${opcoesIntensidade}</select></td>
                        </tr>`).join("")}
                </tbody>
            </table>
        </div>`;
}

function htmlItem(item) {
    if (item.t === "subtitulo") {
        return `<h4 class="subtitulo-secao">${rotulo(item.l)}</h4>`;
    }
    if (item.t === "conflitos") {
        return htmlConflitos(item);
    }
    if (item.t === "pessoas") {
        return `
            <div class="duas-pessoas">
                ${["p1", "p2"].map(p => `
                    <div class="coluna-pessoa">
                        <div class="cabecalho-pessoa"><i class="ti ti-user"></i> ${escaparHTML(nomes[p])}</div>
                        ${item.campos.map(c => htmlCampo(c, `${p}_${c.n}`)).join("")}
                    </div>`).join("")}
            </div>`;
    }
    return htmlCampo(item, item.n);
}

function tituloSecao(secao) {
    return secao.num ? `${secao.num}. ${secao.titulo}` : secao.titulo;
}

function montarFormulario() {
    containerSecoes.innerHTML = SECOES_ANAMNESE_CASAL.map(secao => {
        const classes = ["form-section"];
        if (secao.exclusivo) classes.push("secao-exclusiva");
        if (secao.sigiloso) classes.push("secao-sigilosa");
        const icone = secao.sigiloso ? '<i class="ti ti-lock"></i> ' : (secao.exclusivo ? '<i class="ti ti-stethoscope"></i> ' : "");

        return `
            <fieldset class="${classes.join(" ")}" id="secao-${secao.id}">
                <legend>${icone}${escaparHTML(tituloSecao(secao))}</legend>
                ${secao.aviso ? `<p class="aviso-secao">${escaparHTML(secao.aviso)}</p>` : ""}
                ${secao.itens.map(htmlItem).join("")}
            </fieldset>`;
    }).join("");

    indice.innerHTML = SECOES_ANAMNESE_CASAL
        .filter(s => s.num || s.sigiloso)
        .map(s => {
            const nomeSecao = escaparHTML(s.num ? `${s.num}. ${s.titulo}` : s.titulo);
            // o nome da seção aparece num balãozinho ao passar o mouse (CSS: data-titulo)
            return `<a href="#secao-${s.id}" data-titulo="${nomeSecao}" aria-label="${nomeSecao}">${s.num ? s.num : '<i class="ti ti-lock"></i>'}</a>`;
        })
        .join("");

    // escala 0–10: clicar de novo no número já marcado desmarca
    containerSecoes.querySelectorAll(".escala input[type=radio]").forEach(radio => {
        radio.addEventListener("mousedown", () => { radio.dataset.estavaMarcado = radio.checked ? "1" : ""; });
        radio.addEventListener("click", () => {
            if (radio.dataset.estavaMarcado === "1") {
                radio.checked = false;
                salvarRascunho();
            }
        });
    });

    containerSecoes.querySelectorAll("textarea").forEach(t => {
        t.addEventListener("input", () => autoExpand(t));
    });
}

// ==========================================
// LER / PREENCHER OS CAMPOS
// ==========================================

// percorre todos os campos (já com o nome final p1_/p2_), chamando fn(campo, nome)
function paraCadaCampo(fn) {
    SECOES_ANAMNESE_CASAL.forEach(secao => {
        secao.itens.forEach(item => {
            if (item.t === "subtitulo") return;
            if (item.t === "pessoas") {
                ["p1", "p2"].forEach(p => item.campos.forEach(c => fn(c, `${p}_${c.n}`, p)));
                return;
            }
            fn(item, item.n, null);
        });
    });
}

function lerFormulario() {
    const dados = {};

    paraCadaCampo((campo, nome) => {
        if (campo.t === "conflitos") {
            campo.areas.forEach(([chave]) => {
                dados[`${campo.n}_${chave}`] = form.elements[`${campo.n}_${chave}`].checked ? "Sim" : "";
                dados[`${campo.n}Int_${chave}`] = form.elements[`${campo.n}Int_${chave}`].value;
            });
            return;
        }
        if (campo.t === "checks") {
            const marcados = [...form.querySelectorAll(`input[data-grupo="${nome}"]:checked`)].map(c => c.value);
            dados[nome] = marcados.join("; ");
            if (campo.outro) dados[`${nome}_outro`] = form.elements[`${nome}_outro`].value.trim();
            return;
        }
        if (campo.t === "radio" || campo.t === "escala") {
            const marcado = form.querySelector(`input[name="${nome}"]:checked`);
            dados[nome] = marcado ? marcado.value : "";
            return;
        }
        dados[nome] = form.elements[nome].value;
    });

    return dados;
}

function preencherFormulario(dados) {
    paraCadaCampo((campo, nome) => {
        if (campo.t === "conflitos") {
            campo.areas.forEach(([chave]) => {
                form.elements[`${campo.n}_${chave}`].checked = dados[`${campo.n}_${chave}`] === "Sim";
                form.elements[`${campo.n}Int_${chave}`].value = dados[`${campo.n}Int_${chave}`] || "";
            });
            return;
        }
        if (campo.t === "checks") {
            const marcados = String(dados[nome] || "").split(";").map(v => v.trim()).filter(Boolean);
            form.querySelectorAll(`input[data-grupo="${nome}"]`).forEach(c => { c.checked = marcados.includes(c.value); });
            if (campo.outro) form.elements[`${nome}_outro`].value = dados[`${nome}_outro`] || "";
            return;
        }
        if (campo.t === "radio" || campo.t === "escala") {
            form.querySelectorAll(`input[name="${nome}"]`).forEach(r => { r.checked = r.value === String(dados[nome] ?? ""); });
            return;
        }
        form.elements[nome].value = dados[nome] || "";
    });

    containerSecoes.querySelectorAll("textarea").forEach(autoExpand);
}

// campos ainda vazios são completados com o que já foi informado no cadastro do casal
function completarComCadastro(dados) {
    const resultado = { ...dados };
    paraCadaCampo((campo, nome, pessoa) => {
        if (!campo.cadastro || resultado[nome]) return;
        const valor = pessoa ? casal[`${pessoa}${campo.cadastro}`] : casal[campo.cadastro];
        if (valor && valor !== "-") resultado[nome] = String(valor);
    });
    return resultado;
}

function autoExpand(textarea) {
    textarea.style.height = "0px";
    textarea.style.height = textarea.scrollHeight + "px";
}

// ==========================================
// RASCUNHO (não perde o que foi digitado se a tela fechar sem salvar)
// ==========================================
function salvarRascunho() {
    try {
        localStorage.setItem(chaveRascunho, JSON.stringify(lerFormulario()));
    } catch (e) { /* sem rascunho, segue normal */ }
}

function apagarRascunho() {
    try { localStorage.removeItem(chaveRascunho); } catch (e) { }
}

form.addEventListener("input", salvarRascunho);
form.addEventListener("change", salvarRascunho);

// ==========================================
// INÍCIO
// ==========================================
async function iniciar() {
    const casais = JSON.parse(await window.storage.getItem("casais")) || [];
    casal = casais.find(c => String(c.id) === String(idCasal));

    if (!casal) {
        mostrarMensagem("Casal não encontrado!", "error", () => {
            window.location.href = "pacientes.html";
        });
        return;
    }

    nomes = nomesCurtosCasal(casal);
    document.getElementById("nomeCasal").textContent =
        casal.nomeCasal || `${casal.p1NomeCompleto || "?"} e ${casal.p2NomeCompleto || "?"}`;

    montarFormulario();

    const salvo = (casal.anamneseCasal && typeof casal.anamneseCasal === "object") ? casal.anamneseCasal : {};

    let rascunho = null;
    try { rascunho = JSON.parse(localStorage.getItem(chaveRascunho) || "null"); } catch (e) { }

    preencherFormulario(completarComCadastro(salvo));

    // se há um rascunho diferente do que está salvo, recupera
    if (rascunho && JSON.stringify(rascunho) !== JSON.stringify(lerFormulario())) {
        preencherFormulario(rascunho);
        avisoRascunho.textContent = "Recuperado o que foi digitado e ainda não tinha sido salvo. Clique em \"Salvar Anamnese\" para guardar.";
    } else if (salvo.atualizadoEm) {
        avisoRascunho.textContent = `Última atualização: ${salvo.atualizadoEm}`;
    } else {
        avisoRascunho.textContent = "Ficha nova — os dados do cadastro do casal já vieram preenchidos.";
    }
}

// ==========================================
// SALVAR
// ==========================================
async function gravarAnamnese() {
    // lê a lista atualizada antes de gravar (pode ter chegado algo do outro computador)
    const casais = JSON.parse(await window.storage.getItem("casais")) || [];
    const registro = casais.find(c => String(c.id) === String(idCasal));
    if (!registro) {
        mostrarMensagem("Casal não encontrado!", "error");
        return false;
    }

    const anterior = (registro.anamneseCasal && typeof registro.anamneseCasal === "object") ? registro.anamneseCasal : {};

    registro.anamneseCasal = {
        ...anterior,
        ...lerFormulario(),
        atualizadoEm: new Date().toLocaleString("pt-BR")
    };

    await window.storage.setItem("casais", JSON.stringify(casais));
    casal = registro;
    apagarRascunho();
    avisoRascunho.textContent = `Última atualização: ${registro.anamneseCasal.atualizadoEm}`;
    return true;
}

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (await gravarAnamnese()) {
        mostrarMensagem("Anamnese de casal salva com sucesso!", "success");
    }
});

document.getElementById("btnAbrirAnamnese").addEventListener("click", async () => {
    if (!(await gravarAnamnese())) return;
    window.open(`imprimir-anamnese-casal.html?id=${encodeURIComponent(idCasal)}&visualizar=true`, "_blank");
});

document.getElementById("btnImprimir").addEventListener("click", async () => {
    if (!(await gravarAnamnese())) return;
    window.open(`imprimir-anamnese-casal.html?id=${encodeURIComponent(idCasal)}`, "_blank");
});

document.getElementById("btnVoltar").addEventListener("click", () => history.back());

// ==========================================
// PROMPT PARA IA
// ==========================================
const estiloSwal = document.createElement("style");
estiloSwal.innerHTML = `.swal2-container { z-index: 999999 !important; }`;
document.head.appendChild(estiloSwal);

const modalPromptIA = document.getElementById("modalPromptIA");
const textoPromptIA = document.getElementById("textoPromptIA");
const relatoIA = document.getElementById("relatoIA");

function gerarPrompt() {
    const aviso = "Preencha as perguntas baseado com o relato do paciente citado abaixo, a responda deve ser de acordo com o código de ética CFP e a abordagem de terapia de casal:\n\n";
    const campos = camposTextoAnamneseCasal(nomes);
    return aviso + campos.map(([label]) => `${label}:`).join("\n");
}

document.getElementById("btnGerarPromptIA").addEventListener("click", () => {
    textoPromptIA.value = gerarPrompt();
    relatoIA.value = "";
    modalPromptIA.classList.remove("oculto");
});

["fecharModalPromptIA", "cancelarModalPromptIA"].forEach(id =>
    document.getElementById(id).addEventListener("click", () => modalPromptIA.classList.add("oculto")));

document.getElementById("btnCopiarPromptIA").addEventListener("click", async () => {
    const relato = relatoIA.value.trim();
    if (!relato) {
        mostrarMensagem("Preencha o relato do casal antes de copiar.", "warning");
        return;
    }
    const textoFinal = `${textoPromptIA.value}\n\nRelato do casal:\n${relato}`;
    try {
        await navigator.clipboard.writeText(textoFinal);
    } catch (err) {
        const temporario = document.createElement("textarea");
        temporario.value = textoFinal;
        document.body.appendChild(temporario);
        temporario.select();
        document.execCommand("copy");
        document.body.removeChild(temporario);
    }
    modalPromptIA.classList.add("oculto");
    mostrarMensagem("Prompt copiado! Agora é só colar no chat da IA.", "success");
});

// ==========================================
// PREENCHER COM TEXTO COLADO
// ==========================================
const modalColar = document.getElementById("modalColar");
const textoColado = document.getElementById("textoColado");

function preencherComTexto(texto) {
    // a IA às vezes devolve os títulos em **negrito** ou numerados
    const limpo = texto.replace(/\*\*/g, "").replace(/\r/g, "");

    const mapa = camposTextoAnamneseCasal(nomes);
    const ordenados = [...mapa].sort((a, b) => b[0].length - a[0].length);
    const escapados = ordenados.map(([label]) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

    // título no começo da linha (pode ter "-", "•" ou "1." antes), seguido de ":"
    const regex = new RegExp(`^[ \\t]*(?:[-•*]|\\d+[.)])?[ \\t]*(${escapados.join("|")})[ \\t]*:?`, "gim");

    const achados = [];
    let m;
    while ((m = regex.exec(limpo)) !== null) {
        achados.push({ label: m[1], inicio: m.index, fim: regex.lastIndex });
    }

    if (achados.length === 0) {
        mostrarMensagem("Não encontrei nenhum título conhecido. Confira se os títulos estão iguais aos do prompt, cada um no começo de uma linha.", "warning");
        return;
    }

    let preenchidos = 0;
    achados.forEach((achado, i) => {
        const fim = achados[i + 1] ? achados[i + 1].inicio : limpo.length;
        const valor = limpo.slice(achado.fim, fim).trim();
        const encontrado = mapa.find(([label]) => label.toLowerCase() === achado.label.toLowerCase());
        if (encontrado && valor && form.elements[encontrado[1]]) {
            form.elements[encontrado[1]].value = valor;
            if (form.elements[encontrado[1]].tagName === "TEXTAREA") autoExpand(form.elements[encontrado[1]]);
            preenchidos++;
        }
    });

    salvarRascunho();
    mostrarMensagem(`${preenchidos} campo(s) preenchido(s) automaticamente! Confira e clique em "Salvar Anamnese".`, "success");
}

document.getElementById("btnAbrirModalColar").addEventListener("click", () => modalColar.classList.remove("oculto"));
["fecharModalColar", "cancelarModalColar"].forEach(id =>
    document.getElementById(id).addEventListener("click", () => modalColar.classList.add("oculto")));

document.getElementById("btnPreencherAutomatico").addEventListener("click", () => {
    const texto = textoColado.value.trim();
    if (!texto) {
        mostrarMensagem("Cole o texto da anamnese antes de preencher.", "warning");
        return;
    }
    preencherComTexto(texto);
    modalColar.classList.add("oculto");
    textoColado.value = "";
});

iniciar();
