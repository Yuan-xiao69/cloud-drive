# Docker 开发指南

## 环境要求

- Docker Desktop (Windows/Mac) 或 Docker Engine (Linux)
- 推荐分配 4GB+ 内存给 Docker

## 快速开始

### Windows

```bash
# 双击运行或命令行执行
start-docker.bat
```

### Linux / Mac

```bash
chmod +x docker-helpers.sh
./docker-helpers.sh
```

## 手动命令

### 启动开发环境

```bash
docker-compose -f docker-compose.dev.yml up -d
```

### 查看日志

```bash
docker-compose -f docker-compose.dev.yml logs -f
```

### 进入容器终端

```bash
docker-compose -f docker-compose.dev.yml exec app bash
```

### 初始化数据库

```bash
docker-compose -f docker-compose.dev.yml exec app npx prisma db push
```

### 重新构建

```bash
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml build --no-cache
docker-compose -f docker-compose.dev.yml up -d
```

## 服务地址

| 服务 | 地址 |
|------|------|
| 应用 | http://localhost:3000 |
| MySQL | localhost:3306 |
| Redis | localhost:6379 |

## 数据库连接

```
Host: localhost (Windows) 或 db (容器内)
Port: 3306
User: root
Password: 5201314Chinese*
Database: my_blog
```

## 热更新

代码修改会自动触发 Next.js 热更新，无需重启容器。

## 清理环境

```bash
# 停止并删除容器
docker-compose -f docker-compose.dev.yml down

# 删除数据卷（慎用，会清空数据库）
docker-compose -f docker-compose.dev.yml down -v
```

## VS Code 调试

配置 `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Docker: Attach to Node",
      "port": 9229,
      "request": "attach",
      "skipFiles": ["<node_internals>/**"],
      "type": "node"
    }
  ]
}
```

## 常见问题

### Q: 容器启动失败？

```bash
# 检查 Docker 是否运行
docker info

# 查看具体错误
docker-compose -f docker-compose.dev.yml logs app
```

### Q: 热更新不生效？

```bash
# 重启容器
docker-compose -f docker-compose.dev.yml restart app
```

### Q: 数据库连接失败？

```bash
# 确保 MySQL 容器已就绪
docker-compose -f docker-compose.dev.yml ps

# 等待数据库就绪后重试
docker-compose -f docker-compose.dev.yml exec app npx prisma db push
```
