@echo off
REM 一键安装 mattpocock/skills 到当前目录的 .claude-plugin 文件夹
REM 用法：双击运行，或在 PowerShell/cmd 中执行 .\install.cmd

setlocal

set TARGET=%~dp0
set TARGET_DIR=%TARGET%.claude-plugin

if exist "%TARGET_DIR%\.git" (
    echo [install] %TARGET_DIR% 已是 git 仓库，跳过克隆。
    goto :pull
)

if exist "%TARGET_DIR%" (
    echo [install] 警告：%TARGET_DIR% 已存在但不是 git 仓库。
    echo [install] 把它备份为 .claude-plugin.bak 后再继续？
    set /p ANSWER=输入 y 继续，其他键取消：
    if /i not "%ANSWER%"=="y" goto :end
    move "%TARGET_DIR%" "%TARGET_DIR%.bak.%RANDOM%"
)

echo [install] 正在克隆 mattpocock/skills 到 %TARGET_DIR% ...
git clone --depth 1 https://github.com/mattpocock/skills.git "%TARGET_DIR%"
if errorlevel 1 (
    echo [install] 克隆失败。请检查：
    echo   1. 是否能访问 github.com
    echo   2. git 是否已安装并在 PATH
    echo   3. 是否需要配置代理或 token
    goto :end
)

:pull
echo [install] 正在拉取最新代码 ...
git -C "%TARGET_DIR%" pull --ff-only
if errorlevel 1 (
    echo [install] 拉取失败。已安装的版本仍可使用。
)

echo.
echo [install] 完成。目录：%TARGET_DIR%
echo [install] 在 Claude Code 中启用：
echo   /plugin marketplace add %TARGET_DIR%
echo   /plugin install mattpocock-skills@mattpocock
echo [install] 在 Cursor / Codex 中启用：
echo   直接引用 SKILL.md 即可（参考 %TARGET_DIR%\README.md）

:end
endlocal
pause
