import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Fragment, useCallback, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  ActionSheet,
  BottomSheet,
  BusTag,
  Button,
  Checkbox,
  DaySelector,
  ExpandBar,
  MenuIcon,
  MetaRow,
  Numbering,
  PopoverMenu,
  ReorderSheet,
  RouteTitle,
  ScreenHeader,
  Tag,
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
import {
  useScheduleStore,
  worstStatus,
  type RouteLeg,
  type SchedulePlace,
} from '@/store/useScheduleStore';
import { useTripStore } from '@/store/useTripStore';
import { datesBetween, formatAmPm } from '@/utils/date';
import {
  buildFillSuggestions,
  insertPlacesBeforeEnd,
  rechainLegs,
  type FillSuggestion,
} from '@/utils/schedule';

// Figma 디자인 전용 색상 (constants 팔레트에 없는 값)
const CARD_BORDER = '#E9EAED';

const locationIcon = require('../assets/images/icon-location.png');
const busIcon = require('../assets/images/icon-bus.png');
const infoIcon = require('../assets/images/icon-info-circle.png');
const heartOutlineIcon = require('../assets/images/icon-heart-outline.png');
const searchIcon = require('../assets/images/icon-search.png');

const REVIEW_MENU = [
  { key: 'reorder', label: '일정 순서 변경하기' },
  { key: 'add', label: '일정 추가하기' },
  { key: 'remove', label: '일정 삭제하기' },
];

/* --------------------------------- 구간 카드 --------------------------------- */

interface LegCardProps {
  leg: RouteLeg;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onFillGap: () => void;
  onEdit: () => void;
}

function LegCard({
  leg,
  index,
  expanded,
  onToggle,
  onFillGap,
  onEdit,
}: LegCardProps) {
  return (
    <View style={cardStyles.card}>
      <View style={cardStyles.header}>
        <View style={cardStyles.headerLeft}>
          <Numbering status={leg.status} text={String(index + 1)} />
          <RouteTitle from={leg.from} to={leg.to} />
        </View>
        {leg.status !== 'positive' && <Tag status={leg.status} />}
      </View>

      <MetaRow
        items={[
          `${formatAmPm(leg.startTime)} - ${formatAmPm(leg.endTime)}`,
          `${leg.cost.toLocaleString()}원`,
        ]}
      />

      {expanded && (
        <>
          {leg.reason && (
            <Text style={cardStyles.reason}>
              {leg.reason} (각 일정의 자세한 위험/주의 사유)
            </Text>
          )}
          <View style={cardStyles.divider} />
          <RouteBox leg={leg} />
          <View style={cardStyles.buttonRow}>
            <Button
              title="빈시간 채우기"
              color="outlinedBlack"
              size="small"
              onPress={onFillGap}
              style={cardStyles.flexButton}
            />
            <Button
              title="일정 수정하기"
              color="outlinedBlack"
              size="small"
              onPress={onEdit}
              style={cardStyles.flexButton}
            />
          </View>
        </>
      )}

      <ExpandBar expanded={expanded} onPress={onToggle} />
    </View>
  );
}

/** 구간 안의 경유 지점 목록 (장소 → 정류장 → 정류장 → 장소) */
function RouteBox({ leg }: { leg: RouteLeg }) {
  return (
    <View style={cardStyles.routeBox}>
      {leg.steps.map((step, index) => (
        <Fragment key={`${step.kind}-${step.name}-${index}`}>
          <View style={cardStyles.pointRow}>
            <Image
              source={step.kind === 'place' ? locationIcon : busIcon}
              style={[
                cardStyles.pointIcon,
                step.kind === 'place' && cardStyles.pointIconPlace,
              ]}
            />
            <Text style={cardStyles.pointLabel}>{step.name}</Text>
            {step.caution && (
              <Image source={infoIcon} style={cardStyles.cautionIcon} />
            )}
          </View>
          {index < leg.steps.length - 1 && (
            <View style={cardStyles.connectorRow}>
              <View style={cardStyles.connectorLine} />
              {step.buses.length > 0 ? (
                <View style={cardStyles.busRow}>
                  {step.buses.map((bus) => (
                    <BusTag key={bus.text} color={bus.color} text={bus.text} />
                  ))}
                </View>
              ) : (
                <Text style={cardStyles.connectorLabel}>{step.detail}</Text>
              )}
            </View>
          )}
        </Fragment>
      ))}
    </View>
  );
}

