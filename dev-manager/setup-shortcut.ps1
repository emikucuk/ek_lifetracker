# UTF-8
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Windows.Forms

$scriptDir = $PSScriptRoot
$electronExe = Join-Path $scriptDir "node_modules\electron\dist\electron.exe"
$iconIco = Join-Path $scriptDir "assets\icon.ico"
$iconPng = Join-Path $scriptDir "assets\icon.png"
$shortcutName = "EK LifeTracker Dev Panel.lnk"

function Ensure-AppIcon {
  $ensureScript = Join-Path $scriptDir "scripts\ensure-icon.ps1"
  if (Test-Path $ensureScript) {
    & $ensureScript
    if ($LASTEXITCODE -ne 0) { throw "Icon olusturulamadi." }
  }
}

function Test-ElectronReady {
  if (Test-Path $electronExe) { return $true }

  $answer = [System.Windows.MessageBox]::Show(
    "Electron henuz kurulu degil.`n`nSimdi npm install calistirilsin mi?",
    "EK Dev Panel Kurulum",
    [System.Windows.Forms.MessageBoxButtons]::YesNo,
    [System.Windows.Forms.MessageBoxIcon]::Question
  )

  if ($answer -ne [System.Windows.Forms.DialogResult]::Yes) { return $false }

  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = "cmd.exe"
  $psi.Arguments = "/c npm install"
  $psi.WorkingDirectory = $scriptDir
  $psi.UseShellExecute = $true
  $proc = [System.Diagnostics.Process]::Start($psi)
  $proc.WaitForExit()

  return (Test-Path $electronExe)
}

if (-not (Test-ElectronReady)) {
  [System.Windows.MessageBox]::Show(
    "Electron bulunamadi.`n`ndev-manager klasorunde npm install calistirin.",
    "EK Dev Panel Kurulum",
    [System.Windows.Forms.MessageBoxButtons]::OK,
    [System.Windows.Forms.MessageBoxIcon]::Error
  ) | Out-Null
  exit 1
}

Ensure-AppIcon

$form = New-Object System.Windows.Forms.Form
$form.Text = "EK LifeTracker Dev Panel — Kısayol"
$form.Size = New-Object System.Drawing.Size(420, 260)
$form.StartPosition = "CenterScreen"
$form.FormBorderStyle = "FixedDialog"
$form.MaximizeBox = $false
$form.MinimizeBox = $false
$form.TopMost = $true
$form.Font = New-Object System.Drawing.Font("Segoe UI", 9)

$label = New-Object System.Windows.Forms.Label
$label.Location = New-Object System.Drawing.Point(16, 16)
$label.Size = New-Object System.Drawing.Size(380, 48)
$label.Text = "Kısayolun oluşturulacağı konumu seçin. Hızlı seçim veya özel klasör kullanabilirsiniz."

$btnDesktop = New-Object System.Windows.Forms.Button
$btnDesktop.Location = New-Object System.Drawing.Point(16, 72)
$btnDesktop.Size = New-Object System.Drawing.Size(180, 36)
$btnDesktop.Text = "Masaüstü"

$btnStartMenu = New-Object System.Windows.Forms.Button
$btnStartMenu.Location = New-Object System.Drawing.Point(210, 72)
$btnStartMenu.Size = New-Object System.Drawing.Size(180, 36)
$btnStartMenu.Text = "Başlat menüsü"

$btnBrowse = New-Object System.Windows.Forms.Button
$btnBrowse.Location = New-Object System.Drawing.Point(16, 120)
$btnBrowse.Size = New-Object System.Drawing.Size(374, 36)
$btnBrowse.Text = "Özel klasör seç..."

$status = New-Object System.Windows.Forms.Label
$status.Location = New-Object System.Drawing.Point(16, 168)
$status.Size = New-Object System.Drawing.Size(374, 48)
$status.ForeColor = [System.Drawing.Color]::DarkGreen

$form.Controls.AddRange(@($label, $btnDesktop, $btnStartMenu, $btnBrowse, $status))

function New-DevPanelShortcut {
  param([string]$TargetFolder)

  if (-not (Test-Path $TargetFolder)) {
    New-Item -ItemType Directory -Path $TargetFolder -Force | Out-Null
  }

  $shortcutPath = Join-Path $TargetFolder $shortcutName
  $shell = New-Object -ComObject WScript.Shell
  $link = $shell.CreateShortcut($shortcutPath)
  $link.TargetPath = (Resolve-Path $electronExe).Path
  $link.Arguments = "."
  $link.WorkingDirectory = (Resolve-Path $scriptDir).Path
  $link.WindowStyle = 1
  $link.Description = "EK LifeTracker geliştirme paneli (start/stop, loglar, port durumu)"

  if (Test-Path $iconIco) {
    $iconFull = (Resolve-Path $iconIco).Path
    $link.IconLocation = "$iconFull,0"
  } else {
    $link.IconLocation = "$((Resolve-Path $electronExe).Path),0"
  }

  $link.Save()

  if (-not (Test-Path $shortcutPath)) {
    throw "Kısayol oluşturulamadı: $shortcutPath"
  }

  return $shortcutPath
}

function Show-Success {
  param([string]$Path)

  $status.Text = "Oluşturuldu:`n$Path"
  [System.Windows.MessageBox]::Show(
    "Kısayol başarıyla oluşturuldu:`n`n$Path",
    "EK Dev Panel Kurulum",
    [System.Windows.Forms.MessageBoxButtons]::OK,
    [System.Windows.Forms.MessageBoxIcon]::Information
  ) | Out-Null
}

function Show-Error {
  param([string]$Message)
  $status.ForeColor = [System.Drawing.Color]::DarkRed
  $status.Text = $Message
  [System.Windows.MessageBox]::Show(
    $Message,
    "EK Dev Panel Kurulum",
    [System.Windows.Forms.MessageBoxButtons]::OK,
    [System.Windows.Forms.MessageBoxIcon]::Error
  ) | Out-Null
}

$btnDesktop.Add_Click({
  try {
    $desktop = [Environment]::GetFolderPath("Desktop")
    $path = New-DevPanelShortcut -TargetFolder $desktop
    Show-Success -Path $path
  } catch {
    Show-Error -Message $_.Exception.Message
  }
})

$btnStartMenu.Add_Click({
  try {
    $startMenu = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs"
    $path = New-DevPanelShortcut -TargetFolder $startMenu
    Show-Success -Path $path
  } catch {
    Show-Error -Message $_.Exception.Message
  }
})

$btnBrowse.Add_Click({
  $dialog = New-Object System.Windows.Forms.FolderBrowserDialog
  $dialog.Description = "Kısayolun oluşturulacağı klasörü seçin"
  $dialog.ShowNewFolderButton = $true

  if ($dialog.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) { return }

  try {
    $path = New-DevPanelShortcut -TargetFolder $dialog.SelectedPath
    Show-Success -Path $path
  } catch {
    Show-Error -Message $_.Exception.Message
  }
})

[void]$form.ShowDialog()
