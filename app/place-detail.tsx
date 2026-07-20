import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  ConfirmModal,
  Divider,
  FavoriteMemoModal,
  IndicatorDot,
  LikeIcon,
  PlaceTag,
  Text,
} from '@/components/ui';
import {
  colors,
  fontFamily,
  fontSize,
  lineHeight,
  radius,
  spacing,
} from '@/constants';
import { useFavoriteStore } from '@/store/useFavoriteStore';

// Figma 디자인 전용 색상 (constants 팔레트에 없는 값)
const MEMO_BACKGROUND = '#F5F6F9';

const chevronLeftIcon = require('../assets/images/icon-chevron-left.png');
const timeIcon = require('../assets/images/icon-time.png');
const callIcon = require('../assets/images/icon-call.png');
const mapIcon = require('../assets/images/icon-map.png');
const linkIcon = require('../assets/images/icon-link.png');
const placeholderPlace = require('../assets/images/placeholder-place.png');
const trashIllust = require('../assets/images/illust-trash.png');

// TODO: 장소 상세 API 연동 전 임시 데이터
const MOCK_DETAIL = {
  category: '바다',
  stayMinutes: 180,
  direction: '동쪽',
  openStatus: '영업 중',
  openUntil: '19:00 까지',
  openPeriod: '개장 기간 2026.06.24. ~ 09.06.',
  phone: '064-728-3989',
  link: 'https://www.visitjeju.net/kr/detail/view?',
  intro:
    '함덕해수욕장은 에메랄드빛 바다와 곱고 넓은 백사장이 어우러진 제주의 대표 해수욕장입니다. 주변에 다양한 편의시설이 잘 갖춰져 있어 가족, 연인, 친구와 함께 즐기기 좋은 여행지입니다.',
  usageInfo: [
    { label: '운영시간', value: '09:00 ~ 19:00' },
    { label: '휴무일', value: '연중무휴' },
    { label: '주차', value: '가능' },
    { label: '반려동물', value: '가능 (전용 구역 이용, 목줄 착용 필수)' },
    { label: '입장료', value: '무료' },
    { label: '부대시설', value: '샤워장, 화장실, 탈의실, 음수대' },
    {
      label: '기타 안내',
      value: '여름철 해수욕 안전 수칙을 준수하여 이용해주세요.',
    },
  ],
};

function VerticalDivider() {
  return <View style={styles.verticalDivider} />;
}

