-- Publish spot_note as the public encounter clue while keeping private notes owner-only.

alter table public.cat_cards
add column if not exists private_note text;

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
