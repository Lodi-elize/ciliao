param(
    [switch]$SkipTests
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$serverDir = Join-Path $repoRoot "apps\server"
$uploadDir = Join-Path $repoRoot "deploy\server-upload\ciliao-server-docker"
$jarName = "server-1.0.0.jar"
$sourceJar = Join-Path $serverDir "target\$jarName"

Write-Host "==> Build backend jar" -ForegroundColor Cyan
Push-Location $serverDir
try {
    $args = @("clean", "package")
    if ($SkipTests) {
        $args += "-DskipTests"
    }
    & ".\mvnw.cmd" @args
} finally {
    Pop-Location
}

if (-not (Test-Path -LiteralPath $sourceJar)) {
    throw "Jar not found: $sourceJar"
}

Write-Host "==> Refresh upload folder" -ForegroundColor Cyan
$uploadServerDir = Join-Path $uploadDir "apps\server"
$uploadTargetDir = Join-Path $uploadServerDir "target"
$uploadDeployDir = Join-Path $uploadDir "deploy\server"

New-Item -ItemType Directory -Force -Path $uploadTargetDir | Out-Null
New-Item -ItemType Directory -Force -Path $uploadDeployDir | Out-Null

Copy-Item -LiteralPath (Join-Path $serverDir "Dockerfile") -Destination (Join-Path $uploadServerDir "Dockerfile") -Force
Copy-Item -LiteralPath (Join-Path $serverDir ".dockerignore") -Destination (Join-Path $uploadServerDir ".dockerignore") -Force
Copy-Item -LiteralPath $sourceJar -Destination (Join-Path $uploadTargetDir $jarName) -Force
Copy-Item -LiteralPath (Join-Path $repoRoot "deploy\server\docker-compose.yml") -Destination (Join-Path $uploadDeployDir "docker-compose.yml") -Force
Copy-Item -LiteralPath (Join-Path $repoRoot "deploy\server\.env.example") -Destination (Join-Path $uploadDeployDir ".env.example") -Force
Copy-Item -LiteralPath (Join-Path $repoRoot "deploy\server\README.md") -Destination (Join-Path $uploadDeployDir "README.md") -Force

Write-Host ""
Write-Host "Upload folder ready:" -ForegroundColor Green
Write-Host $uploadDir
Write-Host ""
Write-Host "Fast server update:"
Write-Host "1. Upload this jar to /opt/ciliao/apps/server/target/$jarName"
Write-Host "2. Run: cd /opt/ciliao/deploy/server && docker compose restart ciliao-server"
