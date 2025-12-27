@echo off
REM Set Apple credentials - DO NOT commit real passwords to git!
REM Set EXPO_APPLE_PASSWORD in your environment or pass via EAS secrets
set EXPO_APPLE_ID=timebeunus.boyd@icloud.com
set EXPO_APPLE_TEAM_ID=DB9BF4C58Y
cd /d "C:\Users\Timeb\OneDrive\TIME\mobile"
eas build --platform ios --profile production --non-interactive --no-wait
