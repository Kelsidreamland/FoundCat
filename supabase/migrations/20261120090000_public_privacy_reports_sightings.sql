-- 1. Later encounters are backed up with each card.
-- 2. The public world map shows approximate locations only.
-- 3. Anyone can report a public cat (reviewed in the dashboard).
-- 4. Anyone can say "I've seen this cat too"; the public view carries the count.

alter table public.cat_cards
add column if not exists encounters jsonb;

-- Reports: insert-only for visitors; only the dashboard (service role) can read them.
create table if not exists public.cat_reports (
  id uuid primary key default gen_random_uuid(),
  cat_id uuid not null,
  reason text not null check (reason in ('inappropriate', 'not_a_cat', 'privacy', 'spam', 'other')),
  note text check (note is null or char_length(note) <= 300),
  created_at timestamptz not null default now()
);

alter table public.cat_reports enable row level security;

drop policy if exists "anyone can report a public cat" on public.cat_reports;
create policy "anyone can report a public cat"
on public.cat_reports
for insert
to anon, authenticated
with check (true);

grant insert on public.cat_reports to anon, authenticated;

-- "Seen it too": one row per cat per browser. Inserts only; counts come from the view.
create table if not exists public.cat_sightings (
  cat_id uuid not null,
  device_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (cat_id, device_id)
);

alter table public.cat_sightings enable row level security;

drop policy if exists "anyone can add a sighting" on public.cat_sightings;
create policy "anyone can add a sighting"
on public.cat_sightings
for insert
to anon, authenticated
with check (true);

grant insert on public.cat_sightings to anon, authenticated;

-- Public view: coordinates rounded to 3 decimals (about 100 m) so a cat logged at
-- someone's door does not publish their address. Map links can embed exact
-- coordinates, so they are no longer public either.
drop view if exists public.public_cat_cards;
create or replace view public.public_cat_cards as
with sighting_counts as (
  select cat_id, count(*)::integer as seen_count
  from public.cat_sightings
  group by cat_id
)
select
  cards.id,
  cards.catdex_number,
  cards.public_number,
  cards.cat_name,
  cards.cat_feature_note,
  cards.image_data,
  cards.hero_image_data,
  cards.encountered_at,
  cards.location_name,
  null::text as location_map_url,
  round(cards.lat::numeric, 3)::double precision as lat,
  round(cards.lng::numeric, 3)::double precision as lng,
  cards.personality_tags,
  cards.care_status_tags,
  cards.spot_note,
  coalesce(sighting_counts.seen_count, 0) as seen_count,
  cards.created_at,
  cards.updated_at
from public.cat_cards as cards
left join sighting_counts on sighting_counts.cat_id = cards.id
where cards.is_public = true
  and cards.lat is not null
  and cards.lng is not null
union all
select
  rescue.id,
  rescue.catdex_number,
  rescue.public_number,
  rescue.cat_name,
  null::text as cat_feature_note,
  rescue.image_data,
  rescue.hero_image_data,
  rescue.encountered_at,
  rescue.location_name,
  null::text as location_map_url,
  round(rescue.lat::numeric, 3)::double precision as lat,
  round(rescue.lng::numeric, 3)::double precision as lng,
  rescue.personality_tags,
  rescue.care_status_tags,
  null::text as spot_note,
  coalesce(sighting_counts.seen_count, 0) as seen_count,
  rescue.created_at,
  rescue.updated_at
from public.launch_rescue_cat_cards as rescue
left join sighting_counts on sighting_counts.cat_id = rescue.id;

grant select on public.public_cat_cards to anon, authenticated;
