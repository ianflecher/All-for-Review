@echo off
REM ============================================================
REM  IDF Reviewer - Run on your phone right now (no APK needed)
REM
REM  Starts the dev server and shows a QR code. Install "Expo Go"
REM  from the Play Store / App Store, then scan the QR code.
REM  Your phone must be on the SAME Wi-Fi as this PC.
REM ============================================================

echo.
echo  IDF Reviewer - run on your phone
echo  ================================
echo.
echo  1. Install "Expo Go" on your phone (Play Store / App Store)
echo  2. Connect the phone to the SAME Wi-Fi as this PC
echo  3. Scan the QR code that appears below
echo.
echo  Press Ctrl+C in this window to stop the server.
echo.

cd /d "%~dp0..\PDFReviewerApp"
if errorlevel 1 goto :missing

call npx expo start
exit /b 0

:missing
echo  ERROR: Could not find the PDFReviewerApp folder next to this script.
pause
exit /b 1
