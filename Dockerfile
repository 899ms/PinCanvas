FROM oven/bun:1.3.10-alpine AS build

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

FROM oven/bun:1.3.10-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=80

COPY --from=build /app/dist ./dist
COPY server ./server

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun -e "const r = await fetch('http://127.0.0.1/healthz'); process.exit(r.ok ? 0 : 1)"

CMD ["bun", "server/index.ts"]
