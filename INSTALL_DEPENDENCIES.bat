@echo off
echo.
echo ============================================================
echo    TIME - Installing Dependencies
echo ============================================================
echo.

cd /d "%~dp0"

echo [1/2] Installing backend dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: Backend npm install failed!
    pause
    exit /b 1
)
echo Backend dependencies installed!
echo.

echo [2/2] Installing frontend dependencies...
cd frontend
call npm install
cd ..
if errorlevel 1 (
    echo WARNING: Frontend dependencies failed
)
echo Frontend dependencies installed!
echo.

echo ============================================================
echo    All dependencies installed successfully!
echo    You can now run START_TIME.bat to launch TIME
echo ============================================================
pause
