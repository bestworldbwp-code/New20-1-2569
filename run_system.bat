@echo off
echo Starting local server for PR System...
echo ---------------------------------------
echo.
echo 1. Checking if Python is installed...
python --version >nul 2>&1
if %errorlevel% == 0 (
    echo [OK] Python found. Starting Python server on port 8080...
    start http://localhost:8080
    python -m http.server 8080
    goto end
)

echo 2. Python not found, trying Node.js (npx)...
npx --version >nul 2>&1
if %errorlevel% == 0 (
    echo [OK] Node.js found. Starting http-server on port 8080...
    start http://localhost:8080
    npx http-server -p 8080
    goto end
)

echo [ERROR] Neither Python nor Node.js were found.
echo Please install Python or Node.js to run the local server.
echo Alternatively, you can try opening index.html directly, but some features might not work.
pause

:end
