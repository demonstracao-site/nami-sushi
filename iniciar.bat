@echo off
cd /d "%~dp0"
echo.
echo  Nami Sushi - Cardapio digital
echo  Abrindo em http://127.0.0.1:8080
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "servir.ps1"
pause
