# syntax=docker/dockerfile:1.6
#
# Multi-stage build for Next.js 14 standalone output.
# Used by DigitalOcean App Platform via the "dockerfile" build path.

ARG NODE_VERSION=20

# ---- deps ------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS deps
RUN corepack enable
WORKDIR /app

# Install dependencies based on the lockfile
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile

# ---- builder ---------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS builder
RUN corepack enable
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Switch the schema to Postgres for the production build.
RUN cp prisma/schema.postgres.prisma prisma/schema.prisma

# DATABASE_URL placeholder for `prisma generate`. Real value is injected at
# runtime by DO App Platform.
ENV DATABASE_URL="postgres://placeholder@localhost:5432/placeholder?schema=public"

RUN pnpm prisma generate
RUN pnpm next build

# ---- runner ----------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
RUN apk add --no-cache openssl

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# Migrations need the prisma CLI binary. Bring just the prisma package.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma

USER nextjs
EXPOSE 3000

# Run pending migrations on boot, then launch the standalone server.
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node server.js"]
