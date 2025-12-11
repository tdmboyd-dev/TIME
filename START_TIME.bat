@echo off
echo.
echo ============================================================
echo    TIME - Meta-Intelligence Trading Governor
echo    Starting Up...
echo ============================================================
echo.

cd /d "%~dp0"

REM Check if node_modules exists
if not exist "node_modules" (
    echo [1/3] Installing dependencies... ^(This may take a few minutes^)
    call npm install
    if errorlevel 1 (
        echo.
        echo ERROR: npm install failed!
        echo Make sure Node.js is installed: https://nodejs.org/
        pause
        exit /b 1
    )
    echo Dependencies installed successfully!
    echo.
)

REM Check if frontend node_modules exists
if not exist "frontend\node_modules" (
    echo [2/3] Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
    if errorlevel 1 (
        echo WARNING: Frontend dependencies failed to install
    )
    echo Frontend dependencies installed!
    echo.
)

echo [3/3] Starting TIME Backend Server...
echo.
echo ============================================================
echo    TIME is starting on http://localhost:3001
echo    API: http://localhost:3001/api/v1
echo    Health: http://localhost:3001/health
echo ============================================================
echo.
echo Press Ctrl+C to stop TIME
echo.

npx ts-node src/backend/index.ts

pause
