#Requires -Version 5.1
<#
.SYNOPSIS
  EK LifeTracker — yeni cihazda tek seferlik kurulum.

.DESCRIPTION
  Bağımlılıkları kurar, .env yoksa örnekten oluşturur, Prisma client + şema push yapar.
  Dev Manager (Electron) bağımlılıklarını da isteğe bağlı kurar.

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\setup-new-device.ps1
#>

$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $Root

Write-Host ""
Write-Host "=== EK LifeTracker — yeni cihaz kurulumu ===" -ForegroundColor Cyan
Write-Host "Kök: $Root"
Write-Host ""

function Assert-Command($Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "'$Name' bulunamadı. Lütfen yükleyip PATH'e ekleyin."
  }
}

Assert-Command "node"
Assert-Command "npm"

$nodeVer = node -v
Write-Host "Node: $nodeVer"
if ($nodeVer -notmatch '^v(1[8-9]|[2-9]\d)') {
  Write-Host "Uyarı: Node 18+ önerilir (şu an $nodeVer)." -ForegroundColor Yellow
}

# --- .env ---
$envPath = Join-Path $Root ".env"
$examplePath = Join-Path $Root ".env.example"
if (-not (Test-Path $envPath)) {
  if (Test-Path $examplePath) {
    Copy-Item $examplePath $envPath
    Write-Host ".env oluşturuldu (.env.example kopyası). VOICE_API_KEY ve diğerlerini düzenle." -ForegroundColor Yellow
  } else {
    throw ".env ve .env.example yok — docs/KURULUM.md'ye bak."
  }
} else {
  Write-Host ".env mevcut — dokunulmadı."
}

# --- npm workspaces ---
Write-Host ""
Write-Host "npm install (client + server)..." -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) { throw "npm install başarısız" }

# --- Prisma ---
Write-Host ""
Write-Host "Prisma generate + db push..." -ForegroundColor Cyan
npm run db:generate
if ($LASTEXITCODE -ne 0) { throw "db:generate başarısız" }
npm run db:push
if ($LASTEXITCODE -ne 0) { throw "db:push başarısız" }

# --- Klasörler ---
$backups = Join-Path $Root "backups"
if (-not (Test-Path $backups)) {
  New-Item -ItemType Directory -Path $backups | Out-Null
  Write-Host "backups/ oluşturuldu."
}

# --- Dev Manager ---
$devMgr = Join-Path $Root "dev-manager"
if (Test-Path $devMgr) {
  Write-Host ""
  Write-Host "Dev Manager bağımlılıkları..." -ForegroundColor Cyan
  npm install --prefix $devMgr
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Uyarı: dev-manager install başarısız (isteğe bağlı)." -ForegroundColor Yellow
  }
}

Write-Host ""
Write-Host "=== Kurulum tamam ===" -ForegroundColor Green
Write-Host "Sonraki adımlar:"
Write-Host "  1. .env içindeki VOICE_API_KEY / OLLAMA_MODEL değerlerini gözden geçir"
Write-Host "  2. Eski cihazdan veri taşıyacaksan docs/KURULUM.md → 'Veri taşıma'"
Write-Host "  3. Başlat:  npm run dev"
Write-Host "     veya:   npm run dev-panel"
Write-Host "  4. Panel: http://localhost:5181  ·  API: http://localhost:3081"
Write-Host "  5. Ayarlar → E-posta / Parser / Yedek panellerini yapılandır"
Write-Host ""
