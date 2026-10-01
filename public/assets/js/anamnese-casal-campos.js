// ═══════════════════════════════════════════════
// ANAMNESE DE CASAL — TCC
// Lista de seções e perguntas, usada pela ficha (anamnese-casal.html)
// e pela impressão (imprimir-anamnese-casal.html). Para incluir, tirar ou
// renomear uma pergunta, basta mexer aqui que as duas telas acompanham.
//
// Tipos de pergunta:
//   text | textarea | date | time  → campo de texto
//   escala   → nota de 0 a 10
//   radio    → uma opção (o: [...])
//   checks   → várias opções (o: [...]); outro: true acrescenta "Outro: ___"
//   pessoas  → as perguntas de "campos" aparecem duas vezes, uma para cada
//              pessoa (salvas como p1_nome e p2_nome)
//   conflitos → tabela "Existe conflito? / Intensidade 0–10"
//   subtitulo → só um título dentro da seção
//
// Nos textos, {p1} e {p2} viram o primeiro nome de cada pessoa.
// Tudo é salvo como texto simples em casal.anamneseCasal.
// ═══════════════════════════════════════════════

const OPCOES_SIM_NAO = ["Sim", "Não"];
const OPCOES_NAO_SIM = ["Não", "Sim"];
const OPCOES_NAO_SIM_SESSAO = ["Não", "Sim", "Prefere abordar em sessão"];

