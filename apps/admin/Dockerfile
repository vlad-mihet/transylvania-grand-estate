FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# --- Install dependencies ---
FROM base AS deps
RUN apk add --no-cache openssl
COPY pnpm-lock.yaml pnpm-workspace.yaml .npmrc package.json ./
COPY apps/admin/package.json ./apps/admin/
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY packages/hooks/package.json ./packages/hooks/
COPY packages/ui/package.json ./packages/ui/
COPY packages/i18n/package.json ./packages/i18n/
COPY packages/api-client/package.json ./packages/api-client/
COPY packages/branding/package.json ./packages/branding/
COPY packages/tailwind-config/package.json ./packages/tailwind-config/
RUN pnpm install --frozen-lockfile

# --- Build ---
FROM base AS builder
RUN apk add --no-cache openssl
WORKDIR /app
COPY --from=deps /app ./
COPY . .

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# @tge/types re-exports Prisma enum values, so the client must be generated
# before admin's Next.js build can resolve the enum imports.
RUN cd apps/api && npx prisma generate

RUN pnpm --filter @tge/admin build

# --- Production ---
FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/apps/admin/.next/standalone ./
COPY --from=builder /app/apps/admin/.next/static ./apps/admin/.next/static

EXPOSE 3000
CMD ["node", "apps/admin/server.js"]
