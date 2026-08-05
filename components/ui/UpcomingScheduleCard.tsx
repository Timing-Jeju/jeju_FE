import { Fragment } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  colors,
  fontFamily,
  fontSize,
  lineHeight,
  orange,
  radius,
  spacing,
} from '@/constants';
import type { RouteLeg } from '@/store/useScheduleStore';
import { formatAmPm, toMinutes, toTime } from '@/utils/date';
import { Tag } from './Tag';
import { Text } from './Text';

// Figma 디자인 전용 색상 (constants 팔레트에 없는 값)
const DIVIDER = '#E9EAED';
const SUB_TEXT = '#747476';
const CONNECTOR = '#D0D1D4';

const calendarIcon = require('../../assets/images/icon-calendar.png');
const pinMarker = require('../../assets/images/pin-marker.png');

/** 출발 몇 분 전에 나서야 하는지 (TODO: 경로 API 연동 전 임시 값) */
const LEAVE_BEFORE_MINUTES = 30;

const POINT_WIDTH = 76;
const GAP_WIDTH = 24;
/**
 * 핀 사이를 잇는 점선.
 * react-native-svg가 없어 4px 조각을 4px 간격으로 늘어놓아 그린다.
 * 한 칸(핀 중심 ~ 다음 핀 중심) 길이는 POINT_WIDTH + GAP_WIDTH + 간격 4px.
 */
const DASH_PERIOD = 8;
const DASHES_PER_GAP = Math.ceil(
  (POINT_WIDTH + GAP_WIDTH + spacing['3xs'] * 2) / DASH_PERIOD,
);

interface StripPoint {
  name: string;
  time: string;
  /** 도착 / 출발 */
  action: string;
  /** 핀 안에 넣을 번호 (출발지·도착지는 null) */
  order: number | null;
  current: boolean;
}

interface UpcomingScheduleCardProps {
  legs: RouteLeg[];
  /** 지금 향하고 있는 구간 */
  currentLeg: RouteLeg;
  onPress?: () => void;
}

