import { Image, Pressable, StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/constants';

const bellIcon = require('../../assets/images/icon-bell.png');

interface NotificationBellProps {
  /** 새 알림 여부 (우상단 주황 점 표시) */
  hasBadge?: boolean;
  onPress?: () => void;
}

export function NotificationBell({
  hasBadge = false,
  onPress,
}: NotificationBellProps) {
  return (
    <Pressable style={styles.container} hitSlop={spacing.xs} onPress={onPress}>
      <Image source={bellIcon} style={styles.icon} />
      {hasBadge && <View style={styles.badge} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 24,
    height: 24,
    tintColor: colors.grey[900],
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 5.85,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
});
