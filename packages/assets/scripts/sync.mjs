#!/usr/bin/env node
/**
 * Copies the contents of `@tge/assets/public/` into a target directory
 * (typically a Next.js app's `public/` folder). Each consuming app calls
 * this from its `dev` and `build` scripts so the binary assets ship with
 * the app's static-file root without being duplicated in git.
 *
 * Usage: tge-sync-assets <target-public-dir>
 *
 * Idempotent: re-running just overwrites; safe to chain into hot-reload
 * scripts. Cross-platform via node:fs cpSync (Node 16.7+).
 */
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(here, "..", "public");

const target = process.argv[2];
if (!target) {
  console.error("Usage: tge-sync-assets <target-public-dir>");
  process.exit(1);
}

if (!existsSync(SRC)) {
  console.error(`@tge/assets: source directory missing at ${SRC}`);
  process.exit(1);
}

const dest = resolve(process.cwd(), target);
if (!existsSync(dest)) mkdirSync(dest, { recursive: true });

cpSync(SRC, dest, { recursive: true, force: true });
console.log(`@tge/assets → ${dest}`);
