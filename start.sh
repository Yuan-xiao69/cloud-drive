#!/bin/bash
# 启动脚本

# 安装依赖
npm install

# 生成 Prisma Client
npx prisma generate

# 推送数据库结构
npx prisma db push

echo "启动开发服务器..."
npm run dev
