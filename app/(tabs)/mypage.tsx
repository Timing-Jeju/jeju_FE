import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Image,
  ImageSourcePropType,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConfirmModal, Text } from '@/components/ui';
import {
  colors,
  fontFamily,
  fontSize,
  grid,
  lineHeight,
  radius,
  spacing,
} from '@/constants';
import { useUserStore } from '@/store/useUserStore';

// Figma 디자인 전용 색상 (constants 팔레트에 없는 값)
const BACKGROUND = '#FAFAFA';
const BADGE_BACKGROUND = '#F5F6F9';
const BADGE_BORDER = '#D0D1D4';
const SUB_TEXT = '#747476';

const APP_VERSION = 'v1.0.0';

const avatarIllust = require('../../assets/images/illust-avatar.png');
const warningIllust = require('../../assets/images/illust-warning.png');
// 바로가기 3칸은 주황 외곽선 아이콘을 쓴다 (네비게이션 바의 채움 아이콘과 다름)
const calendarOutlineIcon = require('../../assets/images/icon-calendar-outline.png');
const heartOutlineIcon = require('../../assets/images/icon-heart-outline.png');
const bellIcon = require('../../assets/images/icon-bell.png');
const lockIcon = require('../../assets/images/icon-lock.png');
const bookIcon = require('../../assets/images/icon-book.png');
const infoIcon = require('../../assets/images/icon-info.png');
const headsetIcon = require('../../assets/images/icon-headset.png');
const phoneIcon = require('../../assets/images/icon-phone.png');
const logoutIcon = require('../../assets/images/icon-logout.png');
const chevronRightIcon = require('../../assets/images/icon-chevron-right.png');

interface ShortcutProps {
  icon: ImageSourcePropType;
  label: string;
  onPress?: () => void;
}

function Shortcut({ icon, label, onPress }: ShortcutProps) {
  return (
    <Pressable style={styles.shortcut} onPress={onPress}>
      <Image source={icon} style={styles.shortcutIcon} />
      <Text style={styles.shortcutLabel}>{label}</Text>
    </Pressable>
  );
}

interface MenuRowProps {
  icon: ImageSourcePropType;
  label: string;
  /** 지정 시 화살표 대신 값을 보여준다 (앱정보 버전) */
  value?: string;
  onPress?: () => void;
}

function MenuRow({ icon, label, value, onPress }: MenuRowProps) {
  return (
    <Pressable style={styles.menuRow} onPress={onPress} disabled={!onPress}>
      <View style={styles.menuLabelGroup}>
        <Image source={icon} style={styles.menuIcon} />
        <Text style={styles.menuLabel}>{label}</Text>
      </View>
      {value !== undefined ? (
        <Text style={styles.menuValue}>{value}</Text>
      ) : (
        <Image source={chevronRightIcon} style={styles.chevronIcon} />
      )}
    </Pressable>
  );
}

