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

Invoke-Step "Executando testes unitários" {
  npm run test:unit
}

if (-not $SkipBrowsers) {
  Invoke-Step "Garantindo navegador do Playwright" {
    npm run test:browsers
  }
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
