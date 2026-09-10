import { useFocusEffect, useRouter } from 'expo-router';
import { Fragment, useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ActionSheet,
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
  radius,
  spacing,
} from '@/constants';
import { useScheduleStore, type SchedulePlace } from '@/store/useScheduleStore';
import { useTripStore } from '@/store/useTripStore';
import { datesBetween } from '@/utils/date';
import { PLANNER_UNAVAILABLE_MESSAGE } from '@/services/plannerAvailability';
import { useTripPersistence } from '@/hooks/useTripPersistence';
import { useSchedulePersistence } from '@/hooks/useSchedulePersistence';

// Figma 디자인 전용 색상 (constants 팔레트에 없는 값)
const CARD_BORDER = '#E9EAED';
const SUB_TEXT = '#747476';
const ADD_BUTTON_BG = '#F5F6F9';

const heartOutlineIcon = require('../../assets/images/icon-heart-outline.png');
const searchIcon = require('../../assets/images/icon-search.png');
const placeholderPlace = require('../../assets/images/placeholder-place.png');
const emptyIllust = require('../../assets/images/illust-pin-empty.png');
const pinIllust = require('../../assets/images/illust-pin.png');

const STAY_OPTIONS = [30, 60, 90, 120, 150, 180];

/** 플로팅 버튼(44) + 위아래 여백 — 목록 마지막 항목이 가리지 않게 띄운다 */
const FLOATING_AREA_HEIGHT = 44 + spacing.md + spacing.xl;

const PLACE_MENU = [
  { key: 'stay', label: '체류시간 변경하기' },
  { key: 'reorder', label: '일정 순서 변경하기' },
  { key: 'remove', label: '일정 삭제하기' },
];

/* ------------------------------------ 화면 ----------------------------------- */

export default function CalendarScreen() {
  const router = useRouter();
  const { hydrateLatestTrip } = useTripPersistence();
  const { hydrateSchedule, updateItem, deleteItem, reorderDay } =
    useSchedulePersistence();

  const tripSaved = useTripStore((state) => state.draftSaved);
  const tripRootSaved = useTripStore((state) => state.saved);
  const startDate = useTripStore((state) => state.startDate);
  const endDate = useTripStore((state) => state.endDate);

  const removePlace = useScheduleStore((state) => state.removePlace);
  const movePlace = useScheduleStore((state) => state.movePlace);
  const updateStayMinutes = useScheduleStore(
    (state) => state.updateStayMinutes,
  );

  const [selectedDay, setSelectedDay] = useState(1);
  const [addSheetOpen, setAddSheetOpen] = useState(false);
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
      const load = async () => {
        if (!tripSaved && !tripRootSaved && !useTripStore.getState().loading) {
          await hydrateLatestTrip();
        }
        if (useTripStore.getState().tripId) await hydrateSchedule();
      };
      void load().catch(() => undefined);
    }, [hydrateLatestTrip, hydrateSchedule, tripRootSaved, tripSaved]),
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
    () =>
      places.map((place, index) => ({
        key: place.itemId ?? place.placeId ?? `local-${index}`,
        label: place.name,
      })),
    [places],
  );

  const showMutationError = (error: unknown) => {
    Alert.alert(
      '일정을 저장하지 못했어요',
      error instanceof Error
        ? error.message
        : '최신 일정을 확인한 뒤 다시 시도해 주세요.',
    );
  };

  const handleGenerate = () => {
    Alert.alert('일정 서비스 준비 중', PLANNER_UNAVAILABLE_MESSAGE);
  };

  const handleAddPlace = (key: string) => {
    setAddSheetOpen(false);
    router.push({
      pathname: key === 'favorite' ? '/schedule-favorites' : '/schedule-search',
      params: { day: String(selectedDay) },
    });
  };

  const handleMenuSelect = (key: string) => {
    if (useScheduleStore.getState().mutating) return;
    const target = menuTarget?.place;
    setMenuTarget(null);
    if (!target) return;

    if (key === 'stay') setStayTarget(target);
    else if (key === 'reorder') setReorderOpen(true);
    else if (key === 'remove') {
      if (target.itemId) {
        void deleteItem(target.itemId).catch(showMutationError);
      } else if (target.placeId) {
        removePlace(selectedDay, target.placeId);
      }
    }
  };

  const handleReorder = async (keys: string[]) => {
    if (places.every((place) => place.itemId)) {
      try {
        await reorderDay(selectedDay, keys);
        setReorderOpen(false);
      } catch (error) {
        showMutationError(error);
      }
      return;
    }
    // 앞에서부터 원하는 자리로 하나씩 끌어다 놓는다
    keys.forEach((name, target) => {
      const current = useScheduleStore.getState().places[selectedDay] ?? [];
      const from = current.findIndex(
        (place, index) =>
          (place.itemId ?? place.placeId ?? `local-${index}`) === name,
      );
      if (from !== -1 && from !== target) {
        movePlace(selectedDay, from, target);
      }
    });
    setReorderOpen(false);
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
                <Fragment
                  key={
                    place.itemId ?? place.placeId ?? `${selectedDay}-${index}`
                  }
                >
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
        {/* 방법을 고르는 단계 없이 바로 생성하고 로딩 화면으로 넘어간다 */}
        <FloatingButton
          title="AI로 일정 생성"
          disabled={places.length === 0}
          onPress={() => {
            if (blockedByTripConditions()) return;
            handleGenerate();
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
          onConfirm={(keys) => void handleReorder(keys)}
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
            if (stayTarget.itemId) {
              void updateItem(stayTarget.itemId, {
                stayMinutes: Number(key),
              })
                .then(() => setStayTarget(null))
                .catch(showMutationError);
              return;
            }
            if (stayTarget.placeId) {
              updateStayMinutes(selectedDay, stayTarget.placeId, Number(key));
            }
          }
          setStayTarget(null);
        }}
        onClose={() => setStayTarget(null)}
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
