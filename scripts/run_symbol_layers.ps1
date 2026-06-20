$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$scriptPath = Join-Path $PSScriptRoot "split_symbol_layers.py"
$defaultArgs = @(
  "--contact-sheet",
  "src\assets\baboon_bonus\symbols_updated_cut\layered_symbol_fg_contact.png"
)
$scriptArgs = if ($args.Count -gt 0) { $args } else { $defaultArgs }

$bundledPython = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
if (Test-Path $bundledPython) {
  Push-Location $projectRoot
  try {
    & $bundledPython $scriptPath @scriptArgs
  } finally {
    Pop-Location
  }
  exit $LASTEXITCODE
}

$python = Get-Command python -ErrorAction SilentlyContinue
if ($python) {
  Push-Location $projectRoot
  try {
    & $python.Source $scriptPath @scriptArgs
  } finally {
    Pop-Location
  }
  exit $LASTEXITCODE
}

$py = Get-Command py -ErrorAction SilentlyContinue
if ($py) {
  Push-Location $projectRoot
  try {
    & $py.Source -3 $scriptPath @scriptArgs
  } finally {
    Pop-Location
  }
  exit $LASTEXITCODE
}

throw "Python was not found. Install Python with Pillow and NumPy, or run inside Codex where the bundled runtime is available."
