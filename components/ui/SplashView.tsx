import { Image, StyleSheet, useWindowDimensions, View } from 'react-native';

import { colors, fontFamily, fontSize, spacing } from '@/constants';
import { Text } from './Text';

const splashIllust = require('../../assets/images/illust-splash.png');

// Figma 스플래시 프레임(374 x 812) 기준 좌표 — 화면 크기에 비례해 환산한다
const DESIGN_WIDTH = 374;
const DESIGN_HEIGHT = 812;
const TEXT_TOP = 256;
const ILLUST_WIDTH = 609.5;
const ILLUST_HEIGHT = 574.5;
const ILLUST_TOP = 442.77;

// 로고 워드마크 전용 크기 (fontSize 스케일에 없는 값)
const LOGO_FONT_SIZE = 33;

export function SplashView() {
  const { width, height } = useWindowDimensions();
  const scale = width / DESIGN_WIDTH;
  const illustWidth = ILLUST_WIDTH * scale;
  const illustHeight = ILLUST_HEIGHT * scale;

  return (
    <View style={styles.container}>
      {/*
       * 일러스트는 디자인에서도 화면 아래로 잘려 나가므로 하단을 기준으로 고정한다.
       * 상단 기준으로 두면 화면이 길어질수록 감귤과 바닥 사이가 벌어진다.
       */}
      <Image
        source={splashIllust}
        resizeMode="contain"
        style={[
          styles.illust,
          {
            width: illustWidth,
            height: illustHeight,
            marginLeft: -illustWidth / 2,
            bottom: (DESIGN_HEIGHT - ILLUST_TOP - ILLUST_HEIGHT) * scale,
          },
        ]}
      />
      <View
        style={[styles.textBlock, { top: height * (TEXT_TOP / DESIGN_HEIGHT) }]}
      >
        <Text style={styles.tagline}>지금 딱 제주 갈 타이밍,</Text>
        <Text style={styles.logo}>Timing Jeju</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    overflow: 'hidden',
  },
  illust: {
    position: 'absolute',
    left: '50%',
  },
  textBlock: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: spacing.xs,
  },
  tagline: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize['2xl'],
    color: colors.white,
    textAlign: 'center',
  },
  logo: {
    fontFamily: fontFamily.display,
    fontSize: LOGO_FONT_SIZE,
    color: colors.white,
    textAlign: 'center',
  },
});
