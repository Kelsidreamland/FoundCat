-- Allow temporary anonymous manual publish rows to receive public W-numbers.
-- This is separate from private cat card backup permissions.

grant usage on sequence public.public_cat_cards_number_seq to anon, authenticated;
