import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const action = process.argv[2];
const PROD_CONFIRM_TOKEN = "I_UNDERSTAND_THIS_TARGETS_PRODUCTION";
const MIGRATION_CONFIRM_TOKEN = "MIGRATE_PROD";

if (!action || !["deploy", "migrate"].includes(action)) {
  throw new Error("Usage: node scripts/require-prod-confirmation.mjs <deploy|migrate>");
}

if (process.env.PROD_CONFIRM !== PROD_CONFIRM_TOKEN) {
  throw new Error(
    `Production confirmation missing. Set PROD_CONFIRM=${PROD_CONFIRM_TOKEN} before running ${action}.`
  );
}

if (action === "deploy") {
  process.stdout.write("Production deploy confirmation accepted.\n");
  process.exit(0);
}

if (process.env.PROD_MIGRATION_CONFIRM !== MIGRATION_CONFIRM_TOKEN) {
  throw new Error(
    `Migration confirmation missing. Set PROD_MIGRATION_CONFIRM=${MIGRATION_CONFIRM_TOKEN} before running migrate.`
  );
}

const allowDestructiveMigrations = process.env.ALLOW_DESTRUCTIVE_MIGRATIONS === "true";
const destructiveSqlPattern =
  /\b(drop\s+table|drop\s+index|truncate\s+table|delete\s+from|alter\s+table[\s\S]{0,80}\sdrop\s+(column|constraint))\b/i;
const migrationDirectory = join(process.cwd(), "migrations");

const migrationFiles = readdirSync(migrationDirectory)
  .filter((fileName) => fileName.endsWith(".sql"))
  .sort();

const destructiveFiles = migrationFiles.filter((fileName) => {
  const sql = readFileSync(join(migrationDirectory, fileName), "utf8");
  return destructiveSqlPattern.test(sql);
});

if (destructiveFiles.length > 0 && !allowDestructiveMigrations) {
  throw new Error(
    `Potentially destructive SQL detected in: ${destructiveFiles.join(", "
    )}. Set ALLOW_DESTRUCTIVE_MIGRATIONS=true to proceed intentionally.`
  );
}

process.stdout.write("Production migration confirmations accepted.\n");
