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

    if (dados.tipo === "declaracao") {

        corpoHTML = `
            <div class="cabecalho-print">
                <div class="clinica-nome">Cláudia Bethânia — Psicóloga Clínica</div>
                <div class="subtitulo-clinica">CRP 18/9851</div>
                <h1>Declaração</h1>
                
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

            <img class="marca-dagua" src="../assets/img/logo-marca-dagua.png" alt="">

            ${corpoHTML}

            <div class="assinatura">
                <div class="linha-assinatura"></div>
                <h3>Cláudia Bethânia Prechedes dos Santos Rocha da Silva</h3>
                <p>CRP 18/9851</p>
            </div>

            <div class="rodape-contato">
                maclaudiabethaniapsicologa@gmail.com · (66) 99689-4144 · @psiclaudiabethania_
            </div>

            <div class="timestamp-impressao">${carimboGeracao()}</div>
        </div>
    `;

    localStorage.removeItem("documentoTemp");

    window.print();
}
