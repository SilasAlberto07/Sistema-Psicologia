// ═══════════════════════════════════════════════
// DOCUMENTOS DO PACIENTE — funções compartilhadas
//
// Os documentos gerados ficam dentro do próprio cadastro (paciente ou casal),
// na lista "documentos". Assim entram no backup e na sincronização entre
// computadores, do mesmo jeito que os anexos do prontuário.
//
// Cada documento gerado:
//   { id, tipo, titulo, pessoa, nomePessoa, criadoEm,
//     status: "ativo" | "cancelado" | "substituido",
//     canceladoEm, motivoCancelamento, substituidoEm, substituidoPor, substitui,
//     dados: { ...o que foi preenchido }, pdf: "data:application/pdf;base64,..." }
//
// Os anexos do prontuário NÃO são copiados: a lista lê direto das sessões.
// ═══════════════════════════════════════════════

const DocsPaciente = (() => {

    // tipos de documento. "geravel" = pode ser gerado pela tela Documentos.
    // O tipo "teste" já está previsto para, no futuro, ser gerado pelo sistema;
    // por enquanto os testes entram como anexo do prontuário.
    const TIPOS = {
        contrato:   { nome: "Contrato",   plural: "Contratos",   icone: "ti-file-certificate", geravel: true,  editavel: true },
        atestado:   { nome: "Atestado",   plural: "Atestados",   icone: "ti-stethoscope",      geravel: true,  editavel: true },
        declaracao: { nome: "Declaração", plural: "Declarações", icone: "ti-file-text",        geravel: true,  editavel: true },
        recibo:     { nome: "Recibo",     plural: "Recibos",     icone: "ti-receipt",          geravel: true,  editavel: true },
        devolutiva: { nome: "Devolutiva", plural: "Devolutivas", icone: "ti-report",           geravel: true,  editavel: true },
        laudo:      { nome: "Laudo",      plural: "Laudos",      icone: "ti-file-analytics",   geravel: true,  editavel: true },
        relatorio:  { nome: "Relatório",  plural: "Relatórios",  icone: "ti-file-description", geravel: true,  editavel: true },
        entrevista: { nome: "Entrevista", plural: "Entrevistas", icone: "ti-briefcase",        geravel: true,  editavel: true }, // empresa (Psicologia Organizacional)
        atividade:  { nome: "Atividade",  plural: "Atividades",  icone: "ti-notebook",         geravel: false, editavel: false }, // vem da tela Atividades Terapêuticas
        teste:      { nome: "Teste",      plural: "Testes",      icone: "ti-clipboard-check",  geravel: false, editavel: false },
        anexo:      { nome: "Anexo",      plural: "Anexos",      icone: "ti-paperclip",        geravel: false, editavel: false }
    };

    const TITULOS = {
        contrato: "Contrato de Prestação de Serviços de Psicoterapia",
        atestado: "Atestado Psicológico",
        declaracao: "Declaração de Comparecimento",
        recibo: "Recibo de Prestação de Serviços Psicológicos",
        devolutiva: "Relatório de Devolutiva",
        laudo: "Laudo Psicológico",
        relatorio: "Relatório Psicológico",
        entrevista: "Relatório de Entrevista – Recrutamento e Seleção"
    };

    const CHAVE_CONFIG = "configDocumentos";
    const CONFIG_PADRAO = { limiteAtestados: 15 };
    const LIMITE_MAXIMO_ATESTADOS = 15; // máximo permitido em Configurações

    function novoId() {
        return `doc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    }

    // "empresa" = Psicologia Organizacional (lista separada dos pacientes)
    function chaveLista(origem) {
        if (origem === "empresa") return "empresas";
        return origem === "casal" ? "casais" : "pacientes";
    }

    async function lerLista(origem) {
        try { return JSON.parse(await window.storage.getItem(chaveLista(origem))) || []; }
        catch (e) { return []; }
    }

    function nomeDaPessoa(registro, origem, pessoa) {
        if (origem === "empresa") return registro.nomeFantasia || registro.razaoSocial || "";
        if (origem !== "casal") return registro.nomeCompleto || "";
        if (pessoa === "p1") return registro.p1NomeCompleto || "";
        if (pessoa === "p2") return registro.p2NomeCompleto || "";
        return registro.nomeCasal || "";
    }

    // ---------------- configuração do limite de atestados ----------------
    async function lerConfig() {
        try {
            const salvo = JSON.parse(await window.storage.getItem(CHAVE_CONFIG)) || {};
            return { ...CONFIG_PADRAO, ...salvo };
        } catch (e) {
            return { ...CONFIG_PADRAO };
        }
    }

    async function salvarConfig(config) {
        const atual = await lerConfig();
        await window.storage.setItem(CHAVE_CONFIG, JSON.stringify({ ...atual, ...config }));
    }

    // atestados que contam no limite: todos os ativos da pessoa (total do tratamento).
    // Cancelados e substituídos (versão editada) não contam.
    function contarAtestados(registro, pessoa) {
        return (registro.documentos || []).filter(d => {
            if (d.tipo !== "atestado" || (d.status || "ativo") !== "ativo") return false;
            if (pessoa && d.pessoa !== pessoa) return false;
            return true;
        }).length;
    }

    // ---------------- lista completa (gerados + anexos do prontuário) ----------------
    function formatarDataBR(iso) {
        const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
        return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
    }

    function listarTudo(registro, origem) {
        const itens = [];

        (registro.documentos || []).forEach(doc => {
            itens.push({
                fonte: "gerado",
                id: doc.id,
                tipo: doc.tipo,
                titulo: doc.titulo,
                pessoa: doc.pessoa || null,
                nomePessoa: doc.nomePessoa || nomeDaPessoa(registro, origem, doc.pessoa),
                data: doc.criadoEm,
                status: doc.status || "ativo",
                origemTexto: (doc.tipo === "atividade" ? "Atividades Terapêuticas" : "Gerado em Documentos")
                    + (doc.substitui ? " (versão editada)" : ""),
                arquivo: { tipo: "pdf", dados: doc.pdf, nome: `${doc.titulo}.pdf` },
                doc
            });
        });

        (registro.evolucoes || []).forEach((evo, iEvo) => {
            (evo.anexos || []).forEach((anexo, iAnexo) => {
                const ehTeste = anexo.categoria === "teste";
                const dataSessao = formatarDataBR(evo.dataSessao) || evo.data || "";
                itens.push({
                    fonte: "anexo",
                    id: `anexo_${iEvo}_${iAnexo}`,
                    tipo: ehTeste ? "teste" : "anexo",
                    titulo: anexo.titulo || anexo.nome || "Anexo",
                    pessoa: evo.pessoa || null,
                    nomePessoa: origem === "casal"
                        ? (evo.pessoa ? nomeDaPessoa(registro, origem, evo.pessoa) : "Casal")
                        : "",
                    data: anexo.criadoEm || evo.dataSessao || "",
                    status: "ativo",
                    origemTexto: `Anexado no prontuário${dataSessao ? ` · sessão de ${dataSessao}` : ""}`,
                    arquivo: { tipo: anexo.tipo, dados: anexo.dados, nome: anexo.nome || anexo.titulo },
                    doc: null
                });
            });
        });

        // mais recentes primeiro
        itens.sort((a, b) => String(b.data).localeCompare(String(a.data)));
        return itens;
    }

    // ---------------- gravar um documento gerado ----------------
    // destino = { origem: "individual" | "casal", id, pessoa? }
    // info    = { tipo, dados, substitui? }
    async function salvarDocumentoGerado(destino, info, pdfDataURL) {
        const lista = await lerLista(destino.origem);
        const registro = lista.find(r => String(r.id) === String(destino.id));
        if (!registro) return { ok: false, erro: destino.origem === "empresa" ? "Empresa não encontrada." : "Paciente não encontrado." };

        if (!Array.isArray(registro.documentos)) registro.documentos = [];

        const agora = new Date().toISOString();
        const doc = {
            id: novoId(),
            tipo: info.tipo,
            titulo: info.titulo || TITULOS[info.tipo] || TIPOS[info.tipo]?.nome || "Documento",
            criadoEm: agora,
            status: "ativo",
            dados: info.dados,
            pdf: pdfDataURL
        };
        if (destino.pessoa) doc.pessoa = destino.pessoa;
        doc.nomePessoa = nomeDaPessoa(registro, destino.origem, destino.pessoa);

        // versão editada: a anterior fica guardada como "substituída"
        if (info.substitui) {
            const anterior = registro.documentos.find(d => d.id === info.substitui);
            if (anterior) {
                anterior.status = "substituido";
                anterior.substituidoEm = agora;
                anterior.substituidoPor = doc.id;
                doc.substitui = anterior.id;
            }
        }

        registro.documentos.push(doc);
        await window.storage.setItem(chaveLista(destino.origem), JSON.stringify(lista));
        return { ok: true, doc };
    }

    // ---------------- cancelar ----------------
    async function cancelarDocumento(origem, idRegistro, idDoc, motivo) {
        const lista = await lerLista(origem);
        const registro = lista.find(r => String(r.id) === String(idRegistro));
        const doc = registro && (registro.documentos || []).find(d => d.id === idDoc);
        if (!doc) return false;
        doc.status = "cancelado";
        doc.canceladoEm = new Date().toISOString();
        if (motivo) doc.motivoCancelamento = motivo;
        await window.storage.setItem(chaveLista(origem), JSON.stringify(lista));
        return true;
    }

    // ---------------- excluir de vez ----------------
    // (a sincronização entende o item removido e apaga também no outro computador)
    async function excluirDocumento(origem, idRegistro, idDoc) {
        const lista = await lerLista(origem);
        const registro = lista.find(r => String(r.id) === String(idRegistro));
        if (!registro || !Array.isArray(registro.documentos)) return false;
        const antes = registro.documentos.length;
        registro.documentos = registro.documentos.filter(d => d.id !== idDoc);
        if (registro.documentos.length === antes) return false;
        await window.storage.setItem(chaveLista(origem), JSON.stringify(lista));
        return true;
    }

    // ---------------- RECIBOS DE QUEM NÃO TEM CADASTRO ----------------
    // Ficam na lista "recibos" (sincronizada entre os computadores).
    // Recibo de paciente cadastrado continua guardado no cadastro dele.
    const CHAVE_RECIBOS = "recibos";

    async function lerRecibosAvulsos() {
        try { return JSON.parse(await window.storage.getItem(CHAVE_RECIBOS)) || []; }
        catch (e) { return []; }
    }

    // marca a versão anterior (sem cadastro) como substituída pela nova
    function substituirNaLista(lista, idAnterior, idNovo, agora) {
        const anterior = lista.find(d => d.id === idAnterior);
        if (!anterior) return false;
        anterior.status = "substituido";
        anterior.substituidoEm = agora;
        anterior.substituidoPor = idNovo;
        return true;
    }

    async function salvarReciboAvulso(info, pdfDataURL) {
        const lista = await lerRecibosAvulsos();
        const agora = new Date().toISOString();
        const doc = {
            id: novoId(),
            tipo: "recibo",
            titulo: info.titulo || TITULOS.recibo,
            criadoEm: agora,
            status: "ativo",
            nomePessoa: (info.dados && info.dados.nomeCompleto) || "",
            dados: info.dados,
            pdf: pdfDataURL
        };
        if (info.substitui && substituirNaLista(lista, info.substitui, doc.id, agora)) doc.substitui = info.substitui;
        lista.push(doc);
        await window.storage.setItem(CHAVE_RECIBOS, JSON.stringify(lista));
        return { ok: true, doc };
    }

    // recibo sem cadastro que foi editado e passou para um paciente cadastrado
    async function substituirReciboAvulso(idAnterior, idNovo) {
        const lista = await lerRecibosAvulsos();
        if (!substituirNaLista(lista, idAnterior, idNovo, new Date().toISOString())) return false;
        await window.storage.setItem(CHAVE_RECIBOS, JSON.stringify(lista));
        return true;
    }

    async function cancelarReciboAvulso(idDoc, motivo) {
        const lista = await lerRecibosAvulsos();
        const doc = lista.find(d => d.id === idDoc);
        if (!doc) return false;
        doc.status = "cancelado";
        doc.canceladoEm = new Date().toISOString();
        if (motivo) doc.motivoCancelamento = motivo;
        await window.storage.setItem(CHAVE_RECIBOS, JSON.stringify(lista));
        return true;
    }

    // todos os recibos: os sem cadastro + os guardados nos pacientes e casais
    async function listarRecibos() {
        const itens = [];
        (await lerRecibosAvulsos()).forEach(doc => itens.push({ origem: "recibo", idRegistro: null, doc }));
        for (const origem of ["individual", "casal"]) {
            (await lerLista(origem)).forEach(registro => {
                (registro.documentos || []).filter(d => d.tipo === "recibo")
                    .forEach(doc => itens.push({ origem, idRegistro: registro.id, doc }));
            });
        }
        itens.sort((a, b) => String(b.doc.criadoEm).localeCompare(String(a.doc.criadoEm)));
        return itens;
    }

    // ---------------- gera o PDF da página atual (impressão) ----------------
    // Usado pelas páginas de impressão: guarda o PDF e depois abre a impressão.
    async function guardarPaginaComoPDF(dadosTemp) {
        const destino = dadosTemp && dadosTemp.destino;
        // recibo sem paciente cadastrado também é guardado (na lista "recibos")
        const reciboAvulso = !destino && dadosTemp && dadosTemp.tipo === "recibo";
        if ((!destino && !reciboAvulso) || dadosTemp.salvo) return { ok: false, ignorado: true };
        if (!window.documentosPDF || !window.storage) return { ok: false, erro: "indisponível" };

        const base64 = await window.documentosPDF.gerar();
        if (!base64) return { ok: false, erro: "Não foi possível gerar o PDF." };

        const dados = { ...dadosTemp };
        delete dados.destino;
        delete dados.substitui;
        delete dados.salvo;

        const pdf = `data:application/pdf;base64,${base64}`;
        if (reciboAvulso) {
            return salvarReciboAvulso({ titulo: dadosTemp.tituloDocumento, dados, substitui: dadosTemp.substitui }, pdf);
        }

        const r = await salvarDocumentoGerado(destino, {
            tipo: dadosTemp.tipo,
            titulo: dadosTemp.tituloDocumento,
            dados,
            substitui: dadosTemp.substitui
        }, pdf);
        // recibo que era sem cadastro e agora foi para um paciente: a versão antiga fica "substituída"
        if (r.ok && dadosTemp.tipo === "recibo" && dadosTemp.substitui) {
            try { await substituirReciboAvulso(dadosTemp.substitui, r.doc.id); } catch (e) { }
        }
        return r;
    }

    // guarda o PDF (se tiver paciente escolhido) e depois abre a impressão.
    // chaveTemp: se informada, marca o rascunho como "já guardado" para não
    // duplicar o documento caso a página seja recarregada.
    async function guardarEImprimir(dadosTemp, chaveTemp) {
        try {
            const r = await guardarPaginaComoPDF(dadosTemp);
            if (r.ok && chaveTemp) {
                localStorage.setItem(chaveTemp, JSON.stringify({ ...dadosTemp, salvo: true }));
            }
            if (!r.ok && !r.ignorado) console.warn("[documentos] Documento não foi guardado:", r.erro);
        } catch (e) {
            console.error("[documentos] Erro ao guardar documento:", e);
        }
        window.print();
    }

    // ---------------- arquivos (abrir / baixar) ----------------
    function dataURLParaBlobURL(dataURL) {
        const [cabecalho, base64] = String(dataURL).split(",");
        const mime = (cabecalho.match(/data:(.*?);/) || [])[1] || "application/octet-stream";
        const binario = atob(base64 || "");
        const bytes = new Uint8Array(binario.length);
        for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
        return URL.createObjectURL(new Blob([bytes], { type: mime }));
    }

    return {
        TIPOS, TITULOS, CONFIG_PADRAO,
        lerLista, nomeDaPessoa,
        lerConfig, salvarConfig, contarAtestados,
        listarTudo, formatarDataBR,
        salvarDocumentoGerado, cancelarDocumento, excluirDocumento, guardarPaginaComoPDF, guardarEImprimir,
        lerRecibosAvulsos, cancelarReciboAvulso, listarRecibos,
        dataURLParaBlobURL
    };
})();
