# 从 MetaCode Harness 同步代码并重命名为 MetaCode
# 用法:
#   .\scripts\migrate-from-dsh.ps1
#   .\scripts\migrate-from-dsh.ps1 -Source D:\opensource\metacode-harness -Dest E:\project\metacode-harness

param(
    [string]$Source = "D:\opensource\metacode-harness",
    [string]$Dest = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $Source)) {
    Write-Error "Source not found: $Source"
}

$dirs = @("vendor", "apps", "packages", "native", "examples", "python", "website", ".github", ".agents", "patches", "scripts")
foreach ($d in $dirs) {
    $from = Join-Path $Source $d
    if (-not (Test-Path $from)) { continue }
    $to = Join-Path $Dest $d
    robocopy $from $to /E /NFL /NDL /NJH /NJS /nc /ns /np /XD node_modules .git target lib dist /XF *.lock 2>&1 | Out-Null
    Write-Host "synced: $d"
}

$rootFiles = @(
    "package.json", "pnpm-workspace.yaml",
    "tsconfig.host.json", "tsconfig.client.json", "tsconfig.json",
    "tsdown.config.ts", "vitest.config.ts", "LICENSE"
)
foreach ($f in $rootFiles) {
    $from = Join-Path $Source $f
    if (Test-Path $from) {
        Copy-Item $from (Join-Path $Dest $f) -Force
        Write-Host "synced: $f"
    }
}

& (Join-Path $PSScriptRoot "rename-dsh-to-metacode.ps1") -Root $Dest

Write-Host "migrate-from-dsh complete -> $Dest"
