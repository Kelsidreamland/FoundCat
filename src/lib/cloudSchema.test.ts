import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const schemaPath = join(process.cwd(), 'supabase/found-cat-schema.sql');
const schemaSql = readFileSync(schemaPath, 'utf8');

describe('FOUND CAT Supabase schema', () => {
  it('keeps public cat map reads behind a limited view instead of opening the private backup table', () => {
    expect(schemaSql).not.toMatch(/or\s+is_public\s*=\s*true/i);
    expect(schemaSql).toMatch(/create\s+or\s+replace\s+view\s+public\.public_cat_cards/i);
    expect(schemaSql).toMatch(/where\s+is_public\s*=\s*true/i);
  });

  it('does not expose private backup-only fields through the public cat map view', () => {
    const publicViewSql = schemaSql.split(/create\s+or\s+replace\s+view\s+public\.public_cat_cards/i)[1] ?? '';

    expect(publicViewSql).not.toMatch(/\bowner_id\b/i);
    expect(publicViewSql).not.toMatch(/\blocation_address\b/i);
    expect(publicViewSql).not.toMatch(/\blocation_place_id\b/i);
    expect(publicViewSql).not.toMatch(/\bspot_note\b/i);
  });
});
