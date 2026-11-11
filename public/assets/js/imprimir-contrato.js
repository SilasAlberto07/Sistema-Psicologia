// ═══════════════════════════════════════════════
// IMPRESSÃO DO CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE PSICOTERAPIA
// Os dados vêm da página Documentos (localStorage "contratoTemp").
// Campo deixado em branco no formulário sai como linha para preencher à mão.
// ═══════════════════════════════════════════════

const container = document.getElementById("conteudo-impressao");

function esc(texto) {
    return String(texto ?? "").replace(/[&<>"']/g, (c) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
}

// valor preenchido em destaque, ou linha em branco do tamanho indicado (em "em")
function campo(valor, largura = 10) {
    const texto = String(valor ?? "").trim();
    if (texto) return `<span class="preenchido">${esc(texto)}</span>`;
    return `<span class="branco" style="width:${largura}em"></span>`;
}

// ( X ) quando marcado, (   ) quando não
function marcador(marcado) {
    return marcado ? `<span class="marcar">( X )</span>` : "(&nbsp;&nbsp;&nbsp;)";
}

// "180" → "180,00"; "180,5" → "180,50"; mantém o que já vier formatado
function formatarValor(valor) {
    const limpo = String(valor || "").replace(/^R\$\s*/i, "").trim();
    if (/^\d+$/.test(limpo)) return `${limpo},00`;
    if (/^\d+,\d$/.test(limpo)) return `${limpo}0`;
    return limpo;
}

// "2026-11-10" → "10/11/2026"; outros formatos ficam como vieram
function dataBR(valor) {
    const texto = String(valor || "").trim();
    const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return iso ? `${iso[3]}/${iso[2]}/${iso[1]}` : texto;
}

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho",
    "agosto", "setembro", "outubro", "novembro", "dezembro"];

function localEData(cidade, iso) {
    const partes = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    const local = campo(cidade, 12);
    if (!partes) {
        return `${local}, ${campo("", 3)} de ${campo("", 9)} de ${campo("", 4)}.`;
    }
    const [, ano, mes, dia] = partes;
    return `${local}, ${campo(Number(dia))} de ${campo(MESES[Number(mes) - 1])} de ${campo(ano)}.`;
}

const ICONE_TELEFONE = `<svg viewBox="0 0 24 24" fill="none" stroke="#7a8e69" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>`;
const ICONE_EMAIL = `<svg viewBox="0 0 24 24" fill="none" stroke="#7a8e69" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>`;

function montarContrato(d) {
    // só a opção escolhida sai marcada e com valor; a outra fica em branco
    const ehAvulsa = d.opcaoContratada === "avulsa";
    const ehPacote = d.opcaoContratada === "pacote";
    const avulsa = ehAvulsa ? formatarValor(d.valorAvulsa) : "";
    const pacote = ehPacote ? formatarValor(d.valorPacote) : "";
    const qtdPacote = ehPacote ? d.qtdPacote : "";
    const presencial = d.modalidade === "presencial";
    const online = d.modalidade === "online";

    const rodapeDados = [
        `<strong>${esc(d.psiNome)}${d.psiCrp ? ` · CRP ${esc(d.psiCrp)}` : ""}</strong>`,
        d.psiTelefone ? `<span>${ICONE_TELEFONE}${esc(d.psiTelefone)}</span>` : "",
        d.psiEmail ? `<span>${ICONE_EMAIL}${esc(d.psiEmail)}</span>` : ""
    ].join("");

    return `
    <div class="folha">

        <div class="topo">
            <h1>Contrato de Prestação de Serviços de Psicoterapia</h1>
            <div class="traco"></div>
        </div>

        <div class="rodape">
            <div class="contato">
                <div class="logo"><img src="../assets/img/logo-contrato-verde.png" alt="Cláudia Bethânia Psicóloga"></div>
                <div class="separador"></div>
                <div class="dados">${rodapeDados}</div>
            </div>
            <div class="faixa"></div>
        </div>

        <table class="layout">
            <thead><tr><td><div class="espaco-topo"></div></td></tr></thead>
            <tfoot><tr><td><div class="espaco-rodape"></div></td></tr></tfoot>
            <tbody><tr><td><div class="texto">

        <h2>Cláusula Primeira – Identificação das Partes</h2>
        <p><strong>Contratada:</strong> Psicóloga ${campo(d.psiNome, 20)}, inscrita no Conselho Regional de Psicologia sob o
        nº ${campo(d.psiCrp, 6)}, inscrita no Cadastro de Pessoa Física sob o nº ${campo(d.psiCpf, 9)}, com endereço
        profissional em ${campo(d.psiEndereco, 24)}, telefone ${campo(d.psiTelefone, 9)}.</p>
        <p><strong>Contratante:</strong> ${campo(d.pacNome, 22)}, inscrito(a) no Cadastro de Pessoa Física sob o
        nº ${campo(d.pacCpf, 9)}, nascido(a) em ${campo(dataBR(d.pacNascimento), 7)}, residente e domiciliado(a) em
        ${campo(d.pacEndereco, 26)}, telefone ${campo(d.pacTelefone, 9)} e e-mail ${campo(d.pacEmail, 16)}.</p>

        <h2>Cláusula Segunda – Do Objeto e das Condições do Atendimento</h2>
        <p class="item">I. O presente contrato tem como objetivo estabelecer as condições para a prestação de serviço de
        psicoterapia, respeitando os princípios éticos e técnicos da Psicologia.</p>
        <p class="item">II. Modalidade de atendimento:</p>
        <p class="opcao">${marcador(presencial)} Presencial</p>
        <p class="opcao">${marcador(online)} On-line</p>
        <p class="item">III. As sessões terão duração aproximada de 50 (cinquenta) minutos, com frequência inicialmente
        semanal, podendo ser ajustada conforme a avaliação clínica e as necessidades do paciente.</p>
        <p class="item">IV. Conforme a evolução do acompanhamento, a frequência poderá passar a ser quinzenal e,
        posteriormente, mensal, até o encerramento do processo terapêutico, quando indicado.</p>

        <h2>Cláusula Terceira – Dos Honorários e das Formas de Pagamento</h2>
        <p class="item">I. Valores contratados:</p>
        <p class="opcao">${marcador(ehAvulsa)} Sessão Avulsa: R$ ${campo(avulsa, 8)}.</p>
        <p class="opcao">${marcador(ehPacote)} Pacote Mensal de ${campo(qtdPacote, 2)} Sessões: R$ ${campo(pacote, 8)}.</p>
        <p class="item">II. Para garantir o agendamento, será necessário o pagamento antecipado de, no mínimo, 50%
        (cinquenta por cento) do valor contratado, com quitação do saldo conforme as condições previamente acordadas
        entre as partes.</p>
        <p class="item">III. Os pagamentos poderão ser realizados por Pix ou cartão de crédito, conforme combinado no
        momento da contratação.</p>
        <p class="item">IV. Nos pacotes mensais, o valor corresponde à contratação de um conjunto de sessões e à reserva
        dos respectivos horários na agenda.</p>

        <h2>Cláusula Quarta – Dos Cancelamentos, das Remarcações e dos Atrasos</h2>
        <p class="item">I. O pedido de cancelamento ou remarcação deverá ser comunicado com antecedência mínima de
        24 (vinte e quatro) horas, considerando dias úteis, em relação à data e ao horário agendados.</p>
        <p class="item">II. Quando o pedido for realizado dentro do prazo estabelecido, poderá ser solicitado
        reagendamento, conforme a disponibilidade de agenda da psicóloga.</p>
        <p class="item">III. Cancelamentos comunicados fora do prazo ou ausências sem comunicação prévia poderão implicar
        a cobrança integral da sessão.</p>
        <p class="item">IV. Será tolerado atraso de até 30 (trinta) minutos, desde que comunicado previamente. A sessão
        poderá ocorrer durante o tempo restante, sem redução do valor contratado.</p>
        <p class="item">V. Na ausência de comunicação e no não comparecimento do paciente em até 15 (quinze) minutos após
        o horário agendado, a sessão poderá ser considerada não comparecida e cobrada integralmente.</p>
        <p class="item">VI. Em situações excepcionais que impeçam a realização da sessão por parte da psicóloga, como
        doença ou emergência, será realizado o reagendamento em data conveniente para ambas as partes, sem cobrança
        adicional pela sessão não realizada.</p>

        <h2>Cláusula Quinta – Da Desistência, da Interrupção do Pacote e da Restituição de Valores</h2>
        <p class="item">I. Caso o paciente decida interromper voluntariamente o acompanhamento ou desistir do pacote
        mensal pago antecipadamente, deverá comunicar formalmente sua decisão à psicóloga.</p>
        <p class="item">II. Para o cálculo de eventual restituição, serão descontados os valores correspondentes às
        sessões realizadas e às sessões perdidas por cancelamento fora do prazo previsto neste contrato.</p>
        <p class="item">III. Sobre o saldo referente às sessões não utilizadas, será aplicada retenção compensatória de
        25% (vinte e cinco por cento), conforme as condições previamente informadas e aceitas pelo paciente, observados
        os limites da legislação vigente.</p>
        <p class="item">IV. Eventual saldo a restituir será devolvido no prazo de ${campo(d.prazoRestituicao, 4)} dias
        úteis, contado a partir da confirmação do cálculo e da formalização da desistência.</p>

        <h2>Cláusula Sexta – Dos Direitos e Deveres da Psicóloga</h2>
        <p class="item">I. Prestar os serviços com responsabilidade, competência técnica e respeito às normas éticas da
        profissão.</p>
        <p class="item">II. Preservar o sigilo profissional, observadas as exceções éticas e legais.</p>
        <p class="item">III. Informar ao paciente sobre os objetivos, os procedimentos e as condições do acompanhamento
        psicológico.</p>
        <p class="item">IV. Manter os registros psicológicos conforme as normas profissionais vigentes.</p>
        <p class="item">V. Orientar ou encaminhar o paciente a outros serviços quando houver necessidade técnica.</p>
        <p class="item">VI. Receber os honorários acordados pelos serviços prestados.</p>
        <p class="item">VII. Definir os procedimentos técnicos do acompanhamento conforme sua competência profissional e
        as necessidades clínicas do paciente.</p>

        <h3>Dos Direitos e Deveres do Paciente</h3>
        <p class="item">I. Fornecer informações relevantes para o acompanhamento psicológico.</p>
        <p class="item">II. Comparecer às sessões nos horários agendados e respeitar as regras de cancelamento e
        remarcação.</p>
        <p class="item">III. Efetuar os pagamentos conforme as condições acordadas.</p>
        <p class="item">IV. No atendimento on-line, buscar ambiente reservado, conexão adequada e condições que favoreçam
        a privacidade.</p>
        <p class="item">V. Receber atendimento respeitoso, ético e sem discriminação.</p>
        <p class="item">VI. Ter suas informações protegidas pelo sigilo profissional, conforme as normas aplicáveis.</p>

        <h2>Cláusula Sétima – Do Sigilo Profissional e da Proteção de Dados</h2>
        <p class="item">I. A psicóloga compromete-se a preservar o sigilo profissional e a confidencialidade das
        informações compartilhadas durante o acompanhamento, conforme o Código de Ética Profissional do Psicólogo e as
        demais normas aplicáveis.</p>
        <p class="item">II. O sigilo poderá ser relativizado nas hipóteses previstas nas normas éticas e na legislação
        vigente, observados os critérios técnicos e os princípios de proteção ao paciente.</p>
        <p class="item">III. Os dados pessoais e os registros psicológicos serão tratados e armazenados conforme as normas
        profissionais e a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018), quando aplicável.</p>
        <p class="item">IV. No atendimento on-line, ambas as partes comprometem-se a adotar medidas razoáveis para
        preservar a privacidade e a confidencialidade das sessões.</p>

        <h2>Cláusula Oitava – Disposições Gerais</h2>
        <p class="item">I. As partes declaram ter lido e compreendido as condições estabelecidas neste contrato,
        comprometendo-se a respeitar seus termos e as normas éticas e legais aplicáveis.</p>
        <p class="item">II. Eventuais alterações nas condições de atendimento, nos valores ou na frequência das sessões
        deverão ser previamente comunicadas e acordadas entre as partes.</p>
        <p class="item">III. Este contrato não estabelece garantia de resultado específico, uma vez que a evolução do
        processo terapêutico depende de fatores clínicos e individuais, respeitados os limites técnicos da atuação
        profissional.</p>
        <p class="item">IV. O presente instrumento passa a produzir efeitos a partir da data de sua assinatura.</p>

        <div class="fechamento">
        <p style="margin-top:18px">E, por estarem de acordo, as partes assinam o presente instrumento.</p>

        <p class="local-data">${localEData(d.cidadeEstado, d.data)}</p>

        <div class="assinaturas">
            <div class="assinatura">
                <div class="linha"></div>
                Dra. Cláudia Bethânia – Psicóloga Clínica
                <small>CRP ${esc(d.psiCrp)}</small>
            </div>
            <div class="assinatura">
                <div class="linha"></div>
                ${d.pacNome ? esc(d.pacNome) : ""}
                <small>Contratante</small>
            </div>
        </div>
        </div>

            </div></td></tr></tbody>
        </table>
    </div>`;
}

(function iniciar() {
    let dados = null;
    try { dados = JSON.parse(localStorage.getItem("contratoTemp") || "null"); } catch (e) { }

    if (!dados) {
        container.innerHTML = "<h1 style='text-align:center;font-size:16px'>Nenhum contrato para imprimir. Gere o contrato pela página Documentos.</h1>";
        return;
    }

    document.title = dados.pacNome ? `Contrato — ${dados.pacNome}` : "Contrato de Prestação de Serviços de Psicoterapia";
    container.innerHTML = montarContrato(dados);

    // espera fontes e logo carregarem antes de abrir a impressão
    // (antes de imprimir, guarda o PDF nos documentos do paciente)
    const imprimir = () => setTimeout(() => DocsPaciente.guardarEImprimir(dados, "contratoTemp"), 300);
    const pronto = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    pronto.then(() => {
        const logo = container.querySelector(".rodape img");
        if (logo && !logo.complete) {
            logo.onload = logo.onerror = imprimir;
        } else {
            imprimir();
        }
    });
})();
