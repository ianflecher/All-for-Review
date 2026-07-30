@echo off
REM ============================================================
REM  IDF Reviewer - Build the Android APK
REM
REM  The APK is built by Expo's cloud service (EAS), because
REM  building it on this PC needs Java 17-21 and only Java 26
REM  is installed here, which the Android build tools reject.
REM
REM  You need a free Expo account: https://expo.dev/signup
REM ============================================================

echo.
echo  IDF Reviewer - Android APK builder
echo  ==================================
echo.
echo  This opens Expo's cloud build service.
echo  A free Expo account is required.
echo.

cd /d "%~dp0..\PDFReviewerApp"
if errorlevel 1 goto :missing

echo  [1/2] Signing in to Expo...
call npx eas-cli login
if errorlevel 1 goto :failed

echo.
echo  [2/2] Building the APK (this runs in the cloud, ~10-20 min)...
call npx eas-cli build -p android --profile preview
if errorlevel 1 goto :failed

echo.
echo  Done. Download the .apk from the link above, copy it to your
echo  phone, and open it to install.
echo  (On the phone you may need to allow "Install unknown apps".)
echo.
pause
exit /b 0

:missing
echo  ERROR: Could not find the PDFReviewerApp folder next to this script.
pause
exit /b 1

:failed
echo.
echo  The build did not complete. Check the messages above.
pause
exit /b 1
