@echo off
echo ===================================================
echo    Starting UdyogBill Enterprise Application
echo ===================================================

echo [1/2] Launching Backend API (.NET 9) on http://localhost:5050 ...
start "UdyogBill Backend API" cmd /k "cd /d %~dp0 && dotnet run --project backend\src\UdyogBill.Api\UdyogBill.Api.csproj --urls http://localhost:5050"

echo [2/2] Waiting 5 seconds, then launching Frontend (Next.js)...
timeout /t 5 /nobreak > nul

start "UdyogBill Frontend (Next.js)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ===================================================
echo  Services launched!
echo.
echo  - Frontend URL: http://localhost:3000
echo  - Backend API:  http://localhost:5050
echo ===================================================
pause
