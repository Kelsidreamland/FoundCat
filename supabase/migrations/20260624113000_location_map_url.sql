-- Preserve original Google Maps links for cat navigation.
-- This lets cards keep a clean display name while "go find this cat" can open the exact saved map link.

alter table public.cat_cards
add column if not exists location_map_url text;

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
