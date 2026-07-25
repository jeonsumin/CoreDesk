# syntax=docker/dockerfile:1

# ---------- 1. 의존성 설치 ----------
FROM node:22-slim AS deps
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# ---------- 2. 빌드 ----------
FROM node:22-slim AS builder
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# npm run build = prisma generate && next build
RUN npm run build

# ---------- 3. 런타임 ----------
FROM node:22-slim AS runner
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

# prisma CLI가 dependencies에 있으므로 --omit=dev 로도 migrate deploy 가능
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev && npm cache clean --force

# 빌드 산출물 및 생성된 Prisma Client
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# 업로드 마운트 지점 (k8s PVC가 이 경로에 붙는다)
RUN mkdir -p /app/uploads/drive && chown -R node:node /app/uploads

USER node
EXPOSE 3000
CMD ["npm", "run", "start"]
