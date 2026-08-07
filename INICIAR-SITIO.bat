@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if %errorlevel%==0 (
  node server.js
  goto :end
)
set "JOY_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if exist "%JOY_NODE%" (
  "%JOY_NODE%" server.js
  goto :end
)
echo No se encontro Node.js. Instalalo desde https://nodejs.org para iniciar la comunidad.
:end
pause
