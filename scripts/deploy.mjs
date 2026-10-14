// @ts-check
// scripts/deploy.mjs — Build, push, dan deploy ke Google Apps Script otomatis
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

function formatTimestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const tgl = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  const jam = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  return `Deploy ${tgl} ${jam}`;
}

// Parsing argumen baris perintah
const rawArgs = process.argv.slice(2);
let buatBaru = false;
let explicitId = null;
let customDesc = [];

for (let i = 0; i < rawArgs.length; i++) {
  const arg = rawArgs[i];
  if (arg === '--new' || arg === '--baru') {
    buatBaru = true;
  } else if (arg === '-i' || arg === '--id') {
    if (i + 1 < rawArgs.length) {
      explicitId = rawArgs[++i];
    }
  } else if (arg === '-d' || arg === '--desc') {
    if (i + 1 < rawArgs.length) {
      customDesc.push(rawArgs[++i]);
    }
  } else {
    customDesc.push(arg);
  }
}

const deskripsi = customDesc.join(' ').trim() || formatTimestamp();

console.log('=== EPICPHONE SISTEM - DEPLOY ===\n');

// 1. Build & Push
console.log('[1/2] Menjalankan build & push ke Apps Script...');
try {
  execSync('npm run push', { stdio: 'inherit', shell: true });
} catch {
  console.error('\n✖ Gagal saat build atau push. Deployment dibatalkan.');
  process.exit(1);
}

// 2. Deteksi Deployment ID
let deploymentId = explicitId || process.env.CLASP_DEPLOYMENT_ID || null;

if (!deploymentId && !buatBaru) {
  // Cek apakah ada di .clasp.json
  try {
    const claspConfigPath = path.resolve('.clasp.json');
    if (fs.existsSync(claspConfigPath)) {
      const config = JSON.parse(fs.readFileSync(claspConfigPath, 'utf8'));
      if (config.deploymentId) {
        deploymentId = config.deploymentId;
      }
    }
  } catch {
    // Abaikan jika berkas .clasp.json tidak dapat dibaca
  }
}

if (!deploymentId && !buatBaru) {
  try {
    const listOut = execSync('clasp deployments', { encoding: 'utf8', shell: true });
    const lines = listOut.split('\n').map(l => l.trim());
    const versioned = lines.filter(l => l.startsWith('-') && !l.includes('@HEAD'));
    if (versioned.length > 0) {
      const match = versioned[versioned.length - 1].match(/^-\s+([A-Za-z0-9_-]+)/);
      if (match) {
        deploymentId = match[1];
      }
    }
  } catch {
    // Bila gagal membaca daftar deployment, fallback ke deployment baru
  }
}

console.log('\n[2/2] Memproses deployment ke Apps Script...');
console.log(`Deskripsi : "${deskripsi}"`);

let deployCmd = `clasp deploy -d "${deskripsi}"`;
if (deploymentId && !buatBaru) {
  console.log(`Target    : Memperbarui deployment aktif (${deploymentId}) agar URL tetap sama.`);
  deployCmd = `clasp deploy -i ${deploymentId} -d "${deskripsi}"`;
} else {
  console.log('Target    : Membuat deployment baru.');
}

try {
  const deployOutput = execSync(deployCmd, { encoding: 'utf8', shell: true });
  console.log(deployOutput.trim());

  // Ekstrak deployment ID jika baru dibuat
  const idMatch = deployOutput.match(/Deployed\s+([A-Za-z0-9_-]+)/i) || deployOutput.match(/- ([A-Za-z0-9_-]+) @/);
  const finalId = deploymentId || (idMatch ? idMatch[1] : null);

  console.log('\n✔ Deployment berhasil!');
  if (finalId) {
    console.log(`🔗 URL Web App: https://script.google.com/macros/s/${finalId}/exec`);
  }
} catch (e) {
  console.error('\n✖ Gagal melakukan clasp deploy:');
  console.error(e?.stdout || e?.message || e);
  process.exit(1);
}
