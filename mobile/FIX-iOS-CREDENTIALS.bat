@echo off
echo ==========================================
echo   TIME BEYOND US - iOS Credentials Fix
echo ==========================================
echo.
echo The iOS distribution certificate on EAS is corrupted.
echo This script will help you regenerate it.
echo.
echo IMPORTANT: You will need to:
echo 1. Select "production" profile when prompted
echo 2. Choose "Delete current credentials and regenerate"
echo 3. Follow the prompts to create new credentials
echo.
echo Press any key to start...
pause >nul

cd /d "C:\Users\Timeb\OneDrive\TIME\mobile"

echo.
echo Running EAS credentials manager...
echo.
eas credentials --platform ios

echo.
echo Done! Now run a new iOS build with:
echo   eas build --platform ios --profile production
echo.
pause
