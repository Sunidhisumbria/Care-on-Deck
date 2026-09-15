/**
 * A production build that does not disturb a running dev server.
 *
 * `next build` and `next dev` both write to `.next`, so building while dev is
 * up overwrites what dev is serving and every route answers 500 until dev is
 * restarted. next.config.ts reads NEXT_DIST_DIR, so pointing it at a scratch
 * directory makes the two independent.
 *
 * The cleanup afterwards is not optional. Next writes generated route types
 * into whichever dist dir it builds into, and adds that path to tsconfig
 * `include`. Left behind, those declare a second `LayoutRoutes` / `AppRoutes`
 * that goes stale the moment a route is added -- and tsc then reports errors
 * about routes that are perfectly fine. So the scratch types and the tsconfig
 * entry both go once the build has answered its question.
 *
 * Usage: npm run build:check
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';

const DIST = '.next-check';

const result = spawnSync('next', ['build'], {
  stdio: 'inherit',
  // Resolves the local `next` binary on Windows (next.cmd) and POSIX alike.
  shell: true,
  env: { ...process.env, NEXT_DIST_DIR: DIST },
});

cleanUp();

process.exit(result.status ?? 1);

function cleanUp() {
  rmSync(DIST, { recursive: true, force: true });

  try {
    const raw = readFileSync('tsconfig.json', 'utf8');
    const stripped = raw.replace(new RegExp(`^\\s*"${DIST}/types/\\*\\*/\\*\\.ts",?\\r?\\n`, 'm'), '');
    if (stripped !== raw) {
      writeFileSync('tsconfig.json', fixTrailingComma(stripped), 'utf8');
    }
  } catch {
    // tsconfig is not ours to fight over; a failure here is not worth failing
    // the build for, and the next run will try again.
  }
}

/** Removing the last entry of an array can leave `"x",\n  ]`. */
function fixTrailingComma(text) {
  return text.replace(/,(\s*[\]}])/g, '$1');
}
