/**
 * Published basic strategy charts (total-dependent, initial two-card hands), transcribed from the
 * standard multi-deck charts (Wizard of Odds / Blackjack Apprenticeship conventions).
 * Columns: dealer 2 3 4 5 6 7 8 9 T A. Rows not listed are all-hit (hard <= 8) or all-stand (hard >= 17
 * except where noted).
 */
export interface PublishedChart {
  hard: Record<number, string>;
  soft: Record<number, string>;
  pairs: Record<number, string>;
}

const HARD_COMMON: Record<number, string> = {
  8: 'H H H H H H H H H H',
  12: 'H H S S S H H H H H',
  13: 'S S S S S H H H H H',
  14: 'S S S S S H H H H H',
  17: 'S S S S S S S S S S',
};

export const CHART_2D_H17_DAS: PublishedChart = {
  hard: {
    ...HARD_COMMON,
    9: 'D D D D D H H H H H',
    10: 'D D D D D D D D H H',
    11: 'D D D D D D D D D D',
    15: 'S S S S S H H H H H',
    16: 'S S S S S H H H H H',
  },
  soft: {
    13: 'H H H D D H H H H H',
    14: 'H H D D D H H H H H',
    15: 'H H D D D H H H H H',
    16: 'H H D D D H H H H H',
    17: 'H D D D D H H H H H',
    18: 'Ds Ds Ds Ds Ds S S H H H',
    19: 'S S S S Ds S S S S S',
    20: 'S S S S S S S S S S',
  },
  pairs: {
    2: 'P P P P P P H H H H',
    3: 'P P P P P P H H H H',
    4: 'H H H P P H H H H H',
    6: 'P P P P P P H H H H',
    7: 'P P P P P P P H H H',
    8: 'P P P P P P P P P P',
    9: 'P P P P P S P P S S',
    10: 'S S S S S S S S S S',
    1: 'P P P P P P P P P P',
  },
};

export const CHART_2D_S17_DAS: PublishedChart = {
  hard: {
    ...HARD_COMMON,
    9: 'D D D D D H H H H H',
    10: 'D D D D D D D D H H',
    11: 'D D D D D D D D D D',
    15: 'S S S S S H H H H H',
    16: 'S S S S S H H H H H',
  },
  soft: {
    13: 'H H H D D H H H H H',
    14: 'H H H D D H H H H H',
    15: 'H H D D D H H H H H',
    16: 'H H D D D H H H H H',
    17: 'H D D D D H H H H H',
    18: 'S Ds Ds Ds Ds S S H H H',
    19: 'S S S S S S S S S S',
  },
  pairs: {
    2: 'P P P P P P H H H H',
    3: 'P P P P P P H H H H',
    4: 'H H H P P H H H H H',
    6: 'P P P P P P H H H H',
    7: 'P P P P P P P H H H',
    8: 'P P P P P P P P P P',
    9: 'P P P P P S P P S S',
    10: 'S S S S S S S S S S',
    1: 'P P P P P P P P P P',
  },
};

export const CHART_6D_H17_DAS_LS: PublishedChart = {
  hard: {
    ...HARD_COMMON,
    9: 'H D D D D H H H H H',
    10: 'D D D D D D D D H H',
    11: 'D D D D D D D D D D',
    15: 'S S S S S H H H Rh Rh',
    16: 'S S S S S H H Rh Rh Rh',
    17: 'S S S S S S S S S Rs',
  },
  soft: {
    13: 'H H H D D H H H H H',
    14: 'H H H D D H H H H H',
    15: 'H H D D D H H H H H',
    16: 'H H D D D H H H H H',
    17: 'H D D D D H H H H H',
    18: 'Ds Ds Ds Ds Ds S S H H H',
    19: 'S S S S Ds S S S S S',
  },
  pairs: {
    2: 'P P P P P P H H H H',
    3: 'P P P P P P H H H H',
    4: 'H H H P P H H H H H',
    6: 'P P P P P H H H H H',
    7: 'P P P P P P H H H H',
    8: 'P P P P P P P P P Rp',
    9: 'P P P P P S P P S S',
    10: 'S S S S S S S S S S',
    1: 'P P P P P P P P P P',
  },
};

export const CHART_6D_S17_DAS_LS: PublishedChart = {
  hard: {
    ...HARD_COMMON,
    9: 'H D D D D H H H H H',
    10: 'D D D D D D D D H H',
    11: 'D D D D D D D D D H',
    15: 'S S S S S H H H Rh H',
    16: 'S S S S S H H Rh Rh Rh',
  },
  soft: {
    13: 'H H H D D H H H H H',
    14: 'H H H D D H H H H H',
    15: 'H H D D D H H H H H',
    16: 'H H D D D H H H H H',
    17: 'H D D D D H H H H H',
    18: 'S Ds Ds Ds Ds S S H H H',
    19: 'S S S S S S S S S S',
  },
  pairs: {
    2: 'P P P P P P H H H H',
    3: 'P P P P P P H H H H',
    4: 'H H H P P H H H H H',
    6: 'P P P P P H H H H H',
    7: 'P P P P P P H H H H',
    8: 'P P P P P P P P P P',
    9: 'P P P P P S P P S S',
    10: 'S S S S S S S S S S',
    1: 'P P P P P P P P P P',
  },
};