export default function PlaceDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ name?: string; address?: string }>();

  const [memoModalVisible, setMemoModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  const name = params.name ?? '함덕해수욕장';
  const address =
    params.address ?? '제주특별자치도 제주시 조천읍 조함해안로 525';

  const favorite = useFavoriteStore((state) =>
    state.favorites.find((place) => place.name === name),
  );
  const addFavorite = useFavoriteStore((state) => state.addFavorite);
  const removeFavorite = useFavoriteStore((state) => state.removeFavorite);
  const liked = favorite !== undefined;

  // 찜 안 한 상태면 메모 모달로 찜하기, 찜한 상태면 삭제 확인 모달을 띄운다
  const handleToggleFavorite = () => {
    if (liked) {
      setDeleteModalVisible(true);
    } else {
      setMemoModalVisible(true);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Image source={placeholderPlace} style={styles.heroImage} />
          <View style={styles.heroIndicator}>
            <IndicatorDot selected />
            <IndicatorDot selected={false} />
            <IndicatorDot selected={false} />
            <IndicatorDot selected={false} />
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <View style={styles.titleGroup}>
              <Text style={styles.title}>{name}</Text>
              <View style={styles.tagRow}>
                <PlaceTag label={`추천 체류 ${MOCK_DETAIL.stayMinutes}분`} />
                {favorite && <PlaceTag label={favorite.visitType} />}
              </View>
            </View>
            <LikeIcon liked={liked} onPress={handleToggleFavorite} />
          </View>

          {favorite && favorite.memo.length > 0 && (
            <View style={styles.memoBox}>
              <Text style={styles.memoText}>{favorite.memo}</Text>
            </View>
          )}

          <View style={styles.infoGroup}>
            <View style={styles.infoRow}>
              <Image source={timeIcon} style={styles.infoIcon} />
              <Text style={styles.infoStrong}>{MOCK_DETAIL.openStatus}</Text>
              <Text style={styles.infoText}>{MOCK_DETAIL.openUntil}</Text>
            </View>
            <Text style={styles.infoSub}>{MOCK_DETAIL.openPeriod}</Text>
            <View style={styles.infoRow}>
              <Image source={callIcon} style={styles.infoIcon} />
              <Text style={styles.infoText}>{MOCK_DETAIL.phone}</Text>
              <Text style={styles.copyText}>복사</Text>
            </View>
            <View style={styles.infoRow}>
              <Image source={mapIcon} style={styles.infoIcon} />
              <Text style={styles.infoText} numberOfLines={1}>
                {address}
              </Text>
              <Text style={styles.copyText}>복사</Text>
            </View>
            <View style={styles.infoRow}>
              <Image source={linkIcon} style={styles.infoIcon} />
              <Text style={styles.linkText} numberOfLines={1}>
                {MOCK_DETAIL.link}
              </Text>
            </View>
          </View>

          <View style={styles.actionBar}>
            <Pressable style={styles.actionItem}>
              <Image source={callIcon} style={styles.infoIcon} />
              <Text style={styles.infoText}>전화하기</Text>
            </Pressable>
            <VerticalDivider />
            <Pressable style={styles.actionItem}>
              <Image source={mapIcon} style={styles.infoIcon} />
              <Text style={styles.infoText}>지도보기</Text>
            </Pressable>
            <VerticalDivider />
            <Pressable style={styles.actionItem}>
              <Image source={linkIcon} style={styles.infoIcon} />
              <Text style={styles.infoText}>홈페이지</Text>
            </Pressable>
          </View>

          <Divider size="small" />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>소개</Text>
            <Text style={styles.sectionBody}>{MOCK_DETAIL.intro}</Text>
          </View>

          <Divider size="small" />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>이용 안내</Text>
            <View style={styles.usageBox}>
              {MOCK_DETAIL.usageInfo.map((row) => (
                <View key={row.label} style={styles.usageRow}>
                  <Text style={styles.usageLabel}>{row.label}</Text>
                  <VerticalDivider />
                  <Text style={styles.usageValue}>{row.value}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* 뒤로가기 */}
      <SafeAreaView style={styles.backArea} edges={['top']}>
        <Pressable
          style={styles.backButton}
          hitSlop={spacing.xs}
          onPress={() => router.back()}
        >
          <Image source={chevronLeftIcon} style={styles.backIcon} />
        </Pressable>
      </SafeAreaView>

      {/* 장소 찜하기 / 찜하기 취소 */}
      <View
        style={[styles.footer, { paddingBottom: insets.bottom + spacing.xs }]}
      >
        <Pressable
          style={[styles.likeButton, liked && styles.likeButtonActive]}
          onPress={handleToggleFavorite}
        >
          <Text style={styles.likeButtonLabel}>
            {liked ? '찜하기 취소' : '장소 찜하기'}
          </Text>
        </Pressable>
      </View>

      <FavoriteMemoModal
        visible={memoModalVisible}
        onClose={() => setMemoModalVisible(false)}
        onSave={(visitType, memo) => {
          addFavorite({
            name,
            category: MOCK_DETAIL.category,
            visitType,
            memo,
            stayMinutes: MOCK_DETAIL.stayMinutes,
            direction: MOCK_DETAIL.direction,
          });
          setMemoModalVisible(false);
        }}
      />

      <ConfirmModal
        visible={deleteModalVisible}
        image={trashIllust}
        title="해당 장소 찜을 삭제할까요?"
        description="찜 목록에서 삭제되며 저장한 메모도 함께 사라져요"
        onCancel={() => setDeleteModalVisible(false)}
        onConfirm={() => {
          removeFavorite(name);
          setDeleteModalVisible(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  hero: {
    width: '100%',
    height: 280,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroIndicator: {
    position: 'absolute',
    bottom: 31,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  body: {
    marginTop: -15,
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.sm,
    borderTopRightRadius: radius.sm,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  titleGroup: {
    gap: spacing['2xs'],
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['2xl'],
    lineHeight: lineHeight.xl,
    color: colors.grey[900],
  },
  tagRow: {
    flexDirection: 'row',
    gap: spacing['2xs'],
  },
  memoBox: {
    width: '100%',
    padding: spacing.xs,
    borderRadius: radius['3xs'],
    backgroundColor: MEMO_BACKGROUND,
  },
  memoText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    lineHeight: lineHeight.sm,
    color: colors.grey[900],
  },
  infoGroup: {
    gap: spacing['2xs'],
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoIcon: {
    width: 16,
    height: 16,
  },
  infoStrong: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    lineHeight: lineHeight.lg,
    color: colors.grey[900],
  },
  infoText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    lineHeight: lineHeight.lg,
    color: colors.grey[900],
    flexShrink: 1,
  },
  infoSub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize['2xs'],
    lineHeight: lineHeight.sm,
    color: colors.grey[700],
    paddingLeft: 22,
  },
  copyText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    lineHeight: lineHeight.lg,
    color: colors.grey[400],
    textDecorationLine: 'underline',
  },
  linkText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    lineHeight: lineHeight.lg,
    color: colors.correct,
    flexShrink: 1,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.grey[100],
    borderRadius: 4,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  verticalDivider: {
    width: 1,
    height: 10,
    backgroundColor: colors.grey[100],
  },
  section: {
    gap: spacing.xs,
  },
  sectionTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    color: colors.grey[900],
  },
  sectionBody: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize['2xs'],
    lineHeight: lineHeight.sm,
    color: colors.grey[900],
  },
  usageBox: {
    width: '100%',
    gap: 2,
    paddingVertical: 6,
    paddingLeft: spacing.sm,
    paddingRight: spacing.xs,
    borderWidth: 1,
    borderColor: colors.grey[100],
    borderRadius: radius['2xs'],
  },
  usageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  usageLabel: {
    width: 44,
    fontFamily: fontFamily.medium,
    fontSize: fontSize['3xs'],
    lineHeight: lineHeight.lg,
    color: colors.grey[900],
  },
  usageValue: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize['3xs'],
    lineHeight: 14,
    color: colors.grey[700],
  },
  backArea: {
    position: 'absolute',
    top: 0,
    left: spacing.md,
  },
  backButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 3,
  },
  backIcon: {
    width: 20,
    height: 20,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingTop: spacing['2xl'],
    backgroundColor: 'transparent',
  },
  likeButton: {
    width: '91%',
    height: 58,
    borderRadius: radius.circle,
    backgroundColor: colors.grey[900],
    alignItems: 'center',
    justifyContent: 'center',
  },
  likeButtonActive: {
    backgroundColor: colors.primary,
  },
  likeButtonLabel: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    lineHeight: lineHeight.xl,
    color: colors.white,
  },
});
