@echo off
echo Starting Streaming Server with all services...
echo.
echo Services will start:
echo - MediaMTX (RTSP to WHEP converter)
echo - Backend API Server (port 3001) 
echo - Frontend Dev Server (port 3000)
echo.
echo Press Ctrl+C to stop all services
echo.
npm run dev:full
