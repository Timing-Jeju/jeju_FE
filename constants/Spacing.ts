export const spacing = {
  none: 0,
  '4xs': 1,
  '3xs': 2,
  '2xs': 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 36,
  '4xl': 48,
} as const;

export const radius = {
  none: 0,
  '3xs': 4,
  '2xs': 8,
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  '2xl': 40,
  circle: 999,
} as const;

export const grid = {
  columns: 4,
  gutterWidth: 8,
  columnWidth: 79.5,
  containerMaxWidth: 342,
  pageMargin: 16,
} as const;
