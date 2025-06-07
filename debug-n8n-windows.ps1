# Debug n8n installation on Windows
Write-Host "🔍 Debugging n8n installation on Windows" -ForegroundColor Green
Write-Host "================================================"

# Check running processes
Write-Host "`n📋 1. Checking running n8n processes:" -ForegroundColor Yellow
Get-Process | Where-Object {$_.ProcessName -like "*n8n*" -or $_.ProcessName -like "*node*"} | Select-Object ProcessName, Id, Path

# Check Windows Services
Write-Host "`n⚙️ 2. Checking Windows Services:" -ForegroundColor Yellow
Get-Service | Where-Object {$_.Name -like "*n8n*" -or $_.DisplayName -like "*n8n*"}

# Check listening ports
Write-Host "`n🌐 3. Checking listening ports (likely 5678):" -ForegroundColor Yellow
netstat -an | findstr ":5678"

# Check if Node.js is installed
Write-Host "`n📦 4. Checking Node.js installation:" -ForegroundColor Yellow
if (Get-Command node -ErrorAction SilentlyContinue) {
    node --version
    npm --version
} else {
    Write-Host "Node.js not found in PATH"
}

# Check global npm packages
Write-Host "`n📦 5. Checking global npm packages:" -ForegroundColor Yellow
if (Get-Command npm -ErrorAction SilentlyContinue) {
    npm list -g --depth=0 | findstr n8n
} else {
    Write-Host "npm not found"
}

# Check PM2 if available
Write-Host "`n🔧 6. Checking PM2 processes:" -ForegroundColor Yellow
if (Get-Command pm2 -ErrorAction SilentlyContinue) {
    pm2 list
} else {
    Write-Host "PM2 not found"
}

# Check common installation paths
Write-Host "`n📁 7. Checking common n8n paths:" -ForegroundColor Yellow
$paths = @(
    "$env:USERPROFILE\.n8n",
    "$env:APPDATA\npm\node_modules\n8n",
    "C:\Program Files\nodejs\node_modules\n8n",
    "C:\n8n"
)

foreach ($path in $paths) {
    if (Test-Path $path) {
        Write-Host "Found: $path" -ForegroundColor Green
        Get-ChildItem $path -Name | Select-Object -First 5
    }
}

# Check environment variables
Write-Host "`n📝 8. Checking environment variables:" -ForegroundColor Yellow
Get-ChildItem Env: | Where-Object {$_.Name -like "*N8N*"} | Format-Table Name, Value

# Check Cloudflare tunnel
Write-Host "`n☁️ 9. Checking Cloudflare tunnel:" -ForegroundColor Yellow
Get-Process | Where-Object {$_.ProcessName -like "*cloudflared*"} | Select-Object ProcessName, Id, Path

Write-Host "`n🎯 Next steps:" -ForegroundColor Cyan
Write-Host "1. Identify how n8n is running (npm global, PM2, Windows Service)"
Write-Host "2. Find the configuration method"
Write-Host "3. Add API environment variables"
Write-Host "4. Restart n8n service" 