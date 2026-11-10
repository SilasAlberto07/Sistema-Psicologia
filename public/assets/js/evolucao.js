// ================= PACIENTE / CASAL =================
const params = new URLSearchParams(window.location.search);
const idPaciente = params.get("id");
const origemParam = params.get("origem"); // "casal" ou null
const pessoaParam = params.get("pessoa"); // "p1" | "p2" | null
const nomeParam = params.get("nome");     // nome já pronto, vindo da tela de sessões
const tipoParam = params.get("tipo");     // "consulta" quando aberto pela linha da 1ª Consulta

const nomePaciente = document.getElementById("nomePaciente");
const historico = document.getElementById("historico");
const textoEvolucao = document.getElementById("textoEvolucao");
const planoAcao = document.getElementById("planoAcao");
const relatoSessao = document.getElementById("relatoSessao");
const dataSessao = document.getElementById("dataSessao");

// ================= DATA/HORA MANUAL DA SESSÃO =================

// retorna a data/hora atual no formato aceito pelo input datetime-local (yyyy-MM-ddTHH:mm)
function agoraParaInputDatetime() {
    const agora = new Date();
    const local = new Date(agora.getTime() - agora.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
}

// data/hora padrão do prontuário, puxada da tela de Sessões:
//  - aberto pela linha de uma sessão (02, 03...) → data e hora daquela sessão
//  - aberto pela linha da 1ª Consulta (ou sem linha definida) → data e hora da 1ª Consulta
//  - se a linha ainda não tiver data e hora → data e hora de agora
// O campo continua editável normalmente.
function dataDaLinhaSessoes() {
    if (!registro) return "";

    const indiceSessao = params.get("sessao");
    if (indiceSessao !== null && Array.isArray(registro.sessoes)) {
        const sessao = registro.sessoes[Number(indiceSessao)];
        if (sessao && sessao.data && sessao.hora) {
            return `${sessao.data}T${sessao.hora}`;
        }
        return "";
    }

    const consulta = registro.consulta;
    if (consulta && consulta.data && consulta.hora) {
        return `${consulta.data}T${consulta.hora}`;
    }
    return "";
}

function dataPadraoSessao() {
    return dataDaLinhaSessoes() || agoraParaInputDatetime();
}

// ================= A QUAL SESSÃO CADA REGISTRO PERTENCE =================
// A regra fica em registros-sessao.js (a mesma usada na impressão).

// índice (0, 1, 2...) da sessão aberta agora; null = aberto pela 1ª Consulta ou fora da tela de Sessões
function indiceSessaoAberta() {
    return indiceSessaoDoEndereco(params);
}

function sessaoAberta() {
    const i = indiceSessaoAberta();
    if (i === null || !registro || !Array.isArray(registro.sessoes)) return null;
    return registro.sessoes[i] || null;
}

// converte o valor do input datetime-local para o formato de exibição pt-BR
function formatarDataSessaoBR(valorInput) {
    if (!valorInput) return "";
    const [dataParte, horaParte] = valorInput.split("T");
    const [ano, mes, dia] = dataParte.split("-");
    return `${dia}/${mes}/${ano} ${horaParte}`;
}

const btnSalvar = document.querySelector(".btn-salvar");
const btnImprimir = document.querySelector(".btn-imprimir-tudo");
const btnAbrirProntuario = document.querySelector(".btn-abrir");

let pacientes = [];
let casaisLista = [];
let registro = null;   // paciente individual OU casal, o que for encontrado
let ehCasal = false;
let pessoaAtual = null; // "p1" | "p2" | null — só existe quando for sessão individual do casal
let nomeAtual = "";
let editandoIndex = null; // sempre se refere ao índice REAL em registro.evolucoes
let anexosAtuais = [];    // documentos/testes anexados à sessão que está sendo escrita

// true quando essa tela foi aberta pelo botão "Prontuário" da linha da
// 1ª Consulta de um paciente INDIVIDUAL (o equivalente, para casal, é
// "ehCasal && !pessoaAtual")
let modoConsultaIndividual = false;

let draftKey = `draft_evolucao_${idPaciente}`;
let draftKeyAntigo = null;

function apagarRascunho() {
    localStorage.removeItem(draftKey);
    if (draftKeyAntigo) localStorage.removeItem(draftKeyAntigo);
}

// grava de volta no storage certo (pacientes ou casais), dependendo de quem é o registro
async function salvarRegistro() {
    if (ehCasal) {
        await window.storage.setItem("casais", JSON.stringify(casaisLista));
    } else {
        await window.storage.setItem("pacientes", JSON.stringify(pacientes));
    }
}

async function iniciarEvolucao() {

    pacientes = JSON.parse(await window.storage.getItem("pacientes")) || [];
    casaisLista = JSON.parse(await window.storage.getItem("casais")) || [];

    registro = pacientes.find(p => String(p.id) === String(idPaciente));

    if (!registro) {
        registro = casaisLista.find(c => String(c.id) === String(idPaciente));
        ehCasal = !!registro;
    }

    if (!registro) {
        mostrarMensagem(
            "Paciente não encontrado!",
            "error",
            () => {
                window.location.href = "pacientes.html";
            }
        );
        return;
    }

    // define de quem é esse prontuário quando o registro é de um casal
    if (ehCasal && (pessoaParam === "p1" || pessoaParam === "p2")) {
        pessoaAtual = pessoaParam;
        nomeAtual = pessoaAtual === "p1"
            ? (registro.p1NomeCompleto || nomeParam || "Pessoa 1")
            : (registro.p2NomeCompleto || nomeParam || "Pessoa 2");

        nomePaciente.innerText = nomeAtual;
        draftKey = `draft_evolucao_${idPaciente}_${pessoaAtual}`;
    } else if (ehCasal) {
        // sem pessoa definida (ex.: 1ª Consulta, que é conjunta) — mostra o histórico dos dois
        nomeAtual = `${registro.p1NomeCompleto || "?"} e ${registro.p2NomeCompleto || "?"}`;
        nomePaciente.innerText = `${nomeAtual} (registro conjunto)`;
    } else {
        nomeAtual = registro.nomeCompleto;
        nomePaciente.innerText = nomeAtual;
        modoConsultaIndividual = tipoParam === "consulta";
    }

    if (!Array.isArray(registro.evolucoes)) {
        registro.evolucoes = [];
    }

    // rascunho continua no localStorage — é dado temporário/descartável,
    // não precisa de backup nem entra no SQLite.
    // Cada sessão tem o seu rascunho; um rascunho antigo (de antes dessa
    // separação) ainda é aproveitado, para não perder o que foi digitado.
    draftKeyAntigo = draftKey;
    draftKey = `${draftKey}_${indiceSessaoAberta() === null ? (tipoParam === "consulta" ? "consulta" : "geral") : "s" + indiceSessaoAberta()}`;
    const draft = JSON.parse(localStorage.getItem(draftKey) || localStorage.getItem(draftKeyAntigo) || "null");
    if (draft) {
        textoEvolucao.value = draft.texto || "";
        planoAcao.value = draft.plano || "";
        relatoSessao.value = draft.relato || "";
        // a data da linha da tela de Sessões tem prioridade sobre a do rascunho
        dataSessao.value = dataDaLinhaSessoes() || draft.dataSessao || agoraParaInputDatetime();
    } else {
        dataSessao.value = dataPadraoSessao();
    }

    renderAnexosFormulario();
    renderHistorico();
}

function salvarRascunho() {
    localStorage.setItem(draftKey, JSON.stringify({
        texto: textoEvolucao.value,
        plano: planoAcao.value,
        relato: relatoSessao.value,
        dataSessao: dataSessao.value
    }));
}

textoEvolucao.addEventListener("input", salvarRascunho);
planoAcao.addEventListener("input", salvarRascunho);
relatoSessao.addEventListener("input", salvarRascunho);
dataSessao.addEventListener("input", salvarRascunho);

// retorna só as evoluções que pertencem à pessoa atual (quando for sessão
// individual de casal), mas preserva o índice REAL de registro.evolucoes,
// necessário para editar/excluir o item certo.
function evolucoesDaPessoa() {
    return registro.evolucoes
        .map((item, indiceReal) => ({ item, indiceReal }))
        .filter(({ item }) => {
            const ehRegistroConsulta = item.tipo === "consulta" || (!item.pessoa && !item.tipo && ehCasal);

            if (ehCasal && pessoaAtual) {
                // prontuário individual do casal: as sessões dessa pessoa
                // + a 1ª Consulta, que é compartilhada entre os dois
                return item.pessoa === pessoaAtual || ehRegistroConsulta;
            }
            if (ehCasal && !pessoaAtual) {
                // registro conjunto (aberto pela linha da 1ª Consulta): só ela mesma
                return ehRegistroConsulta;
            }

            // paciente individual
            if (modoConsultaIndividual) {
                // aberto pela linha da 1ª Consulta: mostra só ela, nada das sessões
                return item.tipo === "consulta";
            }

            // aberto por uma sessão normal: filtrado logo abaixo (só até essa sessão)
            return true;
        });
}

// os registros da tela: só até a sessão aberta, em ordem de sessão
function evolucoesVisiveis() {
    return registrosAteASessao(registro, ehCasal, evolucoesDaPessoa(), indiceSessaoAberta());
}

function renderHistorico() {
    historico.innerHTML = "";

    const visiveis = evolucoesVisiveis();

    if (visiveis.length === 0) {
        historico.innerHTML = "<p>Nenhum registro de evolução.</p>";
        return;
    }

    let contador = 0; // conta só as sessões normais — a 1ª Consulta não entra nessa numeração

    visiveis.forEach(({ item, indiceReal, numero }, posicao) => {
        const aberta = posicao === visiveis.length - 1 ? "open" : "";
        const ehConsulta = item.tipo === "consulta" || (!item.pessoa && !item.tipo && ehCasal);

        // número da sessão a que o registro pertence; se não der para saber, segue a contagem
        const numeroExibido = numero ? numero : ++contador;
        if (numero) contador = numero;

        const rotuloHTML = ehConsulta
            ? `<span style="background:#eaf0e3;color:#5c7a48;padding:3px 12px;border-radius:20px;font-weight:600;">📋 1ª Consulta</span>`
            : `<span>Sessão ${String(numeroExibido).padStart(2, "0")}</span>`;

        historico.innerHTML += `
            <details class="card-evolucao" ${aberta}>
                <summary>
                    ${rotuloHTML}
                    <small>${dataDoRegistroProntuario(registro, ehCasal, item).texto}</small>
                </summary>
                <div class="conteudo-evolucao">
                    <p><strong>Relato da Sessão:</strong> ${item.relato}</p>
                    <p><strong>Evolução:</strong> ${item.texto}</p>
                    ${item.plano ? `<p><strong>Plano de ação:</strong> ${item.plano}</p>` : ""}
                </div>
                ${Array.isArray(item.anexos) && item.anexos.length ? `
                <div class="anexos-historico">
                    <strong>Documentos e Testes Aplicados:</strong>
                    <div class="lista-anexos">
                        ${item.anexos.map((anexo, i) => montarCardAnexo(anexo, { registro: indiceReal, anexo: i })).join("")}
                    </div>
                </div>` : ""}
                <div class="acoes-evolucao">
                    <button class="btn-editar-evolucao" data-index="${indiceReal}">
                        <i class="ti ti-pencil"></i> Editar
                    </button>

                    <button class="btn-excluir-evolucao" data-index="${indiceReal}">
                        <i class="ti ti-trash"></i> Excluir
                    </button>
                </div>
            </details>
        `;
    });
}

// ================= SALVAR =================
btnSalvar.addEventListener("click", async () => {

    const relato = relatoSessao.value.trim();
    const conteudo = textoEvolucao.value.trim();
    const plano = planoAcao.value.trim();
    const dataSessaoValor = dataSessao.value;

    if (!conteudo) {
        mostrarMensagem(
            "Digite algo antes de salvar!",
            "warning"
        );
        return;
    }

    if (!dataSessaoValor) {
        mostrarMensagem(
            "Selecione a data e a hora da sessão!",
            "warning"
        );
        return;
    }

    if (editandoIndex !== null) {

        // guarda qual sessão está sendo editada
        const indice = Number(editandoIndex);

        // atualiza o registro existente
        registro.evolucoes[indice].relato = relato;
        registro.evolucoes[indice].texto = conteudo;
        registro.evolucoes[indice].plano = plano;
        // a data segue a sessão na tela de Sessões; só fica "manual" se foi trocada aqui
        const dataDaSessaoDele = dataInputDaAgenda(
            localizarSessaoDoRegistro(registro, ehCasal, registro.evolucoes[indice]).agenda);
        if (dataDaSessaoDele && dataSessaoValor !== dataDaSessaoDele) {
            registro.evolucoes[indice].dataManual = true;
        } else {
            delete registro.evolucoes[indice].dataManual;
        }
        registro.evolucoes[indice].dataSessao = dataSessaoValor;
        registro.evolucoes[indice].data = formatarDataSessaoBR(dataSessaoValor);
        registro.evolucoes[indice].anexos = anexosAtuais;
        // o campo "tipo" (1ª Consulta ou não) não é alterado aqui — permanece
        // como já estava, já que essa marcação é definida só na criação

        await salvarRegistro();

        // limpa os campos
        relatoSessao.value = "";
        textoEvolucao.value = "";
        planoAcao.value = "";
        dataSessao.value = dataPadraoSessao();
        anexosAtuais = [];
        renderAnexosFormulario();
        apagarRascunho();

        // atualiza a lista
        renderHistorico();

        // volta para a sessão que acabou de editar — precisa achar a POSIÇÃO
        // dela na lista filtrada, já que o índice real pode não bater com a
        // ordem exibida quando há sessões de p1 e p2 intercaladas
        const posicaoExibida = evolucoesVisiveis().findIndex(v => v.indiceReal === indice);
        const cards = document.querySelectorAll(".card-evolucao");
        const card = cards[posicaoExibida];

        if (card) {
            card.open = true;

            card.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });
        }

        // encerra o modo edição
        editandoIndex = null;

        mostrarMensagem(
            "Registro atualizado com sucesso!",
            "success"
        );

    } else {

        // cria um registro novo
        const novoRegistro = {
            data: formatarDataSessaoBR(dataSessaoValor),
            dataSessao: dataSessaoValor,
            relato: relato,
            texto: conteudo,
            plano: plano
        };

        if (anexosAtuais.length) {
            novoRegistro.anexos = anexosAtuais;
        }

        // data trocada à mão aqui (diferente da marcada na tela de Sessões)?
        const dataDaLinha = dataDaLinhaSessoes();
        if (dataDaLinha && dataSessaoValor !== dataDaLinha) {
            novoRegistro.dataManual = true;
        }

        if (ehCasal && pessoaAtual) {
            novoRegistro.pessoa = pessoaAtual;
        }

        // guarda de qual sessão esse registro é (para não aparecer nas sessões anteriores)
        if (indiceSessaoAberta() !== null && tipoParam !== "consulta") {
            novoRegistro.sessaoIndice = indiceSessaoAberta();
            const sessao = sessaoAberta();
            if (sessao && sessao._sid) novoRegistro.sessaoSid = sessao._sid;
        }

        // reconhece automaticamente que é a 1ª Consulta quando o botão
        // "Prontuário" foi acionado a partir daquela linha específica
        if (tipoParam === "consulta") {
            novoRegistro.tipo = "consulta";
        }

        registro.evolucoes.push(novoRegistro);

        await salvarRegistro();
        apagarRascunho();

        relatoSessao.value = "";
        textoEvolucao.value = "";
        planoAcao.value = "";
        dataSessao.value = dataPadraoSessao();
        anexosAtuais = [];
        renderAnexosFormulario();

        renderHistorico();

        mostrarMensagem(
            "Evolução salva com sucesso!",
            "success"
        );
    }
});


