# Pulse survey — first install on Windows (Docker Desktop).  Usage: right-click > Run with PowerShell,
# or in PowerShell:  powershell -ExecutionPolicy Bypass -File .\install.ps1
# Creates .env with fresh secrets (only if it does not exist), builds and starts the containers,
# waits until the app is healthy, then opens the setup page and shows the setup code.
$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

function Fail($msg) { Write-Host $msg -ForegroundColor Red; Read-Host "Press Enter to close"; exit 1 }

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { Fail "Docker Desktop is not installed. Install it from https://www.docker.com/products/docker-desktop/ and start it." }
docker info *> $null
if ($LASTEXITCODE -ne 0) { Fail "Docker Desktop is installed but not running. Start Docker Desktop, wait until it says 'Engine running', then run this again." }

function New-Secret([int]$len) {
  $chars = [char[]]"ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"
  $bytes = New-Object byte[] $len
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  -join ($bytes | ForEach-Object { $chars[$_ % $chars.Length] })
}

if (-not (Test-Path ".env")) {
  $url = Read-Host "Public address people will use [http://localhost:8080]"
  if ([string]::IsNullOrWhiteSpace($url)) { $url = "http://localhost:8080" }
  $url = $url.TrimEnd("/")
  $port = "8080"
  if ($url -match "^http://localhost:(\d+)$") { $port = $Matches[1] }
  $lines = Get-Content ".env.example" | ForEach-Object {
    switch -Regex ($_) {
      "^PUBLIC_URL="  { "PUBLIC_URL=$url"; break }
      "^APP_PORT="    { "APP_PORT=$port"; break }
      "^DB_PASSWORD=" { "DB_PASSWORD=$(New-Secret 32)"; break }
      "^AUTH_SECRET=" { "AUTH_SECRET=$(New-Secret 48)"; break }
      "^CRON_SECRET=" { "CRON_SECRET=$(New-Secret 40)"; break }
      "^SETUP_CODE="  { "SETUP_CODE=$(New-Secret 12)"; break }
      default         { $_ }
    }
  }
  # UTF-8 without BOM and LF endings, so Docker reads it cleanly.
  [System.IO.File]::WriteAllText((Join-Path $PSScriptRoot ".env"), (($lines -join "`n") + "`n"), (New-Object System.Text.UTF8Encoding $false))
  Write-Host "Created .env with new secrets." -ForegroundColor Green
} else {
  Write-Host "Using the existing .env (secrets unchanged)."
}

New-Item -ItemType Directory -Force -Path "backups" | Out-Null
docker compose up -d --build
if ($LASTEXITCODE -ne 0) { Fail "Docker could not build or start the containers. Copy the messages above and send them over." }

$envMap = @{}
Get-Content ".env" | Where-Object { $_ -match "^[A-Z_]+=" } | ForEach-Object { $k, $v = $_ -split "=", 2; $envMap[$k] = $v }
$port = if ($envMap["APP_PORT"]) { $envMap["APP_PORT"] } else { "8080" }

Write-Host -NoNewline "Waiting for the app to start"
$ok = $false
for ($i = 0; $i -lt 100; $i++) {
  try {
    $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 3 "http://localhost:$port/api/health"
    if ($r.StatusCode -eq 200) { $ok = $true; break }
  } catch { }
  Write-Host -NoNewline "."
  Start-Sleep -Seconds 3
}
Write-Host ""
if (-not $ok) { Fail "Not healthy after 5 minutes. Run:  docker compose logs app   and send the output." }

Write-Host ""
Write-Host "Pulse is running." -ForegroundColor Green
Write-Host "  Open:        $($envMap['PUBLIC_URL'])/setup"
Write-Host "  Setup code:  $($envMap['SETUP_CODE'])" -ForegroundColor Yellow
Write-Host "  Backups:     .\backups (nightly)"
Start-Process "$($envMap['PUBLIC_URL'])/setup"
Read-Host "Press Enter to close"
