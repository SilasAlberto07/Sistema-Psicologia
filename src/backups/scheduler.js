/**
 * scheduler.js
 * -----------------------------------------------------------------------
 * Agenda a execução automática do backup dentro do próprio app Electron.
 * Importe e chame `startBackupScheduler()` uma vez, no processo principal
 * (main.js), depois que o app estiver pronto (app.whenReady).
 * -----------------------------------------------------------------------
 */

require('dotenv').config();
const cron = require('node-cron');
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

  // Roda uma vez logo ao iniciar o app, além do agendamento
  runBackup({
    dbPath: config.dbPath,
    dataDir: config.dataDir,
    backupDir: config.backupDir,
    password: process.env.BACKUP_PASSWORD,
  }).catch((err) => console.error('[backup] Falha no backup inicial:', err));

  cron.schedule(cronExpr, () => {
    runBackup({
      dbPath: config.dbPath,
      dataDir: config.dataDir,
      backupDir: config.backupDir,
      password: process.env.BACKUP_PASSWORD,
    }).catch((err) => console.error('[backup] Falha no backup agendado:', err));
  });

  console.log(`[backup] Agendador iniciado (expressão cron: "${cronExpr}")`);
}

module.exports = { startBackupScheduler };
