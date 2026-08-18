# 将已复制的 DSH 代码批量重命名为 MetaCode 命名空间
# 用法: .\scripts\rename-dsh-to-metacode.ps1 [-Root E:\project\metacode-harness]

param(
    [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$ErrorActionPreference = "Stop"

# 内容替换（顺序：更长/更具体者优先）
$contentReplacements = [ordered]@{
    '@deepseek-ai/dsh-'              = '@metacode/'
    '@deepseek-ai/dsh'               = '@metacode/cli'
    '@deepseek-ai/'                  = '@metacode/'
    'parseDshArgs'                   = 'parseMetacodeArgs'
    'DshInvocation'                  = 'MetacodeInvocation'
    'DshBundleManifest'              = 'MetacodeBundleManifest'
    'DshProfileManifest'             = 'MetacodeProfileManifest'
    'DshManifestSection'             = 'MetacodeManifestSection'
    'DSH_TELEMETRY_DISABLED'         = 'METACODE_TELEMETRY_DISABLED'
    'DSH_SNAPSHOT'                   = 'METACODE_SNAPSHOT'
    'DSH_LAUNCH_ENVIRONMENT_KEY'     = 'METACODE_LAUNCH_ENVIRONMENT_KEY'
    'DSH_BUILD_FACE'                 = 'METACODE_BUILD_FACE'
    'DSH_HOME_DIR_NAME'              = 'METACODE_HOME_DIR_NAME'
    'DEFAULT_DSH_HOME_DISPLAY'       = 'DEFAULT_METACODE_HOME_DISPLAY'
    'DSH_HOME_ENV'                   = 'METACODE_HOME_ENV'
    'DSH_HOME'                       = 'METACODE_HOME'
    'defaultDshHome'                 = 'defaultMetacodeHome'
    'resolveDshHome'                 = 'resolveMetacodeHome'
    'dshHomeDisplay'                 = 'metacodeHomeDisplay'
    'dshHomePath'                    = 'metacodeHomePath'
    'dsh.profile'                    = 'metacode.profile'
    'dsh.bundle'                     = 'metacode.bundle'
    'dsh-plugin'                     = 'metacode-plugin'
    'dsh-root'                       = 'metacode-root'
    'deepseek-harness'               = 'metacode-harness'
    'DeepSeek Harness home'          = 'MetaCode Harness home'
    'DeepSeek Harness'               = 'MetaCode Harness'
    'loadLayeredEnv(''dsh'')'        = 'loadLayeredEnv(''metacode'')'
    'loadLayeredEnv("dsh")'          = 'loadLayeredEnv("metacode")'
    '~/.dsh'                         = '~/.metacode'
    'dsh --profile'                  = 'metacode --profile'
    'dsh web'                        = 'metacode web'
    'dsh plugin'                     = 'metacode plugin'
    'dsh -h'                         = 'metacode -h'
    'dsh --help'                     = 'metacode --help'
    'dsh:'                           = 'metacode:'
    '$DSH_HOME'                      = '$METACODE_HOME'
    'dsh-base'                       = 'metacode-base'
    'dsh-web-app'                    = 'metacode-web-app'
    'dsh-headless'                   = 'metacode-headless'
    'dsh-test'                       = 'metacode-test'
    'dsh-badge'                      = 'metacode-badge'
    'The dsh-base'                   = 'The metacode-base'
    'every dsh profile'              = 'every metacode profile'
    'dsh CLI'                        = 'metacode CLI'
    'Commander adapter for the `dsh`' = 'Commander adapter for the `metacode`'
    'dsh — command-line'             = 'metacode — command-line'
    'verify-dsh-'                    = 'verify-metacode-'
    'release:dsh'                    = 'release:metacode'
    '--family dsh'                   = '--family metacode'
    'DSH_TEST_'                      = 'METACODE_TEST_'
    'dsh-test:'                      = 'metacode-test:'
    'powered by dsh'                 = 'powered by metacode'
    'ambient DSH home'               = 'ambient METACODE home'
    'github.com/deepseek-ai/'        = 'github.com/metacode-ai/'
    '.dsh'                           = '.metacode'
    '"dsh"'                          = '"metacode"'
    "'dsh'"                          = "'metacode'"
    ' name: dsh'                     = ' name: metacode'
    'const NAME = ''dsh'''           = 'const NAME = ''metacode'''
}

$textExtensions = @(
    '.ts', '.tsx', '.js', '.mjs', '.cjs', '.json', '.yaml', '.yml', '.md',
    '.toml', '.ps1', '.sh', '.mts', '.cts', '.html', '.css', '.vue'
)

# 不重写自身与 reference 快照
$skipDirs = @('node_modules', '.git', 'target', 'lib', 'dist', 'reference', '.metacode')
$skipFiles = @('rename-dsh-to-metacode.ps1')

function ShouldSkipPath([string]$path) {
    $name = Split-Path $path -Leaf
    if ($skipFiles -contains $name) { return $true }
    foreach ($skip in $skipDirs) {
        if ($path -match "[\\/]$([regex]::Escape($skip))([\\/]|$)") { return $true }
    }
    return $false
}

$files = Get-ChildItem -Path $Root -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object {
        $textExtensions -contains $_.Extension.ToLower() -and -not (ShouldSkipPath $_.FullName)
    }

$changed = 0
foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file.FullName)
    $original = $content
    foreach ($pair in $contentReplacements.GetEnumerator()) {
        $content = $content.Replace($pair.Key, $pair.Value)
    }
    if ($content -ne $original) {
        [System.IO.File]::WriteAllText($file.FullName, $content)
        $changed++
    }
}

Write-Host "content: $changed files updated under $Root"
Write-Host "rename-dsh-to-metacode done."
