@echo off
chcp 65001 > nul
title MyClassPluss - Encerrando Servidores

echo =======================================================
echo         ENCERRANDO SERVIÇOS DO MYCLASSPLUSS
echo =======================================================
echo.

echo [1/3] Liberando a porta 3000 (Backend NestJS)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do (
    taskkill /f /pid %%a >nul 2>&1
)

echo [2/3] Liberando a porta 5173 (Frontend Vite)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173') do (
    taskkill /f /pid %%a >nul 2>&1
)

echo [3/3] Finalizando processos remanescentes do Node.js...
taskkill /f /im node.exe >nul 2>&1

echo.
echo =======================================================
echo   Todos os serviços do MyClassPluss foram encerrados!
echo =======================================================
timeout /t 2 > nul
exit