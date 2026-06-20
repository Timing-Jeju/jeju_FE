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

export const colors = {
  primary: orange[500],
  white: '#FFFFFF',
  dim: 'rgba(34, 35, 40, 0.6)',
  warning: '#FF1100',
  orange,
  grey,
} as const;

export default colors;
