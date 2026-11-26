// ═══════════════════════════════════════════════
// MODELO DO RECIBO DE PRESTAÇÃO DE SERVIÇOS PSICOLÓGICOS
// Usado pela prévia (tela Documentos) e pela impressão (imprimir-documento),
// para as duas ficarem sempre iguais.
// Campo vazio sai como linha para preencher à mão.
// ═══════════════════════════════════════════════

const ReciboModelo = (() => {

    const TITULO = "Recibo de Prestação de Serviços Psicológicos";
    const ASSINATURA = `<h3>Cláudia Bethânia – Psicóloga Clínica</h3><p>CRP 18/9851</p>`; // igual aos outros documentos
    const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho",
        "agosto", "setembro", "outubro", "novembro", "dezembro"];

    function esc(texto) {
        return String(texto ?? "").replace(/[&<>"']/g, (c) => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        }[c]));
    }

    // valor em negrito, ou linha em branco para preencher à mão
    function campo(valor, branco = "________________________") {
        const texto = String(valor ?? "").trim();
        return texto ? `<strong>${esc(texto)}</strong>` : branco;
    }

    // "180" → "180,00"; mantém o que já vier formatado
    function formatarValor(valor) {
        const limpo = String(valor || "").replace(/^R\$\s*/i, "").trim();
        if (/^\d+$/.test(limpo)) return `${limpo},00`;
        if (/^\d+,\d$/.test(limpo)) return `${limpo}0`;
        return limpo;
    }

    function dataBR(iso) {
        const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
        return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
    }

    function dataExtenso(iso) {
        const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
        return m ? `${Number(m[3])} de ${MESES[Number(m[2]) - 1]} de ${m[1]}` : "";
    }

    // um item por linha (tira marcadores digitados no começo: •, *, -)
    function itensDescricao(texto) {
        return String(texto || "").split(/\n/)
            .map(l => l.replace(/^\s*[•*\-–]\s*/, "").trim())
            .filter(Boolean);
    }

    function corpoHTML(d) {
        const valor = formatarValor(d.valor);
        const itens = itensDescricao(d.descricao);
        const local = String(d.cidadeEstado || "").trim();
        const emissao = dataExtenso(d.dataEmissao);
        const localData = local && emissao ? `${local}, ${emissao}` : [local, emissao].filter(Boolean).join(", ");

        return `
            <div class="cabecalho-print">
                <h1>${TITULO}</h1>
            </div>

            <p class="documento-texto">Eu, Psicóloga Clínica Cláudia Bethânia, inscrita no Conselho Regional de
            Psicologia sob o CRP 18/9851, declaro, para os devidos fins, que recebi de:</p>

            <p class="documento-texto recibo-dado">Paciente/Contratante: ${campo(d.nomeCompleto)}</p>
            <p class="documento-texto recibo-dado">CPF: ${campo(d.cpf, "______________________")}</p>

            <p class="documento-texto recibo-importancia">A importância de R$ ${campo(valor, "__________")}
            (${campo(d.valorExtenso, "________________________________")}), referente à prestação de serviços
            psicológicos, conforme contratação estabelecida entre as partes.</p>

            <p class="documento-texto recibo-titulo">Descrição dos serviços contratados:</p>
            ${itens.length
                ? `<ul class="documento-lista recibo-lista">${itens.map(i => `<li>${esc(i)}</li>`).join("")}</ul>`
                : `<p class="documento-texto">________________________________________________</p>`}

            <p class="documento-texto recibo-dado">Forma de pagamento: ${campo(d.formaPagamento)}</p>
            <p class="documento-texto recibo-dado">Data do pagamento: ${campo(dataBR(d.dataPagamento), "____/____/________")}</p>
            <p class="documento-texto recibo-dado">Local e data de emissão: ${campo(localData)}</p>

            <p class="documento-texto recibo-final">Declaro que o valor acima foi efetivamente recebido, para os fins
            de comprovação de pagamento.</p>
        `;
    }

    return { TITULO, ASSINATURA, corpoHTML };
})();
