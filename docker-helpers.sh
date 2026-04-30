#!/bin/bash

echo "========================================"
echo "  My Blog Docker 开发环境"
echo "========================================"
echo ""
echo "[1] 启动开发环境"
echo "[2] 停止所有容器"
echo "[3] 查看日志"
echo "[4] 重新构建并启动"
echo "[5] 初始化数据库"
echo "[6] 进入容器终端"
echo "[0] 退出"
echo ""

read -p "请选择操作 (0-6): " choice

case $choice in
  1)
    echo ""
    echo "正在启动 Docker 开发环境..."
    docker-compose -f docker-compose.dev.yml up -d
    echo ""
    echo "启动成功！访问 http://localhost:3000"
    ;;
  2)
    echo ""
    echo "正在停止容器..."
    docker-compose -f docker-compose.dev.yml down
    echo ""
    echo "已停止所有容器"
    ;;
  3)
    echo ""
    echo "按 Ctrl+C 退出日志查看"
    docker-compose -f docker-compose.dev.yml logs -f
    ;;
  4)
    echo ""
    echo "重新构建并启动..."
    docker-compose -f docker-compose.dev.yml down
    docker-compose -f docker-compose.dev.yml build --no-cache
    docker-compose -f docker-compose.dev.yml up -d
    echo ""
    echo "重建完成！"
    ;;
  5)
    echo ""
    echo "初始化数据库..."
    docker-compose -f docker-compose.dev.yml exec app npx prisma db push
    echo ""
    echo "数据库初始化完成！"
    ;;
  6)
    echo ""
    echo "进入容器终端..."
    docker-compose -f docker-compose.dev.yml exec app bash
    ;;
  0)
    exit 0
    ;;
esac