/** 홈 지도 하단의 "다가오는 일정" 카드 */
export function UpcomingScheduleCard({
  legs,
  currentLeg,
  onPress,
}: UpcomingScheduleCardProps) {
  const points: StripPoint[] = [
    {
      name: legs[0].from,
      time: legs[0].startTime,
      action: '출발',
      order: null,
      current: false,
    },
    ...legs.map((leg, index) => ({
      name: leg.to,
      time: leg.endTime,
      action: '도착',
      order: index === legs.length - 1 ? null : index + 1,
      current: leg.id === currentLeg.id,
    })),
  ];

  const leaveAt = toTime(
    Math.max(toMinutes(currentLeg.startTime) - LEAVE_BEFORE_MINUTES, 0),
  );

  return (
    <View style={styles.card}>
      {/* 카드 전체가 실시간 지도로 넘어가는 터치 영역이다 (요약 줄 + 아래 타임라인) */}
      <Pressable style={styles.summary} onPress={onPress}>
        <View style={styles.iconWrap}>
          <Image source={calendarIcon} style={styles.calendarIcon} />
        </View>
        <View style={styles.summaryBody}>
          <View style={styles.summaryTop}>
            <View style={styles.badge}>
              <Text style={styles.badgeLabel}>다가오는 일정</Text>
            </View>
            <Tag status={currentLeg.status} />
          </View>
          <View style={styles.summaryTextGroup}>
            <View style={styles.summaryTitleRow}>
              <Text style={styles.summaryTitle} numberOfLines={1}>
                {currentLeg.to}
              </Text>
              <Text style={styles.summaryTime}>
                {currentLeg.startTime} ~ {currentLeg.endTime}
              </Text>
            </View>
            <Text style={styles.leaveLabel}>출발 권장 {leaveAt}</Text>
          </View>
        </View>
      </Pressable>

      <View style={styles.divider} />

      {/*
       * 하단 타임라인은 좌우로 스크롤한다 (디자인 주석).
       * Pressable을 ScrollView 안에 두어야 드래그는 스크롤이, 탭은 Pressable이
       * 가져간다. 반대로 감싸면 부모가 제스처를 먼저 채가서 스크롤이 죽는다.
       */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Pressable style={styles.strip} onPress={onPress}>
          <View style={styles.connector} pointerEvents="none">
            {Array.from(
              { length: (points.length - 1) * DASHES_PER_GAP },
              (_, index) => (
                <View key={index} style={styles.dash} />
              ),
            )}
          </View>
          {points.map((point, index) => (
            <Fragment key={`${point.name}-${index}`}>
              {index > 0 && (
                <View style={styles.gap}>
                  <Text style={styles.gapLabel}>
                    {toMinutes(points[index].time) -
                      toMinutes(points[index - 1].time)}
                    분
                  </Text>
                </View>
              )}
              <View style={styles.point}>
                <View style={styles.marker}>
                  <Image source={pinMarker} style={styles.markerImage} />
                  {point.order !== null && (
                    <Text style={styles.markerLabel}>{point.order}</Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.pointName,
                    point.current && styles.pointNameCurrent,
                  ]}
                  numberOfLines={1}
                >
                  {point.name}
                </Text>
                <Text
                  style={[
                    styles.pointTime,
                    point.current && styles.pointTimeCurrent,
                  ]}
                >
                  {formatAmPm(point.time).replace(/^(오전|오후) /, '')}{' '}
                  {point.action}
                </Text>
              </View>
            </Fragment>
          ))}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 4,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: radius.circle,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  calendarIcon: {
    width: 24,
    height: 24,
    tintColor: colors.white,
  },
  summaryBody: {
    flex: 1,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  badge: {
    paddingHorizontal: spacing['2xs'],
    borderRadius: 2,
    backgroundColor: orange[50],
  },
  badgeLabel: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize['3xs'],
    lineHeight: lineHeight.sm,
    color: colors.primary,
  },
  summaryTextGroup: {
    gap: spacing['3xs'],
  },
  summaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['2xs'],
  },
  summaryTitle: {
    flexShrink: 1,
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    color: colors.grey[900],
  },
  summaryTime: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.xs,
    color: SUB_TEXT,
  },
  leaveLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.xs,
    color: colors.primary,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: DIVIDER,
  },
  strip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing['3xs'],
  },
  // 핀 머리(흰 원) 높이에 맞춰 점선을 깔고 그 위에 핀을 얹는다
  connector: {
    position: 'absolute',
    top: 15,
    left: POINT_WIDTH / 2,
    right: POINT_WIDTH / 2,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  dash: {
    width: 4,
    height: 1,
    marginRight: 4,
    backgroundColor: CONNECTOR,
  },
  point: {
    width: POINT_WIDTH,
    alignItems: 'center',
    gap: spacing['3xs'],
  },
  marker: {
    width: 32,
    height: 32,
    alignItems: 'center',
  },
  markerImage: {
    width: 32,
    height: 32,
  },
  // 흰 원(중심 y ≈ 13.6) 안에 순번을 겹쳐 그린다
  markerLabel: {
    position: 'absolute',
    top: 7,
    fontFamily: fontFamily.bold,
    fontSize: 9.5,
    lineHeight: 12,
    color: colors.primary,
    textAlign: 'center',
  },
  pointName: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.xs,
    color: SUB_TEXT,
    textAlign: 'center',
  },
  pointNameCurrent: {
    fontFamily: fontFamily.bold,
    color: colors.grey[900],
  },
  pointTime: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize['2xs'],
    lineHeight: lineHeight.sm,
    color: SUB_TEXT,
    textAlign: 'center',
  },
  pointTimeCurrent: {
    color: colors.grey[900],
  },
  gap: {
    width: GAP_WIDTH,
    paddingTop: 2,
  },
  gapLabel: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize['3xs'],
    lineHeight: 14,
    color: SUB_TEXT,
    textAlign: 'center',
  },
});
