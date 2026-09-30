FROM node:22-alpine AS builder

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/
ARG VITE_API_URL=/api
ARG VITE_REALTIME_URL=/realtime
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_REALTIME_URL=$VITE_REALTIME_URL

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @cozy/web build

FROM caddy:2-alpine AS runner
ARG COZY_RELEASE_SHA=local
COPY infra/caddy/Web.Caddyfile /etc/caddy/Caddyfile
COPY --from=builder /app/apps/web/dist /srv/web
RUN printf '%s\n' "$COZY_RELEASE_SHA" > /srv/web/version.txt
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --retries=6 CMD wget -qO- http://127.0.0.1/healthz || exit 1
