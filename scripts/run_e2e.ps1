#!/usr/bin/env pwsh
# Run end-to-end verification (deterministic heuristic agent)
Set-Location "$PSScriptRoot\..\backend"
$env:MASMO_HEURISTIC_ONLY = "1"
& .\venv\Scripts\python.exe ..\scripts\e2e_test.py
exit $LASTEXITCODE
