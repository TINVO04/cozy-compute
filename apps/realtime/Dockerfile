FROM node:22-alpine AS builder

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/realtime/ ./apps/realtime/

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @cozy/realtime build

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=builder /app/packages/ ./packages/
COPY --from=builder /app/apps/realtime/package.json ./apps/realtime/
COPY --from=builder /app/apps/realtime/dist/ ./apps/realtime/dist/

RUN pnpm install --prod --frozen-lockfile

EXPOSE 2567

CMD ["node", "apps/realtime/dist/index.js"]
