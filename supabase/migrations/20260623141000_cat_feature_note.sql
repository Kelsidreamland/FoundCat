-- Store a short human-written feature note for each cat.
-- This is separate from spot_note: feature note describes the cat's look or behavior,
-- while spot_note describes where/when the cat is usually found.

alter table public.cat_cards
add column if not exists cat_feature_note text;

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
  cat_feature_note,
  created_at,
  updated_at
from public.cat_cards
where is_public = true
  and lat is not null
  and lng is not null;

grant select on public.public_cat_cards to anon, authenticated;
