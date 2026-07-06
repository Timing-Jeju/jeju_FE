import { Platform } from 'react-native';

import { Text, TextProps } from './Themed';

const monoFont = Platform.select({ ios: 'Menlo', default: 'monospace' });

export function MonoText(props: TextProps) {
  return <Text {...props} style={[props.style, { fontFamily: monoFont }]} />;
}
