#!/usr/bin/env pwsh
# Start the Masmo Vite frontend (proxies API to :8000)
Set-Location "$PSScriptRoot\..\frontend"
npm run dev
