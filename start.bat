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
