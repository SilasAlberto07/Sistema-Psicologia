const dados = JSON.parse(localStorage.getItem("documentoTemp") || "null");

const container = document.getElementById("conteudo-impressao");

function formatarDataBR(data) {
    if (!data) return "____/____/______";
    const [ano, mes, dia] = data.split("-");
    return `${dia}/${mes}/${ano}`;
}

function dataPorExtenso() {
    const meses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho",
        "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
    const hoje = new Date();
    return `${hoje.getDate()} de ${meses[hoje.getMonth()]} de ${hoje.getFullYear()}`;
}

function carimboGeracao() {
    const agora = new Date();
    const data = agora.toLocaleDateString("pt-BR");
    const hora = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return `Documento gerado eletronicamente em ${data} às ${hora}`;
}

if (!dados) {
    container.innerHTML = "<h1>Nenhum documento gerado</h1>";
} else {

    const cidadeEstado = dados.cidadeEstado || "Sinop, MT";

    let corpoHTML = "";
    let assinaturaHTML = `
                <h3>Dra. Cláudia Bethânia – Psicóloga Clínica</h3>
                <p>CRP 18/9851</p>`;

    if (dados.tipo === "devolutiva") {

        // Só sai o que foi escrito nos campos — campo vazio fica em branco
        // (sem frases do modelo e sem linhas para preencher)
        const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
        // texto com várias linhas → parágrafos
        const paragrafos = (t) => String(t || "").split(/\n/).map(p => p.trim()).filter(Boolean)
            .map(p => `<p class="documento-texto">${esc(p)}</p>`).join("");
        const dataBR = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d || "") ? d.split("-").reverse().join("/") : "";
        const periodo = [dataBR(dados.inicio), dataBR(dados.fim)];
        const textoPeriodo = periodo[0] && periodo[1] ? `${periodo[0]} a ${periodo[1]}` : (periodo[0] || periodo[1]);

        const indicadores = String(dados.evolucao || "").split("\n").map(l => l.trim()).filter(Boolean);
        const dataRelatorio = dados.data ? (() => {
            const meses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho",
                "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
            const [ano, mes, dia] = dados.data.split("-");
            return `${Number(dia)} de ${meses[Number(mes) - 1]} de ${ano}`;
        })() : "";
        const localData = [dados.cidadeEstado, dataRelatorio].map(t => String(t || "").trim()).filter(Boolean).join(", ");

        corpoHTML = `
            <div class="cabecalho-print">
                <h1>Relatório de Devolutiva do Acompanhamento Psicológico</h1>
            </div>

            <div class="titulo-secao">1. Identificação</div>
            <div class="devolutiva-identificacao">
                <p><strong>Paciente:</strong> ${esc(dados.paciente || dados.nomeCompleto)}</p>
                <p><strong>Psicóloga responsável:</strong> Cláudia Bethânia – Psicóloga Clínica</p>
                <p><strong>CRP:</strong> 18/9851</p>
                <p><strong>Período do acompanhamento:</strong> ${textoPeriodo}</p>
                <p><strong>Modalidade:</strong> ${esc(dados.modalidade)}</p>
                <p><strong>Abordagem teórica:</strong> ${esc(dados.abordagem)}</p>
            </div>

            <div class="titulo-secao">2. Objetivo do acompanhamento</div>
            ${paragrafos(dados.objetivo)}

            <div class="titulo-secao">3. Desenvolvimento do processo terapêutico</div>
            ${paragrafos(dados.demandas)}
            ${paragrafos(dados.estrategias)}

            <div class="titulo-secao">4. Evolução observada</div>
            ${indicadores.length ? `<ul class="documento-lista">${indicadores.map(i => `<li>${esc(i)}</li>`).join("")}</ul>` : ""}

            <div class="titulo-secao">5. Considerações sobre o encerramento</div>
            ${paragrafos(dados.avancos)}
            ${paragrafos(dados.motivo)}

            <div class="titulo-secao">6. Orientações finais</div>
            ${paragrafos(dados.orientacoes)}

            ${localData ? `<p class="documento-data">${esc(localData)}.</p>` : ""}
        `;

        assinaturaHTML = `
                <h3>Dra. Cláudia Bethânia – Psicóloga Clínica</h3>
                <p>CRP 18/9851</p>`;

    } else if (dados.tipo === "declaracao" && dados.texto) {

        // texto escrito/editado pela Dra na tela Documentos
        // (o nome do paciente sai em negrito, como antes)
        const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
        // em negrito: nome do paciente, data da sessão e horário
        const dataSessao = /^\d{4}-\d{2}-\d{2}$/.test(dados.data || "") ? dados.data.split("-").reverse().join("/") : "";
        const destaques = [dados.nomeCompleto, dataSessao, dados.hora]
            .map(t => esc(String(t || "").trim())).filter(Boolean);
        const negrito = (html) => {
            if (!destaques.length) return html;
            const regex = new RegExp(destaques.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "g");
            return html.replace(regex, (m) => `<strong>${m}</strong>`);
        };
        const paragrafos = String(dados.texto).split(/\n/).map(p => p.trim()).filter(Boolean)
            .map(p => `<p class="documento-texto">${negrito(esc(p))}</p>`).join("");

        corpoHTML = `
            <div class="cabecalho-print">
                <h1>Declaração de Comparecimento</h1>
            </div>

            ${paragrafos}

            <p class="documento-data">${esc(cidadeEstado)}, ${dataPorExtenso()}.</p>
        `;

    } else if (dados.tipo === "declaracao") {

        // declarações antigas (de antes do texto editável)
        corpoHTML = `
            <div class="cabecalho-print">
                <div class="clinica-nome">Cláudia Bethânia — Psicóloga Clínica</div>
                <div class="subtitulo-clinica">CRP 18/9851</div>
                <h1>Declaração de Comparecimento</h1>
                
            </div>

            <p class="documento-texto">
                Declaro para os devidos fins que <strong>${dados.nomeCompleto}</strong>,
                está sendo submetida a acompanhamento psicológico, sob meus cuidados profissionais,
                comparecendo às sessões do dia <strong>${formatarDataBR(dados.data)}</strong>,
                no horário <strong>${dados.hora || "____:____"}</strong>,
                no endereço <strong>${dados.endereco || "________________________"}</strong>.
            </p>

            <p class="documento-texto">
                ${dados.previsao || "Até o presente momento sem data de previsão para o término do acompanhamento."}
            </p>

            <p class="documento-texto">
                Este documento é emitido nos termos da legislação vigente e das normas do Conselho
                Federal de Psicologia, sendo válido para os fins a que se destina.
            </p>

            <p class="documento-data">${cidadeEstado}, ${dataPorExtenso()}.</p>
        `;

    } else {

        corpoHTML = `
            <div class="cabecalho-print">
                <div class="clinica-nome">Cláudia Bethânia — Psicóloga Clínica</div>
                <div class="subtitulo-clinica">CRP 18/9851</div>
                <h1>Atestado Psicológico</h1>
                
            </div>

            <p class="documento-saudacao">Prezado(a),</p>

            <p class="documento-texto">
                Declaro, para fins de comprovação, que <strong>${dados.nomeCompleto}</strong>${dados.cpf ? `, portador(a) do CPF: <strong>${dados.cpf}</strong>,` : ","}
                está sendo submetido(a) a acompanhamento psicológico, sob meus cuidados profissionais,
                desde o dia <strong>${formatarDataBR(dados.data)}</strong>.
            </p>

            <p class="documento-texto">
                Afirmo que o(a) mesmo(a) não está em condições psíquicas e emocionais para trabalhar
                neste momento, apresentando <strong>${dados.motivo || "quadro emocional que requer acompanhamento"}</strong>,
                diante disso existe um risco eminente para a saúde mental bem como física do(a) paciente,
                necessitando de um afastamento de <strong>${dados.duracao || "tempo indeterminado"}</strong>
                para que possa cuidar da sua saúde emocional.
            </p>

            <p class="documento-texto">Atenciosamente,</p>

            <p class="documento-data">${cidadeEstado}, ${dataPorExtenso()}.</p>
        `;
    }

    container.innerHTML = `
        <div class="prontuario">

            <img class="marca-dagua" src="../assets/img/logo-marca-dagua-documento.png" alt="">

            ${corpoHTML}

            <div class="assinatura">
                <div class="linha-assinatura"></div>
                ${assinaturaHTML}
            </div>

            <div class="rodape-contato">
                maclaudiabethaniapsicologa@gmail.com · (66) 99689-4144 · @psiclaudiabethania_
            </div>

            <div class="timestamp-impressao">${carimboGeracao()}</div>
        </div>
    `;

    localStorage.removeItem("documentoTemp");

    // guarda o PDF nos documentos do paciente e depois abre a impressão
    // (espera a marca d'água carregar para ela sair no PDF)
    // (monta no modelo do contrato e espera fontes e logo carregarem)
    // atestado e declaração são curtos: o conteúdo fica centralizado na folha A4
    const centralizar = dados.tipo !== "devolutiva";
    FolhaPadrao.aplicar(container, { centralizar }).then(() => DocsPaciente.guardarEImprimir(dados));
}
