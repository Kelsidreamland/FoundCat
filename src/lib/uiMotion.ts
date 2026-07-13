export const paperMotion = {
  duration: {
    instant: 0.12,
    quick: 0.18,
    standard: 0.24,
  },
  easeOut: [0.22, 1, 0.36, 1] as const,
  spring: {
    type: 'spring' as const,
    stiffness: 420,
    damping: 34,
    mass: 0.72,
  },
} as const;

export function getPaperSheetMotion(reduced: boolean | null) {
  if (reduced) {
    return {
      backdrop: {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: paperMotion.duration.instant },
      },
      sheet: {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: paperMotion.duration.instant },
      },
    };
  }

  return {
    backdrop: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: {
        duration: paperMotion.duration.quick,
        ease: paperMotion.easeOut,
      },
    },
    sheet: {
      initial: { opacity: 0, y: 26, rotate: -0.8, scale: 0.98 },
      animate: { opacity: 1, y: 0, rotate: -0.35, scale: 1 },
      exit: { opacity: 0, y: 18, rotate: 0, scale: 0.98 },
      transition: paperMotion.spring,
    },
  };
}

export function getPaperNavPress(
  reduced: boolean | null,
  role: 'side' | 'capture'
) {
  if (reduced) return {};

  return role === 'capture'
    ? { y: 2, scale: 0.97 }
    : { y: 2, scale: 0.96 };
}
