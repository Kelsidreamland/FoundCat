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

  it('stores and exposes cat feature notes without exposing private spot notes', () => {
    expect(schemaSql).toMatch(/\bcat_feature_note\s+text\b/i);

    const publicViewSql = schemaSql.split(/create\s+or\s+replace\s+view\s+public\.public_cat_cards/i)[1] ?? '';
    expect(publicViewSql).toMatch(/\bcat_feature_note\b/i);
    expect(publicViewSql).not.toMatch(/\bspot_note\b/i);
  });

  it('keeps world-map numbering separate from private catdex numbering', () => {
    expect(schemaSql).toMatch(/\bpublic_number\s+integer\b/i);
    expect(schemaSql).toMatch(/create\s+sequence\s+if\s+not\s+exists\s+public\.public_cat_cards_number_seq/i);
    expect(schemaSql).toMatch(/create\s+or\s+replace\s+function\s+public\.assign_public_cat_number/i);
    expect(schemaSql).toMatch(/old\.public_number\s+is\s+not\s+null\s+and\s+new\.public_number\s+is\s+null/i);
    expect(schemaSql).toMatch(/new\.public_number\s*:=\s*nextval\('public\.public_cat_cards_number_seq'\)/i);

    const publicViewSql = schemaSql.split(/create\s+or\s+replace\s+view\s+public\.public_cat_cards/i)[1] ?? '';
    expect(publicViewSql).toMatch(/\bpublic_number\b/i);
  });

  it('keeps rescued launch cats visible but closes anonymous launch rescue writes after rescue is complete', () => {
    expect(schemaSql).toMatch(/create\s+table\s+if\s+not\s+exists\s+public\.launch_rescue_cat_cards/i);
    expect(schemaSql).toMatch(/alter\s+table\s+public\.launch_rescue_cat_cards\s+enable\s+row\s+level\s+security/i);
    expect(schemaSql).not.toMatch(/on\s+public\.launch_rescue_cat_cards\s+for\s+insert\s+to\s+anon,\s*authenticated/i);
    expect(schemaSql).not.toMatch(/grant\s+insert\s+on\s+public\.launch_rescue_cat_cards\s+to\s+anon/i);
    expect(schemaSql).not.toMatch(/grant\s+insert\s+on\s+public\.cat_cards\s+to\s+anon/i);

    const publicViewSql = schemaSql.split(/create\s+or\s+replace\s+view\s+public\.public_cat_cards/i)[1] ?? '';
    expect(publicViewSql).toMatch(/union\s+all/i);
    expect(publicViewSql).toMatch(/from\s+public\.launch_rescue_cat_cards/i);
  });
});
