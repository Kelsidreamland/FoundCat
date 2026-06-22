-- Close the temporary launch rescue write path after local-only cards were rescued.
-- Existing rescued rows remain visible through public.public_cat_cards.

drop policy if exists "launch rescue cat cards insertable during launch" on public.launch_rescue_cat_cards;
revoke insert on public.launch_rescue_cat_cards from anon, authenticated;
