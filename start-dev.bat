@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js не найден. Установи LTS с https://nodejs.org и запусти снова. & start https://nodejs.org & pause & exit /b)
if not exist node_modules (echo Устанавливаю зависимости... & call npm install)
echo.
echo Ссылка для Owlbear: http://localhost:5173/manifest.json
echo Не закрывай это окно, пока тестируешь.
echo.
call npm run dev
pause
