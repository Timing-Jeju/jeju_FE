import { useFocusEffect, useRouter } from 'expo-router';
import { Fragment, useCallback, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ActionSheet,
  Button,
  Checkbox,
  DaySelector,
  FloatingButton,
  MenuIcon,
  NoticeModal,
  OptionSheet,
  PlaceTag,
  PopoverMenu,
  ReorderSheet,
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
  type ScheduleMode,
  type SchedulePlace,
} from '@/store/useScheduleStore';
import { lodgingOf, useTripStore } from '@/store/useTripStore';
import { datesBetween } from '@/utils/date';
import { buildDayReview, type DayEndpoint } from '@/utils/schedule';

// Figma 디자인 전용 색상 (constants 팔레트에 없는 값)
const CARD_BORDER = '#E9EAED';
const SUB_TEXT = '#747476';
const ADD_BUTTON_BG = '#F5F6F9';

const heartOutlineIcon = require('../../assets/images/icon-heart-outline.png');
const searchIcon = require('../../assets/images/icon-search.png');
const placeholderPlace = require('../../assets/images/placeholder-place.png');
const manualIllust = require('../../assets/images/illust-manual-schedule.png');
const aiIllust = require('../../assets/images/illust-ai-schedule.png');
const emptyIllust = require('../../assets/images/illust-pin-empty.png');
const pinIllust = require('../../assets/images/illust-pin.png');

const STAY_OPTIONS = [30, 60, 90, 120, 150, 180];

/** 플로팅 버튼(44) + 위아래 여백 — 목록 마지막 항목이 가리지 않게 띄운다 */
const FLOATING_AREA_HEIGHT = 44 + spacing.md + spacing.xl;

/** 여행 시작 / 종료 지점으로 쓰는 제주국제공항 좌표 */
const JEJU_AIRPORT = { latitude: 33.5066, longitude: 126.4931 };

const PLACE_MENU = [
  { key: 'stay', label: '체류시간 변경하기' },
  { key: 'reorder', label: '일정 순서 변경하기' },
  { key: 'remove', label: '일정 삭제하기' },
];

/* ------------------------------ 일정 생성 방법 모달 ----------------------------- */

interface ModePickerProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (mode: ScheduleMode) => void;
}

const MODE_OPTIONS: {
  key: ScheduleMode;
  title: string;
  description: string;
  illust: number;
}[] = [
  {
    key: 'manual',
    title: '직접 일정 입력',
    description: '원하는 동선 및\n체류시간을 직접 설정해요.',
    illust: manualIllust,
  },
  {
    key: 'ai',
    title: 'AI에게 맡길게요',
    description: '선택 장소 바탕으로 AI가\n동선 및 체류시간을 제안해요.',
    illust: aiIllust,
  },
];