// ================= EXCLUIR =================
historico.addEventListener("click", async (e) => {

    if (e.target.classList.contains("btn-excluir-evolucao")) {

        const resposta = await mostrarConfirmacao(
            "Deseja excluir esta evolução?"
        );

        if (!resposta.isConfirmed) {
            return;
        }

        const index = e.target.dataset.index;

        registro.evolucoes.splice(index, 1);

        await salvarRegistro();

        renderHistorico();

        mostrarMensagem(
            "Evolução excluída com sucesso!",
            "success"
        );
    }
});

// ================= EDITAR =================
historico.addEventListener("click", (e) => {

    if (e.target.closest(".btn-editar-evolucao")) {

        const index = e.target.closest(".btn-editar-evolucao").dataset.index;
        const item = registro.evolucoes[index];

        relatoSessao.value = item.relato || "";
        textoEvolucao.value = item.texto || "";
        planoAcao.value = item.plano || "";
        // data da sessão dele na tela de Sessões (ou a que foi trocada à mão;
        // registros antigos sem sessão conhecida mantêm a data que já tinham)
        dataSessao.value = dataDoRegistroProntuario(registro, ehCasal, item).input || dataPadraoSessao();
        // carrega os anexos desse registro no campo (cópia da lista, mesmos itens)
        anexosAtuais = Array.isArray(item.anexos) ? item.anexos.slice() : [];
        renderAnexosFormulario();

        textoEvolucao.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

        textoEvolucao.focus();

        editandoIndex = index;

        mostrarMensagem("Editando registro. Altere os campos acima e clique em Salvar.", "info");

        window.scrollTo({ top: 0, behavior: "smooth" });
    }
});

