/**
 * restore.js
 * -----------------------------------------------------------------------
 * Ferramenta de linha de comando para TESTAR a recuperação de um backup
 * gerado pelo backupManager.js. Use isso periodicamente para confirmar
 * que seus backups realmente funcionam (nunca confie em backup nunca
 * testado!).
 *
 * Uso:
 *   node src/restore.js <caminho-do-backup.bak> <pasta-de-saida>
 *
 * Requer a variável de ambiente BACKUP_PASSWORD (mesma senha usada
 * para gerar o backup).
 * -----------------------------------------------------------------------
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip'); // usado só aqui, para extrair o zip já decifrado
const { decryptFile } = require('./backupManager');

async function main() {
  const [, , backupPath, outputDir] = process.argv;
  const password = process.env.BACKUP_PASSWORD;

  if (!backupPath || !outputDir) {
    console.error('Uso: node src/restore.js <backup.bak> <pasta-de-saida>');
    process.exit(1);
  }
  if (!password) {
    console.error('Defina BACKUP_PASSWORD no seu .env antes de restaurar.');
    process.exit(1);
  }

  fs.mkdirSync(outputDir, { recursive: true });
  const tmpZip = path.join(outputDir, '_tmp-restore.zip');

  console.log('Descriptografando...');
  decryptFile(backupPath, tmpZip, password);

  console.log('Extraindo arquivos...');
  const zip = new AdmZip(tmpZip);
  zip.extractAllTo(outputDir, true);

  fs.unlinkSync(tmpZip);
  console.log(`Backup restaurado em: ${outputDir}`);
  console.log('Confira se "database.sqlite" abre normalmente e se a pasta "dados" está completa.');
}

main().catch((err) => {
  console.error('Erro ao restaurar backup:', err);
  process.exit(1);
});
