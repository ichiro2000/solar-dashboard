# syntax=docker/dockerfile:1.6
#
# Multi-stage build for Next.js 14 standalone output, deployed via DO App
# Platform's "dockerfile" build path.
#
# Uses Debian-slim instead of Alpine because Prisma's prebuilt query engine
# expects glibc + a specific libssl version that Alpine doesn't ship by
# default.

ARG NODE_VERSION=20

# ---- deps ------------------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
RUN corepack enable

COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile --ignore-scripts

# ---- builder ---------------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
RUN corepack enable

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Switch the schema to Postgres for the production build.
RUN cp prisma/schema.postgres.prisma prisma/schema.prisma

# DATABASE_URL placeholder for `prisma generate`. Real value injected at
# runtime by DO App Platform via ${db.DATABASE_URL}.
ENV DATABASE_URL="postgres://placeholder@localhost:5432/placeholder?schema=public"

RUN pnpm prisma generate
RUN pnpm next build

# ---- runner ----------------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
RUN groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid nodejs --no-create-home nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma

USER nextjs
EXPOSE 3000

# Apply pending migrations on boot, then launch the standalone server.
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node server.js"]
