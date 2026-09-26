FROM node:22-alpine AS builder

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @cozy/api build

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=builder /app/packages/ ./packages/
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/dist/ ./apps/api/dist/
COPY --from=builder /app/apps/api/migrations/ ./apps/api/migrations/

RUN pnpm install --prod --frozen-lockfile

EXPOSE 8787

CMD ["node", "apps/api/dist/index.js"]
