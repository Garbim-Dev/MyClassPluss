@echo off
chcp 65001 > nul
title MyClassPluss - Inicializador de Alta Performance

echo =======================================================
echo         INICIANDO MYCLASSPLUSS (ALTA PERFORMANCE)
echo =======================================================
echo.

:: 1. Detectar IP Real da Máquina no Roteador Local
echo [*] Identificando IP da rede local...
for /f "usebackq tokens=*" %%i in (`powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'Loopback|vEthernet|VirtualBox|WSL|Docker' -and $_.IPAddress -notmatch '^(169\.254|127\.)' }).IPAddress | Select-Object -First 1"`) do (
    set SERVER_IP=%%i
)

:: Caso não encontre adaptador físico de rede ativo, usa fallback para 127.0.0.1
if "%SERVER_IP%"=="" (
    set SERVER_IP=127.0.0.1
)

echo [OK] Servidor rodando na rede em: http://%SERVER_IP%:5173
echo.

:: 2. Liberar portas
echo [1/4] Limpando portas 3000 e 5173...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173') do taskkill /f /pid %%a >nul 2>&1

:: 3. Sincronizar Prisma e Banco de Dados
echo [2/4] Sincronizando banco de dados e schema...
cd /d "D:\Programar\MyClassPluss\backend"
call npx prisma generate >nul 2>&1
call npx prisma db push >nul 2>&1

:: 4. Iniciar Backend NestJS
echo [3/4] Iniciando Backend...
start "MyClassPluss - Backend [3000]" cmd /k "cd /d D:\Programar\MyClassPluss\backend && npm run start:dev"

:: 5. Iniciar Frontend (Vite com Host Direto)
echo [4/4] Iniciando Frontend Otimizado...
start "MyClassPluss - Frontend [5173]" cmd /k "cd /d D:\Programar\MyClassPluss\frontend && npm run dev -- --host 0.0.0.0"

:: 6. Aguardar 3 segundos para estabilização dos serviços e abrir no IP real da rede
timeout /t 3 /nobreak > nul
start http://%SERVER_IP%:5173/

echo.
echo =======================================================
echo    MyClassPluss rodando com baixa latência!
echo    Endereço para os smartphones: http://%SERVER_IP%:5173
echo =======================================================