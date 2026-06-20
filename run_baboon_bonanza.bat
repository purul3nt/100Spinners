@echo off
cd /d "%~dp0"
echo Starting Baboon Bonanza at http://127.0.0.1:8097/
start "" "http://127.0.0.1:8097/"
"C:\Users\hanna\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" -m http.server 8097 --bind 127.0.0.1
pause
