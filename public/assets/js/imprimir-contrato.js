// ═══════════════════════════════════════════════
// IMPRESSÃO DO CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE PSICOTERAPIA
// Os dados vêm da página Documentos (localStorage "contratoTemp").
// Só as assinaturas ficam para preencher à mão.
// ═══════════════════════════════════════════════

const container = document.getElementById("conteudo-impressao");

function esc(texto) {
    return String(texto ?? "").replace(/[&<>"']/g, (c) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
}

function dataPorExtenso(iso) {
    if (!iso) return "";
    const [ano, mes, dia] = iso.split("-").map(Number);
    const meses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho",
        "agosto", "setembro", "outubro", "novembro", "dezembro"];
    return `${dia} de ${meses[mes - 1]} de ${ano}`;
}

// "180" → "180,00"; "180,5" → "180,50"; mantém o que já vier formatado
function formatarValor(valor) {
    const limpo = String(valor || "").replace(/^R\$\s*/i, "").trim();
    if (/^\d+$/.test(limpo)) return `${limpo},00`;
    if (/^\d+,\d$/.test(limpo)) return `${limpo}0`;
    return limpo;
}

function letras(indice) {
    return "abcdefghijklmnopqrstuvwxyz"[indice] || String(indice + 1);
}

function montarContrato(d) {
    const b = (texto) => `<strong>${esc(texto)}</strong>`;

    const contatoPsi = [
        d.psiEmail ? `com endereço eletrônico: ${b(d.psiEmail)}` : "",
        d.psiTelefone ? `telefone: ${b(d.psiTelefone)}` : ""
    ].filter(Boolean).join(" e ");

    const contatoPac = [
        d.pacEmail ? `com endereço eletrônico: ${b(d.pacEmail)}` : "",
        d.pacTelefone ? `telefone: ${b(d.pacTelefone)}` : ""
    ].filter(Boolean).join(" e ");

    const servicos = String(d.servicos || "")
        .split("\n").map(s => s.trim().replace(/[;.]$/, "")).filter(Boolean)
        .map((s, i, lista) => `<li>${letras(i)}) ${esc(s)}${i < lista.length - 1 ? ";" : "."}</li>`)
        .join("");

    const duracao = /^\d+$/.test(d.duracao) ? `${d.duracao} minutos` : d.duracao;

    return `
    <div class="prontuario contrato">

        <img class="marca-dagua" src="../assets/img/logo-marca-dagua.png" alt="">

        <div class="cabecalho-print">
            <div class="clinica-nome">${esc(d.psiNome)} — Psicóloga Clínica</div>
            <div class="subtitulo-clinica">CRP ${esc(d.psiCrp)}</div>
            <h1>Contrato de Prestação de Serviços de Psicoterapia</h1>
        </div>

        <p>Pelo presente instrumento particular, de um lado ${b(d.psiNome)}, inscrito(a) no Conselho Regional de
        Psicologia sob o número ${b(d.psiCrp)}, com CPF nº ${b(d.psiCpf)}, realiza atendimento em ${b(d.psiEndereco)}${contatoPsi ? `, ${contatoPsi}` : ""},
        ora denominada como psicóloga.</p>

        <p>E, de outro lado, ${b(d.pacNome)}, portador(a) do CPF nº ${b(d.pacCpf)}, residente e domiciliado(a) em
        ${b(d.pacEndereco)}${contatoPac ? `, ${contatoPac}` : ""}, ora denominado(a) como paciente, têm entre si justo e acordado o seguinte
        contrato, que se regerá pelas cláusulas e condições abaixo:</p>

        <h2 class="clausula">Cláusula Primeira – Do Objeto do Contrato</h2>
        <p>1.1 Constitui objeto do presente contrato a prestação de serviços de psicoterapia, sem exclusividade, pelo(a)
        CONTRATADO(A) ao(à) CONTRATANTE, conforme especificado nos atendimentos presenciais e/ou online.</p>
        <p>1.2 O(a) CONTRATADO(A) poderá oferecer, no âmbito da psicoterapia, os seguintes serviços:</p>
        <ul class="lista-servicos">${servicos}</ul>
        <p>1.3 Os serviços serão previamente acordados entre as partes e realizados de acordo com a necessidade e os
        objetivos do(a) CONTRATANTE.</p>
        <p>1.4 Todos os serviços contratados, alterações ou ajustes serão documentados por escrito, seja por e-mail,
        mensagem de texto (WhatsApp ou outro aplicativo) ou outro meio de comunicação previamente aceito pelas partes,
        e terão validade contratual.</p>

        <h2 class="clausula">Cláusula Segunda – Das Obrigações do(a) Contratado(a)</h2>
        <p>1. Realizar as sessões de psicoterapia com profissionalismo, de acordo com as técnicas aplicáveis e dentro
        das normas éticas da profissão.</p>
        <p>2. Manter sigilo sobre todas as informações compartilhadas durante as sessões, salvo nos casos previstos em lei.</p>
        <p>3. Informar previamente ao(à) CONTRATANTE quaisquer mudanças que possam impactar a prestação dos serviços.</p>

        <h2 class="clausula">Cláusula Terceira – Das Obrigações do(a) Contratante</h2>
        <p>1. Comparecer pontualmente às sessões agendadas e avisar o(a) CONTRATADO(A) com antecedência mínima de
        24 horas em caso de impossibilidade de comparecimento.</p>
        <p>2. Cumprir com os pagamentos acordados, nos prazos estipulados neste contrato.</p>
        <p>3. Fornecer informações verídicas e necessárias para a realização do serviço.</p>

        <h2 class="clausula">Cláusula Quarta – Dos Honorários e Condições de Pagamento</h2>
        <p>1. O valor de cada sessão será de ${b("R$ " + formatarValor(d.valor))}, pago via ${b(d.formasPagamento)}.</p>
        <p>2. O pagamento deverá ser efetuado ${b(d.prazoPagamento)}, sob pena de suspensão dos serviços até a regularização.</p>
        <p>3. Reajustes poderão ser realizados anualmente, mediante comunicação prévia ao(à) CONTRATANTE.</p>

        <h2 class="clausula">Cláusula Quinta – Da Duração e Periodicidade das Sessões</h2>
        <p>1. Cada sessão de psicoterapia terá a duração de ${b(duracao)}.</p>
        <p>2. As sessões ocorrerão com periodicidade ${b(d.periodicidade)}, conforme combinado entre as partes.</p>

        <h2 class="clausula">Cláusula Sexta – Da Política de Cancelamento e Remarcação</h2>
        <p>1. O cancelamento ou remarcação de sessões deverá ser solicitado com antecedência de pelo menos 24 horas.</p>
        <p>2. Em caso de não comparecimento sem aviso prévio, o valor correspondente à sessão será cobrado integralmente.</p>
        <p>3. Situações excepcionais, como emergências médicas ou casos fortuitos devidamente comprovados, poderão ser
        analisadas pelo(a) CONTRATADO(A), a seu critério, para isenção dessa cobrança. Como por exemplo: atestado médico
        ou morte de parentes de 1º e 2º grau.</p>

        <h2 class="clausula">Cláusula Sétima – Da Confidencialidade</h2>
        <p>1. O(a) CONTRATADO(A) compromete-se a manter sigilo sobre todas as informações compartilhadas durante as
        sessões, em conformidade com o Código de Ética Profissional.</p>
        <p>2. O sigilo será rompido apenas em situações previstas em lei, como riscos à vida ou segurança de terceiros.</p>
        <p>3. O paciente reconhece que as sessões de psicoterapia envolvem informações confidenciais e protegidas pelo
        sigilo profissional. Qualquer gravação não autorizada, bem como sua divulgação, total ou parcial, constitui
        violação das presentes condições contratuais e da confidencialidade das informações tratadas.</p>

        <h2 class="clausula">Cláusula Oitava – Proibição de Gravação e Divulgação de Sessões</h2>
        <p>1. Proibição de Gravação: O paciente concorda que é expressamente proibido realizar gravações de áudio, vídeo
        ou qualquer outro tipo de registro das sessões realizadas com o psicólogo, salvo mediante prévia autorização
        por escrito do profissional.</p>
        <p>2. Sanções pelo Descumprimento: Em caso de gravação ou divulgação não autorizada das sessões:</p>
        <p style="margin-left:28px">a) O paciente poderá ser responsabilizado civil e criminalmente, nos termos da legislação vigente;</p>
        <p style="margin-left:28px">b) O paciente estará sujeito ao pagamento de multa compensatória no valor de
        ${b("R$ " + formatarValor(d.multa))} por violação, além de eventuais danos materiais e morais causados ao psicólogo.</p>
        <p>3. Proteção de Direitos Autorais e Profissionais: Orientações, estratégias ou qualquer conteúdo compartilhado
        pelo psicólogo durante as sessões são protegidos como propriedade intelectual e de caráter confidencial. O uso
        indevido de tais informações sujeitará o paciente às penalidades previstas nesta cláusula.</p>

        <h2 class="clausula">Cláusula Nona – Da Rescisão Contratual</h2>
        <p>1. O contrato pode ser rescindido por qualquer das partes mediante aviso prévio de 24 horas.</p>
        <p>2. Em caso de inadimplência por parte do(a) paciente, a psicóloga poderá suspender os serviços até a
        regularização dos pagamentos.</p>

        <h2 class="clausula">Cláusula Décima – Da LGPD</h2>
        <p>1. A PSICÓLOGA compromete-se a proteger os dados pessoais do(a) PACIENTE, coletados para a prestação dos
        serviços, em conformidade com a Lei Geral de Proteção de Dados (LGPD).</p>
        <p>2. Os dados serão utilizados exclusivamente para fins relacionados ao contrato e não serão compartilhados com
        terceiros sem a autorização prévia do(a) PACIENTE, salvo em casos previstos em lei.</p>
        <p>3. O(a) PACIENTE poderá solicitar a exclusão de seus dados ao término do contrato, respeitando-se os prazos
        legais para retenção de documentos.</p>

        <h2 class="clausula">Cláusula Décima Primeira – Do Foro</h2>
        <p>Fica eleito o foro da Comarca de ${b(d.foro)}, com exclusão de qualquer outro, por mais privilegiado que
        seja, para dirimir quaisquer dúvidas ou questões oriundas deste contrato.</p>

        <p>E, por estarem assim justos e contratados, assinam o presente instrumento em vias de igual teor e forma.</p>

        <p class="local-data">${esc(d.cidadeEstado)}, ${esc(dataPorExtenso(d.data))}.</p>

        <div class="assinaturas-contrato">
            <div>
                <div class="linha"></div>
                ${esc(d.pacNome)}
                <small>Paciente — CPF ${esc(d.pacCpf)}</small>
            </div>
            <div>
                <div class="linha"></div>
                ${esc(d.psiNome)}
                <small>Psicóloga — CRP ${esc(d.psiCrp)}</small>
            </div>
        </div>
    </div>`;
}

(function iniciar() {
    let dados = null;
    try { dados = JSON.parse(localStorage.getItem("contratoTemp") || "null"); } catch (e) { }

    if (!dados) {
        container.innerHTML = "<h1>Nenhum contrato para imprimir. Gere o contrato pela página Documentos.</h1>";
        return;
    }

    document.title = `Contrato — ${dados.pacNome}`;
    container.innerHTML = montarContrato(dados);

    // espera a marca d'água carregar antes de abrir a impressão
    setTimeout(() => window.print(), 300);
})();
