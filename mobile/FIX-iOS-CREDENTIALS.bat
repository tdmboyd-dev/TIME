@echo off
echo ==========================================
echo   TIME BEYOND US - Provisioning Profile Fix
echo ==========================================
echo.
echo The provisioning profile needs to be regenerated to include
echo newly enabled capabilities (Apple Pay, HealthKit, NFC, Siri, Sign in with Apple).
echo.
echo STEP-BY-STEP GUIDE:
echo.
echo 1. Select "production" profile
echo 2. Select "Build Credentials"
echo 3. Select "Provisioning Profile: Delete one from your project"
echo 4. Confirm deletion with "y"
echo 5. Then exit (Ctrl+C or navigate back)
echo.
echo After deleting, run the build command - EAS will auto-generate
echo a new provisioning profile with all capabilities!
echo.
echo Press any key to start...
pause >nul

cd /d "C:\Users\Timeb\OneDrive\TIME\mobile"

echo.
echo Running EAS credentials manager...
echo.
eas credentials --platform ios

echo.
echo ==========================================
echo   NOW RUN THE BUILD:
echo   eas build --platform ios --profile production
echo ==========================================
echo.
pause
