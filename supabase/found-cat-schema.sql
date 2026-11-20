-- FOUND CAT cloud MVP schema.
-- Run in Supabase SQL editor after creating the project.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles are readable by owner" on public.profiles;
create policy "profiles are readable by owner"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "profiles are editable by owner" on public.profiles;
create policy "profiles are editable by owner"
on public.profiles for all
using (auth.uid() = id)
with check (auth.uid() = id);

create table if not exists public.cat_cards (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  catdex_number integer,
  public_number integer,
  cat_name text,
  cat_feature_note text,
  image_data text not null,
  hero_image_data text,
  encountered_at timestamptz not null,
  location_name text,
  location_address text,
  location_place_id text,
  location_map_url text,
  lat double precision,
  lng double precision,
  personality_tags text[] not null default '{}',
  care_status_tags text[] not null default '{}',
  spot_note text,
  private_note text,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cat_cards_owner_id_idx on public.cat_cards(owner_id);
create index if not exists cat_cards_public_location_idx on public.cat_cards(is_public, lat, lng);
create index if not exists cat_cards_updated_at_idx on public.cat_cards(updated_at desc);
create unique index if not exists cat_cards_public_number_unique_idx
on public.cat_cards(public_number)
where public_number is not null;

create table if not exists public.launch_rescue_cat_cards (
  id uuid primary key default gen_random_uuid(),
  local_item_id text not null,
  source_fingerprint text not null unique,
  catdex_number integer,
  public_number integer,
  cat_name text,
  image_data text not null,
  hero_image_data text,
  encountered_at timestamptz not null,
  location_name text,
  lat double precision not null,
  lng double precision not null,
  personality_tags text[] not null default '{}',
  care_status_tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists launch_rescue_cat_cards_public_number_unique_idx
on public.launch_rescue_cat_cards(public_number)
where public_number is not null;

alter table public.launch_rescue_cat_cards enable row level security;

drop policy if exists "launch rescue cat cards insertable during launch" on public.launch_rescue_cat_cards;

alter table public.cat_cards enable row level security;

drop policy if exists "cat cards readable by owner or public" on public.cat_cards;
drop policy if exists "cat cards readable by owner" on public.cat_cards;
create policy "cat cards readable by owner"
on public.cat_cards for select
using (owner_id = auth.uid());

drop policy if exists "cat cards insertable by owner" on public.cat_cards;
create policy "cat cards insertable by owner"
on public.cat_cards for insert
with check (owner_id = auth.uid());

drop policy if exists "cat cards editable by owner" on public.cat_cards;
create policy "cat cards editable by owner"
on public.cat_cards for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "cat cards deletable by owner" on public.cat_cards;
create policy "cat cards deletable by owner"
on public.cat_cards for delete
using (owner_id = auth.uid());

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_cat_cards_updated_at on public.cat_cards;
create trigger set_cat_cards_updated_at
before update on public.cat_cards
for each row
execute function public.set_updated_at();

drop trigger if exists set_launch_rescue_cat_cards_updated_at on public.launch_rescue_cat_cards;
create trigger set_launch_rescue_cat_cards_updated_at
before update on public.launch_rescue_cat_cards
for each row
execute function public.set_updated_at();

create sequence if not exists public.public_cat_cards_number_seq;

create or replace function public.assign_public_cat_number()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and old.public_number is not null and new.public_number is null then
    new.public_number := old.public_number;
  end if;

  if new.is_public = true and new.public_number is null then
    new.public_number := nextval('public.public_cat_cards_number_seq');
  end if;

  return new;
end;
$$;

drop trigger if exists assign_public_cat_number_on_publish on public.cat_cards;
create trigger assign_public_cat_number_on_publish
before insert or update on public.cat_cards
for each row
execute function public.assign_public_cat_number();

create or replace function public.assign_launch_rescue_public_cat_number()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and old.public_number is not null and new.public_number is null then
    new.public_number := old.public_number;
  end if;

  if new.public_number is null then
    new.public_number := nextval('public.public_cat_cards_number_seq');
  end if;

  return new;
end;
$$;

drop trigger if exists assign_public_cat_number_on_launch_rescue on public.launch_rescue_cat_cards;
create trigger assign_public_cat_number_on_launch_rescue
before insert or update on public.launch_rescue_cat_cards
for each row
execute function public.assign_launch_rescue_public_cat_number();

drop view if exists public.public_cat_cards;
create or replace view public.public_cat_cards as
select
  id,
  catdex_number,
  public_number,
  cat_name,
  cat_feature_note,
  image_data,
  hero_image_data,
  encountered_at,
  location_name,
  location_map_url,
  lat,
  lng,
  personality_tags,
  care_status_tags,
  spot_note,
  created_at,
  updated_at
from public.cat_cards
where is_public = true
  and lat is not null
  and lng is not null
union all
select
  id,
  catdex_number,
  public_number,
  cat_name,
  null::text as cat_feature_note,
  image_data,
  hero_image_data,
  encountered_at,
  location_name,
  null::text as location_map_url,
  lat,
  lng,
  personality_tags,
  care_status_tags,
  null::text as spot_note,
  created_at,
  updated_at
from public.launch_rescue_cat_cards;

grant select on public.public_cat_cards to anon, authenticated;
revoke insert on public.launch_rescue_cat_cards from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2026-11-20: encounters backup, approximate public locations, reports, sightings
-- (same as supabase/migrations/20261120090000_public_privacy_reports_sightings.sql)
-- ---------------------------------------------------------------------------
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
