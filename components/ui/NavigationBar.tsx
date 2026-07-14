import { Image, Pressable, StyleSheet, View } from 'react-native';

import { colors, radius } from '@/constants';

const TAB_ICON = {
  home: require('../../assets/images/icon-home.png'),
  calendar: require('../../assets/images/icon-calendar.png'),
  favorite: require('../../assets/images/icon-heart-fill.png'),
  mypage: require('../../assets/images/icon-user.png'),
} as const;

export type NavigationTab = keyof typeof TAB_ICON;

const TABS: NavigationTab[] = ['home', 'calendar', 'favorite', 'mypage'];

interface NavigationBarProps {
  activeTab: NavigationTab;
  onTabPress?: (tab: NavigationTab) => void;
}

export function NavigationBar({ activeTab, onTabPress }: NavigationBarProps) {
  return (
    <View style={styles.container}>
      {TABS.map((tab) => {
        const isActive = tab === activeTab;
        return (
          <Pressable
            key={tab}
            style={styles.tab}
            onPress={() => onTabPress?.(tab)}
          >
            <Image
              source={TAB_ICON[tab]}
              style={[
                styles.icon,
                { tintColor: isActive ? colors.white : colors.grey[400] },
              ]}
            />
            <View style={[styles.dot, isActive && styles.dotActive]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 70,
    flexDirection: 'row',
    backgroundColor: colors.grey[900],
    borderTopLeftRadius: radius.sm,
    borderTopRightRadius: radius.sm,
    shadowColor: '#868686',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  icon: {
    width: 24,
    height: 24,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  dotActive: {
    backgroundColor: colors.white,
  },
});
