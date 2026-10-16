// One clock for the entrance, independent of media/network completion.
export const HERO_SEQUENCE = {
  lion: 600,
  scoopEnd: 1200,
  content: [1200, 1300, 1400, 1500, 1600],
  navigation: 1600,
  complete: 1800,
} as const;