export default function MypageScreen() {
  const router = useRouter();

  const userName = useUserStore((state) => state.userName);
  const userId = useUserStore((state) => state.userId);
  const logout = useUserStore((state) => state.logout);

  const [logoutVisible, setLogoutVisible] = useState(false);

  // TODO: 준비 중인 메뉴는 화면 연동 전까지 안내만 띄운다
  const showPreparing = () =>
    Alert.alert('준비 중이에요', '해당 기능을 준비하고 있어요.');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profile}>
          <Image source={avatarIllust} style={styles.avatar} />
          <View style={styles.profileText}>
            <Text style={styles.nickname}>{userName ?? '제주도굿'}</Text>
            <Text style={styles.userId}>{userId ?? 'jejujoa123'}</Text>
            <Pressable style={styles.editBadge} onPress={showPreparing}>
              <Text style={styles.editBadgeLabel}>정보 수정</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.shortcutCard}>
          <Shortcut
            icon={calendarOutlineIcon}
            label="내 일정"
            onPress={() => router.navigate('/(tabs)/calendar')}
          />
          <View style={styles.shortcutDivider} />
          <Shortcut
            icon={heartOutlineIcon}
            label="찜한 장소"
            onPress={() => router.navigate('/(tabs)/favorite')}
          />
          <View style={styles.shortcutDivider} />
          <Shortcut icon={bellIcon} label="알림" onPress={showPreparing} />
        </View>

        <View style={styles.menuCard}>
          <MenuRow icon={bellIcon} label="알림설정" onPress={showPreparing} />
          <MenuRow
            icon={lockIcon}
            label="비밀번호 재설정"
            onPress={() =>
              router.push({
                pathname: '/find-account',
                params: { tab: 'password' },
              })
            }
          />
          <MenuRow icon={bookIcon} label="이용안내" onPress={showPreparing} />
          <MenuRow icon={infoIcon} label="공지사항" onPress={showPreparing} />
          <MenuRow
            icon={headsetIcon}
            label="고객센터"
            onPress={showPreparing}
          />
          <MenuRow icon={phoneIcon} label="앱정보" value={APP_VERSION} />
        </View>

        <View style={styles.accountGroup}>
          <Pressable
            style={styles.accountButton}
            onPress={() => setLogoutVisible(true)}
          >
            <Image source={logoutIcon} style={styles.menuIcon} />
            <Text style={styles.menuLabel}>로그아웃</Text>
          </Pressable>
          <Pressable
            style={styles.accountButton}
            onPress={() => router.push('/withdraw')}
          >
            <Text style={styles.menuLabel}>계정삭제</Text>
          </Pressable>
        </View>

        <Text style={styles.copyright}>
          © 2026 Timing Jeju. All rights reserved.
        </Text>
      </ScrollView>

      <ConfirmModal
        visible={logoutVisible}
        image={warningIllust}
        title="로그아웃 하시겠어요?"
        confirmTitle="확인"
        onCancel={() => setLogoutVisible(false)}
        onConfirm={() => {
          setLogoutVisible(false);
          logout();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  content: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: grid.pageMargin,
    paddingTop: spacing.xl,
    paddingBottom: spacing['2xl'],
  },
  profile: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  profileText: {
    alignItems: 'center',
    gap: 6,
  },
  nickname: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['3xl'],
    lineHeight: lineHeight['2xl'],
    color: colors.grey[900],
  },
  userId: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    color: colors.grey[700],
  },
  editBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing['2xs'],
    borderRadius: radius.circle,
    borderWidth: 1,
    borderColor: BADGE_BORDER,
    backgroundColor: BADGE_BACKGROUND,
  },
  editBadgeLabel: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    lineHeight: lineHeight.sm,
    color: SUB_TEXT,
  },
  shortcutCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 44,
    paddingVertical: spacing.md,
    borderRadius: radius['2xs'],
    backgroundColor: colors.white,
  },
  shortcut: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  shortcutIcon: {
    width: 24,
    height: 24,
    tintColor: colors.primary,
  },
  shortcutLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.xs,
    color: colors.grey[900],
  },
  shortcutDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.grey[100],
  },
  menuCard: {
    width: '100%',
    borderRadius: radius['2xs'],
    backgroundColor: colors.white,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  menuRow: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  menuLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  menuIcon: {
    width: 20,
    height: 20,
  },
  menuLabel: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    color: colors.grey[900],
  },
  menuValue: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    color: SUB_TEXT,
  },
  chevronIcon: {
    width: 24,
    height: 24,
  },
  accountGroup: {
    width: '100%',
    gap: spacing['2xs'],
  },
  accountButton: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radius['2xs'],
    borderWidth: 1,
    borderColor: colors.grey[100],
    backgroundColor: colors.white,
  },
  copyright: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize['3xs'],
    lineHeight: lineHeight.sm,
    color: colors.grey[400],
    textAlign: 'center',
  },
});
