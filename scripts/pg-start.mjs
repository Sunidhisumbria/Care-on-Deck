/**
 * Starts the local PostgreSQL server, clearing a stale lock file if one is in
 * the way.
 *
 * Why this exists: PostgreSQL is not registered as a Windows service here, so
 * nothing restarts it after a reboot. Worse, a machine that goes down without
 * stopping it leaves `postmaster.pid` behind, and Windows will happily hand
 * that PID to some unrelated program later. `pg_ctl` then sees a live process
 * with the recorded PID and refuses to start, reporting that another server
 * might already be running.
 *
 * The dangerous part is the obvious fix. Deleting `postmaster.pid` while a
 * real postmaster IS running lets a second one attach to the same data
 * directory, which corrupts it. So the lock is only removed once all three of
 * these agree that nothing is there:
 *
 *   1. nothing is accepting connections on the port,
 *   2. no postgres process exists at all,
 *   3. the PID in the lock file belongs to something that is not postgres.
 *
 * Any doubt and it stops and says so rather than guessing.
 *
 * Usage: npm run db:start
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { connect } from 'node:net';
import { join } from 'node:path';

const PG_ROOT = process.env.PGROOT ?? 'C:\\Program Files\\PostgreSQL';

main().catch((error) => {
  console.error(`\n${error.message}`);
  process.exit(1);
});

async function main() {
  const { host, port } = target();

  if (host !== 'localhost' && host !== '127.0.0.1') {
    console.log(`DATABASE_URL points at ${host}, which is not this machine. Nothing to start.`);
    return;
  }

  if (await isListening(host, port)) {
    console.log(`PostgreSQL is already accepting connections on ${host}:${port}.`);
    return;
  }

  const install = findInstall();
  const dataDir = join(install, 'data');
  const pgCtl = join(install, 'bin', 'pg_ctl.exe');

  if (!existsSync(pgCtl)) throw new Error(`Could not find pg_ctl at ${pgCtl}.`);

  clearStaleLock(dataDir, port);

  console.log('Starting PostgreSQL...');
  const started = spawnSync(pgCtl, ['-D', dataDir, '-l', join(dataDir, 'log', 'startup.log'), 'start'], {
    stdio: 'inherit',
  });
  if (started.status !== 0) {
    throw new Error('pg_ctl could not start the server. See the log above.');
  }

  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (await isListening(host, port)) {
      console.log(`\nPostgreSQL is up on ${host}:${port}.`);
      return;
    }
    await sleep(500);
  }

  throw new Error(`Started, but nothing is listening on ${port} after 15s. Check the startup log.`);
}

/** Where the app expects the database to be. */
function target() {
  const raw = readFileSync('.env', 'utf8').match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim();
  if (!raw) throw new Error('DATABASE_URL is not set in .env.');

  const url = new URL(raw);
  return { host: url.hostname, port: Number(url.port || 5432) };
}

/** The newest major version installed, unless PGDATA_ROOT names one. */
function findInstall() {
  if (process.env.PGDATA_ROOT) return process.env.PGDATA_ROOT;
  if (!existsSync(PG_ROOT)) throw new Error(`No PostgreSQL install found under ${PG_ROOT}.`);

  const versions = readdirSync(PG_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => Number(b) - Number(a));

  if (versions.length === 0) throw new Error(`No versions found under ${PG_ROOT}.`);
  return join(PG_ROOT, versions[0]);
}

/**
 * Removes `postmaster.pid` only when it is provably left over.
 *
 * Reaching here already means nothing answered on the port. The two further
 * checks are what separate "the machine rebooted" from "a server is running
 * and something else is wrong" -- and only the first is safe to clear.
 */
function clearStaleLock(dataDir, port) {
  const lockFile = join(dataDir, 'postmaster.pid');
  if (!existsSync(lockFile)) return;

  if (postgresProcesses().length > 0) {
    throw new Error(
      `postmaster.pid exists and postgres processes are running, but nothing is listening on ` +
        `${port}. Refusing to touch the lock file -- a second server on this data directory ` +
        `would corrupt it. Stop the running server first:\n` +
        `  & "${join(dataDir, '..', 'bin', 'pg_ctl.exe')}" -D "${dataDir}" stop`,
    );
  }

  const recordedPid = Number(readFileSync(lockFile, 'utf8').split(/\r?\n/)[0]);
  const owner = processName(recordedPid);

  if (owner && /postgres/i.test(owner)) {
    throw new Error(
      `postmaster.pid names PID ${recordedPid}, which is running as "${owner}". ` +
        `Refusing to remove it.`,
    );
  }

  console.log(
    owner
      ? `Stale lock: PID ${recordedPid} now belongs to "${owner}", not postgres. Removing it.`
      : `Stale lock: PID ${recordedPid} is not running. Removing it.`,
  );
  rmSync(lockFile, { force: true });
}

function postgresProcesses() {
  try {
    const out = execFileSync('tasklist', ['/FI', 'IMAGENAME eq postgres.exe', '/NH'], {
      encoding: 'utf8',
    });
    return out.includes('postgres.exe') ? [out] : [];
  } catch {
    return [];
  }
}

/** The image name for a PID, or null when nothing is running under it. */
function processName(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return null;
  try {
    const out = execFileSync('tasklist', ['/FI', `PID eq ${pid}`, '/NH', '/FO', 'CSV'], {
      encoding: 'utf8',
    });
    return out.startsWith('"') ? out.split('","')[0].replace(/"/g, '') : null;
  } catch {
    return null;
  }
}

function isListening(host, port) {
  return new Promise((resolve) => {
    const socket = connect({ host, port });
    const settle = (result) => {
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(1500);
    socket.once('connect', () => settle(true));
    socket.once('timeout', () => settle(false));
    socket.once('error', () => settle(false));
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
