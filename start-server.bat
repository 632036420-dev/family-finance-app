@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
echo 启动前端服务器...
"C:\Program Files\nodejs\npx.cmd" http-server static -p 8080
pause
