import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ConfigService } from '@nestjs/config';

// Walk up from this module's compiled location until we find the @tge/api
// package root, then anchor uploads/ there. This keeps the writer
// (LocalStorageService) and the reader (ServeStaticModule) in lock-step
// regardless of what process.cwd() is — a cwd-based default silently drifted
// when the API was started from different directories and produced a 404.
function findApiPackageRoot(): string | null {
  let dir = __dirname;
  for (let i = 0; i < 10; i++) {
    const pkgPath = path.join(dir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (pkg.name === '@tge/api') return dir;
      } catch {
        /* keep walking */
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

export function resolveUploadsDir(config: ConfigService): string {
  const raw = config.get<string>('UPLOAD_DIR');
  if (raw && raw.trim()) {
    return path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
  }
  const apiRoot = findApiPackageRoot();
  return path.join(apiRoot ?? process.cwd(), 'uploads');
}