const SECOES_ANAMNESE_CASAL = [
    {
        id: "entrevista",
        titulo: "Data da Entrevista",
        itens: [
            { t: "date", n: "dataAnamnese", l: "Data" },
            { t: "time", n: "horaAnamnese", l: "Hora" }
        ]
    },
    {
        id: "identificacao",
        num: 1,
        titulo: "Identificação do casal",
        itens: [
            {
                t: "pessoas",
                campos: [
                    { t: "text", n: "nomeCompleto", l: "Nome completo", cadastro: "NomeCompleto" },
                    { t: "text", n: "nomeSocial", l: "Nome social" },
                    { t: "date", n: "dataNascimento", l: "Data de nascimento", cadastro: "DataNascimento" },
                    { t: "text", n: "idade", l: "Idade", cadastro: "Idade" },
                    { t: "text", n: "profissao", l: "Profissão", cadastro: "Profissao" },
                    { t: "text", n: "telefone", l: "Telefone", cadastro: "Telefone" },
                    { t: "text", n: "email", l: "E-mail", cadastro: "Email" }
                ]
            },
            { t: "subtitulo", l: "Dados da relação" },
            { t: "text", n: "inicioRelacionamento", l: "Data de início do relacionamento", cadastro: "inicioRelacionamento" },
            { t: "text", n: "dataUniao", l: "Data de casamento/união, se aplicável" },
            { t: "text", n: "tempoConvivencia", l: "Tempo de convivência", cadastro: "tempoJuntos" },
            { t: "radio", n: "moramJuntos", l: "Moram juntos?", o: OPCOES_SIM_NAO },
            { t: "radio", n: "filhosEmComum", l: "Filhos em comum?", o: OPCOES_SIM_NAO },
            { t: "radio", n: "filhosAnteriores", l: "Filhos de relacionamentos anteriores?", o: OPCOES_SIM_NAO },
            { t: "textarea", n: "familiaresResidem", l: "Outros familiares que residem com o casal" },
            { t: "textarea", n: "religiao", l: "Religião/espiritualidade, se relevante para a demanda" },
            { t: "radio", n: "atendimento", l: "Atendimento", o: ["Presencial", "Online"], cadastro: "tipoConsulta" }
        ]
    },
    {
        id: "motivo",
        num: 2,
        titulo: "Motivo da busca por terapia de casal",
        itens: [
            { t: "radio", n: "iniciativa", l: "Quem tomou a iniciativa de procurar terapia?", o: ["{p1}", "{p2}", "Ambos", "Outro"] },
            { t: "textarea", n: "motivoPrincipal", l: "Qual é o principal motivo que trouxe o casal à terapia?", cadastro: "queixaPrincipal" },
            {
                t: "pessoas",
                campos: [
                    { t: "textarea", n: "expectativa", l: "O que espera conseguir com a terapia?" }
                ]
            },
            { t: "textarea", n: "sucessoTerapia", l: "Se a terapia fosse bem-sucedida, o que estaria diferente na relação?" }
        ]
    },
    {
        id: "historia",
        num: 3,
        titulo: "História do relacionamento",
        itens: [
            { t: "subtitulo", l: "Início da relação" },
            { t: "textarea", n: "comoConheceram", l: "Como vocês se conheceram?" },
            { t: "textarea", n: "oQueAproximou", l: "O que inicialmente aproximou vocês?" },
            { t: "textarea", n: "comoEraInicio", l: "Como era o relacionamento no início?" },
            { t: "textarea", n: "positivosInicio", l: "Quais eram as principais características positivas da relação?" },
            { t: "subtitulo", l: "Evolução" },
            { t: "textarea", n: "primeirosProblemas", l: "Quando começaram a surgir os primeiros problemas importantes?" },
            { t: "textarea", n: "contextoProblemas", l: "O que estava acontecendo na vida do casal nesse período?" },
            { t: "textarea", n: "acontecimentoMarcante", l: "Houve algum acontecimento que marcou uma mudança na relação?" },
            {
                t: "checks", n: "momentosImportantes", l: "Momentos importantes", outro: true,
                o: ["Mudança de cidade", "Casamento/união", "Nascimento de filhos", "Problemas financeiros",
                    "Mudança profissional", "Doença", "Perdas/luto", "Infidelidade",
                    "Separação/reconciliação", "Conflitos familiares"]
            },
            { t: "textarea", n: "momentosDescricao", l: "Descrição dos momentos importantes" }
        ]
    },
    {
        id: "conflitos",
        num: 4,
        titulo: "Principais áreas de conflito",
        itens: [
            {
                t: "conflitos", n: "conflito",
                areas: [
                    ["comunicacao", "Comunicação"], ["ciumes", "Ciúmes"], ["confianca", "Confiança"],
                    ["infidelidade", "Infidelidade"], ["financas", "Finanças"], ["filhos", "Filhos"],
                    ["familiaOrigem", "Família de origem"], ["tarefas", "Divisão de tarefas"],
                    ["vidaSexual", "Vida sexual"], ["tempoJuntos", "Tempo juntos"], ["trabalho", "Trabalho"],
                    ["religiaoValores", "Religião/valores"], ["educacaoFilhos", "Educação dos filhos"],
                    ["outros", "Outros"]
                ]
            },
            { t: "textarea", n: "principalConflito", l: "Principal área de conflito atualmente" }
        ]
    },
    {
        id: "comunicacao",
        num: 5,
        titulo: "Comunicação do casal",
        itens: [
            {
                t: "checks", n: "padraoConflito", l: "Quando ocorre um conflito, normalmente", outro: true,
                o: ["Conversamos e conseguimos resolver", "Um fala e o outro evita", "Ambos elevam o tom",
                    "Há críticas frequentes", "Há silêncio/afastamento",
                    "Um tenta resolver imediatamente e o outro precisa de espaço",
                    "O problema é frequentemente adiado", "O conflito retorna posteriormente"]
            },
            {
                t: "checks", n: "duranteDiscussoes", l: "Durante discussões, costuma ocorrer",
                o: ["Interrupções", "Ironias", "Acusações", "Generalizações (\"você sempre...\", \"você nunca...\")",
                    "Choro", "Gritos", "Afastamento", "Ameaças de separação", "Pedido de desculpas",
                    "Tentativa de reparação"]
            },
            { t: "subtitulo", l: "Descreva um conflito recente" },
            { t: "textarea", n: "conflitoRecente", l: "O que aconteceu?" },
            { t: "textarea", n: "reacaoP1", l: "Como {p1} reagiu?" },
            { t: "textarea", n: "reacaoP2", l: "Como {p2} reagiu?" },
            { t: "textarea", n: "comoTerminou", l: "Como terminou?" }
        ]
    },
    {
        id: "percepcoes",
        num: 6,
        titulo: "Percepções e pensamentos sobre o parceiro",
        itens: [
            {
                t: "pessoas",
                campos: [
                    { t: "textarea", n: "comportamentoParceiro", l: "Quando meu/minha parceiro(a) faz..." },
                    { t: "textarea", n: "pensamento", l: "...eu geralmente penso:" },
                    { t: "textarea", n: "interpretacao", l: "Eu interpreto esse comportamento como:" },
                    {
                        t: "checks", n: "emocoes", l: "O que sinto nesse momento", outro: true,
                        o: ["Raiva", "Tristeza", "Medo", "Ansiedade", "Frustração", "Culpa",
                            "Ciúmes", "Rejeição", "Solidão"]
                    },
                    { t: "escala", n: "intensidadeEmocao", l: "Intensidade (0–10)" }
                ]
            }
        ]
    },
    {
        id: "necessidades",
        num: 7,
        titulo: "Necessidades e expectativas",
        itens: [
            {
                t: "pessoas",
                campos: [
                    {
                        t: "checks", n: "necessidades", l: "O que mais precisa receber do parceiro atualmente?", outro: true,
                        o: ["Atenção", "Afeto", "Respeito", "Segurança", "Confiança", "Comunicação",
                            "Reconhecimento", "Tempo de qualidade", "Apoio", "Intimidade", "Autonomia"]
                    },
                    { t: "textarea", n: "necessidadesExplique", l: "Explique as necessidades" }
                ]
            }
        ]
    },
    {
        id: "positivos",
        num: 8,
        titulo: "Pontos positivos do relacionamento",
        itens: [
            { t: "textarea", n: "funcionaBem", l: "O que ainda funciona bem entre vocês?" },
            {
                t: "pessoas",
                campos: [
                    { t: "textarea", n: "admira", l: "Quais características admira no parceiro?" }
                ]
            },
            { t: "textarea", n: "atividadesJuntos", l: "Quais atividades vocês gostam de fazer juntos?" },
            { t: "textarea", n: "permaneceramJuntos", l: "O que fez vocês permanecerem juntos até hoje?" }
        ]
    },
    {
        id: "historicoConflitos",
        num: 9,
        titulo: "Histórico de conflitos importantes",
        itens: [
            { t: "radio", n: "jaSepararam", l: "Já houve separação?", o: OPCOES_NAO_SIM },
            { t: "radio", n: "terapiaAnterior", l: "Já houve tentativa anterior de terapia de casal?", o: OPCOES_NAO_SIM },
            { t: "radio", n: "houveInfidelidade", l: "Já houve infidelidade?", o: OPCOES_NAO_SIM_SESSAO },
            { t: "radio", n: "quebraConfianca", l: "Houve quebra de confiança significativa?", o: OPCOES_NAO_SIM },
            { t: "radio", n: "processoSeparacao", l: "Existe atualmente algum processo de separação/divórcio em andamento?", o: OPCOES_NAO_SIM },
            { t: "textarea", n: "historicoConflitosDescricao", l: "Descrição do histórico de conflitos" }
        ]
    },
    {
        id: "familiaOrigem",
        num: 10,
        titulo: "Família de origem",
        itens: [
            {
                t: "pessoas",
                campos: [
                    { t: "textarea", n: "relacaoPais", l: "Como era a relação com os pais/cuidadores?" },
                    { t: "textarea", n: "conflitosFamilia", l: "Como os conflitos eram resolvidos na família?" },
                    { t: "textarea", n: "afetoFamilia", l: "Havia demonstração de afeto?" },
                    { t: "textarea", n: "limitesFamilia", l: "Como eram estabelecidos limites?" },
                    { t: "textarea", n: "perdasFamilia", l: "Existiam separações, perdas ou conflitos familiares importantes?" },
                    { t: "textarea", n: "influenciasFamilia", l: "Influências percebidas da família de origem no relacionamento atual" }
                ]
            }
        ]
    },
    {
        id: "filhos",
        num: 11,
        titulo: "Filhos e parentalidade",
        itens: [
            { t: "radio", n: "possuiFilhos", l: "Possuem filhos?", o: OPCOES_SIM_NAO },
            { t: "text", n: "quantidadeFilhos", l: "Quantidade de filhos" },
            { t: "text", n: "idadesFilhos", l: "Idades dos filhos" },
            { t: "text", n: "filhosComumDetalhe", l: "Filhos em comum" },
            { t: "text", n: "filhosAnterioresDetalhe", l: "Filhos de relacionamentos anteriores" },
            { t: "textarea", n: "divergenciasEducacao", l: "Principais divergências na educação dos filhos" },
            { t: "textarea", n: "decisoesFilhos", l: "Como as decisões relacionadas aos filhos são tomadas?" },
            { t: "textarea", n: "conflitosAutoridade", l: "Existem conflitos envolvendo autoridade, limites ou disciplina?" }
        ]
    },
    {
        id: "financeiro",
        num: 12,
        titulo: "Vida financeira",
        itens: [
            { t: "escala", n: "avaliacaoFinanceira", l: "Como avaliam a situação financeira atual? (0 = muito problemática, 10 = muito satisfatória)" },
            { t: "textarea", n: "conflitosFinanceiros", l: "Principais conflitos financeiros" },
            { t: "textarea", n: "decisoesFinanceiras", l: "Como as decisões financeiras são tomadas?" }
        ]
    },
    {
        id: "intimidade",
        num: 13,
        titulo: "Intimidade e sexualidade",
        aviso: "Informações íntimas — preencher com cuidado.",
        itens: [
            { t: "radio", n: "dificuldadeIntimidade", l: "Existem dificuldades relacionadas à intimidade do casal?", o: OPCOES_NAO_SIM_SESSAO },
            { t: "text", n: "intensidadeIntimidade", l: "Frequência/intensidade percebida do problema" },
            { t: "textarea", n: "percepcaoIntimidade", l: "Como cada parceiro percebe essa questão?" }
        ]
    },
    {
        id: "recursos",
        num: 14,
        titulo: "Recursos e fatores de proteção",
        itens: [
            { t: "textarea", n: "enfrentamento", l: "O que ajuda vocês a enfrentar períodos difíceis?" },
            { t: "textarea", n: "redeApoio", l: "Quem são as pessoas que oferecem apoio ao casal?" },
            { t: "textarea", n: "valoresCompartilhados", l: "Quais valores vocês compartilham?" },
            { t: "textarea", n: "objetivosJuntos", l: "Quais objetivos vocês ainda possuem juntos?" }
        ]
    },
    {
        id: "avaliacaoTCC",
        num: 15,
        titulo: "Avaliação inicial em TCC",
        exclusivo: true,
        aviso: "Uso exclusivo da psicóloga.",
        itens: [
            { t: "textarea", n: "tccDemanda", l: "Demanda principal" },
            { t: "textarea", n: "tccPadroes", l: "Padrões comportamentais observados" },
            { t: "textarea", n: "tccPrecipitantes", l: "Situações precipitantes" },
            { t: "textarea", n: "tccPensamentos", l: "Pensamentos/interpretações relevantes" },
            { t: "textarea", n: "tccEmocoes", l: "Emoções predominantes" },
            { t: "textarea", n: "tccManutencao", l: "Comportamentos de manutenção" },
            { t: "textarea", n: "tccInteracao", l: "Padrão de interação do casal" },
            { t: "textarea", n: "tccRecursos", l: "Recursos/pontos fortes" },
            { t: "textarea", n: "tccHipoteses", l: "Hipóteses de manutenção" },
            { t: "textarea", n: "tccObjetivosIniciais", l: "Objetivos terapêuticos iniciais" }
        ]
    },
    {
        id: "escala",
        num: 16,
        titulo: "Escala inicial do casal",
        itens: [
            {
                t: "pessoas",
                campos: [
                    { t: "escala", n: "escalaSatisfacao", l: "Satisfação com o relacionamento" },
                    { t: "escala", n: "escalaComunicacao", l: "Qualidade da comunicação" },
                    { t: "escala", n: "escalaConfianca", l: "Confiança" },
                    { t: "escala", n: "escalaIntimidade", l: "Intimidade/conexão" },
                    { t: "escala", n: "escalaResolucao", l: "Capacidade de resolver conflitos" }
                ]
            }
        ]
    },
    {
        id: "objetivos",
        num: 17,
        titulo: "Objetivos terapêuticos",
        itens: [
            { t: "textarea", n: "objetivo1", l: "Objetivo 1" },
            { t: "textarea", n: "objetivo2", l: "Objetivo 2" },
            { t: "textarea", n: "objetivo3", l: "Objetivo 3" },
            { t: "textarea", n: "prioridadeAtual", l: "Prioridade atual" }
        ]
    },
    {
        id: "sigiloso",
        titulo: "Registro individual (sigiloso)",
        sigiloso: true,
        aviso: "Anotações que não devem ser compartilhadas entre os parceiros. Não saem na impressão, a menos que você marque \"Incluir registro sigiloso\".",
        itens: [
            {
                t: "pessoas",
                campos: [
                    { t: "textarea", n: "registroSigiloso", l: "Registro individual" }
                ]
            }
        ]
    },
    {
        id: "observacoes",
        titulo: "Observações",
        itens: [
            { t: "textarea", n: "observacoesAdicionais", l: "Algo mais a acrescentar?" },
            { t: "textarea", n: "observacoesEntrevistador", l: "Dados de observação do entrevistador" }
        ]
    }
];

