@echo off

REM --- BACKEND ---
start cmd /k "cd /d C:\Users\pc\Desktop\AppBets\Backend && node index.js"

REM --- FRONTEND ---
start cmd /k "cd /d C:\Users\pc\Desktop\AppBets\Frontend && npm run dev"

REM --- ABRIR NAVEGADOR ---
timeout /t 5 >nul
start http://localhost:5173