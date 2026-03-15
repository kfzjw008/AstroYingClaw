@echo off
REM Astro Teach Automation System - Installation Verification Script (Windows)

echo Astro Teach Automation System - Installation Verification
echo ======================================
echo.

echo 1. Checking Node.js...
where node >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
    echo [OK] Node.js installed (%NODE_VERSION%)
) else (
    echo [ERROR] Node.js not found
    exit /b 1
)

echo.
echo 2. Checking npm...
where npm >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=*" %%i in ('npm -v') do set NPM_VERSION=%%i
    echo [OK] npm installed (%NPM_VERSION%)
) else (
    echo [ERROR] npm not found
    exit /b 1
)

echo.
echo 3. Checking plugin files...
if exist "openclaw.plugin.json" (
    echo [OK] openclaw.plugin.json
) else (
    echo [ERROR] openclaw.plugin.json
)

if exist "package.json" (
    echo [OK] package.json
) else (
    echo [ERROR] package.json
)

if exist "index.ts" (
    echo [OK] index.ts
) else (
    echo [ERROR] index.ts
)

if exist "config.ts" (
    echo [OK] config.ts
) else (
    echo [ERROR] config.ts
)

if exist "types.ts" (
    echo [OK] types.ts
) else (
    echo [ERROR] types.ts
)

echo.
echo 4. Checking tool modules...
if exist "tools\serial_control.ts" (
    echo [OK] tools\serial_control.ts
) else (
    echo [ERROR] tools\serial_control.ts
)

if exist "tools\audio_play.ts" (
    echo [OK] tools\audio_play.ts
) else (
    echo [ERROR] tools\audio_play.ts
)

if exist "tools\pipeline_parser.ts" (
    echo [OK] tools\pipeline_parser.ts
) else (
    echo [ERROR] tools\pipeline_parser.ts
)

if exist "tools\astro_lookup.ts" (
    echo [OK] tools\astro_lookup.ts
) else (
    echo [ERROR] tools\astro_lookup.ts
)

echo.
echo 5. Checking service modules...
if exist "services\pipeline_executor.ts" (
    echo [OK] services\pipeline_executor.ts
) else (
    echo [ERROR] services\pipeline_executor.ts
)

echo.
echo 6. Checking skill files...
if exist "skills\astro-teacher\SKILL.md" (
    echo [OK] skills\astro-teacher\SKILL.md
) else (
    echo [ERROR] skills\astro-teacher\SKILL.md
)

echo.
echo 7. Checking example files...
if exist "examples\pipelines\lesson-01-summer-stars.yaml" (
    echo [OK] examples\pipelines\lesson-01-summer-stars.yaml
) else (
    echo [ERROR] examples\pipelines\lesson-01-summer-stars.yaml
)

if exist "examples\data\celestial_mapping.json" (
    echo [OK] examples\data\celestial_mapping.json
) else (
    echo [ERROR] examples\data\celestial_mapping.json
)

echo.
echo 8. Checking documentation...
if exist "README.md" (
    echo [OK] README.md
) else (
    echo [ERROR] README.md
)

if exist "QUICKSTART.md" (
    echo [OK] QUICKSTART.md
) else (
    echo [ERROR] QUICKSTART.md
)

if exist "INSTALL.md" (
    echo [OK] INSTALL.md
) else (
    echo [ERROR] INSTALL.md
)

echo.
echo ======================================
echo Verification Complete!
echo.
echo Next steps:
echo 1. Fix any errors shown above
echo 2. Run npm install to install dependencies
echo 3. Copy plugin to OpenClaw extensions directory
echo 4. Configure and restart OpenClaw
echo.
echo See README.md and QUICKSTART.md for details
pause
