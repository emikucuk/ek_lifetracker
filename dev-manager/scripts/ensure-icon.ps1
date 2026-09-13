# PNG -> ICO (Windows kisayol ikonu)
$ErrorActionPreference = "Stop"

$root = Split-Path $PSScriptRoot -Parent
$nodeScript = Join-Path $root "scripts\ensure-icon.mjs"
$icoPath = Join-Path $root "assets\icon.ico"

if (-not (Test-Path $nodeScript)) {
  Write-Error "ensure-icon.mjs bulunamadi"
}

& node $nodeScript
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if (-not (Test-Path $icoPath)) {
  Write-Error "icon.ico olusturulamadi"
}

$size = (Get-Item $icoPath).Length
if ($size -lt 1024) {
  Write-Error "icon.ico gecersiz (cok kucuk: $size byte)"
}

Write-Host "Icon hazir: $icoPath ($size byte)"
