import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
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
import { useWeatherForecast } from '@/hooks/useWeatherForecast';
import { getPlace, type PlaceDetail } from '@/services/places';
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
const sunIcon = require('../assets/images/icon-sun.png');

function VerticalDivider() {
  return <View style={styles.verticalDivider} />;
}

export default function PlaceDetailScreen() {
  const params = useLocalSearchParams<{ placeId?: string }>();
  const placeId = typeof params.placeId === 'string' ? params.placeId : '';
  return <PlaceDetailContent key={placeId} placeId={placeId} />;
}

function PlaceDetailContent({ placeId }: { placeId: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loadedDetail, setDetail] = useState<PlaceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [memoModalVisible, setMemoModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const weather = useWeatherForecast(loadedDetail?.placeId ?? null);
  useEffect(() => {
    const controller = new AbortController();
    getPlace(placeId, controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) setDetail(value);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError(
            '장소를 불러오지 못했어요. 이전 항목은 검색에서 다시 선택해 주세요.',
          );
      });
    return () => controller.abort();
  }, [placeId, attempt]);
  const favorite = useFavoriteStore((state) =>
    state.favorites.find((place) => place.placeId === placeId),
  );
  const addFavorite = useFavoriteStore((state) => state.addFavorite);
  const removeFavorite = useFavoriteStore((state) => state.removeFavorite);
  const liked = favorite !== undefined;

  // 찜 안 한 상태면 메모 모달로 찜하기, 찜한 상태면 삭제 확인 모달을 띄운다
  const handleToggleFavorite = () => {
    if (!loadedDetail) {
      if (error) {
        setError(null);
        setAttempt((value) => value + 1);
      }
      return;
    }
    if (liked) {
      setDeleteModalVisible(true);
    } else {
      setMemoModalVisible(true);
    }
  };

  // 로딩/실패에도 기존 상세 레이아웃을 유지한다. 이 표시값은 저장할 수 없다.
  const detail: PlaceDetail = loadedDetail ?? {
    placeId: '',
    name: error ? '장소 정보 미제공' : '불러오는 중',
    roadAddress: '미제공',
    coord: null,
    category: '',
    categoryLabel: '미제공',
    recommendedStayMinutes: null,
    thumbnailUrl: null,
    overview: error,
    contact: { phone: null, homepageUrl: null },
    operations: {
      operatingHoursText: null,
      closedDaysText: null,
      parkingText: null,
      admissionFeeText: null,
    },
  };
  const { name, roadAddress: address, coord } = detail;
  const usageInfo = [
    { label: '운영시간', value: detail.operations.operatingHoursText },
    { label: '휴무일', value: detail.operations.closedDaysText },
    { label: '주차', value: detail.operations.parkingText },
    { label: '반려동물', value: null },
    { label: '입장료', value: detail.operations.admissionFeeText },
    { label: '부대시설', value: null },
    { label: '기타 안내', value: null },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Image
            source={
              detail.thumbnailUrl
                ? { uri: detail.thumbnailUrl }
                : placeholderPlace
            }
            style={styles.heroImage}
          />
          <View
            style={styles.heroIndicator}
            accessible
            accessibilityLabel="추가 사진 준비 중"
          >
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
                <PlaceTag
                  label={
                    detail.recommendedStayMinutes === null
                      ? '추천 체류 시간 미제공'
                      : `추천 체류 ${detail.recommendedStayMinutes}분`
                  }
                />
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
              <Text style={styles.infoStrong}>{'운영 안내'}</Text>
              <Text style={styles.infoText}>
                {detail.operations.operatingHoursText ?? '미제공'}
              </Text>
            </View>
            <Text style={styles.infoSub}>
              {detail.operations.closedDaysText ?? '휴무일 미제공'}
            </Text>
            <View style={styles.infoRow}>
              <Image source={callIcon} style={styles.infoIcon} />
              <Text style={styles.infoText}>
                {detail.contact.phone ?? '미제공'}
              </Text>
              <Text
                style={styles.copyText}
                onPress={() =>
                  Alert.alert(
                    '준비 중이에요',
                    '전화번호 복사는 아직 지원하지 않아요.',
                  )
                }
              >
                복사
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Image source={mapIcon} style={styles.infoIcon} />
              <Text style={styles.infoText} numberOfLines={1}>
                {address}
              </Text>
              <Text
                style={styles.copyText}
                onPress={() =>
                  Alert.alert(
                    '준비 중이에요',
                    '주소 복사는 아직 지원하지 않아요.',
                  )
                }
              >
                복사
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Image source={linkIcon} style={styles.infoIcon} />
              <Text style={styles.linkText} numberOfLines={1}>
                {detail.contact.homepageUrl ?? '미제공'}
              </Text>
            </View>
          </View>

          <View style={styles.actionBar}>
            <Pressable
              style={styles.actionItem}
              onPress={() =>
                Alert.alert(
                  '준비 중이에요',
                  '전화 연결은 아직 지원하지 않아요.',
                )
              }
            >
              <Image source={callIcon} style={styles.infoIcon} />
              <Text style={styles.infoText}>전화하기</Text>
            </Pressable>
            <VerticalDivider />
            <Pressable
              style={styles.actionItem}
              onPress={() =>
                Alert.alert(
                  '준비 중이에요',
                  '상세 화면에서 지도 열기는 아직 지원하지 않아요.',
                )
              }
            >
              <Image source={mapIcon} style={styles.infoIcon} />
              <Text style={styles.infoText}>지도보기</Text>
            </Pressable>
            <VerticalDivider />
            <Pressable
              style={styles.actionItem}
              onPress={() =>
                Alert.alert(
                  '준비 중이에요',
                  '홈페이지 열기는 아직 지원하지 않아요.',
                )
              }
            >
              <Image source={linkIcon} style={styles.infoIcon} />
              <Text style={styles.infoText}>홈페이지</Text>
            </Pressable>
          </View>

          <Divider size="small" />

          {loadedDetail && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>날씨</Text>
              <View style={styles.infoRow}>
                <Image source={sunIcon} style={styles.infoIcon} />
                <Text style={styles.sectionBody}>{weather.message}</Text>
              </View>
            </View>
          )}

          {loadedDetail && <Divider size="small" />}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>소개</Text>
            <Text style={styles.sectionBody}>
              {detail.overview ?? '소개 미제공'}
            </Text>
          </View>

          <Divider size="small" />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>이용 안내</Text>
            <View style={styles.usageBox}>
              {usageInfo.map((row) => (
                <View key={row.label} style={styles.usageRow}>
                  <Text style={styles.usageLabel}>{row.label}</Text>
                  <VerticalDivider />
                  <Text style={styles.usageValue}>{row.value ?? '미제공'}</Text>
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
          disabled={!loadedDetail && !error}
          onPress={handleToggleFavorite}
        >
          <Text style={styles.likeButtonLabel}>
            {!loadedDetail
              ? error
                ? '다시 시도'
                : '불러오는 중'
              : liked
                ? '찜하기 취소'
                : '장소 찜하기'}
          </Text>
        </Pressable>
      </View>

      <FavoriteMemoModal
        visible={memoModalVisible}
        onClose={() => setMemoModalVisible(false)}
        onSave={(visitType, memo) => {
          if (!loadedDetail) return;
          addFavorite({
            placeId: detail.placeId,
            name,
            category: detail.categoryLabel,
            address,
            visitType,
            memo,
            stayMinutes:
              favorite?.stayMinutes ?? detail.recommendedStayMinutes ?? 60,
            direction: '',
            coord,
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
          removeFavorite(placeId);
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
