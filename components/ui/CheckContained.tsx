import { Pressable, StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/constants';
import { CheckMark } from './CheckMark';

interface CheckContainedProps {
  checked: boolean;
  onPress?: () => void;
}

export function CheckContained({ checked, onPress }: CheckContainedProps) {
  return (
    <Pressable style={styles.container} hitSlop={spacing.xs} onPress={onPress}>
      <View
        style={[
          styles.circle,
          checked ? styles.circleChecked : styles.circleUnchecked,
        ]}
      >
        <CheckMark color={checked ? colors.white : colors.grey[300]} size={8} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleUnchecked: {
    borderWidth: 1.5,
    borderColor: colors.grey[300],
  },
  circleChecked: {
    backgroundColor: colors.primary,
  },
});