// monta a query string com o contexto atual (casal/pessoa e/ou modo consulta),
// para os links de prontuário (abrir e imprimir) saberem exatamente o que mostrar
function contextoQuery() {
    let query = "";

    if (ehCasal) {
        query += pessoaAtual
            ? `&origem=casal&pessoa=${pessoaAtual}&nome=${encodeURIComponent(nomeAtual)}`
            : `&origem=casal`;
    }

    if (modoConsultaIndividual) {
        query += `&tipo=consulta`;
    }

    // aberto por uma sessão: abrir/imprimir mostram só até ela
    if (indiceSessaoAberta() !== null) {
        query += `&sessao=${indiceSessaoAberta()}`;
    }

    return query;
}

// ================= Abrir Prontuário (visualizar, sem imprimir) =================
btnAbrirProntuario.addEventListener("click", () => {
    window.open(`imprimir-prontuario.html?id=${idPaciente}${contextoQuery()}&visualizar=true`, "_blank");
});

// ================= IMPRIMIR PRONTUÁRIO =================
btnImprimir.addEventListener("click", () => {

    if (evolucoesVisiveis().length === 0) {
        mostrarMensagem(
            "Não há evoluções registradas para imprimir!",
            "warning"
        );
        return;
    }

    window.open(`imprimir-prontuario.html?id=${idPaciente}${contextoQuery()}`, "_blank");
});

