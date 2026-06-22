-- Give the public world map its own stable numbering.
-- Private catdex numbers stay per user/device; public_number is global.

alter table public.cat_cards
add column if not exists public_number integer;

create sequence if not exists public.public_cat_cards_number_seq;

with numbered_public_cats as (
  select
    id,
    row_number() over (order by created_at asc, id asc) as assigned_number
  from public.cat_cards
  where is_public = true
    and public_number is null
)
update public.cat_cards as cat_cards
set public_number = numbered_public_cats.assigned_number
from numbered_public_cats
where cat_cards.id = numbered_public_cats.id;

select setval(
  'public.public_cat_cards_number_seq',
  greatest(coalesce((select max(public_number) from public.cat_cards), 0), 1),
  coalesce((select max(public_number) from public.cat_cards), 0) > 0
);

create unique index if not exists cat_cards_public_number_unique_idx
on public.cat_cards(public_number)
where public_number is not null;

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
  and lng is not null;

grant select on public.public_cat_cards to anon, authenticated;
