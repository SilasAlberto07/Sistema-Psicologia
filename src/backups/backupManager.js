/**
 * backupManager.js
 * -----------------------------------------------------------------------
 * Gera backups automáticos, criptografados, do sistema:
 *   1. Cria um snapshot consistente do banco SQLite (via VACUUM INTO,
 *      seguro mesmo com o banco aberto e em uso).
 *   2. Compacta o snapshot + a pasta de dados (anexos/documentos) em um .zip.
 *   3. Criptografa o .zip com AES-256-GCM usando uma senha/chave.
 *   4. Salva o arquivo final (.bak) na pasta sincronizada com o Google Drive.
 *   5. Remove backups antigos, mantendo apenas os N mais recentes.
 *
 * Nada disso depende de serviços externos: tudo roda localmente, e o
 * arquivo final só é decifrável com a senha configurada.
 * -----------------------------------------------------------------------
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const archiver = require('archiver');
const Database = require('better-sqlite3');

// ------------------------------------------------------------------
// Criptografia (AES-256-GCM)
// ------------------------------------------------------------------
const ALGO = 'aes-256-gcm';
const SALT_LEN = 16;
const IV_LEN = 12;
const KEY_LEN = 32;

function deriveKey(password, salt) {
  // scrypt é lento de propósito (dificulta força bruta se o arquivo vazar)
  return crypto.scryptSync(password, salt, KEY_LEN);
}

/**
 * Criptografa um arquivo e grava o resultado em outro caminho.
 * Formato do arquivo final: [salt(16)][iv(12)][authTag(16)][ciphertext...]
 */
function encryptFile(inputPath, outputPath, password) {
  const salt = crypto.randomBytes(SALT_LEN);
  const iv = crypto.randomBytes(IV_LEN);
  const key = deriveKey(password, salt);
  const cipher = crypto.createCipheriv(ALGO, key, iv);

  return new Promise((resolve, reject) => {
    const input = fs.createReadStream(inputPath);
    const output = fs.createWriteStream(outputPath);

    output.write(salt);
    output.write(iv);

    input.pipe(cipher).pipe(output, { end: false });

    cipher.on('end', () => {
      const authTag = cipher.getAuthTag();
      output.end(authTag);
    });

    output.on('finish', resolve);
    output.on('error', reject);
    input.on('error', reject);
    cipher.on('error', reject);
  });
}

/**
 * Descriptografa um arquivo gerado por encryptFile.
 * Usado pelo restore.js para testar a recuperação dos backups.
 */
function decryptFile(inputPath, outputPath, password) {
  const data = fs.readFileSync(inputPath);
  const salt = data.subarray(0, SALT_LEN);
  const iv = data.subarray(SALT_LEN, SALT_LEN + IV_LEN);
  const authTag = data.subarray(data.length - 16);
  const ciphertext = data.subarray(SALT_LEN + IV_LEN, data.length - 16);

  const key = deriveKey(password, salt);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  fs.writeFileSync(outputPath, decrypted);
}

// ------------------------------------------------------------------
// Snapshot do SQLite
// ------------------------------------------------------------------
/**
 * Gera uma cópia consistente do banco, mesmo que ele esteja aberto e em
 * uso pelo Electron no momento. VACUUM INTO é a forma recomendada pelo
 * próprio SQLite para isso (evita o problema de copiar o arquivo "cru"
 * enquanto há escritas pendentes / arquivos -wal e -shm).
 */
function snapshotDatabase(dbPath, snapshotPath) {
  if (fs.existsSync(snapshotPath)) fs.unlinkSync(snapshotPath);
  const db = new Database(dbPath, { readonly: true, fileMustExist: true });
  try {
    db.exec(`VACUUM INTO '${snapshotPath.replace(/'/g, "''")}'`);
  } finally {
    db.close();
  }
}

// ------------------------------------------------------------------
// Compactação (zip) do snapshot + pasta de dados
// ------------------------------------------------------------------
function createZip({ dbSnapshotPath, dataDir, zipOutputPath }) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipOutputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', resolve);
    archive.on('error', reject);

    archive.pipe(output);

    // Banco de dados (snapshot seguro)
    archive.file(dbSnapshotPath, { name: 'database.sqlite' });

    // Pasta de dados/anexos (se existir)
    if (dataDir && fs.existsSync(dataDir)) {
      archive.directory(dataDir, 'dados');
    }

    archive.finalize();
  });
}

// ------------------------------------------------------------------
// Rotação: mantém só os N backups mais recentes
// ------------------------------------------------------------------
function rotateBackups(backupDir, keepLast = 10) {
  const files = fs
    .readdirSync(backupDir)
    .filter((f) => f.endsWith('.bak'))
    .map((f) => ({ name: f, time: fs.statSync(path.join(backupDir, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  const toDelete = files.slice(keepLast);
  for (const file of toDelete) {
    fs.unlinkSync(path.join(backupDir, file.name));
  }
}

// ------------------------------------------------------------------
// Função principal: executa um ciclo completo de backup
// ------------------------------------------------------------------
/**
 * @param {Object} opts
 * @param {string} opts.dbPath        Caminho do arquivo .sqlite em uso
 * @param {string} opts.dataDir       Pasta de dados/anexos a incluir (opcional)
 * @param {string} opts.backupDir     Pasta sincronizada com o Google Drive
 * @param {string} opts.password      Senha/chave de criptografia
 * @param {number} [opts.keepLast=10] Quantos backups manter
 */
// ------------------------------------------------------------------
// Trava simples: impede que dois backups rodem ao mesmo tempo
// (evita conflitos nos arquivos temporários se dois gatilhos —
// ex: backup inicial e backup após salvar — disparam quase juntos)
// ------------------------------------------------------------------
let backupEmAndamento = false;

async function runBackup({ dbPath, dataDir, backupDir, password, keepLast = 10 }) {
  if (backupEmAndamento) {
    console.log('[backup] Ignorado: já existe um backup em andamento.');
    return null;
  }

  if (!password) {
    throw new Error('Backup abortado: nenhuma senha de criptografia foi configurada.');
  }

  backupEmAndamento = true;

  fs.mkdirSync(backupDir, { recursive: true });
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'backup-'));

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const snapshotPath = path.join(tmpDir, 'database-snapshot.sqlite');
  const zipPath = path.join(tmpDir, `backup-${timestamp}.zip`);
  const finalPath = path.join(backupDir, `backup-${timestamp}.bak`);

  try {
    snapshotDatabase(dbPath, snapshotPath);
    await createZip({ dbSnapshotPath: snapshotPath, dataDir, zipOutputPath: zipPath });
    await encryptFile(zipPath, finalPath, password);
    rotateBackups(backupDir, keepLast);

    console.log(`[backup] OK -> ${finalPath}`);
    return finalPath;
  } finally {
    // limpa arquivos temporários (nunca deixa .zip/.sqlite sem criptografar por aí)
    fs.rmSync(tmpDir, { recursive: true, force: true });
    backupEmAndamento = false;
  }
}

module.exports = { runBackup, encryptFile, decryptFile };
