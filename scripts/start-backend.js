const { spawn } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
const backendDir = path.join(root, 'backend');

const isWin = process.platform === 'win32';
const pythonBin = isWin
  ? path.join(root, '.venv', 'Scripts', 'python.exe')
  : path.join(root, '.venv', 'bin', 'python');

console.log(`Starting Uvicorn using ${pythonBin}...`);

const child = spawn(pythonBin, ['-m', 'uvicorn', 'main:app', '--reload'], {
  cwd: backendDir,
  stdio: 'inherit'
});

child.on('close', (code) => {
  process.exit(code);
});

child.on('error', (err) => {
  console.error('Failed to start backend:', err);
  process.exit(1);
});
