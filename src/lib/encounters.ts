import type { CatEncounter } from '../store/useScrapbookStore';

/** Newest first; encounters added later may carry earlier dates when backfilled. */
export const sortEncounters = (encounters: CatEncounter[] = []) => (
  [...encounters].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
);
