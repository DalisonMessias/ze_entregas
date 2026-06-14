import fs from 'fs';
import path from 'path';

const DIRECTORIES_TO_SCAN = ['components', 'services', 'server', 'contexts', 'utils', 'src', 'public'];
const EXCLUDED_FILES = ['verificar_erros_rede.js', 'continuous_learning_skills.md', 'checklist.txt', 'TASK_LIST.md', 'imports_scan.json'];

// Cores para o console
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

console.log(`${BOLD}${BLUE}=== INICIANDO VARREDURA COMPLETA DE ERROS DE REDE ===${RESET}\n`);

let totalErrors = 0;
let scannedFilesCount = 0;

function walkDir(dir, callback) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filepath = path.join(dir, file);
        const stat = fs.statSync(filepath);
        if (stat.isDirectory()) {
            if (file !== 'node_modules' && file !== '.git' && file !== 'dist' && file !== 'build') {
                walkDir(filepath, callback);
            }
        } else if (stat.isFile()) {
            const ext = path.extname(file);
            if (['.ts', '.tsx', '.js', '.jsx', '.html', '.css', '.json'].includes(ext)) {
                if (!EXCLUDED_FILES.includes(file)) {
                    callback(filepath);
                }
            }
        }
    }
}

function scanFile(filepath) {
    scannedFilesCount++;
    const content = fs.readFileSync(filepath, 'utf8');
    const lines = content.split(/\r?\n/);
    const relPath = path.relative(process.cwd(), filepath);

    lines.forEach((line, index) => {
        const lineNum = index + 1;

        // 1. Verificar áudio externo Mixkit
        if (line.includes('mixkit.co')) {
            totalErrors++;
            console.log(`${RED}[ERRO] Áudio Mixkit Encontrado:${RESET}`);
            console.log("  Arquivo: " + YELLOW + relPath.replace(/\\/g, '/') + ":" + lineNum + RESET);
            console.log(`  Linha:   "${line.trim()}"\n`);
        }

        // 2. Verificar consultas à impressora com .single()
        if (line.includes('printer_settings') && line.includes('.single()')) {
            totalErrors++;
            console.log(`${RED}[ERRO] printer_settings com .single() Encontrado:${RESET}`);
            console.log("  Arquivo: " + YELLOW + relPath.replace(/\\/g, '/') + ":" + lineNum + RESET);
            console.log(`  Linha:   "${line.trim()}"\n`);
        }

        // 3. Verificar caminhos obsoletos a /pwa/manifest.json
        if (line.includes('/pwa/manifest.json') && !relPath.replace(/\\/g, '/').includes('server/routes/pwa.ts')) {
            totalErrors++;
            console.log(`${RED}[ERRO] Caminho obsoleto /pwa/manifest.json Encontrado:${RESET}`);
            console.log("  Arquivo: " + YELLOW + relPath.replace(/\\/g, '/') + ":" + lineNum + RESET);
            console.log(`  Linha:   "${line.trim()}"\n`);
        }
    });
}

// Iniciar a varredura
const rootDir = process.cwd();
DIRECTORIES_TO_SCAN.forEach(dirName => {
    const fullPath = path.join(rootDir, dirName);
    walkDir(fullPath, filepath => {
        scanFile(filepath);
    });
});

// Scan dos arquivos soltos na raiz do projeto (como index.html, sw.js)
const rootFiles = fs.readdirSync(rootDir);
rootFiles.forEach(file => {
    const filepath = path.join(rootDir, file);
    const stat = fs.statSync(filepath);
    if (stat.isFile()) {
        const ext = path.extname(file);
        if (['.html', '.js', '.ts'].includes(ext) && !EXCLUDED_FILES.includes(file)) {
            scanFile(filepath);
        }
    }
});

console.log(`${BOLD}${BLUE}=== RELATÓRIO DE AUDITORIA ===${RESET}`);
console.log(`Arquivos varridos: ${BOLD}${scannedFilesCount}${RESET}`);

if (totalErrors === 0) {
    console.log(`\n${BOLD}${GREEN}✔ SUCESSO: Nenhum erro de rede ou consulta inadequada foi encontrado no sistema!${RESET}\n`);
} else {
    console.log(`\n${BOLD}${RED}✘ FALHA: Foram encontrados ${totalErrors} erro(s) pendente(s) no sistema! Verifique as ocorrências listadas acima.${RESET}\n`);
}
