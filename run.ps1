# Run script for AI Report Generator

Write-Host "Starting Backend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd Backend; ..\.venv\Scripts\python.exe main.py"

Write-Host "Starting Frontend..." -ForegroundColor Cyan
npm start
