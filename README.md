# Sistema Psicologia

Aplicativo desktop para gestão de consultório de psicologia: pacientes e casais, sessões, prontuário, anamnese, agenda, documentos e financeiro. Funciona offline, com backup criptografado automático e sincronização opcional entre computadores via Google Drive.

## Funcionalidades

- Cadastro de pacientes individuais e casais
- Sessões com status automático e controle de horários
- Prontuário e anamnese (individual e de casal) com apoio de IA
- Agenda mensal e diária
- Alta de pacientes com relatório em PDF
- Declarações, atestados e contratos prontos para impressão
- Controle financeiro

Guia completo de uso: [docs/MANUAL.md](docs/MANUAL.md)

## Tecnologias

Electron · JavaScript · HTML/CSS · SQLite (better-sqlite3) · electron-builder · electron-updater

## Como rodar

Pré-requisitos: [Node.js](https://nodejs.org/) (LTS) e Git.

```bash
git clone https://github.com/SilasAlberto07/Sistema-Psicologia.git
cd Sistema-Psicologia
npm install
npm start
```

Crie um arquivo `.env` na raiz (use o `.env.example` como modelo):

```
BACKUP_PASSWORD=sua-senha
```

## Scripts

| Comando | Descrição |
|---|---|
| `npm start` | Abre o app em desenvolvimento |
| `npm run dist` | Gera o instalador Windows |
| `npm run dist:mac` | Gera o instalador macOS |
| `npm run release` | Publica uma nova versão no GitHub |

## Licença

Software proprietário — todos os direitos reservados. © Silas Alberto