/* ------------------------------- 일정 삭제 시트 ------------------------------- */

interface DeleteSheetProps {
  legs: RouteLeg[];
  onClose: () => void;
  onDelete: (ids: string[]) => void;
}

function DeleteSheet({ legs, onClose, onDelete }: DeleteSheetProps) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );

  return (
    <BottomSheet visible onClose={onClose}>
      <View style={deleteStyles.content}>
        <View style={deleteStyles.textGroup}>
          <Text style={deleteStyles.title}>해당 일정을 삭제할까요?</Text>
          <Text style={deleteStyles.description}>
            일정을 삭제한 후에는 복구할 수 없어요
          </Text>
        </View>
        <View style={deleteStyles.card}>
          {legs.map((leg, index) => (
            <Fragment key={leg.id}>
              {index > 0 && <View style={deleteStyles.divider} />}
              <Pressable
                style={deleteStyles.row}
                onPress={() => toggle(leg.id)}
              >
                <Checkbox
                  checked={selected.includes(leg.id)}
                  onPress={() => toggle(leg.id)}
                />
                <RouteTitle from={leg.from} to={leg.to} size="md" />
              </Pressable>
            </Fragment>
          ))}
        </View>
      </View>
      <View style={deleteStyles.footer}>
        <Button
          title="삭제하기"
          disabled={selected.length === 0}
          onPress={() => onDelete(selected)}
        />
      </View>
    </BottomSheet>
  );
}

/* ------------------------------ 빈 시간 채우기 시트 ----------------------------- */

interface FillSheetProps {
  leg: RouteLeg;
  onClose: () => void;
  onConfirm: (suggestion: FillSuggestion) => void;
}

function FillSheet({ leg, onClose, onConfirm }: FillSheetProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const suggestions = useMemo(() => buildFillSuggestions(leg), [leg]);

  const selected = suggestions.find((item) => item.id === selectedId);

  return (
    <BottomSheet visible onClose={onClose}>
      <View style={fillStyles.content}>
        <Text style={fillStyles.title}>빈 시간 채우기</Text>

        <View style={fillStyles.informBox}>
          <RouteTitle from={leg.from} to={leg.to} size="md" />
          <Text style={fillStyles.slack}>{leg.slackMinutes}분 여유</Text>
        </View>

        <View style={fillStyles.section}>
          <Text style={fillStyles.sectionTitle}>일정 제안</Text>
          {suggestions.map((item) => (
            <Pressable
              key={item.id}
              style={[
                fillStyles.card,
                selectedId === item.id && fillStyles.cardSelected,
              ]}
              onPress={() => setSelectedId(item.id)}
            >
              <View style={fillStyles.cardHeader}>
                <RouteTitle from={leg.from} to={item.name} size="md" />
                <Tag status="positive" />
              </View>
              <MetaRow
                color={colors.grey[900]}
                items={[
                  item.transportLabel,
                  `${formatAmPm(item.startTime)} - ${formatAmPm(item.endTime)}`,
                  item.distanceText,
                ]}
              />
            </Pressable>
          ))}
        </View>
      </View>
      <View style={fillStyles.footer}>
        <Button
          title="선택 장소 추가 후 재검사 하기"
          disabled={!selected}
          onPress={() => selected && onConfirm(selected)}
        />
      </View>
    </BottomSheet>
  );
}

/* ------------------------------------ 화면 ----------------------------------- */

