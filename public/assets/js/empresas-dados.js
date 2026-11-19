// ═══════════════════════════════════════════════
// PSICOLOGIA ORGANIZACIONAL — dados das empresas
//
// As empresas ficam numa lista separada dos pacientes: chave "empresas".
// Entra no backup e na sincronização entre computadores (como pacientes).
//
// Cada empresa:
//   { id, codigo, criadoEm, atualizadoEm, arquivada,
//     razaoSocial, nomeFantasia, cnpj, ramo, endereco, cidadeEstado, cep,
//     respNome, respCargo, respTelefone, respEmail,
//     totalColaboradores, qtdSetores, respRH,
//     escopo, dataInicio, periodoQtd, periodoUnidade, dataTermino, respProjeto,
//     dataCadastro, observacoes,
//     documentos: [ ...mesmo formato dos documentos do paciente... ] }
// ═══════════════════════════════════════════════

const Empresas = (() => {

    const CHAVE = "empresas";

    async function lerTodas() {
        try { return JSON.parse(await window.storage.getItem(CHAVE)) || []; }
        catch (e) { return []; }
    }

    async function salvarTodas(lista) {
        await window.storage.setItem(CHAVE, JSON.stringify(lista));
    }

    async function buscar(id) {
        const lista = await lerTodas();
        return lista.find(e => String(e.id) === String(id)) || null;
    }

    // id único (não repete nem entre os dois computadores)
    function novoId() {
        return `emp_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    }

    // código só para mostrar na tela: EMP0001, EMP0002...
    function proximoCodigo(lista) {
        let maior = 0;
        lista.forEach(e => {
            const n = parseInt(String(e.codigo || "").replace(/\D/g, ""), 10);
            if (Number.isFinite(n) && n > maior) maior = n;
        });
        return "EMP" + String(maior + 1).padStart(4, "0");
    }

    function nome(empresa) {
        if (!empresa) return "";
        return (empresa.nomeFantasia || "").trim() || (empresa.razaoSocial || "").trim() || "Empresa sem nome";
    }

    // ---------------- datas ----------------
    function hojeISO() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }

    function paraData(iso) {
        const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
        return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
    }

    function paraISO(data) {
        return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
    }

    function dataBR(iso) {
        const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
        return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
    }

    // término = início + período (meses, semanas ou dias)
    function calcularTermino(dataInicio, qtd, unidade) {
        const inicio = paraData(dataInicio);
        const n = Number(qtd);
        if (!inicio || !Number.isFinite(n) || n <= 0) return "";
        const fim = new Date(inicio);
        if (unidade === "dias") fim.setDate(fim.getDate() + n);
        else if (unidade === "semanas") fim.setDate(fim.getDate() + n * 7);
        else fim.setMonth(fim.getMonth() + n);
        return paraISO(fim);
    }

    function textoPeriodo(empresa) {
        const n = Number(empresa.periodoQtd);
        if (!Number.isFinite(n) || n <= 0) return "";
        const u = empresa.periodoUnidade || "meses";
        const singular = { meses: "mês", semanas: "semana", dias: "dia" }[u] || u;
        return `${n} ${n === 1 ? singular : u}`;
    }

    // situação do contrato, para os cards
    // (o trabalho é por contrato: mostra só o status e a vigência, sem contar dias)
    function situacaoContrato(empresa) {
        const inicio = paraData(empresa.dataInicio);
        const fim = paraData(empresa.dataTermino);
        const hoje = paraData(hojeISO());

        const vigencia = inicio
            ? (fim ? `${dataBR(empresa.dataInicio)} a ${dataBR(empresa.dataTermino)}` : `desde ${dataBR(empresa.dataInicio)}`)
            : "";

        if (!inicio) return { status: "sem-data", texto: "Sem data de início", vigencia };
        if (hoje < inicio) return { status: "a-iniciar", texto: "Contrato a iniciar", vigencia };
        if (fim && hoje > fim) return { status: "encerrado", texto: "Contrato encerrado", vigencia };
        return { status: "andamento", texto: "Contrato ativo", vigencia };
    }

    // documentos que estão valendo (cancelados e substituídos não contam)
    function documentosValendo(empresa) {
        return (empresa.documentos || []).filter(d => (d.status || "ativo") === "ativo");
    }

    return {
        CHAVE, lerTodas, salvarTodas, buscar, novoId, proximoCodigo, nome,
        hojeISO, dataBR, calcularTermino, textoPeriodo, situacaoContrato, documentosValendo
    };
})();
