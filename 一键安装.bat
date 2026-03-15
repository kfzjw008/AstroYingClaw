@echo off
REM ======================================================================
REM 天文教学自动化系统 - 一键安装脚本 (Windows)
REM ======================================================================

echo.
echo ======================================
echo   天文教学自动化系统 - 一键安装
echo ======================================
echo.
echo 此脚本将自动完成以下操作：
echo   1. 检查系统环境
echo   2. 配置OpenClaw插件
echo   3. 创建必要目录
echo   4. 复制示例文件
echo   5. 验证安装
echo.
echo 按任意键继续，或按Ctrl+C取消...
pause > nul

REM ======================================================================
echo.
echo [1/6] 检查OpenClaw安装...
echo.

where openclaw >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 未找到OpenClaw CLI
    echo 请先安装OpenClaw: https://docs.openclaw.ai
    pause
    exit /b 1
)
echo [OK] OpenClaw已安装

REM ======================================================================
echo.
echo [2/6] 配置插件...
echo.

REM 读取当前配置
for /f "tokens=*" %%i in ('openclaw config get plugins 2^>nul') do set CONFIG=%%i

REM 添加插件到信任列表
echo 添加插件到信任列表...
openclaw config set plugins.allow '["astro-teach"]' 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] 已添加到信任列表
) else (
    echo [警告] 无法修改信任列表，可能已存在
)

REM 启用插件
echo 启用天文教学插件...
openclaw config set plugins.entries.astro-teach.enabled true 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] 插件已启用
) else (
    echo [警告] 插件可能已启用
)

REM ======================================================================
echo.
echo [3/6] 创建工作目录...
echo.

REM 创建OpenClaw工作目录中的文件夹
set WORKDIR=%USERPROFILE%\.openclaw\workspace

if not exist "%WORKDIR%\pipelines" (
    mkdir "%WORKDIR%\pipelines"
    echo [OK] 创建 pipelines 目录
) else (
    echo [跳过] pipelines 目录已存在
)

if not exist "%WORKDIR%\audio" (
    mkdir "%WORKDIR%\audio"
    echo [OK] 创建 audio 目录
) else (
    echo [跳过] audio 目录已存在
)

if not exist "%WORKDIR%\data" (
    mkdir "%WORKDIR%\data"
    echo [OK] 创建 data 目录
) else (
    echo [跳过] data 目录已存在
)

REM ======================================================================
echo.
echo [4/6] 复制示例文件...
echo.

set SCRIPTDIR=%~dp0
set EXAMPLEDIR=%SCRIPTDIR%extensions\astro-teach\examples

REM 复制流水线文件
if exist "%EXAMPLEDIR%\pipelines\*.yaml" (
    copy /Y "%EXAMPLEDIR%\pipelines\*.yaml" "%WORKDIR%\pipelines\" >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo [OK] 流水线文件已复制
    ) else (
        echo [警告] 流水线文件复制失败
    )
) else (
    echo [警告] 未找到示例流水线文件
)

REM 复制数据文件
if exist "%EXAMPLEDIR%\data\*.json" (
    copy /Y "%EXAMPLEDIR%\data\*.json" "%WORKDIR%\data\" >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo [OK] 数据文件已复制
    ) else (
        echo [警告] 数据文件复制失败
    )
) else (
    echo [警告] 未找到示例数据文件
)

REM ======================================================================
echo.
echo [5/6] 复制源代码到OpenClaw扩展目录...
echo.

set TARGETDIR=%USERPROFILE%\.openclaw\extensions\astro-teach

if not exist "%TARGETDIR%" (
    mkdir "%TARGETDIR%"
    echo [OK] 创建插件目录
)

REM 复制插件文件
if exist "%SCRIPTDIR%extensions\astro-teach\index.ts" (
    xcopy /E /I /Y "%SCRIPTDIR%extensions\astro-teach\*" "%TARGETDIR%\" >nul 2>&1
    echo [OK] 插件文件已复制
) else (
    echo [警告] 插件源文件不在预期位置
)

REM ======================================================================
echo.
echo [6/6] 验证安装...
echo.

echo 正在检查插件状态...
openclaw plugins list 2>nul | findstr /C:"astro" >nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] 插件已加载
) else (
    echo [警告] 插件可能未加载，请重启OpenClaw
)

echo 正在检查流水线...
openclaw astro list 2>nul | findstr /C:"lesson" >nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] 流水线文件已配置
) else (
    echo [提示] 流水线文件可能未就绪，请手动检查
)

REM ======================================================================
echo.
echo ======================================
echo   安装完成！
echo ======================================
echo.
echo 下一步：
echo   1. 准备音频文件放入: %WORKDIR%\audio\
echo   2. 连接天文指星仪到串口
echo   3. 运行测试: openclaw astro serial
echo   4. 开始使用: openclaw astro start lesson-01-summer-stars
echo.
echo 完整文档：
echo   - 一键安装指南.md
echo   - AI课程制作指南.md
echo   - extensions\astro-teach\README.md
echo.
echo 按任意键退出...
pause > nul
