FROM node:22-alpine AS builder

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @cozy/web build

FROM alpine:3.20 AS runner
WORKDIR /srv/web
COPY --from=builder /app/apps/web/dist ./
CMD ["tail", "-f", "/dev/null"]
