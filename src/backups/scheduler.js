/**
 * scheduler.js
 * -----------------------------------------------------------------------
 * Agenda a execução automática do backup dentro do próprio app Electron.
 * Importe e chame `startBackupScheduler()` uma vez, no processo principal
 * (main.js), depois que o app estiver pronto (app.whenReady).
 * -----------------------------------------------------------------------
 */

const path = require('path');

// Caminho explícito do .env — necessário porque dentro do app instalado
// o diretório de trabalho (process.cwd()) pode não ser a pasta do projeto,
// então o dotenv não acharia o .env sem indicarmos o caminho exato.
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const cron = require('node-cron');
const log = require('electron-log');
const { runBackup } = require('./backupManager');

/**
 * @param {Object} config
 * @param {string} config.dbPath     Caminho do banco SQLite em uso
 * @param {string} config.dataDir    Pasta de dados/anexos
 * @param {string} config.backupDir  Pasta local sincronizada com o Google Drive
 * @param {string} [config.cronExpr] Expressão cron (padrão: a cada 6 horas)
 */
function startBackupScheduler(config) {
  const cronExpr = config.cronExpr || '0 */6 * * *'; // a cada 6 horas

  if (!process.env.BACKUP_PASSWORD) {
    log.error('[backup] BACKUP_PASSWORD não encontrado no .env — os backups vão falhar até isso ser corrigido.');
  }

  // Roda uma vez logo ao iniciar o app, além do agendamento
  runBackup({
    dbPath: config.dbPath,
    dataDir: config.dataDir,
    backupDir: config.backupDir,
    password: process.env.BACKUP_PASSWORD,
  }).then((finalPath) => {
    log.info(`[backup] Backup inicial concluído -> ${finalPath}`);
  }).catch((err) => log.error('[backup] Falha no backup inicial:', err));

  cron.schedule(cronExpr, () => {
    runBackup({
      dbPath: config.dbPath,
      dataDir: config.dataDir,
      backupDir: config.backupDir,
      password: process.env.BACKUP_PASSWORD,
    }).then((finalPath) => {
      log.info(`[backup] Backup agendado concluído -> ${finalPath}`);
    }).catch((err) => log.error('[backup] Falha no backup agendado:', err));
  });

  log.info(`[backup] Agendador iniciado (expressão cron: "${cronExpr}")`);
}

module.exports = { startBackupScheduler };
