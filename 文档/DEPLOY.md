# 部署指南

> 本文档详细介绍 GitHub Platform 的部署方式，包括开发环境、测试环境和生产环境。

---

## 目录

- [环境要求](#环境要求)
- [开发环境部署](#开发环境部署)
- [生产环境部署](#生产环境部署)
- [Docker 部署详解](#docker-部署详解)
- [手动部署](#手动部署)
- [配置说明](#配置说明)
- [常见问题](#常见问题)

---

## 环境要求

### 最低要求

| 组件 | 最低配置 | 推荐配置 |
|------|---------|---------|
| CPU | 2 核 | 4 核 |
| 内存 | 4 GB | 8 GB |
| 磁盘 | 20 GB | 50 GB SSD |
| Docker | 20.10+ | 最新版 |

### 依赖服务

| 服务 | 版本 | 说明 |
|------|------|------|
| PostgreSQL | 14+ | 数据库 |
| Redis | 6+ | 缓存/速率限制（可选） |
| MinIO | 2023+ | S3 兼容对象存储 |

---

## 开发环境部署

### 快速开始

```bash
# 1. 克隆项目
git clone <repository-url>
cd my-blog

# 2. 启动开发环境
docker-compose -f docker-compose.dev.yml up -d

# 3. 等待服务启动
docker-compose logs -f

# 4. 初始化数据库
docker-compose -f docker-compose.dev.yml exec app npx prisma db push

# 5. 初始化种子数据 (可选)
docker-compose -f docker-compose.dev.yml exec app npx prisma db seed
```

### 访问服务

| 服务 | 地址 | 说明 |
|------|------|------|
| 应用 | http://localhost:3000 | 主应用 |
| API 文档 | http://localhost:3000/api/docs | Swagger |
| MinIO Console | http://localhost:9001 | 对象存储 |

### 开发命令

```bash
# 进入应用容器
docker-compose -f docker-compose.dev.yml exec app bash

# 查看应用日志
docker-compose -f docker-compose.dev.yml logs -f app

# 重启应用
docker-compose -f docker-compose.dev.yml restart app

# 重新构建
docker-compose -f docker-compose.dev.yml build --no-cache app
docker-compose -f docker-compose.dev.yml up -d
```

---

## 生产环境部署

### 方式一：Docker Compose (推荐)

```bash
# 1. 准备生产环境配置
cp .env.production.example .env.production

# 2. 编辑生产环境变量
vim .env.production

# 3. 启动服务
docker-compose -f docker-compose.yml up -d

# 4. 初始化数据库
docker-compose exec app npx prisma db push

# 5. 初始化种子数据 (可选)
docker-compose exec app npx prisma db seed
```

### 方式二：Docker Stack (Swarm)

```bash
# 初始化 Swarm
docker swarm init

# 部署 stack
docker stack deploy -c docker-compose.yml github-platform

# 查看服务状态
docker service ls
docker service ps github-platform_app
```

### 方式三：Kubernetes

```bash
# 创建 namespace
kubectl create namespace github-platform

# 部署配置
kubectl apply -f k8s/

# 检查部署状态
kubectl get pods -n github-platform
```

---

## Docker 部署详解

### docker-compose.yml 结构

```yaml
version: '3.8'

services:
  # 应用服务
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - S3_ENDPOINT=${S3_ENDPOINT}
    depends_on:
      - postgres
      - redis
      - minio
    restart: unless-stopped

  # PostgreSQL 数据库
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: github_platform
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  # Redis 缓存
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

  # MinIO 对象存储
  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER:-minioadmin}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD:-minioadmin}
    volumes:
      - minio_data:/data
    restart: unless-stopped

  # Nginx 反向代理 (可选)
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

### 环境变量模板

创建 `.env.production`:

```env
# 应用
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_APP_URL=https://your-domain.com

# 数据库
DATABASE_URL=postgresql://postgres:your-password@postgres:5432/github_platform

# Redis
REDIS_URL=redis://redis:6379

# MinIO / S3
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_BUCKET=github-platform
S3_REGION=us-east-1

# JWT
NEXTAUTH_SECRET=your-nextauth-secret-min-32-chars
JWT_SECRET=your-jwt-secret-min-32-chars

# CORS
CORS_ORIGIN=https://your-domain.com
```

---

## 手动部署

### 1. 服务器准备

```bash
# 安装 Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# 安装 Redis
sudo apt-get install -y redis-server

# 安装 MinIO
wget https://dl.min.io/server/minio/release/linux-amd64/minio
chmod +x minio
sudo mv minio /usr/local/bin/
```

### 2. 数据库配置

```bash
# 启动 PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 创建数据库和用户
sudo -u postgres psql << EOF
CREATE DATABASE github_platform;
CREATE USER postgres WITH ENCRYPTED PASSWORD 'your-password';
GRANT ALL PRIVILEGES ON DATABASE github_platform TO postgres;
\c github_platform
GRANT ALL ON SCHEMA public TO postgres;
EOF
```

### 3. MinIO 配置

```bash
# 创建数据目录
sudo mkdir -p /data/minio
sudo chown -R $(whoami):$(whoami) /data/minio

# 启动 MinIO (后台运行)
MINIO_ROOT_USER=minioadmin MINIO_ROOT_PASSWORD=minioadmin nohup minio server /data/minio --console-address ":9001" > /var/log/minio.log 2>&1 &

# 创建 bucket
mc alias set local http://localhost:9000 minioadmin minioadmin
mc mb local/github-platform
mc anonymous set download local/github-platform
```

### 4. 应用构建和启动

```bash
# 克隆项目
git clone <repository-url>
cd my-blog

# 安装依赖
npm install

# 生成 Prisma Client
npx prisma generate

# 构建应用
npm run build

# 推送数据库 schema
npx prisma db push

# 启动应用 (使用 PM2)
npm install -g pm2
pm2 start npm --name "github-platform" -- start

# 配置开机自启
pm2 startup
pm2 save
```

---

## 配置说明

### 数据库连接

```typescript
// Prisma Schema (schema.prisma)
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Redis 缓存

Redis 用于：
- 速率限制（令牌桶算法）
- Session 存储
- API 响应缓存

如不使用 Redis，速率限制会回退到内存存储（仅适合单机部署）。

### MinIO / S3 存储

文件上传流程：
1. 前端直接上传到 MinIO (使用预签名 URL)
2. 或通过应用服务器中转

```typescript
// 上传配置
const uploadConfig = {
  maxFileSize: 100 * 1024 * 1024, // 100MB
  allowedTypes: ['image/*', 'application/pdf', 'text/*'],
  chunkSize: 5 * 1024 * 1024, // 5MB 分片
};
```

### 安全配置

| 配置项 | 说明 | 建议值 |
|--------|------|--------|
| `NEXTAUTH_SECRET` | NextAuth 加密密钥 | 32+ 随机字符 |
| `JWT_SECRET` | JWT 签名密钥 | 32+ 随机字符 |
| `CORS_ORIGIN` | 允许的跨域来源 | 生产域名 |
| `DATABASE_URL` | 数据库连接串 | 包含强密码 |

---

## 常见问题

### 1. 数据库连接失败

```bash
# 检查 PostgreSQL 状态
sudo systemctl status postgresql

# 检查连接
psql -h localhost -U postgres -d github_platform

# 查看日志
sudo tail -f /var/log/postgresql/postgresql-*.log
```

### 2. 文件上传失败

```bash
# 检查 MinIO 状态
curl http://localhost:9000/minio/health/live

# 检查 bucket 权限
mc anonymous info local/github-platform

# 查看 MinIO 日志
tail -f /var/log/minio.log
```

### 3. 内存不足

```bash
# 查看内存使用
free -h

# 清理 Docker
docker system prune -a

# 限制 Docker 内存
# 编辑 /etc/docker/daemon.json
{
  "memory": "4g",
  "memory-swap": "8g"
}
```

### 4. 端口冲突

```bash
# 检查端口占用
sudo netstat -tlnp | grep 3000

# 更改端口
# 编辑 .env
PORT=3001
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

### 5. SSL 证书问题

使用 Let's Encrypt:

```bash
# 安装 certbot
sudo apt-get install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

---

## 备份与恢复

### 数据库备份

```bash
# 备份
docker-compose exec postgres pg_dump -U postgres github_platform > backup_$(date +%Y%m%d).sql

# 恢复
cat backup_20240101.sql | docker-compose exec -T postgres psql -U postgres github_platform
```

### MinIO 数据备份

```bash
# 备份 bucket
mc mirror local/github-platform backup/

# 恢复
mc mirror backup/ local/github-platform/
```

---

## 监控

### Docker Stats

```bash
docker stats

# 查看特定容器
docker stats github-platform_app
```

### PM2 监控

```bash
pm2 monit
pm2 list
pm2 logs github-platform
```

---

## 更新

### Docker 更新

```bash
# 拉取最新代码
git pull origin main

# 重新构建
docker-compose build --no-cache
docker-compose up -d

# 执行数据库迁移
docker-compose exec app npx prisma migrate deploy
```

### 数据库迁移

```bash
# 开发环境
npx prisma migrate dev

# 生产环境
npx prisma migrate deploy
```

---

## 技术支持

- 文档: [docs/](docs/)
- Issue: [GitHub Issues](https://github.com/your-repo/issues)
- 讨论: [Discussions](https://github.com/your-repo/discussions)
