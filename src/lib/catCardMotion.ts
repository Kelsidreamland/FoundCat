const RESTING_CARD_SHADOW = '7px 8px 0 #1d1714';
const LIFTED_CARD_SHADOW = '9px 11px 0 rgba(47, 95, 179, 0.82)';

export function getPaperCardDragVisuals(reduced: boolean | null) {
  if (reduced) {
    return {
      rotate: [0, 0, 0],
      scale: [1, 1, 1],
      shadow: [RESTING_CARD_SHADOW, RESTING_CARD_SHADOW, RESTING_CARD_SHADOW],
    };
  }

  return {
    rotate: [-8, -1.2, 8],
    scale: [1.015, 1, 1.015],
    shadow: [LIFTED_CARD_SHADOW, RESTING_CARD_SHADOW, LIFTED_CARD_SHADOW],
  };
}
