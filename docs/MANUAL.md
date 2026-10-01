# Manual de uso — Sistema Psicologia

Guia das telas e funcionalidades. Para instalação e desenvolvimento, veja o [README](../README.md).

## Sumário

- [Início](#início)
- [Novo Cadastro](#novo-cadastro)
- [Pacientes](#pacientes)
- [Anamnese](#anamnese)
- [Sessões](#sessões)
- [Prontuário](#prontuário)
- [Altas](#altas)
- [Agenda](#agenda)
- [Documentos](#documentos)
- [Financeiro](#financeiro)
- [Lixeira](#lixeira)
- [Configurações e sincronização](#configurações-e-sincronização)
- [Impressão em PDF](#impressão-em-pdf)

## Início

- Total de pacientes e casais em atendimento, sessões de hoje, próxima sessão e agenda do dia.
- **Resumo Geral:** total de sessões, realizadas, agendadas, canceladas e pacientes com alta (mesma contagem da tela de Sessões).

## Novo Cadastro

- **Paciente individual:** dados pessoais, endereço, contato de emergência, queixa principal e responsável (menores de idade).
- **Casal:** dados das duas pessoas, endereço, tipo e tempo de relacionamento e queixa.

## Pacientes

- Abas **Individual** e **Casal**, busca por nome ou ID e ordenação por coluna.
- Quantidade de sessões, telefone e modalidade (Presencial/Online) editáveis direto na tabela.
- Ações: **Anamnese**, **Ficha**, **Alta** e **Excluir** (envia para a Lixeira).

## Anamnese

**Individual** — ficha de anamnese com seção extra para menores de idade.

**Casal (TCC)** — 17 seções: identificação, motivo da busca, história do relacionamento, áreas de conflito (intensidade 0–10), comunicação, percepções, necessidades, pontos positivos, histórico de conflitos, família de origem, filhos, finanças, intimidade, recursos, avaliação inicial em TCC (uso exclusivo da psicóloga), escala inicial do casal e objetivos terapêuticos.

- Perguntas de cada pessoa lado a lado; dados do cadastro já vêm preenchidos.
- Índice de seções no topo (passe o mouse sobre o número para ver o nome).
- Rascunho recuperado automaticamente se a tela fechar sem salvar.
- **Registro individual (sigiloso):** não sai na impressão, a menos que seja marcado.

Nas duas versões:

- **Gerar Prompt para IA:** monta o modelo de perguntas para colar em um chat de IA junto com o relato.
- **Preencher com Texto Colado:** cola a resposta da IA e o sistema preenche os campos pelos títulos.

## Sessões

- Um card por paciente/casal com a 1ª Consulta e as sessões numeradas (data, horário, duração e status).
- Status automático pelo horário (agendada → em andamento → realizada); **cancelada** é sempre manual.
- Aviso de conflito de horário entre pacientes.
- Em casal, cada sessão indica quem foi atendido(a).
- Ao voltar do prontuário, a tela reabre **no mesmo paciente** (mesma aba, pesquisa e card aberto).

## Prontuário

- Registro por sessão: data/hora, relato, evolução e plano de ação; editar e excluir registros.
- Prompt para IA específico para **individual (TCC)** e **casal (terapia de casal)**.
- Abrir e imprimir o prontuário completo.

## Altas

- O botão **Alta** (em Pacientes) pede a data e o motivo da alta; o paciente sai de Pacientes e Sessões.
- **Relatório de Alta:** resumo do tratamento e tudo o que foi trabalhado nas sessões, para imprimir ou salvar em PDF.
- **Reativar** desfaz a alta; **Excluir** envia para a Lixeira ou apaga definitivamente.

## Agenda

- Calendário mensal destacando os dias com sessão (individuais e casais).
- Agenda do dia em intervalos de 15 minutos, incluindo horários fora da grade e sessões sem horário.

## Documentos

- **Declaração de Comparecimento** e **Atestado Psicológico**.
- **Contrato de Prestação de Serviços de Psicoterapia:** campos obrigatórios na tela (psicóloga, paciente, serviços, valor, pagamento, duração, periodicidade, multa, foro e data). Sai impresso já preenchido, apenas com as assinaturas para fazer à mão. Os dados da psicóloga e os valores ficam salvos para o próximo contrato.

## Financeiro

- Lançamentos de receitas e despesas com pagamentos parciais (total, pago e restante).
- Cards de receitas e despesas, filtro por mês e pesquisa.

## Lixeira

- Pacientes e casais excluídos, com opção de restaurar ou apagar definitivamente.

## Configurações e sincronização

- **Atualizações:** verificar manualmente e ver a versão instalada.
- **Sincronização:** escolha a mesma pasta do Google Drive em cada computador (sugestão: `Sistema Psicologia - Sincronizacao`). Os dados são lidos a cada 45 segundos e juntados item por item, então duas pessoas podem trabalhar ao mesmo tempo. São sincronizados pacientes, casais e financeiro; a senha de login é separada em cada computador.

## Impressão em PDF

Em qualquer tela de impressão, escolha a impressora **Microsoft Print to PDF** (Windows) ou **Salvar como PDF** (macOS).
