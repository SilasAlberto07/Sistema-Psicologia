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

    } else if (dados.tipo === "fichaEmpresa") {

        // FICHA DE CADASTRO INSTITUCIONAL – PSICOLOGIA ORGANIZACIONAL (só imprime, não fica guardada)
        const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
        const dataBR = (d) => /^\d{4}-\d{2}-\d{2}/.test(d || "") ? d.slice(0, 10).split("-").reverse().join("/") : esc(d || "");
        const linha = (rotulo, valor) => `<tr><th>${rotulo}</th><td>${valor ? esc(valor) : "&nbsp;"}</td></tr>`;
        const n = Number(dados.periodoQtd);
        const periodo = Number.isFinite(n) && n > 0
            ? `${n} ${n === 1 ? ({ meses: "mês", semanas: "semana", dias: "dia" }[dados.periodoUnidade || "meses"]) : (dados.periodoUnidade || "meses")}`
              + (dados.dataTermino ? ` (até ${dataBR(dados.dataTermino)})` : "")
            : (dados.dataTermino ? `até ${dataBR(dados.dataTermino)}` : "");

        corpoHTML = `
            <div class="cabecalho-print">
                <h1>Cadastro Institucional – Psicologia Organizacional</h1>
            </div>

            <div class="titulo-secao">1. Identificação da Empresa</div>
            <table class="ficha-tabela">
                ${linha("Razão social", dados.razaoSocial)}
                ${linha("Nome fantasia", dados.nomeFantasia)}
                ${linha("CNPJ", dados.cnpj)}
                ${linha("Ramo de atividade", dados.ramo)}
                ${linha("Endereço", dados.endereco)}
                ${linha("Cidade/Estado", dados.cidadeEstado)}
                ${linha("CEP", dados.cep)}
            </table>

            <div class="titulo-secao">2. Responsável pela Empresa</div>
            <table class="ficha-tabela">
                ${linha("Nome completo", dados.respNome)}
                ${linha("Cargo", dados.respCargo)}
                ${linha("Telefone/WhatsApp", dados.respTelefone)}
                ${linha("E-mail", dados.respEmail)}
            </table>

            <div class="titulo-secao">3. Informações Organizacionais</div>
            <table class="ficha-tabela">
                ${linha("Total de colaboradores", dados.totalColaboradores)}
                ${linha("Quantidade de setores", dados.qtdSetores)}
                ${linha("Responsável pelo RH/Administrativo", dados.respRH)}
            </table>

            <div class="titulo-secao">4. Informações da Contratação</div>
            <table class="ficha-tabela">
                ${linha("Objeto e escopo do serviço contratado", dados.escopo)}
                <tr><th>Data de início</th><td>${dados.dataInicio ? dataBR(dados.dataInicio) : "&nbsp;"}</td></tr>
                ${linha("Período previsto", periodo)}
                ${linha("Responsável pelo acompanhamento do projeto", dados.respProjeto)}
            </table>

            <div class="titulo-secao">5. Psicóloga Responsável pelo Projeto</div>
            <table class="ficha-tabela">
                ${linha("Psicóloga", "Cláudia Bethânia")}
                ${linha("CRP", "18/9851")}
                ${linha("Área de atuação", "Psicologia Organizacional")}
                <tr><th>Data do cadastro</th><td>${dados.dataCadastro ? dataBR(dados.dataCadastro) : "&nbsp;"}</td></tr>
            </table>

            <div class="titulo-secao">6. Finalidade e Proteção das Informações</div>
            <p class="documento-texto">As informações coletadas destinam-se exclusivamente à identificação cadastral da empresa e à
            organização da prestação dos serviços de Psicologia Organizacional. Os dados serão tratados com confidencialidade
            e segurança, observando a legislação aplicável, especialmente a Lei Geral de Proteção de Dados Pessoais
            (Lei nº 13.709/2018).</p>
        `;

        // o modelo da ficha não tem assinatura (termina na seção 6)
        assinaturaHTML = "";

    } else if (dados.tipo === "entrevista") {

        // RELATÓRIO DE ENTREVISTA – RECRUTAMENTO E SELEÇÃO (documento para empresa)
        const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
        // Texto copiado de PDF vem com quebra de linha no fim de cada linha.
        // Junta as linhas quebradas no meio da frase de volta em um parágrafo só
        // (assim o texto fica justificado e sem espaço extra entre as linhas).
        // Novo parágrafo só depois de linha em branco ou de linha que termina com . ! ? ou :
        // (texto copiado de PDF: só depois de linha em branco)
        const ehTopico = (l) => /^\s*[-•*–]\s+/.test(l);
        const paragrafos = (t) => {
            const blocos = [];
            let atual = null;
            const todas = String(t || "").split(/\n/).map(l => l.trim()).filter(l => l && !ehTopico(l));
            // a maioria das linhas termina sem ponto → texto copiado de PDF:
            // só a linha em branco separa parágrafo (junta mesmo se a linha terminar com ponto)
            const semPonto = todas.filter(l => !/[.!?:]["”)]?$/.test(l)).length;
            const copiadoDePDF = todas.length >= 3 && semPonto / todas.length >= 0.5;
            String(t || "").split(/\n/).forEach(bruta => {
                const linha = bruta.trim();
                if (!linha) { atual = null; return; }
                if (ehTopico(linha)) {
                    atual = { topico: true, texto: linha.replace(/^\s*[-•*–]\s+/, "") };
                    blocos.push(atual);
                    return;
                }
                if (atual && !atual.topico && (copiadoDePDF || !/[.!?:]["”)]?$/.test(atual.texto))) {
                    // palavra quebrada com hífen no fim da linha ("compe-" + "tências")
                    atual.texto = /[A-Za-zÀ-ÿ]-$/.test(atual.texto)
                        ? atual.texto.slice(0, -1) + linha
                        : `${atual.texto} ${linha}`;
                    return;
                }
                atual = { topico: false, texto: linha };
                blocos.push(atual);
            });
            return blocos.map(b => b.topico
                ? `<ul class="documento-lista"><li>${esc(b.texto)}</li></ul>`
                : `<p class="documento-texto">${esc(b.texto)}</p>`).join("");
        };
        const porExtenso = (d) => {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(d || "")) return "";
            const meses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho",
                "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
            const [ano, mes, dia] = d.split("-");
            return `${Number(dia)} de ${meses[Number(mes) - 1]} de ${ano}`;
        };
        const localData = [dados.cidadeEstado, porExtenso(dados.data)].map(t => String(t || "").trim()).filter(Boolean).join(", ");
        const linhaId = (rotulo, valor) => valor ? `<p><strong>${rotulo}:</strong> ${esc(valor)}</p>` : "";

        corpoHTML = `
            <div class="cabecalho-print">
                <h1>Relatório de Entrevista – Recrutamento e Seleção</h1>
            </div>

            <div class="devolutiva-identificacao">
                ${linhaId("Empresa", dados.empresa)}
                ${linhaId("Cargo", dados.cargo)}
                ${linhaId("Candidato(a)", dados.candidato || dados.nomeCompleto)}
                ${linhaId("Idade", dados.idade)}
            </div>

            <div class="titulo-secao">1. Objetivo do acompanhamento da entrevista</div>
            ${paragrafos(dados.objetivo)}

            <div class="titulo-secao">2. Desenvolvimento do processo seletivo</div>
            ${paragrafos(dados.desenvolvimento)}

            <div class="titulo-secao">3. Indicadores comportamentais identificados</div>
            ${paragrafos(dados.indicadores)}

            <div class="titulo-secao">4. Evolução observada e considerações finais</div>
            ${paragrafos(dados.consideracoes)}

            ${localData ? `<p class="documento-data">${esc(localData)}.</p>` : ""}
        `;

        assinaturaHTML = `
                <p>Responsável pela entrevista:</p>
                <h3>${esc(dados.responsavel || "Psicóloga Organizacional – Dra. Cláudia Bethânia")}</h3>
                <p>CRP 18/9851${dados.empresa ? ` · ${esc(dados.empresa)}` : ""}</p>`;

    } else if (dados.tipo === "laudo" || dados.tipo === "relatorio") {

        // LAUDO PSICOLÓGICO / RELATÓRIO PSICOLÓGICO
        // Só sai o que foi escrito nos campos. Linha começando com "-", "•" ou "*" vira tópico.
        const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
        const ehTopico = (l) => /^\s*[-•*–]\s+/.test(l);
        const blocos = (t) => {
            const linhas = String(t || "").split(/\n/).map(l => l.trim()).filter(Boolean);
            let html = "", lista = [];
            const fecharLista = () => {
                if (lista.length) html += `<ul class="documento-lista">${lista.map(i => `<li>${esc(i)}</li>`).join("")}</ul>`;
                lista = [];
            };
            linhas.forEach(l => {
                if (ehTopico(l)) lista.push(l.replace(/^\s*[-•*–]\s+/, ""));
                else { fecharLista(); html += `<p class="documento-texto">${esc(l)}</p>`; }
            });
            fecharLista();
            return html;
        };
        const dataBR = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d || "") ? d.split("-").reverse().join("/") : esc(d || "");
        const porExtenso = (d) => {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(d || "")) return "";
            const meses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho",
                "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
            const [ano, mes, dia] = d.split("-");
            return `${Number(dia)} de ${meses[Number(mes) - 1]} de ${ano}`;
        };
        const localData = [dados.cidadeEstado, porExtenso(dados.data)].map(t => String(t || "").trim()).filter(Boolean).join(", ");
        const linhaId = (rotulo, valor) => valor ? `<p><strong>${rotulo}:</strong> ${valor}</p>` : "";

        if (dados.tipo === "laudo") {
            corpoHTML = `
                <div class="cabecalho-print">
                    <h1>Laudo Psicológico</h1>
                </div>

                <div class="titulo-secao">1) Identificação</div>
                <div class="devolutiva-identificacao">
                    ${linhaId("Nome", esc(dados.paciente || dados.nomeCompleto))}
                    ${linhaId("Idade", esc(dados.idade))}
                    ${linhaId("CPF", esc(dados.cpf))}
                    ${linhaId("Solicitante", esc(dados.solicitante))}
                    ${linhaId("Finalidade", esc(dados.finalidade))}
                    <p><strong>Autora:</strong> Cláudia Bethânia Prechedes dos Santos Rocha da Silva, CRP 18/9851</p>
                </div>

                <div class="titulo-secao">2) Descrição</div>
                ${blocos(dados.descricao)}

                <div class="titulo-secao">3) Procedimentos</div>
                ${blocos(dados.procedimentos)}

                <div class="titulo-secao">4) Análise</div>
                ${blocos(dados.analise)}

                <div class="titulo-secao">5) Conclusão</div>
                ${blocos(dados.conclusao)}

                ${localData ? `<p class="documento-data">${esc(localData)}.</p>` : ""}
            `;
        } else {
            corpoHTML = `
                <div class="cabecalho-print">
                    <h1>Relatório Psicológico</h1>
                </div>

                <div class="titulo-secao">1) Identificação</div>
                <div class="devolutiva-identificacao">
                    ${linhaId("Paciente", esc(dados.paciente || dados.nomeCompleto))}
                    ${linhaId("Data de Nascimento", dataBR(dados.nascimento))}
                    <p><strong>Psicóloga:</strong> Cláudia Bethânia Prechedes dos Santos Rocha da Silva</p>
                    <p><strong>CRP:</strong> 18/9851</p>
                    ${linhaId("Data do atendimento", dataBR(dados.dataAtendimento))}
                    ${linhaId("Data de emissão", dataBR(dados.data))}
                </div>

                <div class="titulo-secao">2) Finalidade do documento</div>
                ${blocos(dados.finalidade)}

                <div class="titulo-secao">3) Descrição da Demanda</div>
                ${blocos(dados.demanda)}

                <div class="titulo-secao">4) Procedimento</div>
                ${blocos(dados.procedimento)}

                <div class="titulo-secao">5) Análise</div>
                ${blocos(dados.analise)}

                <div class="titulo-secao">6) Conclusão</div>
                ${blocos(dados.conclusao)}

                ${localData ? `<p class="documento-data">${esc(localData)}.</p>` : ""}
            `;
        }

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

            ${assinaturaHTML ? `<div class="assinatura">
                <div class="linha-assinatura"></div>
                ${assinaturaHTML}
            </div>` : ""}

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
    const centralizar = !["devolutiva", "laudo", "relatorio", "entrevista", "fichaEmpresa"].includes(dados.tipo);
    FolhaPadrao.aplicar(container, { centralizar }).then(() => {
        // relatório de entrevista (empresa): texto mais compacto, com menos espaço entre as linhas
        if (dados.tipo === "entrevista" || dados.tipo === "fichaEmpresa") {
            const folha = container.querySelector(".folha");
            if (folha) folha.classList.add("folha-compacta");
        }
        return DocsPaciente.guardarEImprimir(dados);
    });
}
