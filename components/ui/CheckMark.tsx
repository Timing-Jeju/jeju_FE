import { View } from 'react-native';

interface CheckMarkProps {
  color: string;
  size?: number;
  thickness?: number;
}

export function CheckMark({
  color,
  size = 10,
  thickness = 1.5,
}: CheckMarkProps) {
  return (
    <View
      style={{
        width: size,
        height: size * 0.55,
        borderLeftWidth: thickness,
        borderBottomWidth: thickness,
        borderColor: color,
        transform: [{ translateY: -size * 0.12 }, { rotate: '-45deg' }],
      }}
    />
  );
}