function ModePicker({ visible, onClose, onConfirm }: ModePickerProps) {
  const [mode, setMode] = useState<ScheduleMode | null>(null);

  if (!visible) return null;

  return (
    <View style={modeStyles.overlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={modeStyles.card}>
        <View style={modeStyles.content}>
          <Text style={modeStyles.title}>일정 생성 방법을 선택해주세요</Text>
          <View style={modeStyles.optionRow}>
            {MODE_OPTIONS.map((option) => {
              const isSelected = mode === option.key;
              return (
                <Pressable
                  key={option.key}
                  style={[
                    modeStyles.option,
                    isSelected && modeStyles.optionSelected,
                  ]}
                  onPress={() => setMode(option.key)}
                >
                  <Checkbox
                    checked={isSelected}
                    onPress={() => setMode(option.key)}
                  />
                  <Image source={option.illust} style={modeStyles.illust} />
                  <View style={modeStyles.optionTextGroup}>
                    <Text style={modeStyles.optionTitle}>{option.title}</Text>
                    <Text style={modeStyles.optionDescription}>
                      {option.description}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={modeStyles.footer}>
          <Button
            title="다음"
            size="small"
            disabled={!mode}
            onPress={() => mode && onConfirm(mode)}
          />
        </View>
      </View>
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
  const arrivalTime = useTripStore((state) => state.arrivalTime);
  const departureTime = useTripStore((state) => state.departureTime);

  const removePlace = useScheduleStore((state) => state.removePlace);
  const movePlace = useScheduleStore((state) => state.movePlace);
  const updateStayMinutes = useScheduleStore(
    (state) => state.updateStayMinutes,
  );
  const setReview = useScheduleStore((state) => state.setReview);

  const [selectedDay, setSelectedDay] = useState(1);
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [modePickerOpen, setModePickerOpen] = useState(false);
  const [reorderOpen, setReorderOpen] = useState(false);
  const [stayTarget, setStayTarget] = useState<SchedulePlace | null>(null);
  const [menuTarget, setMenuTarget] = useState<{
    place: SchedulePlace;
    top: number;
  } | null>(null);
  const [conditionNoticeVisible, setConditionNoticeVisible] = useState(false);

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

  const dayPlaces = useScheduleStore((state) => state.places[selectedDay]);
  const places = useMemo(() => dayPlaces ?? [], [dayPlaces]);

  const tripDates = useMemo(
    () => (startDate && endDate ? datesBetween(startDate, endDate) : []),
    [startDate, endDate],
  );
  const dayCount = Math.max(tripDates.length, 1);

  const reorderItems = useMemo(
    () => places.map((place) => ({ key: place.name, label: place.name })),
    [places],
  );

  /** 여행 조건(도착 시간 / 활동 시간 / 숙소)으로 해당 Day의 출발지·도착지를 만든다 */
  const endpointsOf = useCallback(() => {
    const date = tripDates[selectedDay - 1];
    const dayTime = date ? dayTimes[date] : undefined;
    const trip = useTripStore.getState();
    const lodging = lodgingOf(trip, date);
    const lodgingName = lodging?.name ?? '숙소';
    const lodgingCoord = lodging?.coord ?? null;

    const start: DayEndpoint =
      selectedDay === 1
        ? {
            name: '제주국제공항',
            time: arrivalTime ?? dayTime?.start ?? '9:00',
            coord: JEJU_AIRPORT,
          }
        : {
            name: lodgingName,
            time: dayTime?.start ?? '9:00',
            coord: lodgingCoord,
          };

    const end: DayEndpoint =
      selectedDay === dayCount
        ? {
            name: '제주국제공항',
            time: departureTime ?? dayTime?.end ?? '21:00',
            coord: JEJU_AIRPORT,
          }
        : {
            name: lodgingName,
            time: dayTime?.end ?? '21:00',
            coord: lodgingCoord,
          };

    return { start, end };
  }, [arrivalTime, dayCount, dayTimes, departureTime, selectedDay, tripDates]);

  const handleGenerate = (mode: ScheduleMode) => {
    const { start, end } = endpointsOf();
    setReview(
      selectedDay,
      buildDayReview(
        useScheduleStore.getState().places[selectedDay] ?? [],
        start,
        end,
        mode,
      ),
    );
    setModePickerOpen(false);
    router.push({
      pathname: '/schedule-review',
      params: { day: String(selectedDay) },
    });
  };

  const handleAddPlace = (key: string) => {
    setAddSheetOpen(false);
    router.push({
      pathname: key === 'favorite' ? '/schedule-favorites' : '/schedule-search',
      params: { day: String(selectedDay) },
    });
  };

  const handleMenuSelect = (key: string) => {
    const target = menuTarget?.place;
    setMenuTarget(null);
    if (!target) return;

    if (key === 'stay') setStayTarget(target);
    else if (key === 'reorder') setReorderOpen(true);
    else if (key === 'remove') removePlace(selectedDay, target.name);
  };

  const handleReorder = (keys: string[]) => {
    setReorderOpen(false);
    // 앞에서부터 원하는 자리로 하나씩 끌어다 놓는다
    keys.forEach((name, target) => {
      const current = useScheduleStore.getState().places[selectedDay] ?? [];
      const from = current.findIndex((place) => place.name === name);
      if (from !== -1 && from !== target) {
        movePlace(selectedDay, from, target);
      }
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="여행 일정 입력" showBack={false} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <DaySelector
          dayCount={dayCount}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{selectedDay}일차 일정 항목</Text>

          {places.length > 0 ? (
            <View>
              {places.map((place, index) => (
                <Fragment key={place.name}>
                  {index > 0 && <View style={styles.rowDivider} />}
                  <View style={styles.placeRow}>
                    <View style={styles.placeInfo}>
                      <View style={styles.numbering}>
                        <Text style={styles.numberingLabel}>{index + 1}</Text>
                      </View>
                      <Image
                        source={placeholderPlace}
                        style={styles.placeImage}
                      />
                      <View style={styles.placeTextGroup}>
                        <View style={styles.placeNameRow}>
                          <Text style={styles.placeName} numberOfLines={1}>
                            {place.name}
                          </Text>
                          <PlaceTag label={place.category} />
                        </View>
                        <Text style={styles.placeAddress} numberOfLines={1}>
                          {place.address}
                        </Text>
                      </View>
                    </View>
                    <MenuIcon
                      onPress={(event) =>
                        // 누른 아이콘 바로 아래에 메뉴를 띄운다
                        setMenuTarget({
                          place,
                          top: event.nativeEvent.pageY + spacing.sm,
                        })
                      }
                    />
                  </View>
                </Fragment>
              ))}
            </View>
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

          <Pressable
            style={styles.addButton}
            onPress={() => {
              if (blockedByTripConditions()) return;
              setAddSheetOpen(true);
            }}
          >
            <Text style={styles.addLabel}>+ 장소 추가하기</Text>
          </Pressable>
        </View>
      </ScrollView>

      <View style={styles.floatingArea}>
        <FloatingButton
          title={`Day ${selectedDay} 일정 생성`}
          disabled={places.length === 0}
          onPress={() => {
            if (blockedByTripConditions()) return;
            setModePickerOpen(true);
          }}
        />
      </View>

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

      <PopoverMenu
        visible={menuTarget !== null}
        items={PLACE_MENU}
        anchor={{ top: menuTarget?.top ?? 0, right: grid.pageMargin }}
        onSelect={handleMenuSelect}
        onClose={() => setMenuTarget(null)}
      />

      {reorderOpen && (
        <ReorderSheet
          title="일정을 이동할까요?"
          items={reorderItems}
          onClose={() => setReorderOpen(false)}
          onConfirm={handleReorder}
        />
      )}

      <OptionSheet
        visible={stayTarget !== null}
        options={STAY_OPTIONS.map((minutes) => ({
          key: String(minutes),
          label: `${minutes}분`,
        }))}
        selectedKey={stayTarget ? String(stayTarget.stayMinutes) : undefined}
        onSelect={(key) => {
          if (stayTarget) {
            updateStayMinutes(selectedDay, stayTarget.name, Number(key));
          }
          setStayTarget(null);
        }}
        onClose={() => setStayTarget(null)}
      />

      <ModePicker
        visible={modePickerOpen}
        onClose={() => setModePickerOpen(false)}
        onConfirm={handleGenerate}
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
    paddingTop: spacing.md,
    paddingBottom: FLOATING_AREA_HEIGHT,
  },
  section: {
    gap: spacing.xs,
  },
  sectionTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    lineHeight: lineHeight.md,
    color: colors.grey[900],
  },
  rowDivider: {
    width: '100%',
    height: 1,
    backgroundColor: CARD_BORDER,
  },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  placeInfo: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  numbering: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  numberingLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    lineHeight: lineHeight.xs,
    color: colors.white,
    textAlign: 'center',
  },
  placeImage: {
    width: 52,
    height: 52,
    borderRadius: 4.6,
  },
  placeTextGroup: {
    flexShrink: 1,
    gap: spacing['2xs'],
  },
  placeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['2xs'],
  },
  placeName: {
    flexShrink: 1,
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    lineHeight: lineHeight.xl,
    color: colors.grey[900],
  },
  placeAddress: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize['2xs'],
    lineHeight: lineHeight.sm,
    color: SUB_TEXT,
  },
  addButton: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius['2xs'],
    backgroundColor: ADD_BUTTON_BG,
  },
  addLabel: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
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
  // 탭 바 바로 위 가운데 (탭 바가 이미 홈 인디케이터 영역을 차지한다)
  floatingArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: spacing.md,
    alignItems: 'center',
  },
  conditionIllust: {
    width: 130,
    height: 91,
    resizeMode: 'contain',
  },
});

const modeStyles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dim,
  },
  card: {
    width: grid.containerMaxWidth,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  content: {
    gap: spacing.md,
    paddingTop: 30,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['2xl'],
    lineHeight: lineHeight.xl,
    color: colors.grey[900],
  },
  optionRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  option: {
    flex: 1,
    gap: spacing.xs,
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: '#F5F6F9',
    borderRadius: radius['2xs'],
    backgroundColor: colors.white,
  },
  optionSelected: {
    borderColor: orange[50],
    backgroundColor: orange[50],
  },
  illust: {
    width: 72,
    height: 72,
    resizeMode: 'contain',
  },
  optionTextGroup: {
    gap: spacing['2xs'],
  },
  optionTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    color: colors.grey[900],
  },
  optionDescription: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    lineHeight: lineHeight.sm,
    color: colors.grey[700],
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
});
