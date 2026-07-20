import { useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import {
  colors,
  fontFamily,
  fontSize,
  grid,
  lineHeight,
  spacing,
} from '@/constants';
import { Text } from './Text';

const chevronLeftIcon = require('../../assets/images/icon-chevron-left.png');

interface ScreenHeaderProps {
  title?: string;
  onBack?: () => void;
  /** 탭 진입 화면처럼 뒤로 갈 곳이 없으면 false */
  showBack?: boolean;
}

export function ScreenHeader({
  title,
  onBack,
  showBack = true,
}: ScreenHeaderProps) {
  const router = useRouter();

  return (
    <View style={styles.header}>
      {showBack && (
        <Pressable
          style={styles.backButton}
          hitSlop={spacing.xs}
          onPress={onBack ?? (() => router.back())}
        >
          <Image source={chevronLeftIcon} style={styles.backIcon} />
        </Pressable>
      )}
      {title !== undefined && <Text style={styles.title}>{title}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    left: grid.pageMargin,
  },
  backIcon: {
    width: 24,
    height: 24,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['2xl'],
    lineHeight: lineHeight.xl,
    color: colors.grey[900],
  },
});
