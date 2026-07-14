import { Pressable, StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/constants';
import { CheckMark } from './CheckMark';

interface CheckboxProps {
  checked: boolean;
  onPress?: () => void;
  /** box: 사각 박스형, check: 체크 표시만 */
  type?: 'box' | 'check';
}

export function Checkbox({ checked, onPress, type = 'box' }: CheckboxProps) {
  return (
    <Pressable style={styles.container} hitSlop={spacing.xs} onPress={onPress}>
      {type === 'check' ? (
        <CheckMark
          color={checked ? colors.primary : colors.grey[300]}
          size={12}
        />
      ) : (
        <View
          style={[
            styles.box,
            checked ? styles.boxChecked : styles.boxUnchecked,
          ]}
        >
          <CheckMark color={checked ? colors.white : colors.grey[300]} />
        </View>
      )}
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
  box: {
    width: 20,
    height: 20,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxUnchecked: {
    borderWidth: 1.5,
    borderColor: colors.grey[300],
  },
  boxChecked: {
    backgroundColor: colors.primary,
  },
});
