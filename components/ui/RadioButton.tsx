import { Pressable, StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/constants';

interface RadioButtonProps {
  selected: boolean;
  onPress?: () => void;
}

export function RadioButton({ selected, onPress }: RadioButtonProps) {
  return (
    <Pressable style={styles.container} hitSlop={spacing.xs} onPress={onPress}>
      <View style={[styles.ring, selected && styles.ringSelected]}>
        {selected && <View style={styles.dot} />}
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
  ring: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.grey[300],
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringSelected: {
    borderColor: colors.primary,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
});
