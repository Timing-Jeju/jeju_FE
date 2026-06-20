export const fontFamily = {
  regular: 'Pretendard-Regular',
  medium: 'Pretendard-Medium',
  bold: 'Pretendard-Bold',
  extraBold: 'Pretendard-ExtraBold',
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  bold: '700',
  extraBold: '800',
} as const;

export const fontSize = {
  '3xs': 10,
  '2xs': 11,
  xs: 12,
  sm: 13,
  md: 14,
  lg: 16,
  '2xl': 18,
  '3xl': 20,
  '4xl': 22,
} as const;

export const lineHeight = {
  xs: 16,
  sm: 18,
  md: 20,
  lg: 22,
  xl: 24,
  '2xl': 26,
  '3xl': 30,
} as const;

export const letterSpacing = {
  common: 0,
  narrow: -0.6,
} as const;