export default function ScheduleReviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ day?: string }>();

  const startDate = useTripStore((state) => state.startDate);
  const endDate = useTripStore((state) => state.endDate);

  const reviews = useScheduleStore((state) => state.reviews);
  const setLegs = useScheduleStore((state) => state.setLegs);
  const removeLegs = useScheduleStore((state) => state.removeLegs);
  const recheck = useScheduleStore((state) => state.recheck);
  const confirmDay = useScheduleStore((state) => state.confirmDay);
  const addPlaces = useScheduleStore((state) => state.addPlaces);

  const [selectedDay, setSelectedDay] = useState(Number(params.day) || 1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [menuTop, setMenuTop] = useState<number | null>(null);
  const [reorderOpen, setReorderOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [fillTarget, setFillTarget] = useState<RouteLeg | null>(null);

  const dayCount = useMemo(
    () =>
      startDate && endDate
        ? Math.max(datesBetween(startDate, endDate).length, 1)
        : 1,
    [startDate, endDate],
  );

  const review = reviews[selectedDay];
  const legs = useMemo(() => review?.legs ?? [], [review]);

  const reorderItems = useMemo(
    () =>
      legs.map((leg) => ({
        key: leg.id,
        label: <RouteTitle from={leg.from} to={leg.to} size="md" />,
      })),
    [legs],
  );

  const handleMenuSelect = (key: string) => {
    setMenuTop(null);
    if (key === 'reorder') setReorderOpen(true);
    else if (key === 'add') setAddSheetOpen(true);
    else if (key === 'remove') setDeleteOpen(true);
  };

  const handleReorder = (keys: string[]) => {
    setReorderOpen(false);
    const ordered = keys
      .map((id) => legs.find((leg) => leg.id === id))
      .filter((leg): leg is RouteLeg => !!leg);
    setLegs(selectedDay, rechainLegs(ordered));
  };

  const handleFill = (suggestion: FillSuggestion) => {
    const target = fillTarget;
    setFillTarget(null);
    if (!target) return;

    // 제안 장소를 그 Day의 장소 목록에 넣고, 구간을 둘로 쪼갠다
    const place: SchedulePlace = {
      name: suggestion.name,
      category: '카페',
      address: '',
      visitType: '선택방문',
      stayMinutes: 30,
      coord: null,
    };
    addPlaces(selectedDay, [place]);

    const inserted: RouteLeg[] = [
      {
        ...target,
        id: `${target.from}→${suggestion.name}`,
        to: suggestion.name,
      },
      {
        ...target,
        id: `${suggestion.name}→${target.to}`,
        from: suggestion.name,
        departStayMinutes: place.stayMinutes,
      },
    ];
    setLegs(
      selectedDay,
      rechainLegs(
        legs.flatMap((leg) => (leg.id === target.id ? inserted : [leg])),
      ),
    );
  };

  // 장소 추가 화면에서 돌아오면 새로 담긴 장소를 일정에 끼워 넣는다
  useFocusEffect(
    useCallback(() => {
      const state = useScheduleStore.getState();
      const current = state.reviews[selectedDay];
      if (!current || current.legs.length === 0) return;

      const visited = new Set(
        current.legs.flatMap((leg) => [leg.from, leg.to]),
      );
      const added = (state.places[selectedDay] ?? []).filter(
        (place) => !visited.has(place.name),
      );
      if (added.length === 0) return;

      state.setLegs(selectedDay, insertPlacesBeforeEnd(current.legs, added));
    }, [selectedDay]),
  );

  const handleAddPlace = (key: string) => {
    setAddSheetOpen(false);
    router.push({
      pathname: key === 'favorite' ? '/schedule-favorites' : '/schedule-search',
      params: { day: String(selectedDay) },
    });
  };

  if (!review) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScreenHeader title="일정 검토" />
        <View style={styles.emptyArea}>
          <Text style={styles.emptyText}>
            아직 생성된 일정이 없어요.{'\n'}Day {selectedDay} 일정을 먼저
            생성해주세요.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="일정 검토" />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <DaySelector
          dayCount={dayCount}
          selectedDay={selectedDay}
          onSelectDay={(day) => {
            setSelectedDay(day);
            setExpandedId(null);
          }}
        />

        <View style={styles.summaryBox}>
          <Text style={styles.summary}>{review.summary}</Text>
        </View>

        <View style={styles.legSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleGroup}>
              <Text style={styles.sectionTitle}>일정 항목</Text>
              <Tag status={worstStatus(legs)} />
            </View>
            <MenuIcon
              onPress={(event) =>
                setMenuTop(event.nativeEvent.pageY + spacing.sm)
              }
            />
          </View>

          {legs.map((leg, index) => (
            <LegCard
              key={leg.id}
              leg={leg}
              index={index}
              expanded={expandedId === leg.id}
              onToggle={() =>
                setExpandedId((prev) => (prev === leg.id ? null : leg.id))
              }
              onFillGap={() => setFillTarget(leg)}
              onEdit={() =>
                router.push({
                  pathname: '/schedule-leg',
                  params: { day: String(selectedDay), legId: leg.id },
                })
              }
            />
          ))}
        </View>
      </ScrollView>

      <View
        style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}
      >
        <Button
          title={review.dirty ? '재검사 하기' : '확정하기'}
          disabled={legs.length === 0}
          onPress={() => {
            if (review.dirty) {
              recheck(selectedDay);
              return;
            }
            confirmDay(selectedDay);
            router.back();
          }}
        />
      </View>

      <PopoverMenu
        visible={menuTop !== null}
        items={REVIEW_MENU}
        anchor={{ top: menuTop ?? 0, right: grid.pageMargin }}
        onSelect={handleMenuSelect}
        onClose={() => setMenuTop(null)}
      />

      {reorderOpen && (
        <ReorderSheet
          title="일정을 이동할까요?"
          items={reorderItems}
          onClose={() => setReorderOpen(false)}
          onConfirm={handleReorder}
        />
      )}

      {deleteOpen && (
        <DeleteSheet
          legs={legs}
          onClose={() => setDeleteOpen(false)}
          onDelete={(ids) => {
            removeLegs(selectedDay, ids);
            setDeleteOpen(false);
          }}
        />
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

      {fillTarget && (
        <FillSheet
          leg={fillTarget}
          onClose={() => setFillTarget(null)}
          onConfirm={handleFill}
        />
      )}
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
    paddingHorizontal: grid.pageMargin,
    paddingTop: spacing.md,
    paddingBottom: spacing['2xl'],
  },
  summaryBox: {
    padding: spacing.md,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: radius.xs,
    backgroundColor: colors.white,
  },
  summary: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    lineHeight: lineHeight.sm,
    color: colors.grey[800],
  },
  legSection: {
    gap: spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sectionTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    lineHeight: lineHeight.md,
    color: colors.grey[900],
  },
  footer: {
    paddingHorizontal: grid.pageMargin,
    paddingTop: spacing.xs,
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
    lineHeight: lineHeight.lg,
    color: colors.grey[500],
    textAlign: 'center',
  },
});

