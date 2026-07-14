export const orange = {
  50: '#FFEEE6',
  100: '#FFDDCC',
  200: '#FFBB9A',
  300: '#FF9967',
  400: '#FF7835',
  500: '#FF5602',
  600: '#CC4502',
  700: '#993401',
  800: '#662201',
  900: '#331100',
} as const;

export const grey = {
  50: '#F4F4F4',
  100: '#E9E9EA',
  200: '#D3D3D4',
  300: '#BDBDBF',
  400: '#A7A7A9',
  500: '#919194',
  600: '#7B7B7E',
  700: '#646569',
  800: '#4E4F53',
  900: '#222328',
} as const;

export const red = {
  50: '#FEEAEA',
  500: '#F63131',
} as const;

export const yellow = {
  50: '#FFF9E9',
  500: '#FFCF4C',
  600: '#E8B11C',
} as const;

export const green = {
  50: '#EAF7E9',
  400: '#59BC51',
  500: '#2FAB26',
} as const;

// 대중교통 노선 색상 (BusTag / TransportIcon)
export const transport = {
  green: '#3CC344',
  blue: '#386DE8',
  sky: '#65A6D2',
  red: '#FB5852',
} as const;

export const colors = {
  primary: orange[500],
  white: '#FFFFFF',
  dim: 'rgba(34, 35, 40, 0.6)',
  warning: '#FF5858',
  cautionary: '#FFCF4C',
  positive: '#59BC51',
  correct: '#1174FF',
  orange,
  grey,
  red,
  yellow,
  green,
  transport,
} as const;

export default colors;
