// ================================
// A QUAL SESSÃO CADA REGISTRO DO PRONTUÁRIO PERTENCE
// ================================
// Usado pela tela do prontuário (evolucao.js) e pela impressão
// (imprimir-prontuario.js), para as duas mostrarem exatamente o mesmo:
// aberto pela Sessão N → só a 1ª Consulta e as sessões 1..N.
//
// Registros novos guardam a sessão de onde foram feitos ("sessaoSid", o
// identificador fixo da sessão, e "sessaoIndice"). Registros antigos não
// têm isso — para eles a sessão é deduzida pela data, SEM alterar o que está salvo.

// converte uma data já salva em texto ("12/03/2026 14:00", "12/03/2026, 14:00:00"...)
// para o formato do campo (yyyy-MM-ddTHH:mm). Retorna "" se não reconhecer.
function dataTextoParaInput(texto) {
    const m = String(texto || "").match(/(\d{2})\/(\d{2})\/(\d{4})(?:\D*(\d{2}):(\d{2}))?/);
    if (!m) return "";
    const [, dia, mes, ano, hora, minuto] = m;
    return `${ano}-${mes}-${dia}T${hora || "00"}:${minuto || "00"}`;
}

function dataHoraDaSessaoAgenda(sessao) {
    if (!sessao || !sessao.data) return null;
    const d = new Date(`${sessao.data}T${sessao.hora || "23:59"}`);
    return isNaN(d) ? null : d;
}

function dataHoraDoRegistroProntuario(item) {
    const valor = item.dataSessao || dataTextoParaInput(item.data);
    if (!valor) return null;
    const d = new Date(valor);
    return isNaN(d) ? null : d;
}

function registroEhConsulta(item, ehCasal) {
    return item.tipo === "consulta" || (!item.pessoa && !item.tipo && ehCasal);
}

/**
 * Acha a sessão (da tela de Sessões) a que o registro pertence.
 * Devolve { numero, agenda }:
 *   numero → 1, 2, 3... (0 = 1ª Consulta; null = não dá para saber, aparece em todos)
 *   agenda → a linha da tela de Sessões ({ data, hora, ... }) quando se tem certeza
 *            de qual é; null quando foi só um palpite pela data
 */
function localizarSessaoDoRegistro(registro, ehCasal, item) {
    if (registroEhConsulta(item, ehCasal)) return { numero: 0, agenda: registro.consulta || null };

    const sessoes = Array.isArray(registro.sessoes) ? registro.sessoes : [];

    // registro novo: ligado à sessão
    if (item.sessaoSid) {
        const i = sessoes.findIndex(s => s && s._sid === item.sessaoSid);
        if (i >= 0) return { numero: i + 1, agenda: sessoes[i] };
    }
    if (typeof item.sessaoIndice === "number") {
        return { numero: item.sessaoIndice + 1, agenda: sessoes[item.sessaoIndice] || null };
    }

    // registro antigo: pela data
    const quando = dataHoraDoRegistroProntuario(item);
    if (!quando) return { numero: null, agenda: null };

    // 1º: uma sessão no mesmo dia
    const dia = quando.toDateString();
    const mesmoDia = sessoes.findIndex(s => {
        const d = dataHoraDaSessaoAgenda(s);
        return d && d.toDateString() === dia;
    });
    if (mesmoDia >= 0) return { numero: mesmoDia + 1, agenda: sessoes[mesmoDia] };

    // 2º: a última sessão que aconteceu antes do registro (só palpite)
    let ultima = -1;
    sessoes.forEach((s, i) => {
        const d = dataHoraDaSessaoAgenda(s);
        if (d && d <= quando) ultima = i;
    });
    return { numero: ultima >= 0 ? ultima + 1 : null, agenda: null };
}

function numeroSessaoDoRegistroDe(registro, ehCasal, item) {
    return localizarSessaoDoRegistro(registro, ehCasal, item).numero;
}

// "2026-11-09" + "14:00" → "2026-11-09T14:00" (formato do campo).
// Sessão com data e SEM hora: usa a data dela com a "horaReserva"
// (se não houver, 00:00). Sem data → "".
function dataInputDaAgenda(agenda, horaReserva) {
    if (!agenda || !agenda.data) return "";
    return `${agenda.data}T${agenda.hora || horaReserva || "00:00"}`;
}

// o valor do campo é a data/hora da sessão? (sessão sem hora: basta o dia bater)
function ehDataDaSessao(valorInput, agenda) {
    if (!agenda || !agenda.data || !valorInput) return false;
    const [dia, hora] = valorInput.split("T");
    return dia === agenda.data && (!agenda.hora || (hora || "").slice(0, 5) === agenda.hora);
}

// "2026-11-09T14:00" → "09/11/2026 14:00"
function dataInputParaTextoBR(valor) {
    if (!valor) return "";
    const [d, h] = valor.split("T");
    const [ano, mes, dia] = d.split("-");
    return `${dia}/${mes}/${ano}${h ? " " + h.slice(0, 5) : ""}`;
}

/**
 * Data e hora que aparecem no registro: as da sessão dele na tela de Sessões
 * (se a sessão for remarcada, o registro acompanha). Só não segue a sessão
 * quando a data foi mudada à mão no prontuário ("dataManual").
 * Devolve { input: "yyyy-MM-ddTHH:mm", texto: "dd/mm/aaaa HH:mm" }.
 */
function dataDoRegistroProntuario(registro, ehCasal, item) {
    const salvo = item.dataSessao || dataTextoParaInput(item.data);
    if (!item.dataManual) {
        // sessão sem hora marcada: mantém a hora que já estava no registro
        const horaSalva = salvo && salvo.includes("T") ? salvo.split("T")[1].slice(0, 5) : "";
        const daAgenda = dataInputDaAgenda(localizarSessaoDoRegistro(registro, ehCasal, item).agenda, horaSalva);
        if (daAgenda) return { input: daAgenda, texto: dataInputParaTextoBR(daAgenda) };
    }
    return { input: salvo, texto: item.data || dataInputParaTextoBR(salvo) };
}

/**
 * Filtra e ordena os registros para o prontuário aberto pela sessão
 * "indiceAberto" (0, 1, 2...; null = sem filtro).
 * Recebe [{ item, indiceReal }] e devolve [{ item, indiceReal, numero }].
 */
function registrosAteASessao(registro, ehCasal, lista, indiceAberto) {
    return lista
        .map((v) => ({ ...v, numero: numeroSessaoDoRegistroDe(registro, ehCasal, v.item) }))
        .filter((v) => indiceAberto === null || v.numero === null || v.numero <= indiceAberto + 1)
        // em ordem de sessão (1ª Consulta, Sessão 1, 2, 3...), mesmo que alguma
        // tenha sido registrada fora de ordem
        .sort((a, b) => {
            const na = a.numero === null ? Infinity : a.numero;
            const nb = b.numero === null ? Infinity : b.numero;
            return na !== nb ? na - nb : a.indiceReal - b.indiceReal;
        });
}

// índice da sessão aberta, lido do endereço (?sessao=2); null se não houver
function indiceSessaoDoEndereco(params) {
    const v = params.get("sessao");
    if (v === null || v === "" || isNaN(Number(v))) return null;
    return Number(v);
}
