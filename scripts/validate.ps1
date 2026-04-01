param(
  [switch]$SkipInstall,
  [switch]$SkipBrowsers,
  [switch]$SkipAndroid,
  [switch]$Headed,
  [switch]$UpdateSnapshots
)

$ErrorActionPreference = "Stop"
if ($PSVersionTable.PSVersion.Major -ge 7) {
  $PSNativeCommandUseErrorActionPreference = $true
}

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot
$testPort = if ($env:ARALEARN_TEST_PORT) { [int]$env:ARALEARN_TEST_PORT } else { 4273 }
$expectedHealthBody = "aralearn-test-server"

function Test-ServerHealth {
  param(
    [int]$Port = $testPort
  )

  try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/healthz" -UseBasicParsing -TimeoutSec 2
    return $response.StatusCode -eq 200 -and $response.Content.Trim() -eq $expectedHealthBody
  } catch {
    return $false
  }
}

function Wait-ServerHealth {
  param(
    [int]$Port = $testPort,
    [int]$TimeoutSeconds = 20
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-ServerHealth -Port $Port) {
      return $true
    }
    Start-Sleep -Milliseconds 250
  }

  throw "O servidor de testes não respondeu em http://127.0.0.1:$Port/healthz dentro de $TimeoutSeconds segundos."
}

function Invoke-Step {
  param(
    [string]$Title,
    [scriptblock]$Command
  )

  Write-Host ""
  Write-Host "==> $Title"
  $global:LASTEXITCODE = 0
  & $Command
  if ($LASTEXITCODE -ne 0) {
    throw "A etapa '$Title' falhou com código $LASTEXITCODE."
  }
}

if (-not $SkipInstall) {
  Invoke-Step "Instalando dependências npm" {
    if (Test-Path "package-lock.json") {
      npm ci
    } else {
      npm install
    }
  }
}

Invoke-Step "Gerando runtime do hardcoded" {
  npm run build:hardcoded-content
}

Invoke-Step "Auditando conteúdo embarcado" {
  node ./scripts/audit-course-content.mjs
}

Invoke-Step "Executando testes unitários" {
  npm run test:unit
}

if (-not $SkipBrowsers) {
  Invoke-Step "Garantindo navegador do Playwright" {
    npm run test:browsers
  }
}

$managedServer = $null
$reusedServer = $false
try {
  if (Test-ServerHealth) {
    $reusedServer = $true
  } else {
    $env:ARALEARN_TEST_PORT = "$testPort"
    $managedServer = Start-Process node -ArgumentList "scripts/test-server.mjs" -WorkingDirectory $projectRoot -PassThru -WindowStyle Hidden
    Wait-ServerHealth
  }

  Invoke-Step "Executando testes E2E" {
    if ($Headed) {
      npm run test:e2e:headed
    } elseif ($UpdateSnapshots) {
      npx playwright test --update-snapshots
    } else {
      npm run test:e2e
    }
  }
} finally {
  if ($managedServer -and -not $managedServer.HasExited) {
    Stop-Process -Id $managedServer.Id -Force
  }
}

if (-not $SkipAndroid) {
  Invoke-Step "Gerando APK debug" {
    if (-not $env:ANDROID_SDK_ROOT) {
      $defaultSdk = Join-Path $env:LOCALAPPDATA "Android\Sdk"
      if (Test-Path $defaultSdk) {
        $env:ANDROID_SDK_ROOT = $defaultSdk
        $env:ANDROID_HOME = $defaultSdk
      }
    }

    Push-Location "android"
    try {
      .\gradlew.bat :app:assembleDebug --no-daemon
    } finally {
      Pop-Location
    }
  }
}

Write-Host ""
Write-Host "Validação concluída com sucesso."
