@echo off
chcp 65001 >nul
echo ========================================
echo   My Blog Docker 开发环境
echo ========================================
echo.
echo [1] 启动开发环境
echo [2] 停止所有容器
echo [3] 查看日志
echo [4] 重新构建并启动
echo [5] 初始化数据库
echo [6] 进入容器终端
echo [0] 退出
echo.

set /p choice=请选择操作 (0-6):

if "%choice%"=="1" goto start
if "%choice%"=="2" goto stop
if "%choice%"=="3" goto logs
if "%choice%"=="4" goto rebuild
if "%choice%"=="5" goto dbinit
if "%choice%"=="6" goto terminal
if "%choice%"=="0" goto end

:start
echo.
echo 正在启动 Docker 开发环境...
docker-compose -f docker-compose.dev.yml up -d
echo.
echo 启动成功！访问 http://localhost:3000
echo.
pause
goto end

:stop
echo.
echo 正在停止容器...
docker-compose -f docker-compose.dev.yml down
echo.
echo 已停止所有容器
pause
goto end

:logs
echo.
echo 按 Ctrl+C 退出日志查看
docker-compose -f docker-compose.dev.yml logs -f
goto end

:rebuild
echo.
echo 重新构建并启动...
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml build --no-cache
docker-compose -f docker-compose.dev.yml up -d
echo.
echo 重建完成！
pause
goto end

:dbinit
echo.
echo 初始化数据库...
docker-compose -f docker-compose.dev.yml exec app npx prisma db push
docker-compose -f docker-compose.dev.yml exec app npx prisma db push
echo.
echo 数据库初始化完成！
pause
goto end

:terminal
echo.
echo 进入容器终端...
docker-compose -f docker-compose.dev.yml exec app bash
goto end

:end
