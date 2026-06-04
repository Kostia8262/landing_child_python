@echo off
REM =====================================================
REM  My Computer Academy — Git setup + v1.0 commit
REM  Запусти ОДИН РАЗ после копирования docx-файлов в docs\
REM =====================================================

echo.
echo [1/3] Инициализация Git...
git init
git config user.email "sosca17@gmail.com"
git config user.name "My Computer Academy"

echo.
echo [2/3] Добавляем все файлы...
git add -A

echo.
echo [3/3] Коммит v1.0...
git commit -m "v1.0: My Computer Academy — production-ready landing"
git tag -a v1.0 -m "Version 1.0 — Launch. Лендинг + Node.js backend + политики + cookie banner"

echo.
echo ====================================================
echo  ГОТОВО. Версия v1.0 сохранена.
echo.
echo  Для следующих правок в рамках v1 используй:
echo    git add -A
echo    git commit -m "v1.x: описание изменений"
echo.
echo  Для перехода на v2 — скопируй папку рядом
echo  под именем: "лендинг ... v2"
echo ====================================================
pause
