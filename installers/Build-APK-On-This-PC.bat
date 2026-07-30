@echo off
REM ============================================================
REM  IDF Reviewer - Build the APK on this PC
REM
REM  Needs a JDK 17-21 installed. Your system Java is NOT changed:
REM  JAVA_HOME is set only inside the build process.
REM
REM  The real work lives in build-apk.ps1 next to this file.
REM ============================================================

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build-apk.ps1"

echo.
pause
