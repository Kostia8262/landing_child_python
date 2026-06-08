@echo off
REM =====================================================
REM  My Computer Academy — install.bat
REM  Запусти для установки зависимостей на Windows
REM  Работает без Visual Studio / Build Tools
REM =====================================================

echo.
echo [1/3] Удаляем старые node_modules (если есть)...
if exist node_modules (
    rmdir /s /q node_modules
    echo     Удалено.
) else (
    echo     Нет старых модулей, пропускаем.
)

echo.
echo [2/3] Устанавливаем зависимости (ignore-scripts)...
npm install

echo.
echo [3/3] Запускаем сервер...
echo.
echo ====================================================
echo  Сервер запущен: http://localhost:3000
echo  Для остановки нажми Ctrl+C
echo ====================================================
echo.
npm start
