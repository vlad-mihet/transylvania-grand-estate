import path from 'node:path';
import { defineConfig } from 'prisma/config';

// Prisma 7 will drop support for the `package.json#prisma` config block.
// Moving to this file now silences the deprecation warning that fires on
// every `prisma db seed` run and future-proofs the seed workflow.
//
// The `ts-node prisma/seed.ts` command preserves behaviour from the old
// package.json block — local dev still runs via ts-node, prod (Fly
// container) still invokes via `npx prisma db seed` after deploy.

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    seed: 'ts-node prisma/seed.ts',
  },
});
