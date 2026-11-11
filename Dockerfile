FROM node:20 AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm config delete proxy \
 && npm config delete http-proxy \
 && npm config delete https-proxy \
 && npm config set registry https://registry.npmmirror.com
RUN npm ci

FROM node:20 AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# build 阶段需要 JWT_SECRET 占位值（lib/auth 在模块加载时会校验），运行时由 .env 注入真实值
ENV JWT_SECRET=build-placeholder
ENV JWT_REFRESH_SECRET=build-placeholder
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
# 安装 openssl：Prisma 依赖 libssl 检测引擎版本，slim 镜像缺失会误判为 1.1.x
RUN apt-get update -y \
 && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/* \
 && groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
