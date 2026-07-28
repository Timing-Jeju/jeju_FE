import {
  NaverMapMarkerOverlay,
  NaverMapView,
} from '@mj-studio/react-native-naver-map';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Image,
  ImageSourcePropType,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ActionSheet,
  Button,
  ConfirmModal,
  DaySelector,
  NoticeModal,
  OptionSheet,
  ScreenHeader,
  Text,
} from '@/components/ui';
import {
  colors,
  fontFamily,
  fontSize,
  grid,
  lineHeight,
  orange,
  radius,
  spacing,
} from '@/constants';
import {
  useScheduleStore,
  VISIT_TYPE_LABEL,
  type ScheduleItem,
} from '@/store/useScheduleStore';
import { useTripStore } from '@/store/useTripStore';
import { datesBetween } from '@/utils/date';

// Figma 디자인 전용 색상 (constants 팔레트에 없는 값)
const CARD_BORDER = '#E9EAED';
const AI_BACKGROUND = '#FFFCFB';
const AI_BORDER = '#F0F0F0';
const ITEM_TITLE = '#3E3E3E';
const ITEM_ICON_BACKGROUND = '#F5F6F9';
const SUB_TEXT = '#747476';

const starsIcon = require('../../assets/images/icon-stars.png');
const heartOutlineIcon = require('../../assets/images/icon-heart-outline.png');
const searchIcon = require('../../assets/images/icon-search.png');
const editIcon = require('../../assets/images/icon-edit.png');
const dragHandleIcon = require('../../assets/images/icon-drag-handle.png');
const planeIcon = require('../../assets/images/icon-plane.png');
const buildingIcon = require('../../assets/images/icon-building.png');
const coffeeIcon = require('../../assets/images/icon-coffee.png');
const utensilsIcon = require('../../assets/images/icon-utensils.png');
const terraceIcon = require('../../assets/images/icon-terrace.png');
const mountainsIcon = require('../../assets/images/icon-mountains.png');
const emptyIllust = require('../../assets/images/illust-pin-empty.png');
const pinIllust = require('../../assets/images/illust-pin.png');

const INITIAL_CAMERA = {
  latitude: 33.5104,
  longitude: 126.5219,
  zoom: 11,
};

const MAP_HEIGHT = 295;

const TIMELINE_ROW_HEIGHT = 40;
const TIMELINE_ROW_GAP = 11;
// 타임라인 한 칸 높이 (행 + 위아래 간격 + 구분선) — 드래그로 옮길 위치를 계산할 때 쓴다
const TIMELINE_ROW_STEP = TIMELINE_ROW_HEIGHT + TIMELINE_ROW_GAP * 2 + 1;

const CATEGORY_ICON: Record<string, ImageSourcePropType> = {
  공항: planeIcon,
  숙소: buildingIcon,
  카페: coffeeIcon,
  식당: utensilsIcon,
  바다: terraceIcon,
  산: mountainsIcon,
};

const STAY_OPTIONS = [30, 60, 90, 120, 150, 180];

// 장소 사이 이동 시간 (분) — TODO: 경로 API 연동 전 임시 값
const MOVE_MINUTES = 30;

const toMinutes = (time: string) => {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
};

const toTime = (minutes: number) =>
  `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(
    minutes % 60,
  ).padStart(2, '0')}`;

interface DayEndpoint {
  name: string;
  category: string;
  time: string;
}

/**
 * TODO: AI 일정 생성 API 연동 전 임시 로직.
 * 출발지 시간부터 이동 시간 + 체류 시간을 더해가며 방문 순서대로 시간을 배분한다.
 */
const buildDaySchedule = (
  visits: ScheduleItem[],
  start: DayEndpoint,
  end: DayEndpoint,
): ScheduleItem[] => {
  let cursor = toMinutes(start.time);

  const timedVisits = visits.map((visit) => {
    cursor += MOVE_MINUTES;
    const timed = { ...visit, time: toTime(cursor) };
    cursor += visit.stayMinutes ?? 0;
    return timed;
  });

  return [
    {
      name: start.name,
      type: 'departure',
      category: start.category,
      visitType: null,
      stayMinutes: null,
      time: toTime(toMinutes(start.time)),
      coord: null,
    },
    ...timedVisits,
    {
      name: end.name,
      type: 'arrival',
      category: end.category,
      visitType: null,
      stayMinutes: null,
      time: toTime(Math.max(cursor + MOVE_MINUTES, toMinutes(end.time))),
      coord: null,
    },
  ];
};

