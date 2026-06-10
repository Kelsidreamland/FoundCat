#!/usr/bin/env node

import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_SCHEMA_PATH = 'supabase/found-cat-schema.sql';
const DEFAULT_ENV_EXAMPLE_PATH = '.env.example';
const DEFAULT_MIGRATIONS_DIR = 'supabase/migrations';

const schemaRequirements = [
  {
    message: 'Schema must include public.profiles.',
    pattern: /\bpublic\.profiles\b/i,
  },
  {
    message: 'Schema must include public.cat_cards.',
    pattern: /\bpublic\.cat_cards\b/i,
  },
  {
    message: 'Schema must include public.public_cat_cards.',
    pattern: /\bpublic\.public_cat_cards\b/i,
  },
  {
    message: 'Schema must enable row level security.',
    pattern: /\benable\s+row\s+level\s+security\b/i,
  },
  {
    message: 'Schema must define RLS policies.',
    pattern: /\bcreate\s+policy\b/i,
  },
  {
    message: 'Schema must grant public_cat_cards select access to anon and authenticated.',
    pattern: /\bgrant\s+select\s+on\s+public\.public_cat_cards\s+to\s+anon\s*,\s*authenticated\b/i,
  },
];

const envRequirements = [
  {
    message: '.env.example must include VITE_SUPABASE_URL.',
    pattern: /^VITE_SUPABASE_URL=/m,
  },
  {
    message: '.env.example must include VITE_SUPABASE_ANON_KEY.',
    pattern: /^VITE_SUPABASE_ANON_KEY=/m,
  },
];

async function readTextFile(rootDir, relativePath) {
  const path = resolve(rootDir, relativePath);

  try {
    return { ok: true, text: await readFile(path, 'utf8') };
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return { ok: false, text: '', missing: true };
    }

    throw error;
  }
}

async function readMigrationFiles(rootDir, migrationsDir) {
  const dir = resolve(rootDir, migrationsDir);

  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const migrationFiles = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
      .map((entry) => `${migrationsDir}/${entry.name}`)
      .sort();

    const migrations = await Promise.all(
      migrationFiles.map(async (migrationPath) => {
        const migration = await readTextFile(rootDir, migrationPath);
        return migration.text;
      }),
    );

    return {
      ok: migrationFiles.length > 0,
      text: migrations.join('\n\n'),
      files: migrationFiles,
    };
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return { ok: false, text: '', files: [] };
    }

    throw error;
  }
}

export async function analyzeCloudReadiness({
  rootDir = process.cwd(),
  schemaPath = DEFAULT_SCHEMA_PATH,
  envExamplePath = DEFAULT_ENV_EXAMPLE_PATH,
  migrationsDir = DEFAULT_MIGRATIONS_DIR,
} = {}) {
  const failures = [];
  const warnings = ['Vercel production env cannot be verified locally. Run `vercel env ls` before deploying.'];

  const migrations = await readMigrationFiles(rootDir, migrationsDir);
  if (!migrations.ok) {
    failures.push(`${migrationsDir} must contain at least one .sql migration file.`);
  }

  const schema = migrations.ok ? { ok: true, text: migrations.text } : await readTextFile(rootDir, schemaPath);
  if (!schema.ok) {
    failures.push(`${schemaPath} must exist.`);
  } else {
    for (const requirement of schemaRequirements) {
      if (!requirement.pattern.test(schema.text)) {
        failures.push(requirement.message);
      }
    }
  }

  const envExample = await readTextFile(rootDir, envExamplePath);
  if (!envExample.ok) {
    failures.push(`${envExamplePath} must exist.`);
  } else {
    for (const requirement of envRequirements) {
      if (!requirement.pattern.test(envExample.text)) {
        failures.push(requirement.message);
      }
    }
  }

  return {
    ok: failures.length === 0,
    failures,
    warnings,
  };
}

function printResult(result) {
  if (result.ok) {
    console.log('FOUND CAT cloud readiness: OK');
  } else {
    console.error('FOUND CAT cloud readiness: needs attention');
    for (const failure of result.failures) {
      console.error(`- ${failure}`);
    }
  }

  for (const warning of result.warnings) {
    console.warn(`- ${warning}`);
  }
}

const isCli = process.argv[1] ? fileURLToPath(import.meta.url) === resolve(process.argv[1]) : false;

if (isCli) {
  const result = await analyzeCloudReadiness();
  printResult(result);
  process.exitCode = result.ok ? 0 : 1;
}
