FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# --- Install dependencies ---
FROM base AS deps
RUN apk add --no-cache openssl
COPY pnpm-lock.yaml pnpm-workspace.yaml .npmrc package.json ./
COPY apps/academy/package.json ./apps/academy/
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
ARG NEXT_PUBLIC_SITE=ACADEMY
ENV NEXT_PUBLIC_SITE=$NEXT_PUBLIC_SITE
# Permanent feature flags. Empty default = feature on; pass "true" via the
# Fly deploy --build-arg to disable. The values must be present at `next
# build` time because they're baked into the client bundle.
ARG NEXT_PUBLIC_EMAIL_VERIFICATION_DISABLED=
ENV NEXT_PUBLIC_EMAIL_VERIFICATION_DISABLED=$NEXT_PUBLIC_EMAIL_VERIFICATION_DISABLED
ARG NEXT_PUBLIC_GOOGLE_AUTH_DISABLED=
ENV NEXT_PUBLIC_GOOGLE_AUTH_DISABLED=$NEXT_PUBLIC_GOOGLE_AUTH_DISABLED

# @tge/types re-exports Prisma enum values (CourseStatus, LessonType…) so
# the client must be generated before academy's Next.js build resolves them.
RUN cd apps/api && npx prisma generate

RUN pnpm --filter @tge/academy build

# --- Production ---
FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/apps/academy/.next/standalone ./
COPY --from=builder /app/apps/academy/.next/static ./apps/academy/.next/static

EXPOSE 3000
CMD ["node", "apps/academy/server.js"]
