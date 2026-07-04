@echo off
:: set-sentry-dsn.bat
:: Usage: set-sentry-dsn.bat <YOUR_SENTRY_DSN>
::
:: Replaces the YOUR_SENTRY_DSN placeholder in all HTML files.
:: Get your DSN from: sentry.io → Project → Settings → Client Keys (DSN)
::
:: Example:
::   set-sentry-dsn.bat https://abc123@o000000.ingest.sentry.io/0000000

setlocal enabledelayedexpansion

if "%~1"=="" (
  echo.
  echo  ERROR: No DSN provided.
  echo.
  echo  Usage: set-sentry-dsn.bat ^<YOUR_SENTRY_DSN^>
  echo  Example: set-sentry-dsn.bat https://abc123@o000000.ingest.sentry.io/0000000
  echo.
  echo  Get your DSN from: sentry.io -^> Project -^> Settings -^> Client Keys
  echo.
  pause
  exit /b 1
)

set "DSN=%~1"
set "DIR=%~dp0"

echo.
echo  Replacing YOUR_SENTRY_DSN with:
echo  %DSN%
echo.

:: Use PowerShell for reliable string replacement in large HTML files
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$dsn = '%DSN%'; " ^
  "$files = @('index.html','landing.html','account.html','legal.html'); " ^
  "foreach ($f in $files) { " ^
    "$path = '%DIR%' + $f; " ^
    "if (Test-Path $path) { " ^
      "$content = Get-Content $path -Raw -Encoding UTF8; " ^
      "$count = ([regex]::Matches($content, 'YOUR_SENTRY_DSN')).Count; " ^
      "if ($count -gt 0) { " ^
        "$content = $content -replace 'YOUR_SENTRY_DSN', $dsn; " ^
        "Set-Content $path -Value $content -Encoding UTF8 -NoNewline; " ^
        "Write-Host ('  [OK] ' + $f + ' — replaced ' + $count + ' occurrence(s)'); " ^
      "} else { " ^
        "Write-Host ('  [--] ' + $f + ' — placeholder not found (already set?)'); " ^
      "} " ^
    "} else { " ^
      "Write-Host ('  [!!] ' + $f + ' — file not found, skipped'); " ^
    "} " ^
  "}"

echo.
echo  Done. Commit and push to deploy.
echo  (push.bat will handle the git push)
echo.
pause
