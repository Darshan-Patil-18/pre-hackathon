@echo off
echo ============================================
echo  BrandMind -- AI Brand Intelligence
echo  Build a brand that can think.
echo ============================================
echo.

:: Build frontend
echo [1/2] Building frontend...
call npm run build
if errorlevel 1 (
    echo ERROR: Frontend build failed. Make sure Node.js and npm are installed.
    pause
    exit /b 1
)

:: Start backend server (serves both API and built frontend)
echo.
echo [2/2] Starting BrandMind server on http://localhost:8000
echo.
echo  - Open your browser at: http://localhost:8000
echo  - Press Ctrl+C to stop the server
echo.
python server.py

pause
