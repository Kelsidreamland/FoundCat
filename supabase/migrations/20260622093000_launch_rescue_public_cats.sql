-- Temporary launch rescue path.
-- Lets older local-only PWA cat cards with coordinates enter the public world map
-- without weakening authenticated private backup writes in public.cat_cards.

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
create policy "launch rescue cat cards insertable during launch"
on public.launch_rescue_cat_cards for insert to anon, authenticated
with check (
  image_data <> ''
  and lat between -90 and 90
  and lng between -180 and 180
);

drop trigger if exists set_launch_rescue_cat_cards_updated_at on public.launch_rescue_cat_cards;
create trigger set_launch_rescue_cat_cards_updated_at
before update on public.launch_rescue_cat_cards
for each row
execute function public.set_updated_at();

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
  image_data,
  hero_image_data,
  encountered_at,
  location_name,
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
  image_data,
  hero_image_data,
  encountered_at,
  location_name,
  lat,
  lng,
  personality_tags,
  care_status_tags,
  created_at,
  updated_at
from public.launch_rescue_cat_cards;

grant select on public.public_cat_cards to anon, authenticated;
grant insert on public.launch_rescue_cat_cards to anon, authenticated;
