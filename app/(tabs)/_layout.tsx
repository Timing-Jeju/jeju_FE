import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NavigationBar, type NavigationTab } from '@/components/ui';
import { colors } from '@/constants';

// expo-router 라우트명 ↔ NavigationBar 탭명 매핑
const ROUTE_TO_TAB: Record<string, NavigationTab> = {
  index: 'home',
  calendar: 'calendar',
  favorite: 'favorite',
  mypage: 'mypage',
};

const TAB_TO_ROUTE: Record<NavigationTab, string> = {
  home: 'index',
  calendar: 'calendar',
  favorite: 'favorite',
  mypage: 'mypage',
};

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={({ state, navigation }) => (
        <View style={[styles.tabBarWrap, { paddingBottom: insets.bottom }]}>
          <NavigationBar
            activeTab={ROUTE_TO_TAB[state.routes[state.index].name] ?? 'home'}
            onTabPress={(tab) => navigation.navigate(TAB_TO_ROUTE[tab])}
          />
        </View>
      )}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="calendar" />
      <Tabs.Screen name="favorite" />
      <Tabs.Screen name="mypage" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarWrap: {
    backgroundColor: colors.grey[900],
  },
});
