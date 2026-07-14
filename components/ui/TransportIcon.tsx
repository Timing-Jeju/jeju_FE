import { Image, StyleSheet } from 'react-native';

import { transport } from '@/constants';

const busIcon = require('../../assets/images/icon-bus.png');

export type TransportColor = keyof typeof transport;

interface TransportIconProps {
  color?: TransportColor;
  size?: number;
}

export function TransportIcon({
  color = 'green',
  size = 16,
}: TransportIconProps) {
  return (
    <Image
      source={busIcon}
      style={[
        styles.icon,
        { width: size, height: size, tintColor: transport[color] },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  icon: {
    width: 16,
    height: 16,
  },
});
