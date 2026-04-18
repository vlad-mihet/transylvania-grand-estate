FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat openssl
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# --- Install dependencies ---
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml .npmrc package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/
COPY packages/data/package.json ./packages/data/
RUN pnpm install --frozen-lockfile

# --- Build ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app ./
COPY . .
RUN cd apps/api && npx prisma generate
# @tge/types ships a compiled dist that apps/api's `require("@tge/types/*")`
# resolves to at runtime via the package's exports map. Build it before the
# API so node_modules/@tge/types/dist is populated.
RUN pnpm --filter @tge/types build
# Same reason as @tge/types: the seed consumes @tge/data via plain
# `require(...)` at runtime, so the package has to ship compiled JS in
# dist/. Without this step, `npx prisma db seed` in the running
# container crashes with ERR_MODULE_NOT_FOUND on extensionless imports.
RUN pnpm --filter @tge/data build
RUN pnpm --filter @tge/api build

# --- Production ---
FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/apps/api/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
# Preserve the pnpm symlink targets for @tge/* workspace packages. Without
# these, node_modules/@tge/types → ../packages/types is a dangling symlink.
COPY --from=builder /app/packages ./packages

RUN mkdir -p /app/uploads

EXPOSE 3333
CMD ["node", "dist/apps/api/src/main.js"]