// ================= VOLTAR =================
// Quando o prontuário foi aberto pela tela de Sessões, volta para lá já
// no mesmo paciente (a tela de Sessões guardou onde a pessoa estava).
const veioDeSessoes = params.get("voltar") === "sessoes";

function voltarTelaAnterior() {
    if (veioDeSessoes) {
        window.location.href = "sessoes.html";
    } else {
        history.back();
    }
}

const btnVoltarTopo = document.getElementById("btnVoltarTopo");
if (btnVoltarTopo) {
    btnVoltarTopo.addEventListener("click", voltarTelaAnterior);
    if (veioDeSessoes) {
        btnVoltarTopo.querySelector("span").textContent = "Voltar para Sessões";
    }
}


// ==========================================
// DOCUMENTOS E TESTES APLICADOS (anexos)
// ==========================================
// Cada anexo fica salvo dentro do próprio registro da sessão:
//   { titulo, nome, tipo: "pdf" | "imagem", dados: "data:...;base64,...", criadoEm }
// Assim ele entra junto no backup e na sincronização entre computadores.

const TAMANHO_MAXIMO_ANEXO_MB = 10;

const listaAnexos = document.getElementById("listaAnexos");
const modalAnexo = document.getElementById("modalAnexo");
const tituloAnexo = document.getElementById("tituloAnexo");
const categoriaAnexo = document.getElementById("categoriaAnexo"); // teste | externo | outro (aparece em Sessões → Documentos)
const arquivoAnexo = document.getElementById("arquivoAnexo");
const areaArquivoAnexo = document.getElementById("areaArquivoAnexo");
const previewAnexo = document.getElementById("previewAnexo");
const modalVerAnexo = document.getElementById("modalVerAnexo");
const corpoVerAnexo = document.getElementById("corpoVerAnexo");
const tituloVerAnexo = document.getElementById("tituloVerAnexo");

