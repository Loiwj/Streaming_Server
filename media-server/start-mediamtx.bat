@echo off
echo ========================================
echo    MediaMTX WebRTC Server
echo ========================================
echo.
echo Starting MediaMTX server...
echo WebRTC endpoint: ws://localhost:8889
echo API endpoint: http://localhost:9997
echo.
echo Press Ctrl+C to stop the server
echo.

cd /d "%~dp0"
mediamtx.exe mediamtx.yml

pause
