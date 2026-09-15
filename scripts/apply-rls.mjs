
import 'dotenv/config';

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import postgres from 'postgres';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL must be set.');
  process.exit(1);
}

const files = ['drizzle/sql/constraints.sql', 'drizzle/sql/rls.sql'];
const sql = postgres(url, { max: 1, onnotice: () => {} });

try {
  for (const file of files) {
    const text = await readFile(join(root, file), 'utf8');
    process.stdout.write(`applying ${file} ... `);
    await sql.unsafe(text);
    process.stdout.write('ok\n');
  }
  console.log('\nRLS and constraints applied.');
} catch (error) {
  console.error(`\nfailed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await sql.end();
}
