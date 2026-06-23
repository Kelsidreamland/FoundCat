-- Enable cat feature notes in cloud backup and the public world map view.
-- spot_note remains private and is intentionally not exposed in public.public_cat_cards.

alter table public.cat_cards
add column if not exists cat_feature_note text;

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
  lat,
  lng,
  personality_tags,
  care_status_tags,
  created_at,
  updated_at
from public.launch_rescue_cat_cards;

grant select on public.public_cat_cards to anon, authenticated;
