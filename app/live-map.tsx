import {
  NaverMapMarkerOverlay,
  NaverMapView,
} from '@mj-studio/react-native-naver-map';
import { useRouter } from 'expo-router';
import { Fragment, useMemo, useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BusTag,
  ExpandBar,
  MetaRow,
  RouteTitle,
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
import { useScheduleStore, type RouteLeg } from '@/store/useScheduleStore';
import { formatAmPm } from '@/utils/date';
import { activeReview } from '@/utils/schedule';

// Figma 디자인 전용 색상 (constants 팔레트에 없는 값)
const CARD_BORDER = '#E9EAED';
const CURRENT_BORDER = '#FF9967';

const chevronLeftIcon = require('../assets/images/icon-chevron-left.png');
const restartIcon = require('../assets/images/icon-restart.png');

const INITIAL_CAMERA = {
  latitude: 33.5104,
  longitude: 126.5219,
  zoom: 13,
};

const SHEET_TOP = 353;

/* ------------------------------- 오늘의 일정 카드 ------------------------------ */

interface LiveLegCardProps {
  leg: RouteLeg;
  /** 지금 이동 중인 구간 */
  current: boolean;
  expanded: boolean;
  onToggle: () => void;
}

function LiveLegCard({ leg, current, expanded, onToggle }: LiveLegCardProps) {
  const stops = leg.steps.filter((step) => step.kind === 'stop');

  return (
    <View style={[styles.card, current && styles.cardCurrent]}>
      <View style={styles.cardHeader}>
        <RouteTitle from={leg.from} to={leg.to} color={colors.grey[800]} />
        {current && <Tag status="mono" text="현위치" />}
      </View>

      <MetaRow
        items={[
          <View key="buses" style={styles.busRow}>
            {leg.buses.map((bus) => (
              <BusTag key={bus.text} color={bus.color} text={bus.text} />
            ))}
          </View>,
          `${formatAmPm(leg.startTime)} - ${formatAmPm(leg.endTime)}`,
          leg.distanceText,
        ]}
      />

      {expanded && (
        <View style={styles.stopArea}>
          {/* 이동 중인 구간의 진행 정도 */}
          <View style={styles.progressTrack}>
            <View style={styles.progressIconWrap}>
              <Image source={restartIcon} style={styles.progressIcon} />
            </View>
            <View style={styles.progressFill} />
          </View>

          {stops.map((stop, index) => (
            <Fragment key={`${stop.name}-${index}`}>
              <View style={styles.stopRow}>
                <TransportIcon color={stop.caution ? 'red' : 'green'} />
                <Text style={styles.stopLabel}>
                  {index === 0 ? '출발 버스 승강장' : '도착 버스 승강장'}
                </Text>
              </View>
              {stop.buses.length > 0 && (
                <View style={styles.stopBusList}>
                  {stop.buses.map((bus) => (
                    <View key={bus.text} style={styles.stopBusRow}>
                      <BusTag color={bus.color} text={bus.text} />
                      <Text style={styles.stopBusLabel}>
                        {formatAmPm(leg.startTime)} - {formatAmPm(leg.endTime)}
                      </Text>
                      <Text style={styles.stopBusLabel}>
                        {leg.cost.toLocaleString()}원
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </Fragment>
          ))}
        </View>
      )}

      <ExpandBar expanded={expanded} onPress={onToggle} />
    </View>
  );
}

/* ------------------------------------ 화면 ----------------------------------- */

export default function LiveMapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const reviews = useScheduleStore((state) => state.reviews);

  // TODO: 실제 위치 추적 연동 전에는 오늘 일정의 두 번째 구간을 현위치로 본다
  const legs = useMemo(() => activeReview(reviews)?.legs ?? [], [reviews]);

  const currentLeg = legs[Math.min(1, legs.length - 1)];
  const [expandedId, setExpandedId] = useState<string | null>(
    currentLeg?.id ?? null,
  );

  const currentPlace = currentLeg?.from ?? '위치 확인 중';
  const minutesLeft = currentLeg?.slackMinutes ?? 0;

  // 구간 끝점을 모아 지도에 찍는다 (좌표를 아는 장소만)
  const markers = useMemo(
    () =>
      legs.flatMap((leg) =>
        leg.toCoord ? [{ name: leg.to, coord: leg.toCoord }] : [],
      ),
    [legs],
  );

  return (
    <View style={styles.container}>
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
            currentLeg?.fromCoord
              ? { ...currentLeg.fromCoord, zoom: 13 }
              : INITIAL_CAMERA
          }
          isShowLocationButton={false}
        >
          {markers.map((marker) => (
            <NaverMapMarkerOverlay
              key={marker.name}
              latitude={marker.coord.latitude}
              longitude={marker.coord.longitude}
              caption={{ text: marker.name }}
              tintColor={colors.primary}
            />
          ))}
        </NaverMapView>
      )}

      <Pressable
        style={[styles.backButton, { top: insets.top + spacing.lg }]}
        hitSlop={spacing.xs}
        onPress={() => router.back()}
      >
        <Image source={chevronLeftIcon} style={styles.backIcon} />
      </Pressable>

      <View style={styles.sheet}>
        <View style={styles.handleArea}>
          <View style={styles.handle} />
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.sheetContent,
            { paddingBottom: insets.bottom + spacing['2xl'] },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.statusGroup}>
            <View style={styles.statusRow}>
              <View style={styles.currentRow}>
                <Text style={styles.currentLabel}>현재 위치:</Text>
                <Text style={styles.currentValue}>{currentPlace}</Text>
              </View>
              <Pressable hitSlop={spacing.xs}>
                <Image source={restartIcon} style={styles.refreshIcon} />
              </Pressable>
            </View>
            <View style={styles.noticeBox}>
              <Text style={styles.noticeLabel}>
                {minutesLeft}분 이내에 출발해야해요.
              </Text>
              <Tag status={minutesLeft > 10 ? 'positive' : 'warning'} />
            </View>
          </View>

          <View style={styles.legSection}>
            <Text style={styles.sectionTitle}>오늘의 일정</Text>
            {legs.map((leg) => (
              <LiveLegCard
                key={leg.id}
                leg={leg}
                current={leg.id === currentLeg?.id}
                expanded={expandedId === leg.id}
                onToggle={() =>
                  setExpandedId((prev) => (prev === leg.id ? null : leg.id))
                }
              />
            ))}
            {legs.length === 0 && (
              <Text style={styles.emptyText}>
                확정된 일정이 없어요. 일정을 먼저 확정해주세요.
              </Text>
            )}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  map: {
    width: '100%',
    height: SHEET_TOP + radius.sm,
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
  backButton: {
    position: 'absolute',
    left: grid.pageMargin,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    width: 30,
    height: 30,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: SHEET_TOP,
    bottom: 0,
    borderTopLeftRadius: radius.sm,
    borderTopRightRadius: radius.sm,
    backgroundColor: colors.white,
  },
  handleArea: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  handle: {
    width: 40,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.grey[300],
  },
  sheetContent: {
    gap: spacing.lg,
    paddingHorizontal: grid.pageMargin,
  },
  statusGroup: {
    gap: spacing.xs,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  currentRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing['2xs'],
  },
  currentLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.xs,
    color: colors.grey[800],
  },
  currentValue: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.xs,
    color: colors.primary,
  },
  refreshIcon: {
    width: 24,
    height: 24,
    tintColor: colors.grey[800],
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: radius['2xs'],
    backgroundColor: colors.white,
  },
  noticeLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.xs,
    color: colors.grey[800],
  },
  legSection: {
    gap: spacing.xs,
  },
  sectionTitle: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.xs,
    color: colors.grey[800],
  },
  card: {
    gap: spacing.xs,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: radius.xs,
    backgroundColor: colors.white,
  },
  cardCurrent: {
    borderColor: CURRENT_BORDER,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  busRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['2xs'],
  },
  stopArea: {
    gap: spacing.xs,
  },
  progressTrack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressIconWrap: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: transport.green,
  },
  progressIcon: {
    width: 10,
    height: 10,
    tintColor: colors.white,
  },
  progressFill: {
    flex: 1,
    height: 12,
    marginLeft: -4,
    borderRadius: radius['2xs'],
    backgroundColor: transport.green,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  stopLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    color: colors.grey[900],
  },
  stopBusList: {
    gap: spacing['3xs'],
    paddingLeft: spacing.xl,
  },
  stopBusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['2xs'],
  },
  stopBusLabel: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    lineHeight: lineHeight.sm,
    color: colors.grey[800],
  },
  emptyText: {
    marginTop: spacing.lg,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.md,
    color: colors.grey[500],
    textAlign: 'center',
  },
});
