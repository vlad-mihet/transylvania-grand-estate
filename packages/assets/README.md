# @tge/assets

Single source of truth for binary static assets shared across the Next.js
apps (admin, landing, revery). Owns image files like the curated city
hero photos under `public/images/cities/`. The actual files live here in
git; consuming apps gitignore their own copies and re-sync at the start
of every dev/build.

## Why a package, not three copies?

`apps/landing/public/images/cities/` and `apps/revery/public/images/cities/`
each used to carry an independent ~14 MB copy of the same 34 JPGs.
`apps/admin/` had none, which is why city tiles 404'd in the admin city
list. Hosting them once here keeps the three apps in sync and saves ~28 MB
in the repo.

## Layout

```
packages/assets/
  public/                 # mirrors a Next.js public/ folder layout
    images/
      cities/
        alba-iulia.jpg
        arad.jpg
        ...
  scripts/
    sync.mjs              # copies public/* into a target dir
```

A path under `public/` here ends up at the same path under each app's
public root. e.g. `public/images/cities/cluj.jpg` → `/images/cities/cluj.jpg`.

## How an app consumes it

1. Add the workspace dep:
   ```json
   "dependencies": { "@tge/assets": "workspace:*" }
   ```
2. Chain the sync into `dev` and `build`:
   ```json
   "scripts": {
     "dev":   "tge-sync-assets ./public && next dev --port 3051",
     "build": "tge-sync-assets ./public && next build"
   }
   ```
3. Gitignore the synced paths in your app:
   ```
   public/images/cities/
   ```

The synced files end up on disk in the app's `public/` folder, so
production deploys (`next build` → `.next/standalone` or static export)
bake them into the deploy artifact without runtime coupling between apps.

## Adding new assets

Drop the file under `packages/assets/public/...` matching the public-URL
path you want it served at. No code changes needed in consuming apps —
their next `dev`/`build` picks it up.
