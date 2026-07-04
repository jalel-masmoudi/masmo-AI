#!/usr/bin/env pwsh
# Start the Masmo FastAPI backend on port 8000
Set-Location "$PSScriptRoot\..\backend"
& .\venv\Scripts\uvicorn.exe app.main:app --reload --port 8000 --host 127.0.0.1
