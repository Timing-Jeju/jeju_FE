import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { colors, fontFamily, fontSize } from '@/constants';

export default function PlaceholderScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>준비 중이에요</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  text: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['2xl'],
    color: colors.grey[400],
  },
});
