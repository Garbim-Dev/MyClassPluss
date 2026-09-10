@echo off
chcp 65001 > nul
title MyClassPluss - Inicializador de Alta Performance

echo =======================================================
echo        INICIANDO MYCLASSPLUSS (ALTA PERFORMANCE)
echo =======================================================
echo.

:: 1. Liberar portas
echo [1/4] Limpando portas 3000 e 5173...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173') do taskkill /f /pid %%a >nul 2>&1

:: 2. Sincronizar Prisma e Banco de Dados
echo [2/4] Sincronizando banco de dados e schema...
cd /d "D:\Programar\MyClassPluss\backend"
call npx prisma generate >nul 2>&1
call npx prisma db push >nul 2>&1

:: 3. Iniciar Backend NestJS
echo [3/4] Iniciando Backend...
start "MyClassPluss - Backend [3000]" cmd /k "cd /d D:\Programar\MyClassPluss\backend && npm run start:dev"

:: 4. Iniciar Frontend (Vite com Host Direto)
echo [4/4] Iniciando Frontend Otimizado...
start "MyClassPluss - Frontend [5173]" cmd /k "cd /d D:\Programar\MyClassPluss\frontend && npm run dev -- --host 0.0.0.0"

timeout /t 2 /nobreak > nul
start http://localhost:5173/

echo.
echo MyClassPluss rodando com baixa latencia!