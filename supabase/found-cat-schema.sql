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
  created_at,
  updated_at
from public.launch_rescue_cat_cards;

grant select on public.public_cat_cards to anon, authenticated;
revoke insert on public.launch_rescue_cat_cards from anon, authenticated;