const cardStyles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: radius.xs,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  headerLeft: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  reason: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    lineHeight: lineHeight.sm,
    color: colors.grey[800],
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: CARD_BORDER,
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
  },
  pointIconPlace: {
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
    alignItems: 'center',
    gap: spacing['2xl'],
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  // 지점과 지점을 잇는 세로선 (아이콘 가운데에 맞춘다)
  connectorLine: {
    width: 1,
    height: 24,
    backgroundColor: colors.grey[200],
  },
  connectorLabel: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    lineHeight: lineHeight.sm,
    color: colors.grey[800],
  },
  busRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['2xs'],
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing['2xs'],
  },
  flexButton: {
    flex: 1,
  },
});

const deleteStyles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingHorizontal: grid.pageMargin,
  },
  textGroup: {
    gap: spacing['2xs'],
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['2xl'],
    lineHeight: lineHeight.xl,
    color: colors.grey[900],
  },
  description: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    color: colors.grey[700],
  },
  card: {
    gap: 11,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: radius.sm,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: colors.grey[100],
  },
  row: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  footer: {
    paddingHorizontal: grid.pageMargin,
    paddingTop: spacing.lg,
  },
});

const fillStyles = StyleSheet.create({
  content: {
    gap: spacing.xl,
    paddingHorizontal: grid.pageMargin,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['2xl'],
    lineHeight: lineHeight.xl,
    color: colors.grey[900],
    textAlign: 'center',
  },
  informBox: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: radius['2xs'],
    backgroundColor: colors.white,
  },
  slack: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    color: colors.grey[900],
  },
  section: {
    gap: spacing.xs,
  },
  sectionTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    color: colors.grey[900],
  },
  card: {
    gap: spacing.xs,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: radius.xs,
    backgroundColor: colors.white,
  },
  cardSelected: {
    borderColor: colors.primary,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  footer: {
    paddingHorizontal: grid.pageMargin,
    paddingTop: spacing.lg,
  },
});
