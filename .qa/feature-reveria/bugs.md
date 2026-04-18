# Bug Report — `feature/reveria` QA Pass

Format per plan. Each bug gets a unique `BUG-###` id assigned in order of discovery.

**Severity rubric:**
- **Blocker** — merge unsafe; data loss, auth broken, migration failure, brand-isolation leak
- **Critical** — golden path broken for a major surface
- **Major** — feature works but with visible defect
- **Minor** — cosmetic, edge-case, non-default locale
- **Trivial** — typos, console warnings

---

<!-- Bugs appended below as they are discovered -->

### BUG-001 — `nest start --watch` fails to find entry file (API dev server broken)
- **Severity:** Blocker
- **App/Area:** api
- **Phase:** A
- **Environment:** local, commit 4ac455b + uncommitted working-tree on `feature/reveria`, Node v24.5.0, pnpm 10.32.1
- **Steps to reproduce:**
  1. Fresh checkout of `feature/reveria` (or current working tree).
  2. From `apps/api/`, run `npm run dev` (alias: `nest start --watch`). Also reproduces via `nx dev api` and root `npm run dev:api`.
- **Expected:** NestJS dev server boots and listens on `:3333`.
- **Actual:** Compilation succeeds (`Found 0 errors`) but the runner immediately crashes:
  ```
  Error: Cannot find module 'C:\Users\Diaxxa\OneDrive\Work\TGE\apps\api\dist\main'
      at Module._resolveFilename (node:internal/modules/cjs/loader:1410:15)
    code: 'MODULE_NOT_FOUND'
  ```
- **Suspected cause:** `apps/api/tsconfig.build.json` (uncommitted on branch vs `main`) changes `rootDir` from `"."` to `"../.."` and adds `../../packages/{types,data}/src/**/*.ts` to `include`. This was done to bundle `@tge/types` and `@tge/data` into the API build, but it shifts the compiled entry point from `dist/src/main.js` (what `nest start` defaults to) to `dist/apps/api/src/main.js`. The production script `start:prod` in `apps/api/package.json:9` hardcodes the new path (`node dist/apps/api/src/main.js`), but neither the `dev` nest-cli start nor the Nx `dev`/`serve` targets in `apps/api/project.json` (which uses `node dist/main.js`) were updated. Affects three entry points:
  - `apps/api/package.json:7` — `"dev": "nest start --watch"`
  - `apps/api/project.json` `dev` target — same command
  - `apps/api/project.json` `serve` target — `node dist/main.js`
- **Evidence:** stack trace above. Diff on disk:
  ```
  git diff HEAD -- apps/api/tsconfig.build.json
  -    "rootDir": "."
  +    "rootDir": "../.."
  ```
- **Suggested fix:** either (a) pass `--entryFile apps/api/src/main` to `nest start` in the `dev` script and update `project.json` paths accordingly, or (b) use TS project references so packages are resolved without moving the API's rootDir, or (c) add an `outDir` override in `nest-cli.json` to keep the main entry at `dist/main.js`.

### BUG-002 — TGE site tagline + description seeded without Romanian diacritics
- **Severity:** Major
- **App/Area:** api (seed data) → surfaces on landing
- **Phase:** B/C
- **Environment:** local, same as BUG-001
- **Steps to reproduce:**
  1. Open `apps/api/prisma/seed.ts` lines 519 and 523.
- **Expected:** per CLAUDE.md memory and `seed.ts:603` comment ("Romanian strings use the proper diacritics"), Romanian text must use ă, â, î, ș, ț.
- **Actual:**
  ```
  ro: 'Consultanta Imobiliara de Lux Premier din Romania',
  ro: 'Descoperiti proprietati de lux exceptionale in cele mai prestigioase adrese din Romania. Vile, conace si domenii de la €1M+.',
  ```
  Should read:
  ```
  ro: 'Consultanță Imobiliară de Lux Premier din România',
  ro: 'Descoperiți proprietăți de lux excepționale în cele mai prestigioase adrese din România. Vile, conace și domenii de la €1M+.',
  ```
- **Suspected cause:** source-level oversight in the TGE site-config seed block. Every other `.ts` seed file (`packages/data/src/properties.ts`, `cities.ts`, `developers.ts`, `testimonials.ts`, `agents.ts`) uses proper diacritics.
- **Evidence:** `grep -n "Consultanta\|Descoperiti" apps/api/prisma/seed.ts`.

### BUG-003 — Stale compiled `.js` files in `packages/data/src/` contain pre-diacritic Romanian text
- **Severity:** Minor (cleanup) / potentially Major if something imports the .js by mistake
- **App/Area:** shared (`packages/data`)
- **Phase:** C
- **Environment:** local working tree
- **Steps to reproduce:**
  1. `ls packages/data/src/*.js` — 10+ untracked `.js` + `.js.map` files (timestamp Apr 17 14:29, older than the `.ts` sources at Apr 18 00:37).
  2. `grep "consacrati\|rezidential\|inalta" packages/data/src/developers.js` — returns diacritic-less Romanian text.
- **Expected:** no compiled `.js` files under `src/`. `packages/data/package.json` entry is `./src/index.ts`, so TS source is the runtime.
- **Actual:** stale compiled outputs sitting next to the source files:
  ```
  packages/data/src/agents.js, articles.js, cities.js, counties.js, developers.js,
  index.js, neighborhoods.js, (all with .js.map) — untracked
  ```
  These contain older Romanian content without diacritics. If any tool falls back to `.js` resolution (e.g., a worker script not going through TS loader), users would see stale text.
- **Suspected cause:** a prior `tsc` or compile step left artifacts in `src/` instead of a separate `dist/`. Likely benign unless something imports `@tge/data/foo` without going through TS. Worth a single `rm packages/data/src/*.js packages/data/src/*.js.map` before merge + ensuring `.gitignore` (or tsconfig `outDir`) prevents regression.
- **Evidence:** `git ls-files packages/data/src/*.js` returns empty (all untracked); `git check-ignore` returns empty too (not in .gitignore).

### BUG-004 — Currently-seeded DB content has Romanian text without diacritics
- **Severity:** Major (content quality on production-adjacent data)
- **App/Area:** api DB (seeded from `packages/data/*.ts` earlier)
- **Phase:** B
- **Environment:** local DB `tge_dev`, content fetched at `2026-04-18 01:21`
- **Steps to reproduce:**
  1. `curl -s -H "X-Site: TGE_LUXURY" http://localhost:3333/api/v1/properties/dacia-tower-penthouse-cluj | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(d.data.description.ro.slice(0,300))"`.
- **Expected:** Romanian content with proper diacritics — the current `.ts` source at `packages/data/src/properties.ts:1222` does have them ("în cartierul Mărăști", "Munții Apuseni", "neobstrucționată", "înaltă clădire rezidențială", "Facilitățile").
- **Actual:** API returns the same property WITHOUT diacritics: "in cartierul Marasti din Cluj", "Muntii Apuseni", "neobstructionata", "inalta", "Facilitatile". The DB row is stale — it was seeded from an earlier version of the `.ts` source (before diacritics were added) and `upsert`-style seeds don't overwrite existing content.
- **Suspected cause:** seed runs before diacritics landed; subsequent re-runs did not overwrite existing rows. Even if `seed.ts` is idempotent it likely skips rows that already exist rather than updating them.
- **Suggested fix:** add a `--force` / drop-and-reseed option, or change the seed to `upsert` with the latest content on every run. Before merge, re-seed against the target environment to refresh content.