const subtitleOf = (item: ScheduleItem) => {
  if (item.type === 'departure') return '출발지';
  if (item.type === 'arrival') return '도착지';
  return item.visitType ? VISIT_TYPE_LABEL[item.visitType] : '방문';
};

/* --------------------------------- 일정 타임라인 --------------------------------- */

interface TimelineRowProps {
  item: ScheduleItem;
  index: number;
  /** 지금 끌고 있는 행인지 */
  dragging: boolean;
  /** 타임라인에서 드래그가 진행 중인지 (끝나면 밀린 행을 즉시 제자리로) */
  dragActive: boolean;
  /** 끌고 있는 행에 밀려 이동해야 하는 거리 */
  shift: number;
  /** 끌고 있는 행이 손가락을 따라가는 값 (타임라인이 소유) */
  dragY: Animated.Value;
  onEditStay: (item: ScheduleItem) => void;
  onDragStart: (index: number) => void;
  onDragMove: (index: number, dy: number) => void;
  onDragEnd: (index: number) => void;
}

function TimelineRow({
  item,
  index,
  dragging,
  dragActive,
  shift,
  dragY,
  onEditStay,
  onDragStart,
  onDragMove,
  onDragEnd,
}: TimelineRowProps) {
  // 밀려나는 행은 제자리에서 부드럽게 한 칸 이동한다
  const shiftY = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    // 드래그가 끝나면 목록이 실제로 재배치되므로 밀어둔 값은 즉시 되돌린다
    if (!dragActive) {
      shiftY.setValue(0);
      return;
    }
    Animated.timing(shiftY, {
      toValue: shift,
      duration: 160,
      useNativeDriver: false,
    }).start();
  }, [dragActive, shift, shiftY]);

  // 방문 장소만 순서를 바꿀 수 있다 (출발지 / 도착지는 고정)
  const draggable = item.type === 'visit';

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        // 핸들을 잡는 순간 바로 드래그를 시작하고, ScrollView에 제스처를 뺏기지 않는다
        onStartShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => onDragStart(index),
        onPanResponderMove: (_, gesture) => onDragMove(index, gesture.dy),
        onPanResponderRelease: () => onDragEnd(index),
        onPanResponderTerminate: () => onDragEnd(index),
      }),
    [index, onDragStart, onDragMove, onDragEnd],
  );

  return (
    <Animated.View
      style={[
        styles.row,
        dragging && styles.rowDragging,
        { transform: [{ translateY: dragging ? dragY : shiftY }] },
      ]}
    >
      <View style={styles.rowIconWrap}>
        <Image
          source={CATEGORY_ICON[item.category] ?? mountainsIcon}
          style={styles.rowIcon}
        />
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowTextGroup}>
          <Text style={styles.rowTitle}>
            {item.time ? `${item.time} ${item.name}` : item.name}
          </Text>
          <Text style={styles.rowSubtitle}>{subtitleOf(item)}</Text>
        </View>
        {draggable && (
          <View style={styles.rowTrailing}>
            <Pressable style={styles.stayChip} onPress={() => onEditStay(item)}>
              <Text style={styles.stayLabel}>체류 {item.stayMinutes}분</Text>
              <Image source={editIcon} style={styles.stayEditIcon} />
            </Pressable>
            <View
              style={styles.dragHandle}
              hitSlop={spacing.xs}
              {...panResponder.panHandlers}
            >
              <Image
                source={dragHandleIcon}
                style={[styles.dragIcon, dragging && styles.dragIconActive]}
              />
            </View>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

interface ScheduleTimelineProps {
  items: ScheduleItem[];
  onEditStay: (item: ScheduleItem) => void;
  onMove: (from: number, to: number) => void;
  /**
   * 드래그 중에는 바깥 ScrollView를 멈춰야 한다.
   * iOS 스크롤은 네이티브 제스처라 PanResponder만으로는 막히지 않는다.
   */
  onReorderingChange: (reordering: boolean) => void;
}

function ScheduleTimeline({
  items,
  onEditStay,
  onMove,
  onReorderingChange,
}: ScheduleTimelineProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const dragY = useMemo(() => new Animated.Value(0), []);
  // 드래그가 끝날 때 최신 목적지를 읽어야 해서 ref로도 들고 있는다
  const dropIndexRef = useRef<number | null>(null);

  // 방문 장소가 놓일 수 있는 구간 (출발지 다음 ~ 도착지 이전)
  const bounds = useMemo(() => {
    const visits = items.reduce<number[]>((acc, item, index) => {
      if (item.type === 'visit') acc.push(index);
      return acc;
    }, []);
    return visits.length > 0
      ? { first: visits[0], last: visits[visits.length - 1] }
      : null;
  }, [items]);

  const handleDragStart = useCallback(
    (index: number) => {
      // 직전 드래그의 마무리 애니메이션이 남아 있을 수 있다
      dragY.stopAnimation();
      dragY.setValue(0);
      dropIndexRef.current = index;
      setDragIndex(index);
      setDropIndex(index);
      onReorderingChange(true);
    },
    [dragY, onReorderingChange],
  );

  const handleDragMove = useCallback(
    (index: number, dy: number) => {
      if (!bounds) return;

      // 출발지 / 도착지 밖으로는 끌고 나갈 수 없다
      const clamped = Math.min(
        Math.max(dy, (bounds.first - index) * TIMELINE_ROW_STEP),
        (bounds.last - index) * TIMELINE_ROW_STEP,
      );
      dragY.setValue(clamped);

      const next = index + Math.round(clamped / TIMELINE_ROW_STEP);
      dropIndexRef.current = next;
      setDropIndex((prev) => (prev === next ? prev : next));
    },
    [bounds, dragY],
  );

  const handleDragEnd = useCallback(
    (index: number) => {
      const target = dropIndexRef.current ?? index;
      dropIndexRef.current = null;

      // 놓을 자리까지 미끄러진 뒤에 목록을 바꾼다 (중간에 위치가 튀지 않도록)
      Animated.timing(dragY, {
        toValue: (target - index) * TIMELINE_ROW_STEP,
        duration: 140,
        useNativeDriver: false,
      }).start(({ finished }) => {
        // 마무리 도중 다음 드래그가 시작되면 그쪽 상태를 건드리지 않는다
        if (!finished) return;
        dragY.setValue(0);
        setDragIndex(null);
        setDropIndex(null);
        onReorderingChange(false);
        if (target !== index) onMove(index, target);
      });
    },
    [dragY, onMove, onReorderingChange],
  );

  /** 끌고 있는 행이 지나간 자리만큼 다른 행을 한 칸씩 밀어준다 */
  const shiftOf = (index: number) => {
    if (dragIndex === null || dropIndex === null || index === dragIndex) {
      return 0;
    }
    if (dragIndex < dropIndex && index > dragIndex && index <= dropIndex) {
      return -TIMELINE_ROW_STEP;
    }
    if (dragIndex > dropIndex && index >= dropIndex && index < dragIndex) {
      return TIMELINE_ROW_STEP;
    }
    return 0;
  };

  return (
    <View style={styles.timeline}>
      {items.map((item, index) => (
        // 당일치기는 출발지 / 도착지가 모두 공항이라 종류까지 키에 넣는다
        <Fragment key={`${item.type}-${item.name}`}>
          {index > 0 && <View style={styles.timelineDivider} />}
          <TimelineRow
            item={item}
            index={index}
            dragging={dragIndex === index}
            dragActive={dragIndex !== null}
            shift={shiftOf(index)}
            dragY={dragY}
            onEditStay={onEditStay}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
          />
        </Fragment>
      ))}
    </View>
  );
}

/* ------------------------------------ 화면 ----------------------------------- */

export default function CalendarScreen() {
  const router = useRouter();

  const tripSaved = useTripStore((state) => state.saved);
  const startDate = useTripStore((state) => state.startDate);
  const endDate = useTripStore((state) => state.endDate);
  const dayTimes = useTripStore((state) => state.dayTimes);
  const lodging = useTripStore((state) => state.lodging);
  const arrivalTime = useTripStore((state) => state.arrivalTime);
  const departureTime = useTripStore((state) => state.departureTime);

  const setItems = useScheduleStore((state) => state.setItems);
  const updateStayMinutes = useScheduleStore(
    (state) => state.updateStayMinutes,
  );
  const moveItem = useScheduleStore((state) => state.moveItem);

  const [selectedDay, setSelectedDay] = useState(1);
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [stayTarget, setStayTarget] = useState<ScheduleItem | null>(null);
  const [conditionNoticeVisible, setConditionNoticeVisible] = useState(false);
  const [reordering, setReordering] = useState(false);

  // 탭에 들어올 때마다 여행 기본 조건이 저장돼 있는지 다시 확인한다
  useFocusEffect(
    useCallback(() => {
      setConditionNoticeVisible(!tripSaved);
    }, [tripSaved]),
  );

  /** 여행 기본 조건이 없으면 안내 모달을 띄우고 true를 돌려준다 */
  const blockedByTripConditions = () => {
    if (tripSaved) return false;
    setConditionNoticeVisible(true);
    return true;
  };

  const items = useScheduleStore((state) => state.schedules[selectedDay]) ?? [];

  const tripDates = useMemo(
    () => (startDate && endDate ? datesBetween(startDate, endDate) : []),
    [startDate, endDate],
  );
  const dayCount = Math.max(tripDates.length, 1);

  const hasSchedule = items.length > 0;
  // 출발지 / 도착지가 붙어 있으면 이미 AI 일정을 생성한 상태다
  const isGenerated = items.some((item) => item.type !== 'visit');

  const markers = items.flatMap((item) =>
    item.coord ? [{ name: item.name, coord: item.coord }] : [],
  );

  /** 여행 조건(도착 시간 / 활동 시간 / 숙소)으로 해당 Day의 출발지·도착지를 만든다 */
  const applySchedule = useCallback(
    (visits: ScheduleItem[]) => {
      const date = tripDates[selectedDay - 1];
      const dayTime = date ? dayTimes[date] : undefined;
      const lodgingName = lodging?.name ?? '숙소';

      const start: DayEndpoint =
        selectedDay === 1
          ? {
              name: '제주국제공항',
              category: '공항',
              time: arrivalTime ?? dayTime?.start ?? '09:00',
            }
          : {
              name: lodgingName,
              category: '숙소',
              time: dayTime?.start ?? '09:00',
            };

      const end: DayEndpoint =
        selectedDay === dayCount
          ? {
              name: '제주국제공항',
              category: '공항',
              time: departureTime ?? dayTime?.end ?? '21:00',
            }
          : {
              name: lodgingName,
              category: '숙소',
              time: dayTime?.end ?? '21:00',
            };

      setItems(selectedDay, buildDaySchedule(visits, start, end));
    },
    [
      arrivalTime,
      dayCount,
      dayTimes,
      departureTime,
      lodging,
      selectedDay,
      setItems,
      tripDates,
    ],
  );

  /** 순서 / 체류 시간이 바뀌면 이미 생성된 일정의 시간도 다시 배분한다 */
  const refreshSchedule = useCallback(() => {
    const current = useScheduleStore.getState().schedules[selectedDay] ?? [];
    if (current.every((item) => item.type === 'visit')) return;
    applySchedule(current.filter((item) => item.type === 'visit'));
  }, [applySchedule, selectedDay]);

  const generate = () =>
    applySchedule(items.filter((item) => item.type === 'visit'));

  const handleGeneratePress = () => {
    if (blockedByTripConditions()) return;
    if (isGenerated) {
      setResetModalVisible(true);
      return;
    }
    generate();
  };

  // 방문 장소는 출발지 / 도착지 사이에서만 순서를 바꿀 수 있다
  const handleMove = useCallback(
    (from: number, to: number) => {
      const current = useScheduleStore.getState().schedules[selectedDay] ?? [];
      const first = current.findIndex((item) => item.type === 'visit');
      if (first === -1) return;

      let last = first;
      current.forEach((item, index) => {
        if (item.type === 'visit') last = index;
      });

      moveItem(selectedDay, from, Math.min(Math.max(to, first), last));
      refreshSchedule();
    },
    [moveItem, refreshSchedule, selectedDay],
  );

  const handleAddPlace = (key: string) => {
    setAddSheetOpen(false);
    router.push({
      pathname: key === 'favorite' ? '/schedule-favorites' : '/schedule-search',
      params: { day: String(selectedDay) },
    });
  };

  const content = (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      scrollEnabled={!reordering}
    >
      <DaySelector
        dayCount={dayCount}
        selectedDay={selectedDay}
        onSelectDay={setSelectedDay}
      />

      <View style={styles.aiSection}>
        <Pressable style={styles.aiButton} onPress={handleGeneratePress}>
          <Image source={starsIcon} style={styles.aiIcon} />
          <Text style={styles.aiLabel}>AI로 일정 생성하기</Text>
        </Pressable>
        <Text style={styles.aiCaption}>
          AI가 여행 방향성, 숙소, 시간 기준으로 일정 초안을 생성해줘요.
        </Text>
      </View>

      <View style={styles.scheduleSection}>
        <Text style={styles.sectionTitle}>일정 항목</Text>

        {hasSchedule ? (
          <ScheduleTimeline
            items={items}
            onEditStay={setStayTarget}
            onMove={handleMove}
            onReorderingChange={setReordering}
          />
        ) : (
          <View style={styles.emptyCard}>
            <Image source={emptyIllust} style={styles.emptyIllust} />
            <View style={styles.emptyTextGroup}>
              <Text style={styles.emptyTitle}>아직 일정이 없어요</Text>
              <Text style={styles.emptyDescription}>
                장소를 추가해서 나만의 여행 일정을 만들어보세요!
              </Text>
            </View>
          </View>
        )}

        <Button
          title="+ 장소추가"
          color="outlinedOrange"
          size="small"
          shape="rectangle"
          onPress={() => {
            if (blockedByTripConditions()) return;
            setAddSheetOpen(true);
          }}
        />
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title={hasSchedule ? 'Day별 일정 입력' : '여행 일정 입력'}
        showBack={false}
      />

      {hasSchedule ? (
        <View style={styles.mapBody}>
          {Platform.OS === 'web' ? (
            <View style={[styles.map, styles.mapFallback]}>
              <Text style={styles.mapFallbackText}>
                네이버 지도는 iOS / Android에서만 지원됩니다.
              </Text>
            </View>
          ) : (
            <NaverMapView style={styles.map} initialCamera={INITIAL_CAMERA}>
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

          <View style={styles.sheet}>
            <View style={styles.sheetHandleArea}>
              <View style={styles.sheetHandle} />
            </View>
            {content}
          </View>
        </View>
      ) : (
        content
      )}

      <ActionSheet
        visible={addSheetOpen}
        title="장소 추가 방법을 선택해주세요"
        actions={[
          {
            key: 'favorite',
            label: '찜 목록에서 가져오기',
            icon: heartOutlineIcon,
          },
          { key: 'search', label: '직접 검색하기', icon: searchIcon },
        ]}
        onSelect={handleAddPlace}
        onClose={() => setAddSheetOpen(false)}
      />

      <OptionSheet
        visible={stayTarget !== null}
        options={STAY_OPTIONS.map((minutes) => ({
          key: String(minutes),
          label: `${minutes}분`,
        }))}
        selectedKey={
          stayTarget?.stayMinutes != null
            ? String(stayTarget.stayMinutes)
            : undefined
        }
        onSelect={(key) => {
          if (stayTarget) {
            updateStayMinutes(selectedDay, stayTarget.name, Number(key));
            refreshSchedule();
          }
          setStayTarget(null);
        }}
        onClose={() => setStayTarget(null)}
      />

      <ConfirmModal
        visible={resetModalVisible}
        title={'생성된 일정을 초기화하고\nAI 일정을 다시 생성할까요?'}
        description="지금까지의 일정은 초기화하고, 새 일정이 생성돼요"
        confirmTitle="확인"
        onCancel={() => setResetModalVisible(false)}
        onConfirm={() => {
          setResetModalVisible(false);
          generate();
        }}
      />

      {/* 여행 기본 조건을 저장하기 전에는 일정을 만들 수 없다 */}
      <NoticeModal
        visible={conditionNoticeVisible}
        image={pinIllust}
        imageStyle={styles.conditionIllust}
        title="여행 기본 조건 설정 후 이용 가능해요"
        description="1분만에 입력 후 맞춤 여행 일정을 짜볼까요?"
        buttonTitle="여행 기본 조건 설정하러 가기"
        onConfirm={() => {
          // 모달을 먼저 닫아야 이동한 화면을 가리지 않는다
          setConditionNoticeVisible(false);
          router.push('/trip-conditions');
        }}
        onClose={() => setConditionNoticeVisible(false)}
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
    gap: spacing.xl,
    paddingHorizontal: grid.pageMargin,
    paddingTop: spacing['2xs'],
    paddingBottom: spacing['2xl'],
  },
  mapBody: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: MAP_HEIGHT,
  },
  mapFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ITEM_ICON_BACKGROUND,
  },
  mapFallbackText: {
    fontSize: fontSize.md,
    color: colors.grey[600],
  },
  sheet: {
    flex: 1,
    marginTop: -spacing.md,
    borderTopLeftRadius: radius.sm,
    borderTopRightRadius: radius.sm,
    backgroundColor: colors.white,
  },
  sheetHandleArea: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  sheetHandle: {
    width: 40,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.grey[300],
  },
  aiSection: {
    gap: spacing['2xs'],
  },
  aiButton: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: AI_BORDER,
    borderRadius: radius['2xs'],
    backgroundColor: AI_BACKGROUND,
  },
  aiIcon: {
    width: 20,
    height: 20,
  },
  aiLabel: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    color: colors.grey[900],
  },
  aiCaption: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize['3xs'],
    lineHeight: lineHeight.sm,
    color: colors.grey[400],
  },
  scheduleSection: {
    gap: spacing.xs,
  },
  sectionTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    lineHeight: lineHeight.md,
    color: colors.grey[900],
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: spacing['4xl'],
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
  },
  emptyIllust: {
    width: 130,
    height: 91,
    resizeMode: 'contain',
  },
  emptyTextGroup: {
    alignItems: 'center',
    gap: spacing['2xs'],
  },
  emptyTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['2xl'],
    lineHeight: lineHeight.xl,
    color: colors.grey[900],
  },
  emptyDescription: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.xs,
    color: SUB_TEXT,
  },
  timeline: {
    gap: TIMELINE_ROW_GAP,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: radius.sm,
  },
  timelineDivider: {
    width: '100%',
    height: 1,
    backgroundColor: colors.grey[100],
  },
  row: {
    height: TIMELINE_ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  // 끌고 있는 동안에는 카드처럼 살짝 떠 보이게 한다
  rowDragging: {
    zIndex: 1,
    borderRadius: radius['2xs'],
    backgroundColor: colors.white,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  rowIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ITEM_ICON_BACKGROUND,
  },
  rowIcon: {
    width: 20,
    height: 20,
    tintColor: colors.grey[400],
  },
  rowBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  rowTextGroup: {
    flexShrink: 1,
    gap: spacing['3xs'],
  },
  rowTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    color: ITEM_TITLE,
  },
  rowSubtitle: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    lineHeight: lineHeight.xs,
    color: colors.grey[400],
  },
  rowTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['2xs'],
  },
  stayChip: {
    minWidth: 82,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing['3xs'],
    paddingHorizontal: spacing['2xs'],
    paddingVertical: 2,
    borderRadius: radius['3xs'],
    backgroundColor: orange[50],
  },
  stayLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.xs,
    color: colors.primary,
  },
  stayEditIcon: {
    width: 13,
    height: 13,
    tintColor: colors.primary,
  },
  dragHandle: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragIcon: {
    width: 20,
    height: 20,
  },
  dragIconActive: {
    tintColor: colors.primary,
  },
  conditionIllust: {
    width: 130,
    height: 91,
    resizeMode: 'contain',
  },
});
