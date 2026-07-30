@echo off
chcp 65001 >nul
title 餐饮点餐系统
echo ========================================
echo   餐饮点餐系统 启动中...
echo ========================================
echo.

:: 启动后端服务
echo [1/2] 启动后端服务...
cd /d "%~dp0server"
start "点餐系统-后端服务" cmd /c "node src/app.js"

:: 等待服务启动
timeout /t 2 /nobreak >nul

:: 启动桌面端（开发模式）
echo [2/2] 启动桌面端...
cd /d "%~dp0desktop"
if exist "node_modules" (
    start "点餐系统-桌面端" cmd /c "npx vite --port 5174"
    timeout /t 3 /nobreak >nul
    start "" cmd /c "npx electron ."
) else (
    echo [提示] 桌面端依赖未安装，请先执行: cd desktop ^&^& npm install
    echo [提示] 当前仅启动后端服务，可通过浏览器访问:
    echo        管理后台: http://localhost:3000/admin
    echo        后厨端:   http://localhost:3000/kitchen
)

echo.
echo ========================================
echo   系统已启动！
echo   后端服务: http://localhost:3000
echo   顾客点餐: http://局域网IP:3000/c/menu?table=A01
echo   服务员端: 安装APK后配置服务器地址
echo ========================================
echo.
pause
@echo off
chcp 65001 >nul
title 点餐系统服务
echo ========================================
echo   局域网扫码点餐系统 启动中...
echo ========================================
echo.

cd /d "%~dp0server"
node src/app.js

pause
