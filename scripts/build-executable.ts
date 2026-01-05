#!/usr/bin/env ts-node
/**
 * Build Executable Script
 * Компилирует Python backend в исполняемый файл
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, copyFileSync, rmSync } from 'fs';
import { join } from 'path';

const ROOT_DIR = join(__dirname, '..');
const AUTOREG_DIR = join(ROOT_DIR, 'autoreg');
const DIST_DIR = join(ROOT_DIR, 'dist');
const EXECUTABLE_DIR = join(DIST_DIR, 'executable');
const BIN_DIR = join(DIST_DIR, 'bin');

function isWindows(): boolean {
    return process.platform === 'win32';
}

function getBinName(base: string): string {
    return isWindows() ? `${base}.exe` : base;
}

console.log('\n🔨 Building Kiro Manager Executable');
console.log('=====================================\n');

// Проверяем что Python и PyInstaller доступны
function checkDependencies() {
    console.log('📋 Checking dependencies...');
    
    try {
        const pythonVersion = execSync('python --version', { stdio: 'pipe', encoding: 'utf8' });
        console.log(`✅ Python found: ${pythonVersion.trim()}`);
    } catch {
        try {
            const python3Version = execSync('python3 --version', { stdio: 'pipe', encoding: 'utf8' });
            console.log(`✅ Python3 found: ${python3Version.trim()}`);
        } catch {
            console.error('❌ Python not found. Please install Python 3.11+');
            console.error('Download from: https://www.python.org/downloads/');
            process.exit(1);
        }
    }
    
    try {
        execSync('pip show pyinstaller', { stdio: 'pipe' });
        console.log('✅ PyInstaller found');
    } catch {
        console.log('📦 Installing PyInstaller...');
        try {
            execSync('pip install pyinstaller', { stdio: 'inherit' });
            console.log('✅ PyInstaller installed');
        } catch (error) {
            console.error('❌ Failed to install PyInstaller:', error);
            process.exit(1);
        }
    }
}

// Устанавливаем зависимости
function installDependencies() {
    console.log('\n📦 Installing Python dependencies...');
    
    process.chdir(AUTOREG_DIR);
    execSync('pip install -r requirements.txt', { stdio: 'inherit' });
}

// Создаем директории
function createDirectories() {
    console.log('\n📁 Creating directories...');
    
    if (existsSync(EXECUTABLE_DIR)) {
        rmSync(EXECUTABLE_DIR, { recursive: true, force: true });
    }
    if (existsSync(BIN_DIR)) {
        rmSync(BIN_DIR, { recursive: true, force: true });
    }
    
    mkdirSync(EXECUTABLE_DIR, { recursive: true });
    mkdirSync(BIN_DIR, { recursive: true });
    console.log(`✅ Created: ${EXECUTABLE_DIR}`);
    console.log(`✅ Created: ${BIN_DIR}`);
}

// Компилируем с PyInstaller
function buildExecutable() {
    console.log('\n🔨 Building executable with PyInstaller...');
    
    process.chdir(AUTOREG_DIR);
    
    const command = 'pyinstaller kiro-manager.spec --clean --noconfirm';
    console.log(`Running: ${command}`);
    
    execSync(command, { stdio: 'inherit' });
    
    // Копируем результат
    const sourceExe = join(AUTOREG_DIR, 'dist', getBinName('kiro-manager'));
    const targetExe = join(EXECUTABLE_DIR, getBinName('kiro-manager'));
    const targetBin = join(BIN_DIR, getBinName('kiro-manager'));
    
    if (existsSync(sourceExe)) {
        copyFileSync(sourceExe, targetExe);
        copyFileSync(sourceExe, targetBin);
        console.log(`✅ Executable created: ${targetExe}`);
        console.log(`✅ Bundled binary copied: ${targetBin}`);
    } else {
        console.error('❌ Executable not found after build');
        process.exit(1);
    }
}

// Компилируем CLI (с регистрацией)
function buildCliExecutable() {
    console.log('\n🔨 Building CLI executable with PyInstaller...');
    
    process.chdir(AUTOREG_DIR);
    
    const command = 'pyinstaller kiro-cli.spec --clean --noconfirm';
    console.log(`Running: ${command}`);
    
    execSync(command, { stdio: 'inherit' });
    
    const sourceExe = join(AUTOREG_DIR, 'dist', getBinName('kiro-cli'));
    const targetExe = join(EXECUTABLE_DIR, getBinName('kiro-cli'));
    const targetBin = join(BIN_DIR, getBinName('kiro-cli'));
    
    if (existsSync(sourceExe)) {
        copyFileSync(sourceExe, targetExe);
        copyFileSync(sourceExe, targetBin);
        console.log(`✅ CLI executable created: ${targetExe}`);
        console.log(`✅ Bundled binary copied: ${targetBin}`);
    } else {
        console.error('❌ CLI executable not found after build');
        process.exit(1);
    }
}

// Создаем README для пользователей
function createReadme() {
    console.log('\n📝 Creating README...');
    
    const binName = getBinName('kiro-manager');
    const readme = `# Kiro Manager Executable

Standalone executable для управления Kiro аккаунтами.
Не требует установки Python на компьютере пользователя.

## Использование

\`\`\`bash
# Общий статус
${binName} status

# Список токенов
${binName} tokens list

# Переключить аккаунт
${binName} tokens switch <name>

# Проверить квоты
${binName} quota
${binName} quota --all

# Управление Machine ID
${binName} machine status
${binName} machine reset

# Патчинг Kiro
${binName} patch status
${binName} patch apply
${binName} patch restart

# Управление Kiro IDE
${binName} kiro status
${binName} kiro restart

# Импорт SSO аккаунта
${binName} sso-import
\`\`\`

## IMAP Профили

Поддерживаемые IMAP серверы:
- Yandex: imap.yandex.ru:993
- Gmail: imap.gmail.com:993
- Outlook: outlook.office365.com:993

## Конфигурация

Создайте файл \`.env\` рядом с executable:

\`\`\`
IMAP_SERVER=imap.yandex.ru
IMAP_USER=testmail@example.com
IMAP_PASSWORD=your-imap-app-password
\`\`\`

## Версия

Собрано: ${new Date().toISOString()}
`;

    const readmePath = join(EXECUTABLE_DIR, 'README.md');
    require('fs').writeFileSync(readmePath, readme);
    console.log(`✅ README created: ${readmePath}`);
}

// Создаем пример .env файла
function createEnvExample() {
    console.log('\n⚙️ Creating .env example...');
    
    const envExample = `# IMAP Configuration for catch-all email
IMAP_SERVER=imap.yandex.ru
IMAP_USER=testmail@example.com
IMAP_PASSWORD=your-imap-app-password

# Optional: Custom paths
# TOKENS_PATH=C:\\Users\\Username\\.kiro-manager-wb\\tokens

# Optional: Debug settings
# DEBUG_VERBOSE=true
# DEBUG_SCREENSHOTS=true

# Optional: Registration settings
# AUTOREG_HEADLESS=false
# AUTOREG_SPOOFING=true
`;

    const envPath = join(EXECUTABLE_DIR, '.env.example');
    require('fs').writeFileSync(envPath, envExample);
    console.log(`✅ .env example created: ${envPath}`);
}

// Показываем размер файла
function showFileSize() {
    const exePath = join(EXECUTABLE_DIR, getBinName('kiro-manager'));
    if (existsSync(exePath)) {
        const stats = require('fs').statSync(exePath);
        const sizeMB = (stats.size / 1024 / 1024).toFixed(1);
        console.log(`\n📊 Executable size: ${sizeMB} MB`);
    }
}

// Main
async function main() {
    try {
        checkDependencies();
        installDependencies();
        createDirectories();
        buildExecutable();
        buildCliExecutable();
        createReadme();
        createEnvExample();
        showFileSize();
        
        console.log('\n🎉 Build completed successfully!');
        console.log(`📁 Output directory: ${EXECUTABLE_DIR}`);
        console.log('\n💡 Next steps:');
        console.log(`1. Copy ${getBinName('kiro-manager')} to target machine`);
        console.log('2. Create .env file with IMAP settings');
        console.log(`3. Run: ${getBinName('kiro-manager')} status`);
        
    } catch (error) {
        console.error('\n❌ Build failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}
