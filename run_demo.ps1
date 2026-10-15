Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "                RESCUEMESH AI COMMAND CENTER" -ForegroundColor Yellow
Write-Host "   AI-Powered Distributed Survivor Detection & Localization System" -ForegroundColor White
Write-Host "=====================================================================" -ForegroundColor Cyan

$root = $PSScriptRoot

Write-Host "`n[1/3] Starting AI Fusion Engine (Flask/Python on Port 5001)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\ai_engine'; python app.py"

Start-Sleep -Seconds 3

Write-Host "[2/3] Starting Gateway & Backend Server (Node.js on Port 5000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\backend'; npm start"

Start-Sleep -Seconds 3

Write-Host "[3/3] Starting Command Center Dashboard (React/Vite on Port 3000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\frontend'; npm run dev"

Write-Host "`n=====================================================================" -ForegroundColor Cyan
Write-Host "RescueMesh is running!" -ForegroundColor Green
Write-Host "Dashboard: http://localhost:3000" -ForegroundColor White
Write-Host "Gateway:   http://localhost:5000" -ForegroundColor White
Write-Host "AI Engine: http://localhost:5001" -ForegroundColor White
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "`nPress Enter to start the Virtual Hardware Simulator (Optional)..."
Read-Host
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\simulator'; node virtual_nodes.js"
