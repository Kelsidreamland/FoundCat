import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { analyzeCloudReadiness } from './check-cloud-readiness.mjs';

async function withProject(files, testFn) {
  const root = await mkdtemp(join(tmpdir(), 'found-cat-cloud-'));

  try {
    await Promise.all(
      Object.entries(files).map(async ([path, contents]) => {
        const fullPath = join(root, path);
        await mkdir(join(fullPath, '..'), { recursive: true });
        await writeFile(fullPath, contents, 'utf8');
      }),
    );

    return await testFn(root);
  } finally {
    await rm(root, { force: true, recursive: true });
  }
}

describe('analyzeCloudReadiness', () => {
  it('passes when the Supabase schema and env example contain the required cloud setup pieces', async () => {
    const schema = `
      create table public.profiles (id uuid primary key);
      alter table public.profiles enable row level security;
      create table public.cat_cards (id uuid primary key);
      alter table public.cat_cards enable row level security;
      create or replace view public.public_cat_cards as select id from public.cat_cards;
      create policy "profiles are readable by owner" on public.profiles for select using (auth.uid() = id);
      create policy "cat cards readable by owner" on public.cat_cards for select using (owner_id = auth.uid());
      grant select on public.public_cat_cards to anon, authenticated;
    `;

    await withProject(
      {
        'supabase/migrations/20260610083000_found_cat_cloud_mvp.sql': schema,
        '.env.example': 'VITE_SUPABASE_URL=\nVITE_SUPABASE_ANON_KEY=\n',
      },
      async (root) => {
        const result = await analyzeCloudReadiness({
          rootDir: root,
          schemaPath: 'supabase/migrations/20260610083000_found_cat_cloud_mvp.sql',
          envExamplePath: '.env.example',
        });

        expect(result.ok).toBe(true);
        expect(result.failures).toEqual([]);
        expect(result.warnings).toContain('Vercel production env cannot be verified locally. Run `vercel env ls` before deploying.');
      },
    );
  });

  it('reports missing schema, env example, and schema requirements without exposing secret values', async () => {
    await withProject(
      {
        'found-cat-schema.sql': 'create table public.cat_cards (id uuid primary key);',
        '.env.example': 'VITE_SUPABASE_URL=https://example.supabase.co\n',
      },
      async (root) => {
        const result = await analyzeCloudReadiness({
          rootDir: root,
          schemaPath: 'found-cat-schema.sql',
          envExamplePath: '.env.example',
        });

        expect(result.ok).toBe(false);
        expect(result.failures).toEqual(
          expect.arrayContaining([
            'Schema must include public.profiles.',
            'Schema must include public.public_cat_cards.',
            'Schema must enable row level security.',
            '.env.example must include VITE_SUPABASE_ANON_KEY.',
          ]),
        );
        expect(result.failures.join('\n')).not.toContain('https://example.supabase.co');
      },
    );
  });

  it('requires a Supabase migrations directory for GitHub integration deployments', async () => {
    await withProject(
      {
        'supabase/found-cat-schema.sql': 'create table public.cat_cards (id uuid primary key);',
        '.env.example': 'VITE_SUPABASE_URL=\nVITE_SUPABASE_ANON_KEY=\n',
      },
      async (root) => {
        const result = await analyzeCloudReadiness({ rootDir: root });

        expect(result.ok).toBe(false);
        expect(result.failures).toContain('supabase/migrations must contain at least one .sql migration file.');
      },
    );
  });
});
