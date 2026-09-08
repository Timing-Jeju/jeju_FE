import { useRouter } from 'expo-router';
import { Image, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Text } from '@/components/ui';
import { colors, fontFamily, fontSize, spacing } from '@/constants';
import { PLANNER_UNAVAILABLE_MESSAGE } from '@/services/plannerAvailability';

export function PlannerUnavailable() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Image
          source={require('../assets/images/illust-pin.png')}
          style={styles.image}
        />
        <Text style={styles.title}>일정 서비스 준비 중</Text>
        <Text style={styles.message}>{PLANNER_UNAVAILABLE_MESSAGE}</Text>
        <Button
          title="일정 입력으로 돌아가기"
          onPress={() => router.replace('/(tabs)/calendar')}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white, justifyContent: 'center' },
  content: { padding: spacing.xl, gap: spacing.lg, alignItems: 'center' },
  image: { width: 130, height: 91, resizeMode: 'contain' },
  title: { fontFamily: fontFamily.semiBold, fontSize: fontSize['2xl'] },
  message: { textAlign: 'center', fontSize: fontSize.md },
});
