@echo off
TITLE RescueMesh AI Launcher
echo =====================================================================
echo                RESCUEMESH AI COMMAND CENTER
echo   AI-Powered Distributed Survivor Detection & Localization System
echo =====================================================================
echo.

echo [1/3] Starting AI Fusion Engine (Flask/Python on Port 5001)...
start "RescueMesh AI Engine" cmd /k "cd /d %~dp0ai_engine && python app.py"

timeout /t 3 /nobreak >nul

echo [2/3] Starting Gateway & Backend Server (Node.js on Port 5000)...
start "RescueMesh Gateway" cmd /k "cd /d %~dp0backend && npm start"

timeout /t 3 /nobreak >nul

echo [3/3] Starting Command Center Dashboard (React/Vite on Port 3000)...
start "RescueMesh Dashboard" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo =====================================================================
echo RescueMesh is launching!
echo Dashboard URL: http://localhost:3000
echo Gateway API:   http://localhost:5000
echo AI Engine:     http://localhost:5001
echo =====================================================================
echo.
echo Press any key to start the Virtual Hardware Simulator (Optional)...
pause >nul
start "RescueMesh Virtual Node Simulator" cmd /k "cd /d %~dp0simulator && node virtual_nodes.js"
