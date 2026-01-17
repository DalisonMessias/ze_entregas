import { spawn } from 'child_process';
import path from 'path';

// Definição de cores para logs
const colors = {
    reset: '\x1b[0m',
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
};

const log = (prefix, color, data) => {
    const lines = data.toString().split('\n');
    lines.forEach(line => {
        if (line.trim()) {
            console.log(`${color}[${prefix}]${colors.reset} ${line}`);
        }
    });
};

console.log(`${colors.cyan}🚀 Iniciando Ambiente de Desenvolvimento do Zé Entregas...${colors.reset}\n`);

// Iniciar Backend (API)
// Usamos 'process.platform' para compatibilidade com Windows (npm.cmd)
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const api = spawn(npmCmd, ['run', 'dev:api'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
    env: { ...process.env, PORT: '4000' } // Garante porta 4000
});

api.stdout.on('data', data => log('API', colors.yellow, data));
api.stderr.on('data', data => log('API', colors.red, data));

// Iniciar Frontend (Vite) de forma direta usando npx para evitar chamadas circulares
const viteProcess = spawn('npx', ['vite'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
});

viteProcess.stdout.on('data', data => log('VITE', colors.green, data));
viteProcess.stderr.on('data', data => log('VITE', colors.red, data));

// Gerenciamento de encerramento
const cleanup = () => {
    console.log(`\n${colors.cyan}🛑 Encerrando todos os processos...${colors.reset}`);
    api.kill();
    viteProcess.kill();
    process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);
