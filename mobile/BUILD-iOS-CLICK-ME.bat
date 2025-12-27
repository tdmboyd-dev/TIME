@echo off
echo ==========================================
echo   TIME BEYOND US - iOS Build Script
echo ==========================================
echo.

REM Clear cached Apple session
rmdir /s /q "C:\Users\Timeb\.app-store" 2>nul
echo Cleared cached Apple credentials.
echo.

REM Set Apple credentials - DO NOT commit real passwords to git!
REM Set EXPO_APPLE_PASSWORD in your environment or pass via EAS secrets
set EXPO_APPLE_ID=timebeunus.boyd@icloud.com
set EXPO_APPLE_TEAM_ID=DB9BF4C58Y

cd /d "C:\Users\Timeb\OneDrive\TIME\mobile"

echo Starting iOS build...
echo.
echo When prompted for Apple login, type: y
echo.

eas build --platform ios --profile production

echo.
echo Build complete! Press any key to close...
pause >nul
