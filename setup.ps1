# Setup script for AI Report Generator

Write-Host "Setting up environment..." -ForegroundColor Cyan

# 1. Create Python Virtual Environment
if (-not (Test-Path ".venv")) {
    Write-Host "Creating virtual environment..."
    python -m venv .venv
}

# 2. Install Backend Requirements
Write-Host "Installing backend requirements..."
& ".\.venv\Scripts\python.exe" -m pip install -r .\Backend\requirements.txt

# 3. Install Frontend Requirements
Write-Host "Installing frontend requirements..."
npm install

Write-Host "Setup complete!" -ForegroundColor Green