let arquivoSelecionado = null; // arquivo escolhido na janela, antes de salvar
let urlVisualizacao = null;    // endereço temporário do PDF aberto (liberado ao fechar)

function escaparHTML(texto) {
    return String(texto ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

// monta o cartão de um anexo. "origem" diz de onde ele vem:
//   { formulario: i }          → anexo da sessão que está sendo escrita (pode remover)
//   { registro: r, anexo: i }  → anexo de uma sessão já salva (só abre)
function montarCardAnexo(anexo, origem) {
    const atributos = origem.formulario !== undefined
        ? `data-formulario="${origem.formulario}"`
        : `data-registro="${origem.registro}" data-anexo="${origem.anexo}"`;

    const miniatura = anexo.tipo === "imagem"
        ? `<img src="${anexo.dados}" alt="">`
        : `<i class="ti ti-file-type-pdf icone-pdf"></i>`;

    const botaoRemover = origem.formulario !== undefined
        ? `<button type="button" class="btn-remover-anexo" title="Remover anexo"><i class="ti ti-x"></i></button>`
        : "";

    return `
        <div class="card-anexo" ${atributos} title="Clique para abrir">
            ${botaoRemover}
            <div class="card-anexo-titulo">${escaparHTML(anexo.titulo)}</div>
            <div class="card-anexo-miniatura">${miniatura}</div>
            <div class="card-anexo-arquivo">${escaparHTML(anexo.nome)}</div>
        </div>
    `;
}

function renderAnexosFormulario() {
    if (!anexosAtuais.length) {
        listaAnexos.innerHTML = `<div class="anexos-vazio">Nenhum documento anexado nesta sessão.</div>`;
        return;
    }
    listaAnexos.innerHTML = anexosAtuais
        .map((anexo, i) => montarCardAnexo(anexo, { formulario: i }))
        .join("");
}

// ---------- janela de anexar ----------
function limparJanelaAnexo() {
    tituloAnexo.value = "";
    if (categoriaAnexo) categoriaAnexo.value = "teste";
    arquivoAnexo.value = "";
    arquivoSelecionado = null;
    previewAnexo.innerHTML = "";
    areaArquivoAnexo.classList.remove("selecionado");
    areaArquivoAnexo.innerHTML = `<i class="ti ti-upload"></i> <span>Clique para escolher o arquivo</span>`;
}

function fecharJanelaAnexo() {
    modalAnexo.classList.add("oculto");
    limparJanelaAnexo();
}

document.getElementById("btnAbrirModalAnexo").addEventListener("click", () => {
    limparJanelaAnexo();
    modalAnexo.classList.remove("oculto");
    setTimeout(() => tituloAnexo.focus(), 50);
});

document.getElementById("fecharModalAnexo").addEventListener("click", fecharJanelaAnexo);
document.getElementById("cancelarModalAnexo").addEventListener("click", fecharJanelaAnexo);

areaArquivoAnexo.addEventListener("click", () => arquivoAnexo.click());

function lerArquivoComoDataURL(arquivo) {
    return new Promise((resolve, reject) => {
        const leitor = new FileReader();
        leitor.onload = () => resolve(leitor.result);
        leitor.onerror = () => reject(leitor.error);
        leitor.readAsDataURL(arquivo);
    });
}

arquivoAnexo.addEventListener("change", async () => {
    const arquivo = arquivoAnexo.files[0];
    if (!arquivo) return;

    const ehPdf = arquivo.type === "application/pdf";
    const ehImagem = arquivo.type.startsWith("image/");

    if (!ehPdf && !ehImagem) {
        mostrarMensagem("Escolha um arquivo PDF ou uma imagem.", "warning");
        arquivoAnexo.value = "";
        return;
    }

    if (arquivo.size > TAMANHO_MAXIMO_ANEXO_MB * 1024 * 1024) {
        mostrarMensagem(`O arquivo é maior que ${TAMANHO_MAXIMO_ANEXO_MB} MB. Escolha um arquivo menor.`, "warning");
        arquivoAnexo.value = "";
        return;
    }

    try {
        const dados = await lerArquivoComoDataURL(arquivo);
        arquivoSelecionado = {
            nome: arquivo.name,
            tipo: ehPdf ? "pdf" : "imagem",
            dados
        };
    } catch (err) {
        mostrarMensagem("Não foi possível ler o arquivo.", "error");
        return;
    }

    areaArquivoAnexo.classList.add("selecionado");
    areaArquivoAnexo.innerHTML = `<i class="ti ti-check"></i> <span>${escaparHTML(arquivo.name)} (clique para trocar)</span>`;
    previewAnexo.innerHTML = ehImagem
        ? `<img src="${arquivoSelecionado.dados}" alt="">`
        : `<i class="ti ti-file-type-pdf icone-pdf"></i>`;
});

document.getElementById("btnConfirmarAnexo").addEventListener("click", () => {
    const titulo = tituloAnexo.value.trim();

    if (!titulo) {
        mostrarMensagem("Digite qual documento ou teste está sendo anexado.", "warning");
        return;
    }

    if (!arquivoSelecionado) {
        mostrarMensagem("Escolha o arquivo (PDF ou imagem).", "warning");
        return;
    }

    anexosAtuais.push({
        titulo,
        categoria: categoriaAnexo ? categoriaAnexo.value : "outro",
        nome: arquivoSelecionado.nome,
        tipo: arquivoSelecionado.tipo,
        dados: arquivoSelecionado.dados,
        criadoEm: new Date().toISOString()
    });

    renderAnexosFormulario();
    fecharJanelaAnexo();

    mostrarMensagem("Documento anexado! Ele será gravado quando você clicar em Salvar.", "info");
});

// ---------- abrir / remover ----------
function dataURLParaBlobURL(dataURL) {
    const [cabecalho, base64] = dataURL.split(",");
    const mime = (cabecalho.match(/data:(.*?);/) || [])[1] || "application/octet-stream";
    const binario = atob(base64);
    const bytes = new Uint8Array(binario.length);
    for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
    return URL.createObjectURL(new Blob([bytes], { type: mime }));
}

function abrirAnexo(anexo) {
    if (!anexo) return;

    tituloVerAnexo.textContent = anexo.titulo;

    if (anexo.tipo === "imagem") {
        corpoVerAnexo.innerHTML = `<img src="${anexo.dados}" alt="">`;
    } else {
        urlVisualizacao = dataURLParaBlobURL(anexo.dados);
        corpoVerAnexo.innerHTML = `<iframe src="${urlVisualizacao}"></iframe>`;
    }

    modalVerAnexo.classList.remove("oculto");
}

function fecharVisualizacao() {
    modalVerAnexo.classList.add("oculto");
    corpoVerAnexo.innerHTML = "";
    if (urlVisualizacao) {
        URL.revokeObjectURL(urlVisualizacao);
        urlVisualizacao = null;
    }
}

document.getElementById("fecharModalVerAnexo").addEventListener("click", fecharVisualizacao);
modalVerAnexo.addEventListener("click", (e) => {
    if (e.target === modalVerAnexo) fecharVisualizacao();
});

// cartões do campo da sessão atual: abrir ou remover
listaAnexos.addEventListener("click", async (e) => {
    const card = e.target.closest(".card-anexo");
    if (!card) return;

    const i = Number(card.dataset.formulario);

    if (e.target.closest(".btn-remover-anexo")) {
        const resposta = await mostrarConfirmacao(`Remover o anexo "${anexosAtuais[i].titulo}"?`);
        if (!resposta.isConfirmed) return;
        anexosAtuais.splice(i, 1);
        renderAnexosFormulario();
        return;
    }

    abrirAnexo(anexosAtuais[i]);
});

// cartões dentro do histórico (sessões já salvas): só abrir
historico.addEventListener("click", (e) => {
    const card = e.target.closest(".card-anexo");
    if (!card) return;

    const item = registro.evolucoes[Number(card.dataset.registro)];
    const anexo = item && Array.isArray(item.anexos) ? item.anexos[Number(card.dataset.anexo)] : null;
    abrirAnexo(anexo);
});


iniciarEvolucao();


// ==========================================
// PREENCHIMENTO AUTOMÁTICO A PARTIR DE TEXTO COLADO
// ==========================================

const mapaCamposEvolucao = [
    ["Relato da Sessão", "relatoSessao"],
    ["Evolução da sessão", "textoEvolucao"],
    ["Plano de ação", "planoAcao"]
];

function preencherEvolucaoAutomaticamente(textoColado) {

    const camposOrdenados = [...mapaCamposEvolucao].sort((a, b) => b[0].length - a[0].length);

    const escapados = camposOrdenados.map(([label]) =>
        label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    );

    const regexLabels = new RegExp(`(${escapados.join("|")})\\s*:?\\s*`, "gi");

    let matches = [];
    let m;
    while ((m = regexLabels.exec(textoColado)) !== null) {
        matches.push({ label: m[1], inicio: m.index, fim: regexLabels.lastIndex });
    }

    if (matches.length === 0) {
        mostrarMensagem(
            "Não encontrei nenhum título conhecido. Confira se os títulos batem com 'Relato da Sessão', 'Evolução da sessão' e 'Plano de ação'.",
            "warning"
        );
        return;
    }

    const camposElemento = {
        relatoSessao,
        textoEvolucao,
        planoAcao
    };

    let preenchidos = 0;

    matches.forEach((match, i) => {
        const proximaOcorrencia = matches[i + 1];
        const fimConteudo = proximaOcorrencia ? proximaOcorrencia.inicio : textoColado.length;
        const valor = textoColado.slice(match.fim, fimConteudo).trim();

        const encontrado = mapaCamposEvolucao.find(
            ([label]) => label.toLowerCase() === match.label.toLowerCase()
        );

        if (encontrado && valor) {
            const [, nomeCampo] = encontrado;
            camposElemento[nomeCampo].value = valor;
            preenchidos++;
        }
    });

    salvarRascunho(); // já aproveita e atualiza o rascunho com o que foi preenchido

    mostrarMensagem(`${preenchidos} campo(s) preenchido(s) automaticamente!`, "success");
}

// ==========================================
// ABRIR / FECHAR MODAL DE COLAR TEXTO
// ==========================================

const modalColarEvolucao = document.getElementById("modalColarEvolucao");
const textoColadoEvolucao = document.getElementById("textoColadoEvolucao");

document.getElementById("btnAbrirModalColar").addEventListener("click", () => {
    modalColarEvolucao.classList.remove("oculto");
});

document.getElementById("fecharModalColar").addEventListener("click", () => {
    modalColarEvolucao.classList.add("oculto");
});

document.getElementById("cancelarModalColar").addEventListener("click", () => {
    modalColarEvolucao.classList.add("oculto");
});

document.getElementById("btnPreencherAutomatico").addEventListener("click", () => {

    const texto = textoColadoEvolucao.value.trim();

    if (!texto) {
        mostrarMensagem("Cole o texto da sessão antes de preencher.", "warning");
        return;
    }

    preencherEvolucaoAutomaticamente(texto);

    modalColarEvolucao.classList.add("oculto");
    textoColadoEvolucao.value = "";
});
// ==========================================
// GERAR PROMPT PRONTO PARA IA (somente perguntas)
// ==========================================
const estiloSwal = document.createElement('style');
estiloSwal.innerHTML = `.swal2-container { z-index: 999999 !important; }`;
document.head.appendChild(estiloSwal);

function gerarPromptEvolucao() {
    // prontuário de casal (sessão conjunta ou de um dos dois) usa o prompt de terapia de casal;
    // paciente individual continua com o prompt da TCC
    const aviso = ehCasal
        ? "Preencha as perguntas baseado com o relato do paciente citado abaixo, a responda deve ser de acordo com o código de ética CFP e a abordagem de terapia de casal:\n\n"
        : "Preencha as perguntas baseado com o relato do paciente citado abaixo, a respostas devem ser de acordo com o código de ética CFP e a abordagem da TCC de forma ética, técnica e revisada com CFP\n\n";

    const campos = mapaCamposEvolucao.map(([label]) => `${label}:`).join("\n");

    return aviso + campos;
}

const modalPromptIAEvolucao = document.getElementById("modalPromptIAEvolucao");
const textoPromptIAEvolucao = document.getElementById("textoPromptIA");
const relatoPacienteIAEvolucao = document.getElementById("relatoPacienteIA");

document.getElementById("btnGerarPromptIA").addEventListener("click", () => {
    textoPromptIAEvolucao.value = gerarPromptEvolucao();
    relatoPacienteIAEvolucao.value = "";
    modalPromptIAEvolucao.classList.remove("oculto");
});

document.getElementById("fecharModalPromptIA").addEventListener("click", () => {
    modalPromptIAEvolucao.classList.add("oculto");
});

document.getElementById("cancelarModalPromptIA").addEventListener("click", () => {
    modalPromptIAEvolucao.classList.add("oculto");
});

document.getElementById("btnCopiarPromptIA").addEventListener("click", async () => {

    const relato = relatoPacienteIAEvolucao.value.trim();

    if (!relato) {
        mostrarMensagem("Preencha o relato da sessão antes de copiar.", "warning");
        return;
    }

    const textoFinal = `${textoPromptIAEvolucao.value}\n\nRelato da sessão:\n${relato}`;

    try {
        await navigator.clipboard.writeText(textoFinal);
        mostrarMensagem("Prompt copiado! Agora é só colar no chat da IA.", "success");
    } catch (err) {
        const temporario = document.createElement("textarea");
        temporario.value = textoFinal;
        document.body.appendChild(temporario);
        temporario.select();
        document.execCommand("copy");
        document.body.removeChild(temporario);
        mostrarMensagem("Prompt copiado! Agora é só colar no chat da IA.", "success");
    }
});