# Restore Git after .git corruption (run in PowerShell, not CMD)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$remoteUrl = 'https://github.com/ramjananshari241/v2-test.git'
$repairedGit = Join-Path $projectRoot '.git-repaired'
$brokenGit = Join-Path $projectRoot '.git'
$backupGit = Join-Path $projectRoot '.git.broken'
$tempClone = Join-Path $env:TEMP ('v2-test-git-restore-' + [guid]::NewGuid().ToString('N'))

Write-Host "Project: $projectRoot"

function Restore-FromRemote {
  Write-Host "Cloning fresh .git from $remoteUrl ..."
  git clone $remoteUrl $tempClone
  if (Test-Path $brokenGit) {
    if (Test-Path $backupGit) { Remove-Item $backupGit -Recurse -Force }
    Rename-Item $brokenGit '.git.broken' -Force
  }
  Copy-Item (Join-Path $tempClone '.git') $brokenGit -Recurse -Force
  Remove-Item $tempClone -Recurse -Force
  Set-Location $projectRoot
  git status
  Write-Host 'Done. Review changes, then commit and push.'
}

if (Test-Path $repairedGit) {
  Write-Host 'Found .git-repaired; swapping into place ...'
  if (Test-Path $brokenGit) {
    cmd /c "rd /s /q \\?\$brokenGit" 2>$null
    if (Test-Path $brokenGit) {
      if (Test-Path $backupGit) { Remove-Item $backupGit -Recurse -Force }
      Rename-Item $brokenGit '.git.broken' -Force
      Write-Warning 'Could not delete .git. Renamed to .git.broken. Close Cursor and run again.'
      exit 1
    }
  }
  Rename-Item $repairedGit '.git'
  Set-Location $projectRoot
  git status
  Write-Host 'Done.'
  exit 0
}

if (Test-Path $brokenGit) {
  $status = git -C $projectRoot status 2>&1
  if ($LASTEXITCODE -eq 0) {
    Write-Host '.git already works:'
    git -C $projectRoot status
    exit 0
  }
  Write-Host 'Broken .git detected; replacing from remote ...'
  Restore-FromRemote
  exit 0
}

Write-Host 'No .git found; restoring from remote ...'
Restore-FromRemote