// primeiro nome de cada pessoa do casal (para trocar {p1} / {p2} nos textos)
function nomesCurtosCasal(casal) {
    const primeiro = (nome, padrao) => (String(nome || "").trim().split(/\s+/)[0]) || padrao;
    return {
        p1: primeiro(casal && casal.p1NomeCompleto, "Pessoa 1"),
        p2: primeiro(casal && casal.p2NomeCompleto, "Pessoa 2")
    };
}

function trocarNomesCasal(texto, nomes) {
    return String(texto).replace(/\{p1\}/g, nomes.p1).replace(/\{p2\}/g, nomes.p2);
}

// percorre todas as perguntas "de texto" (para o prompt da IA e o colar texto)
// devolvendo [rótulo único, nome do campo]
function camposTextoAnamneseCasal(nomes, incluirExclusivos = false) {
    const lista = [];
    SECOES_ANAMNESE_CASAL.forEach(secao => {
        if (secao.id === "entrevista") return;
        if (secao.sigiloso) return;
        if (secao.exclusivo && !incluirExclusivos) return;
        secao.itens.forEach(item => {
            if (item.t === "text" || item.t === "textarea") {
                lista.push([trocarNomesCasal(item.l, nomes), item.n]);
            }
            // nome, telefone etc. vêm do cadastro, não do relato
            if (item.t === "pessoas" && secao.id !== "identificacao") {
                ["p1", "p2"].forEach(p => {
                    item.campos.forEach(c => {
                        if (c.t === "text" || c.t === "textarea") {
                            lista.push([`${trocarNomesCasal(c.l, nomes)} (${nomes[p]})`, `${p}_${c.n}`]);
                        }
                    });
                });
            }
        });
    });
    return lista;
}
