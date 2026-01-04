@echo off
echo.
echo ========================================
echo  Kiro Manager - Build Executable
echo ========================================
echo.

REM Проверяем Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found!
    echo Please install Python 3.11+ from https://www.python.org/downloads/
    pause
    exit /b 1
)

echo [OK] Python found

REM Переходим в директорию autoreg
cd /d "%~dp0autoreg"

REM Устанавливаем зависимости
echo.
echo [STEP 1] Installing Python dependencies...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)

REM Устанавливаем PyInstaller если нужно
echo.
echo [STEP 2] Installing PyInstaller...
pip install pyinstaller
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install PyInstaller
    pause
    exit /b 1
)

REM Собираем executable
echo.
echo [STEP 3] Building executable...
pyinstaller kiro-manager.spec --clean --noconfirm
if %errorlevel% neq 0 (
    echo [ERROR] Build failed
    pause
    exit /b 1
)

REM Создаем финальную директорию
echo.
echo [STEP 4] Preparing distribution...
if not exist "..\dist\executable" mkdir "..\dist\executable"

REM Копируем файлы
copy "dist\kiro-manager.exe" "..\dist\executable\" >nul
copy ".env.example" "..\dist\executable\" >nul

REM Создаем README
echo # Kiro Manager Executable > "..\dist\executable\README.txt"
echo. >> "..\dist\executable\README.txt"
echo Standalone executable for Kiro account management. >> "..\dist\executable\README.txt"
echo No Python installation required on target machine. >> "..\dist\executable\README.txt"
echo. >> "..\dist\executable\README.txt"
echo Usage: >> "..\dist\executable\README.txt"
echo   kiro-manager.exe status >> "..\dist\executable\README.txt"
echo   kiro-manager.exe tokens list >> "..\dist\executable\README.txt"
echo   kiro-manager.exe imap test >> "..\dist\executable\README.txt"
echo. >> "..\dist\executable\README.txt"
echo Configuration: >> "..\dist\executable\README.txt"
echo   1. Copy .env.example to .env >> "..\dist\executable\README.txt"
echo   2. Edit .env with your IMAP settings >> "..\dist\executable\README.txt"
echo   3. Run: kiro-manager.exe imap test >> "..\dist\executable\README.txt"

echo.
echo ========================================
echo  BUILD COMPLETED SUCCESSFULLY!
echo ========================================
echo.
echo Output: %~dp0dist\executable\kiro-manager.exe
echo.
echo Next steps:
echo 1. Copy kiro-manager.exe to target machine
echo 2. Create .env file with IMAP settings:
echo    IMAP_SERVER=imap.yandex.ru
echo    IMAP_USER=testmail@example.com
echo    IMAP_PASSWORD=your-imap-app-password
echo 3. Test: kiro-manager.exe imap test
echo.
pause