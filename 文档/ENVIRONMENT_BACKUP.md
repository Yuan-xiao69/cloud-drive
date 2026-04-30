# GitHub Platform 环境备份文档
# 备份时间: 2026-04-16
# 用于重装 Docker 后恢复环境

## 一、项目结构说明

```
my-blog/
├── docker-compose.yml        # 生产环境配置
├── docker-compose.dev.yml    # 开发环境配置
├── Dockerfile                # 生产镜像
├── Dockerfile.dev            # 开发镜像
├── .env                       # 主环境变量
├── .env.local                 # 本地环境变量
├── prisma/
│   ├── schema.prisma         # 数据库 schema
│   └── seed.ts               # 种子数据脚本
├── postgres_backup.sql       # 数据库备份（如有）
└── src/                      # 源代码
```

## 二、Docker 服务组件

| 服务 | 镜像 | 端口 | 数据卷 |
|------|------|------|--------|
| app | Next.js 应用 | 3000 | src/, public/ |
| db | postgres:16-alpine | 5432 | postgres_data |
| redis | redis:7-alpine | 6379 | redis_data |
| minio | minio/minio | 9000, 9001 | minio_data |

## 三、环境变量配置

### .env 文件
```bash
# PostgreSQL 数据库
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/github_platform"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET=github-platform-jwt-secret-2024
JWT_REFRESH_SECRET=github-platform-refresh-secret-2024

# NextAuth
NEXTAUTH_SECRET=github-platform-nextauth-secret-2024
NEXTAUTH_URL=http://localhost:3000

# MinIO 文件存储
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=github-platform
S3_REGION=us-east-1

# 开发模式
USE_MOCK=false
NODE_ENV=development
```

### .env.local 文件（前端用）
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/github_platform
REDIS_URL=redis://localhost:6379
JWT_SECRET=github-platform-secret-key-2024
JWT_REFRESH_SECRET=github-platform-refresh-secret-2024
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=nextauth-secret-key
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=github-platform
S3_REGION=us-east-1
NEXT_PUBLIC_USE_MOCK=false
```

## 四、docker-compose.yml 配置

```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/github_platform
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET:-github-platform-secret-key-2024}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET:-github-platform-refresh-secret-2024}
      - NODE_ENV=development
      - NEXTAUTH_URL=http://localhost:3000
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET:-nextauth-secret-key}
      - S3_ENDPOINT=http://minio:9000
      - S3_ACCESS_KEY=minioadmin
      - S3_SECRET_KEY=minioadmin
      - S3_BUCKET=github-platform
      - S3_REGION=us-east-1
      - USE_MOCK=${USE_MOCK:-false}
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
      minio:
        condition: service_started
    volumes:
      - ./src:/app/src
      - ./public:/app/public
    command: npm run dev
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: github_platform
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

  minio:
    image: minio/minio:latest
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes:
      - minio_data:/data
    command: server /data --console-address ":9001"
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  minio-init:
    image: minio/mc:latest
    depends_on:
      minio:
        condition: service_healthy
    entrypoint: >
      /bin/sh -c "
      mc alias set myminio http://minio:9000 minioadmin minioadmin;
      mc mb myminio/github-platform --ignore-existing;
      mc anonymous set download myminio/github-platform;
      exit 0;
      "

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

## 五、恢复步骤

### 1. 重新安装 Docker Desktop

### 2. 启动 Docker Desktop

### 3. 恢复项目文件
```bash
# 将备份的项目文件夹解压到目标位置
```

### 4. 启动服务
```bash
cd d:/XIANGMU/vs/my-blog

# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f
```

### 5. 初始化数据库
```bash
# 进入 app 容器执行
docker exec -it my-blog-app-1 npx prisma db push

# 运行种子数据
docker exec -it my-blog-app-1 npx prisma db seed

# 或者手动执行
docker exec -it my-blog-app-1 npm run db:push
docker exec -it my-blog-app-1 npm run db:seed
```

### 6. 验证服务
```bash
# 检查健康状态
curl http://localhost:3000/api/health

# 检查 Docker 容器
docker ps
```

## 六、常用命令

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 查看日志
docker-compose logs -f app

# 重启应用
docker-compose restart app

# 进入容器
docker exec -it my-blog-app-1 /bin/sh

# 查看数据库
docker exec -it my-blog-db-1 psql -U postgres -d github_platform

# 备份数据库
docker exec my-blog-db-1 pg_dump -U postgres github_platform > backup.sql

# 恢复数据库
docker exec -i my-blog-db-1 psql -U postgres github_platform < backup.sql
```

## 七、测试账户

| 用户名 | 邮箱 | 密码 | 角色 |
|--------|------|------|------|
| root | root@root | 123456 | super_admin |
| admin | admin@example.com | Admin@123456 | admin |
| octocat | octocat@example.com | Demo@123456 | user |
| defunkt | defunkt@example.com | Demo@123456 | user |

## 八、访问地址

- 应用首页: http://localhost:3000
- MinIO 控制台: http://localhost:9001 (minioadmin/minioadmin)
- PostgreSQL: localhost:5432 (postgres/postgres)
- Redis: localhost:6379
