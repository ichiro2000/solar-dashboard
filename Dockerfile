# syntax=docker/dockerfile:1.6
#
# Build & runtime container for Next.js 14 + Prisma + Postgres on
# DigitalOcean App Platform. Single-stage to keep pnpm's symlinked
# node_modules intact at runtime — Prisma's prebuilt query engine
# resolves through that path.

FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
RUN corepack enable

# Install all deps (incl. dev) so we can build, and so the Prisma engine
# is available at runtime.
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile --ignore-scripts

# Switch to the Postgres schema before generate.
RUN cp prisma/schema.postgres.prisma prisma/schema.prisma

# DATABASE_URL placeholder for `prisma generate`. Real value is injected at
# runtime by DO App Platform via ${db.DATABASE_URL}.
ENV DATABASE_URL="postgres://placeholder@localhost:5432/placeholder?schema=public"

RUN pnpm prisma generate

COPY . .
# Re-apply schema swap (the COPY . . above just overwrote it)
RUN cp prisma/schema.postgres.prisma prisma/schema.prisma
RUN pnpm next build

# Drop dev deps to slim the image; Prisma engine + runtime deps stay.
RUN pnpm prune --prod

EXPOSE 3000

# Run pending migrations on boot, then launch Next.
CMD ["sh", "-c", "pnpm prisma migrate deploy && pnpm next start -H 0.0.0.0"]
