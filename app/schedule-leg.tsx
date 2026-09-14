import { PLANNER_AVAILABLE } from '@/services/plannerAvailability';
import {
  NaverMapMarkerOverlay,
  NaverMapView,
} from '@mj-studio/react-native-naver-map';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Fragment, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
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
  BusTag,
  Button,
  ConfirmModal,
  Divider,
  MetaRow,
  Numbering,
  RouteTitle,
  ScreenHeader,
  Tag,
  Text,
  TransportIcon,
} from '@/components/ui';
import {
  colors,
  fontFamily,
  fontSize,
  grid,
  lineHeight,
  radius,
  spacing,
  transport,
} from '@/constants';
import { openNaverDestinationNavigation } from '@/services/externalNavigation';
import type { Coord } from '@/services/naverApi';
import { useScheduleStore, type RouteLeg } from '@/store/useScheduleStore';
import { formatTime } from '@/utils/date';
import { buildAlternatives } from '@/utils/schedule';

// Figma 디자인 전용 색상 (constants 팔레트에 없는 값)
const CARD_BORDER = '#E9EAED';
const TRACK_BACKGROUND = '#D9D9D9';

const locationIcon = require('../assets/images/icon-location.png');
const busIcon = require('../assets/images/icon-bus.png');
const infoIcon = require('../assets/images/icon-info-circle.png');
const trashIcon = require('../assets/images/icon-trash.png');
const trashIllust = require('../assets/images/illust-trash.png');
const pinMarker = require('../assets/images/pin-marker.png');

/** 지도 마커 크기 (UpcomingScheduleCard의 핀과 같은 크기로 맞춘다) */
const MARKER_SIZE = 32;

/**
 * 핀 이미지 아래에 투명 여백이 7/96 만큼 있어서 기본 앵커(y: 1)로는 핀 끝이
 * 좌표보다 위에 찍힌다. 불투명 영역의 밑변(89/96)을 앵커로 잡아 끝을 맞춘다.
 */
const MARKER_ANCHOR = { x: 0.5, y: 89 / 96 };

const INITIAL_CAMERA = {
  latitude: 33.5104,
  longitude: 126.5219,
  zoom: 11,
};

const MAP_HEIGHT = 302;

/* -------------------------------- 이동 진행 바 -------------------------------- */

/** 구간 전체에서 버스 이동이 차지하는 비율을 보여주는 막대 */
function ProgressTrack() {
  return (
    <View style={styles.track}>
      <View style={styles.trackWalk} />
      <View style={styles.trackRide}>
        <View style={styles.trackIconWrap}>
          <Image source={busIcon} style={styles.trackIcon} />
        </View>
      </View>
    </View>
  );
}

/* ------------------------------------ 화면 ----------------------------------- */

function ScheduleLegScreenContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ day?: string; legId?: string }>();
  const day = Number(params.day) || 1;

  const reviews = useScheduleStore((state) => state.reviews);
  const setLegs = useScheduleStore((state) => state.setLegs);
  const removeLegs = useScheduleStore((state) => state.removeLegs);

  const [selectedAlternative, setSelectedAlternative] = useState<string | null>(
    null,
  );
  const [deleteVisible, setDeleteVisible] = useState(false);

  const candidateReview = reviews[day];
  const review =
    PLANNER_AVAILABLE || candidateReview?.serverBacked
      ? candidateReview
      : undefined;
  const legs = review?.legs ?? [];
  const legIndex = legs.findIndex((item) => item.id === params.legId);
  const leg: RouteLeg | undefined = legs[legIndex];

  const alternatives = useMemo(
    () => (leg ? buildAlternatives(leg) : []),
    [leg],
  );

  const fromCoord = leg?.fromCoord ?? null;
  const toCoord = leg?.toCoord ?? null;

  if (!leg) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScreenHeader title="상세 일정" />
        <View style={styles.emptyArea}>
          <Text style={styles.emptyText}>
            {PLANNER_AVAILABLE
              ? '일정 정보를 찾을 수 없어요.'
              : '구간 상세는 준비 중이에요.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const markers = [
    { label: '출발', name: leg.from, coord: fromCoord },
    { label: '도착', name: leg.to, coord: toCoord },
  ].filter((marker): marker is { label: string; name: string; coord: Coord } =>
    Boolean(marker.coord),
  );

  const handleApply = () => {
    const alternative = alternatives.find(
      (item) => item.id === selectedAlternative,
    );
    if (!alternative) return;

    // 고른 대안의 시간 / 비용으로 구간을 갈아끼운다
    const next = legs.map((item) =>
      item.id === leg.id
        ? {
            ...item,
            startTime: alternative.startTime,
            endTime: alternative.endTime,
            cost: alternative.cost,
            status: 'positive' as const,
            reason: null,
          }
        : item,
    );
    setLegs(day, next);
    router.back();
  };

  const handleOpenDestination = () => {
    if (!toCoord) return;
    void openNaverDestinationNavigation({ name: leg.to, coord: toCoord }).catch(
      (error: unknown) => {
        Alert.alert(
          '길찾기를 열 수 없어요',
          error instanceof Error
            ? error.message
            : '잠시 후 다시 시도해 주세요.',
        );
      },
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="상세 일정" />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 96 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* 구간 제목 + 삭제 */}
        <View style={styles.titleArea}>
          <View style={styles.titleRow}>
            <View style={styles.titleGroup}>
              <Numbering status={leg.status} text={String(legIndex + 1)} />
              <RouteTitle from={leg.from} to={leg.to} size="xl" />
              {leg.status !== 'positive' && <Tag status={leg.status} />}
            </View>
            <Pressable
              hitSlop={spacing.xs}
              onPress={() => {
                if (review?.serverBacked) {
                  Alert.alert(
                    '준비 중이에요',
                    '서버 일정 삭제는 일정 입력 화면에서 진행해 주세요.',
                  );
                  return;
                }
                setDeleteVisible(true);
              }}
            >
              <Image source={trashIcon} style={styles.trashIcon} />
            </Pressable>
          </View>
          <MetaRow
            items={[
              `${formatTime(leg.startTime)} - ${formatTime(leg.endTime)}`,
              leg.cost === null
                ? '요금 정보 없음'
                : `${leg.cost.toLocaleString()}원`,
            ]}
          />
        </View>

        {/* 경로 지도 */}
        {Platform.OS === 'web' ? (
          <View style={[styles.map, styles.mapFallback]}>
            <Text style={styles.mapFallbackText}>
              네이버 지도는 iOS / Android에서만 지원됩니다.
            </Text>
          </View>
        ) : (
          <NaverMapView
            style={styles.map}
            initialCamera={
              fromCoord ? { ...fromCoord, zoom: 12 } : INITIAL_CAMERA
            }
          >
            {markers.map((marker) => (
              <NaverMapMarkerOverlay
                key={marker.label}
                latitude={marker.coord.latitude}
                longitude={marker.coord.longitude}
                caption={{ text: `${marker.label} ${marker.name}` }}
                image={pinMarker}
                width={MARKER_SIZE}
                height={MARKER_SIZE}
                anchor={MARKER_ANCHOR}
              />
            ))}
          </NaverMapView>
        )}

        {/* 경유 지점 */}
        <View style={styles.routeArea}>
          <ProgressTrack />
          <View style={styles.routeBox}>
            {leg.steps.map((step, index) => (
              <Fragment key={`${step.kind}-${step.name}-${index}`}>
                <Pressable
                  style={styles.pointRow}
                  disabled={index !== leg.steps.length - 1 || !toCoord}
                  accessibilityRole={
                    index === leg.steps.length - 1 && toCoord
                      ? 'link'
                      : undefined
                  }
                  accessibilityLabel={
                    index === leg.steps.length - 1 && toCoord
                      ? `지도에서 ${leg.to} 길찾기`
                      : undefined
                  }
                  onPress={handleOpenDestination}
                >
                  {step.kind === 'place' ? (
                    <Image source={locationIcon} style={styles.pointIcon} />
                  ) : (
                    <TransportIcon color={step.caution ? 'red' : 'green'} />
                  )}
                  <Text style={styles.pointLabel}>{step.name}</Text>
                  {step.caution && (
                    <Image source={infoIcon} style={styles.cautionIcon} />
                  )}
                </Pressable>
                {index < leg.steps.length - 1 && (
                  <View style={styles.connectorRow}>
                    <View style={styles.connectorLine} />
                    <View style={styles.connectorContent}>
                      {step.buses.length > 0 ? (
                        step.buses.map((bus) => (
                          <View key={bus.text} style={styles.busLine}>
                            <BusTag color={bus.color} text={bus.text} />
                            <Text style={styles.connectorLabel}>
                              {formatTime(leg.startTime)} -{' '}
                              {formatTime(leg.endTime)}
                            </Text>
                            <Text style={styles.connectorLabel}>
                              {leg.cost === null
                                ? '요금 정보 없음'
                                : `${leg.cost.toLocaleString()}원`}
                            </Text>
                          </View>
                        ))
                      ) : (
                        <Text style={styles.connectorLabel}>
                          {step.detail ?? `도보 ${leg.distanceText}`}
                        </Text>
                      )}
                    </View>
                  </View>
                )}
              </Fragment>
            ))}
          </View>
        </View>

        <Divider />

        {/* 일정 제안 */}
        <View style={styles.suggestArea}>
          <Text style={styles.suggestTitle}>일정 제안</Text>
          {alternatives.map((alternative) => {
            const isSelected = selectedAlternative === alternative.id;
            return (
              <Pressable
                key={alternative.id}
                style={[
                  styles.suggestCard,
                  isSelected && styles.suggestCardSelected,
                ]}
                onPress={() => setSelectedAlternative(alternative.id)}
              >
                <View style={styles.suggestHeader}>
                  <RouteTitle
                    from={alternative.from}
                    to={alternative.to}
                    size="sm"
                  />
                  <Tag status="positive" />
                </View>
                <MetaRow
                  color={colors.grey[900]}
                  items={[
                    alternative.bus ? (
                      <BusTag
                        key="bus"
                        color={alternative.bus.color}
                        text={alternative.bus.text}
                      />
                    ) : (
                      '택시'
                    ),
                    `${formatTime(alternative.startTime)} - ${formatTime(
                      alternative.endTime,
                    )}`,
                    `${alternative.cost.toLocaleString()}원`,
                  ]}
                />
                <View style={styles.suggestDivider} />
                <View style={styles.noteRow}>
                  <Image source={infoIcon} style={styles.noteIcon} />
                  <Text style={styles.noteLabel}>{alternative.note}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View
        style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}
      >
        <Button
          title="변경하기"
          disabled={!selectedAlternative}
          onPress={handleApply}
        />
      </View>

      <ConfirmModal
        visible={deleteVisible}
        image={trashIllust}
        title="해당 일정을 삭제할까요?"
        description="일정을 삭제한 후에는 복구할 수 없어요"
        onCancel={() => setDeleteVisible(false)}
        onConfirm={() => {
          setDeleteVisible(false);
          removeLegs(day, [leg.id]);
          router.back();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    gap: spacing.lg,
  },
  titleArea: {
    alignItems: 'center',
    gap: spacing['2xs'],
    paddingTop: spacing.xs,
  },
  titleRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: grid.pageMargin,
  },
  titleGroup: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  trashIcon: {
    position: 'absolute',
    right: grid.pageMargin,
    width: 24,
    height: 24,
    tintColor: colors.grey[300],
  },
  map: {
    width: '100%',
    height: MAP_HEIGHT,
  },
  mapFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F6F9',
  },
  mapFallbackText: {
    fontSize: fontSize.md,
    color: colors.grey[600],
  },
  routeArea: {
    gap: spacing['3xs'],
    paddingHorizontal: grid.pageMargin,
  },
  track: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackWalk: {
    width: 44,
    height: 12,
    borderRadius: radius['2xs'],
    backgroundColor: TRACK_BACKGROUND,
  },
  trackRide: {
    flex: 1,
    height: 12,
    marginLeft: -4,
    borderRadius: radius['2xs'],
    backgroundColor: transport.green,
    justifyContent: 'center',
  },
  trackIconWrap: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: transport.green,
  },
  trackIcon: {
    width: 12,
    height: 12,
    tintColor: colors.white,
  },
  routeBox: {
    paddingVertical: spacing.xs,
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
  pointIcon: {
    width: 16,
    height: 16,
    tintColor: colors.grey[800],
  },
  pointLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    color: colors.grey[900],
  },
  cautionIcon: {
    width: 20,
    height: 20,
    marginLeft: -spacing.md,
  },
  connectorRow: {
    flexDirection: 'row',
    gap: spacing['2xl'],
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  // 지점과 지점을 잇는 세로선 (아이콘 가운데에 맞춘다)
  connectorLine: {
    width: 1,
    backgroundColor: colors.grey[200],
  },
  connectorContent: {
    flex: 1,
    gap: spacing['3xs'],
  },
  busLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['2xs'],
  },
  connectorLabel: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    lineHeight: lineHeight.sm,
    color: colors.grey[900],
  },
  suggestArea: {
    gap: spacing.xs,
    paddingHorizontal: grid.pageMargin,
  },
  suggestTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    color: colors.grey[900],
  },
  suggestCard: {
    gap: spacing.xs,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: radius.xs,
    backgroundColor: colors.white,
  },
  suggestCardSelected: {
    borderColor: colors.primary,
  },
  suggestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  suggestDivider: {
    width: '100%',
    height: 1,
    backgroundColor: CARD_BORDER,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['2xs'],
  },
  noteIcon: {
    width: 20,
    height: 20,
    tintColor: colors.grey[500],
  },
  noteLabel: {
    flex: 1,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.xs,
    color: colors.grey[800],
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: spacing.md,
    paddingHorizontal: grid.pageMargin,
    backgroundColor: colors.white,
  },
  emptyArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.md,
    color: colors.grey[500],
  },
});

export default function ScheduleLegScreen() {
  return <ScheduleLegScreenContent />;
}
