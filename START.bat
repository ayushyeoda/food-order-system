@echo off
echo ========================================
echo  Restaurant Ordering System - Starting
echo ========================================
echo.
echo Installing dependencies (first time only)...
call npm install
echo.
echo Starting server...
echo.
echo Access the system at:
echo   Main: http://localhost:3000
echo   Customer: http://localhost:3000/order?table=1
echo   Kitchen: http://localhost:3000/kitchen
echo   Admin: http://localhost:3000/admin
echo.
echo Press Ctrl+C to stop the server
echo.
call npm start
pause
