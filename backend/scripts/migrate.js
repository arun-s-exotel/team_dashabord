// Boot-time DB schema management.
//
// Handles three cases safely:
//   1. Fresh DB (no tables) -> run `prisma migrate deploy` to create everything.
//   2. Existing DB created via `prisma db push` (no _prisma_migrations table or
//      empty one) but the user-data tables already exist -> baseline by marking
//      the init migration as applied, then `migrate deploy` (no-op for init,
//      runs any later migrations).
//   3. Already migrated DB -> just `migrate deploy`.
//
// Each step is wrapped so a failure here exits non-zero and the container
// will not start. This is intentional: starting the app against an unknown
// schema state is more dangerous than failing loudly.

const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');

const INIT_MIGRATION_NAME = '20260602120000_init';

function run(cmd) {
  console.log(`[migrate] $ ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

async function detectState() {
  const prisma = new PrismaClient();
  try {
    const result = await prisma.$queryRawUnsafe(`
      SELECT
        EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'users'
        ) AS users_exists,
        EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = '_prisma_migrations'
        ) AS migrations_exists
    `);
    const { users_exists, migrations_exists } = result[0];

    let appliedCount = 0;
    if (migrations_exists) {
      const counted = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*)::int AS n FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`
      );
      appliedCount = counted[0].n;
    }

    return {
      hasUsers: Boolean(users_exists),
      hasMigrationsTable: Boolean(migrations_exists),
      appliedCount
    };
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  let state;
  try {
    state = await detectState();
  } catch (err) {
    console.error('[migrate] Failed to inspect DB state:', err.message);
    process.exit(1);
  }

  console.log('[migrate] DB state:', state);

  if (state.appliedCount > 0) {
    console.log('[migrate] Migrations history present, running migrate deploy');
    run('npx prisma migrate deploy');
    return;
  }

  if (state.hasUsers) {
    console.log(`[migrate] Existing data tables without migration history. Baselining ${INIT_MIGRATION_NAME}`);
    run(`npx prisma migrate resolve --applied ${INIT_MIGRATION_NAME}`);
    run('npx prisma migrate deploy');
    return;
  }

  console.log('[migrate] Fresh DB, running migrate deploy from scratch');
  run('npx prisma migrate deploy');
}

main().catch(err => {
  console.error('[migrate] Fatal:', err);
  process.exit(1);
});
