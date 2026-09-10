@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Vui long cai Node.js 24 LTS tu https://nodejs.org roi chay lai file nay.
 pause
 exit /b 1
)
node -e "if(Number(process.versions.node.split('.')[0])<24){console.error('Can Node.js 24 tro len.');process.exit(1)}"
if errorlevel 1 (
 pause
 exit /b 1
)
echo Mo trinh duyet tai http://localhost:3000
node --env-file-if-exists=CAU-HINH.env server/server.mjs
pause
