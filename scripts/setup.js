/**
 * setup.js — cross-platform dev environment setup for NoelCast
 * Handles Python venv creation + pip install + npm install
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const venvDir = path.join(root, '.venv');
const isWin = process.platform === 'win32';
const pythonBin = isWin
  ? path.join(venvDir, 'Scripts', 'python.exe')
  : path.join(venvDir, 'bin', 'python');
const pipBin = isWin
  ? path.join(venvDir, 'Scripts', 'pip.exe')
  : path.join(venvDir, 'bin', 'pip');

function run(cmd, opts = {}) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', ...opts });
}

// ── Step 1: Python venv ────────────────────────────────────────────────────────
if (fs.existsSync(pythonBin)) {
  console.log('✅ Python venv already exists — skipping creation.');
} else {
  console.log('🐍 Creating Python virtual environment...');
  try {
    run('python -m venv .venv', { cwd: root });
  } catch {
    // Python 3.14 venv launcher bug workaround
    console.warn('⚠️  Standard venv failed, trying with --without-pip...');
    run('python -m venv .venv --without-pip', { cwd: root });
  }
}

// ── Step 2: pip install ────────────────────────────────────────────────────────
console.log('\n📦 Installing Python dependencies...');
const requirementsTxt = path.join(root, 'backend', 'requirements.txt');
run(`"${pythonBin}" -m pip install -r "${requirementsTxt}"`, { cwd: root });

// ── Step 3: npm install (frontend) ────────────────────────────────────────────
console.log('\n📦 Installing frontend npm packages...');
run('npm install --legacy-peer-deps', { cwd: path.join(root, 'frontend') });

// ── Step 4: Copy .env if missing ──────────────────────────────────────────────
const envExample = path.join(root, 'backend', '.env.example');
const envFile    = path.join(root, 'backend', '.env');
if (!fs.existsSync(envFile) && fs.existsSync(envExample)) {
  fs.copyFileSync(envExample, envFile);
  console.log('\n✅ Created backend/.env from .env.example');
}

console.log('\n🎄 Setup complete! Run `npm run dev` to start.\n');
