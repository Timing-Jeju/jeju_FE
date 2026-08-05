import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  BottomSheet,
  Button,
  CheckContained,
  Checkbox,
  Chip,
  RadioButton,
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
import { searchPlaces, type Place } from '@/services/naverApi';
import {
  isLodgingComplete,
  useTripStore,
  type ArrivalTransport,
  type DayTime,
  type LodgingMode,
  type TripLodging,
  type TripTransportMode,
} from '@/store/useTripStore';
import {
  datesBetween,
  formatAmPm,
  formatDot,
  formatKorean,
  formatShort,
  fromKey,
  toKey,
  WEEKDAYS,
} from '@/utils/date';

// Figma 디자인 전용 색상 (constants 팔레트에 없는 값)
const BACKGROUND = '#FAFAFA';
const TITLE = '#191919';
const INPUT_BORDER = '#F0F0F0';
const CARD_BORDER = '#E9EAED';
const PLACEHOLDER = '#898989';
const INACTIVE_TEXT = '#747476';
const TRACK_BACKGROUND = '#F5F6F9';
const SELECTED_CARD_BG = '#FFFCFB';

const chevronIcon = require('../assets/images/icon-chevron-left.png');
const chevronDownIcon = require('../assets/images/icon-chevron-down.png');
const searchIcon = require('../assets/images/icon-search.png');
const busImage = require('../assets/images/transport-bus.png');
const taxiImage = require('../assets/images/transport-taxi.png');
const walkImage = require('../assets/images/transport-walk.png');
const pinIllust = require('../assets/images/illust-pin.png');
const searchIllust = require('../assets/images/illust-search.png');
const placeholderPlace = require('../assets/images/placeholder-place.png');

const TRAVEL_STYLES = [
  '맛집투어',
  '카페투어',
  '액티비티',
  '힐링/휴식',
  '핫플/트렌디',
  '로컬/현지',
  '예술/전시',
];

const TRANSPORT_OPTIONS: {
  key: TripTransportMode;
  label: string;
  image: number;
}[] = [
  { key: 'bus', label: '버스', image: busImage },
  { key: 'taxi', label: '택시', image: taxiImage },
  { key: 'walk', label: '도보', image: walkImage },
];

// 30분 간격 교통편 시간 후보 (06:00 ~ 22:00)
const TIME_SLOTS = Array.from({ length: 33 }, (_, i) => {
  const hour = 6 + Math.floor(i / 2);
  const minute = i % 2 === 0 ? '00' : '30';
  return `${hour}:${minute}`;
});

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 10, 20, 30, 40, 50];

/* ---------------------------------- 캘린더 ---------------------------------- */

interface CalendarProps {
  startDate: string | null;
  endDate: string | null;
  onSelectDate: (key: string) => void;
}

function Calendar({ startDate, endDate, onSelectDate }: CalendarProps) {
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const moveMonth = (delta: number) => {
    const next = new Date(year, month + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
  };

  const weeks = useMemo(() => {
    const first = new Date(year, month, 1);
    const lastDate = new Date(year, month + 1, 0).getDate();
    const cells: (string | null)[] = Array(first.getDay()).fill(null);
    for (let day = 1; day <= lastDate; day += 1) {
      cells.push(toKey(new Date(year, month, day)));
    }
    while (cells.length % 7 !== 0) cells.push(null);
    const rows: (string | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }, [year, month]);

  const isInRange = (key: string) =>
    !!startDate && !!endDate && key > startDate && key < endDate;
  const isEndpoint = (key: string) => key === startDate || key === endDate;

  return (
    <View style={calendarStyles.container}>
      <View style={calendarStyles.monthRow}>
        <Text style={calendarStyles.monthLabel}>
          {year}년 {month + 1}월
        </Text>
        <View style={calendarStyles.monthNav}>
          <Pressable hitSlop={spacing.xs} onPress={() => moveMonth(-1)}>
            <Image source={chevronIcon} style={calendarStyles.navIcon} />
          </Pressable>
          <Pressable hitSlop={spacing.xs} onPress={() => moveMonth(1)}>
            <Image
              source={chevronIcon}
              style={[calendarStyles.navIcon, calendarStyles.navIconRight]}
            />
          </Pressable>
        </View>
      </View>
      <View style={calendarStyles.weekdayRow}>
        {WEEKDAYS.map((day, index) => (
          <Text
            key={day}
            style={[
              calendarStyles.weekday,
              (index === 0 || index === 6) && calendarStyles.weekdayDim,
            ]}
          >
            {day}
          </Text>
        ))}
      </View>
      {weeks.map((week, weekIndex) => (
        <View key={weekIndex} style={calendarStyles.weekRow}>
          {week.map((key, dayIndex) => {
            if (!key)
              return <View key={dayIndex} style={calendarStyles.dayCell} />;
            const endpoint = isEndpoint(key);
            const inRange = isInRange(key);
            const weekend =
              fromKey(key).getDay() === 0 || fromKey(key).getDay() === 6;
            return (
              <Pressable
                key={dayIndex}
                style={[
                  calendarStyles.dayCell,
                  inRange && calendarStyles.dayCellInRange,
                  endpoint && calendarStyles.dayCellSelected,
                ]}
                onPress={() => onSelectDate(key)}
              >
                <Text
                  style={[
                    calendarStyles.dayLabel,
                    weekend && calendarStyles.dayLabelDim,
                    endpoint && calendarStyles.dayLabelSelected,
                  ]}
                >
                  {fromKey(key).getDate()}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const calendarStyles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthLabel: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['2xl'],
    lineHeight: lineHeight.xl,
    color: colors.grey[900],
  },
  monthNav: {
    flexDirection: 'row',
    gap: 18,
  },
  navIcon: {
    width: 24,
    height: 24,
  },
  navIconRight: {
    transform: [{ scaleX: -1 }],
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  weekday: {
    width: 40,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
    color: colors.grey[900],
    textAlign: 'center',
  },
  weekdayDim: {
    fontFamily: fontFamily.regular,
    color: PLACEHOLDER,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  dayCell: {
    width: 44,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.circle,
  },
  dayCellInRange: {
    backgroundColor: TRACK_BACKGROUND,
    borderRadius: 0,
  },
  dayCellSelected: {
    backgroundColor: colors.primary,
  },
  dayLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
    color: colors.grey[900],
  },
  dayLabelDim: {
    color: PLACEHOLDER,
  },
  dayLabelSelected: {
    color: colors.white,
  },
});

/* ------------------------------- 메인 화면 ------------------------------- */

type OrderGuard = 'schedule' | 'dayTime' | null;

export default function TripConditionsScreen() {
  const router = useRouter();
  const saveConditions = useTripStore((state) => state.saveConditions);
  const stored = useTripStore();

  // 여행 일정
  const [startDate, setStartDate] = useState(stored.startDate);
  const [endDate, setEndDate] = useState(stored.endDate);
  const [arrivalTransport, setArrivalTransport] =
    useState<ArrivalTransport | null>(stored.arrivalTransport);
  const [arrivalTime, setArrivalTime] = useState(stored.arrivalTime);
  const [departureTransport, setDepartureTransport] =
    useState<ArrivalTransport | null>(stored.departureTransport);
  const [departureTime, setDepartureTime] = useState(stored.departureTime);
  // 하루 활동 시간
  const [dayTimes, setDayTimes] = useState<Record<string, DayTime>>(
    stored.dayTimes,
  );
  // 숙소 / 스타일 / 이동수단
  const [lodgingMode, setLodgingMode] = useState<LodgingMode | null>(
    stored.lodgingMode,
  );
  const [lodging, setLodging] = useState<TripLodging | null>(stored.lodging);
  const [dailyLodgings, setDailyLodgings] = useState<
    Record<string, TripLodging>
  >(stored.dailyLodgings);
  const [styleTags, setStyleTags] = useState<string[]>(stored.styles);
  const [transportMode, setTransportMode] = useState<TripTransportMode | null>(
    stored.transport,
  );

  // 바텀시트 / 모달
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [timeSheet, setTimeSheet] = useState<{
    date: string;
    field: 'start' | 'end';
  } | null>(null);
  const [lodgingOpen, setLodgingOpen] = useState(false);
  const [orderGuard, setOrderGuard] = useState<OrderGuard>(null);

  const tripDates = useMemo(
    () => (startDate && endDate ? datesBetween(startDate, endDate) : []),
    [startDate, endDate],
  );

  const isScheduleSet =
    !!startDate && !!endDate && !!arrivalTime && !!departureTime;
  const isDayTimesSet =
    isScheduleSet && tripDates.every((date) => dayTimes[date]);
  // 모든 날의 활동 시간이 같으면 두 드롭다운에 그 값을 그대로 보여준다
  const commonTime = useMemo(() => {
    if (!isDayTimesSet) return null;
    const first = dayTimes[tripDates[0]];
    return tripDates.every(
      (date) =>
        dayTimes[date].start === first.start &&
        dayTimes[date].end === first.end,
    )
      ? first
      : null;
  }, [dayTimes, isDayTimesSet, tripDates]);

  const lodgingDone = isLodgingComplete(
    { lodgingMode, lodging, dailyLodgings },
    tripDates,
  );
  const canSave =
    isDayTimesSet && lodgingDone && styleTags.length > 0 && !!transportMode;

  const toggleStyle = (tag: string) => {
    setStyleTags((prev) => {
      if (prev.includes(tag)) return prev.filter((item) => item !== tag);
      if (prev.length >= 4) return prev;
      return [...prev, tag];
    });
  };

  const openDayTimes = (field: 'start' | 'end') => {
    if (!isScheduleSet) {
      setOrderGuard('schedule');
      return;
    }
    setTimeSheet({ date: tripDates[0], field });
  };

  const openLodging = () => {
    if (!isScheduleSet) {
      setOrderGuard('schedule');
      return;
    }
    if (!isDayTimesSet) {
      setOrderGuard('dayTime');
      return;
    }
    setLodgingOpen(true);
  };

  const handleSave = () => {
    saveConditions({
      startDate,
      endDate,
      arrivalTransport,
      arrivalTime,
      departureTransport,
      departureTime,
      dayTimes,
      lodgingMode,
      lodging,
      dailyLodgings,
      styles: styleTags,
      transport: transportMode,
    });
    router.back();
  };

  /** 숙소 위치 행에 보여줄 요약 문구 */
  const lodgingLabel = () => {
    if (lodgingMode === 'daily') {
      const filled = tripDates.filter((date) => dailyLodgings[date]).length;
      if (filled === 0) return null;
      return filled === tripDates.length
        ? `일자별 숙소 ${filled}곳`
        : `일자별 숙소 ${filled}/${tripDates.length}곳`;
    }
    return lodging?.name ?? null;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleBlock}>
          <Text style={styles.title}>
            이번 여행의 기본 조건을{'\n'}설정해주세요
          </Text>
          <Text style={styles.subtitle}>
            선택 값을 바탕으로 일정을 생성해드려요
          </Text>
        </View>

        <View style={styles.card}>
          {/* 여행 일정 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>여행 일정</Text>
            <Pressable
              style={styles.scheduleBox}
              onPress={() => setScheduleOpen(true)}
            >
              <View style={styles.scheduleSide}>
                {startDate ? (
                  <>
                    <Text style={styles.scheduleDate}>
                      {formatKorean(startDate)}
                    </Text>
                    <Text style={styles.scheduleSub}>
                      {arrivalTransport ?? '교통편'} {arrivalTime ?? ''} 도착
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.scheduleLabel}>가는 날</Text>
                    <Text style={styles.schedulePlaceholder}>날짜 선택</Text>
                  </>
                )}
              </View>
              <View style={styles.scheduleDivider} />
              <View style={styles.scheduleSide}>
                {endDate ? (
                  <>
                    <Text style={styles.scheduleDate}>
                      {formatKorean(endDate)}
                    </Text>
                    <Text style={styles.scheduleSub}>
                      {departureTransport ?? '교통편'} {departureTime ?? ''}{' '}
                      떠남
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.scheduleLabel}>오는 날</Text>
                    <Text style={styles.schedulePlaceholder}>날짜 선택</Text>
                  </>
                )}
              </View>
            </Pressable>
          </View>

          {/* 하루 활동 시간 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>하루 활동 시간</Text>
            <View style={styles.timeRow}>
              <Pressable
                style={styles.dropdown}
                onPress={() => openDayTimes('start')}
              >
                <Text
                  style={
                    commonTime ? styles.inputValue : styles.inputPlaceholder
                  }
                >
                  {commonTime ? formatAmPm(commonTime.start) : '시작 시간'}
                </Text>
                <Image source={chevronDownIcon} style={styles.dropdownIcon} />
              </Pressable>
              <Pressable
                style={styles.dropdown}
                onPress={() => openDayTimes('end')}
              >
                <Text
                  style={
                    commonTime ? styles.inputValue : styles.inputPlaceholder
                  }
                >
                  {commonTime ? formatAmPm(commonTime.end) : '종료 시간'}
                </Text>
                <Image source={chevronDownIcon} style={styles.dropdownIcon} />
              </Pressable>
            </View>

            {/* 날마다 시간이 다르면 Day별로도 확인할 수 있게 펼쳐둔다 */}
            {isDayTimesSet && !commonTime && (
              <View style={styles.dayList}>
                {tripDates.map((date, index) => (
                  <Pressable
                    key={date}
                    style={styles.dayRow}
                    onPress={() => setTimeSheet({ date, field: 'start' })}
                  >
                    <View style={styles.dayRowLeft}>
                      <View style={styles.dayBadge}>
                        <Text style={styles.dayBadgeLabel}>
                          Day {index + 1}
                        </Text>
                      </View>
                      <Text style={styles.dayRowDate}>{formatShort(date)}</Text>
                    </View>
                    <View style={styles.dayRowRight}>
                      <Text style={styles.dayRowTime}>
                        {dayTimes[date].start} ~ {dayTimes[date].end}
                      </Text>
                      <Image source={chevronIcon} style={styles.rowChevron} />
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* 숙소 위치 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>숙소 위치</Text>
            <Pressable style={styles.inputRow} onPress={openLodging}>
              {lodgingLabel() ? (
                <Text style={styles.inputValue}>{lodgingLabel()}</Text>
              ) : (
                <Text style={styles.inputPlaceholder}>검색 또는 지도 선택</Text>
              )}
              <Image source={searchIcon} style={styles.rowSearchIcon} />
            </Pressable>
          </View>

          {/* 여행 스타일 */}
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>여행 스타일</Text>
              <Text style={styles.sectionHint}>최대 4개 선택 가능해요</Text>
            </View>
            <View style={styles.chipWrap}>
              {TRAVEL_STYLES.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  selected={styleTags.includes(tag)}
                  onPress={() => toggleStyle(tag)}
                />
              ))}
            </View>
          </View>

          {/* 주요 이동 수단 */}
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>주요 이동 수단</Text>
              <Text style={styles.sectionHint}>1개만 선택 가능해요</Text>
            </View>
            <View style={styles.transportRow}>
              {TRANSPORT_OPTIONS.map((option) => {
                const isSelected = transportMode === option.key;
                return (
                  <Pressable
                    key={option.key}
                    style={[
                      styles.transportCard,
                      isSelected && styles.transportCardSelected,
                    ]}
                    onPress={() => setTransportMode(option.key)}
                  >
                    <Image
                      source={option.image}
                      style={styles.transportImage}
                    />
                    <Text
                      style={[
                        styles.transportLabel,
                        isSelected && styles.transportLabelSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="기본 조건 저장"
          disabled={!canSave}
          onPress={handleSave}
        />
      </View>

      {/* 여행 일정 바텀시트 */}
      <ScheduleSheet
        visible={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        initial={{
          startDate,
          endDate,
          arrivalTransport,
          arrivalTime,
          departureTransport,
          departureTime,
        }}
        onComplete={(value) => {
          setStartDate(value.startDate);
          setEndDate(value.endDate);
          setArrivalTransport(value.arrivalTransport);
          setArrivalTime(value.arrivalTime);
          setDepartureTransport(value.departureTransport);
          setDepartureTime(value.departureTime);
          // 날짜가 바뀌면 날짜 키로 잡아둔 값은 모두 다시 받아야 한다
          setDayTimes({});
          setDailyLodgings({});
          setScheduleOpen(false);
        }}
      />

      {/* 하루 활동 시간 바텀시트 */}
      {timeSheet && (
        <DayTimeSheet
          visible
          dates={tripDates}
          initialDate={timeSheet.date}
          initialField={timeSheet.field}
          initialApplyAll={!!commonTime || !isDayTimesSet}
          existing={dayTimes}
          onClose={() => setTimeSheet(null)}
          onComplete={(next) => {
            setDayTimes((prev) => ({ ...prev, ...next }));
            setTimeSheet(null);
          }}
        />
      )}

      {/* 숙소 위치 바텀시트 */}
      {lodgingOpen && (
        <LodgingSheet
          dates={tripDates}
          initialMode={lodgingMode}
          initialLodging={lodging}
          initialDailyLodgings={dailyLodgings}
          onClose={() => setLodgingOpen(false)}
          onComplete={(value) => {
            setLodgingMode(value.mode);
            setLodging(value.lodging);
            setDailyLodgings(value.dailyLodgings);
            setLodgingOpen(false);
          }}
        />
      )}

      {/* 순서 안내 모달 */}
      <Modal visible={orderGuard !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setOrderGuard(null)}
          />
          <View style={styles.modalBox}>
            <Image source={pinIllust} style={styles.modalIllust} />
            <View style={styles.modalTextGroup}>
              <Text style={styles.modalTitle}>
                {orderGuard === 'schedule'
                  ? '앗, 여행 일정을 먼저 정해볼까요?'
                  : '앗, 하루 활동 시간을 먼저 정해볼까요?'}
              </Text>
              <Text style={styles.modalSubtitle}>
                순서대로 입력해야 최적의 일정 추천이 가능해요!
              </Text>
            </View>
            <Button
              title={
                orderGuard === 'schedule'
                  ? '여행 일정 입력하러 가기'
                  : '하루 활동 시간 입력하러 가기'
              }
              size="small"
              onPress={() => {
                const guard = orderGuard;
                setOrderGuard(null);
                if (guard === 'schedule') setScheduleOpen(true);
                else openDayTimes('start');
              }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ------------------------------ 여행 일정 시트 ------------------------------ */

interface ScheduleValue {
  startDate: string | null;
  endDate: string | null;
  arrivalTransport: ArrivalTransport | null;
  arrivalTime: string | null;
  departureTransport: ArrivalTransport | null;
  departureTime: string | null;
}

interface ScheduleSheetProps {
  visible: boolean;
  onClose: () => void;
  initial: ScheduleValue;
  onComplete: (value: ScheduleValue) => void;
}

function ScheduleSheet({
  visible,
  onClose,
  initial,
  onComplete,
}: ScheduleSheetProps) {
  const [startDate, setStartDate] = useState(initial.startDate);
  const [endDate, setEndDate] = useState(initial.endDate);
  const [arrivalTransport, setArrivalTransport] = useState<ArrivalTransport>(
    initial.arrivalTransport ?? '비행기',
  );
  const [arrivalTime, setArrivalTime] = useState(initial.arrivalTime);
  const [departureTransport, setDepartureTransport] =
    useState<ArrivalTransport>(initial.departureTransport ?? '비행기');
  const [departureTime, setDepartureTime] = useState(initial.departureTime);

  const handleSelectDate = (key: string) => {
    if (!startDate || (startDate && endDate)) {
      setStartDate(key);
      setEndDate(null);
      return;
    }
    if (key < startDate) {
      setStartDate(key);
      return;
    }
    setEndDate(key);
  };

  const canComplete =
    !!startDate && !!endDate && !!arrivalTime && !!departureTime;

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={sheetStyles.headerArea}>
        <Text style={sheetStyles.title}>제주에서의 일정을 알려주세요</Text>
      </View>
      <ScrollView style={sheetStyles.scheduleScroll}>
        <Calendar
          startDate={startDate}
          endDate={endDate}
          onSelectDate={handleSelectDate}
        />
        <View style={sheetStyles.transportArea}>
          <TransportQuestion
            question="어떤 교통편으로 제주에 도착하시나요?"
            transport={arrivalTransport}
            onSelectTransport={setArrivalTransport}
            time={arrivalTime}
            onSelectTime={setArrivalTime}
          />
          <TransportQuestion
            question="어떤 교통편으로 제주를 떠나시나요?"
            transport={departureTransport}
            onSelectTransport={setDepartureTransport}
            time={departureTime}
            onSelectTime={setDepartureTime}
          />
        </View>
      </ScrollView>
      <View style={sheetStyles.footer}>
        <Button
          title="선택완료"
          disabled={!canComplete}
          onPress={() =>
            onComplete({
              startDate,
              endDate,
              arrivalTransport,
              arrivalTime,
              departureTransport,
              departureTime,
            })
          }
        />
      </View>
    </BottomSheet>
  );
}

interface TransportQuestionProps {
  question: string;
  transport: ArrivalTransport;
  onSelectTransport: (value: ArrivalTransport) => void;
  time: string | null;
  onSelectTime: (value: string) => void;
}

function TransportQuestion({
  question,
  transport,
  onSelectTransport,
  time,
  onSelectTime,
}: TransportQuestionProps) {
  return (
    <View style={sheetStyles.question}>
      <Text style={sheetStyles.questionTitle}>{question}</Text>
      <View style={sheetStyles.radioRow}>
        {(['비행기', '선박'] as const).map((option) => (
          <Pressable
            key={option}
            style={sheetStyles.radioItem}
            onPress={() => onSelectTransport(option)}
          >
            <RadioButton
              selected={transport === option}
              onPress={() => onSelectTransport(option)}
            />
            <Text
              style={[
                sheetStyles.radioLabel,
                transport === option && sheetStyles.radioLabelActive,
              ]}
            >
              {option}
            </Text>
          </Pressable>
        ))}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={sheetStyles.timeChipRow}>
          {TIME_SLOTS.map((slot) => {
            const isSelected = time === slot;
            return (
              <Pressable
                key={slot}
                style={[
                  sheetStyles.timeChip,
                  isSelected && sheetStyles.timeChipSelected,
                ]}
                onPress={() => onSelectTime(slot)}
              >
                <Text
                  style={[
                    sheetStyles.timeChipLabel,
                    isSelected && sheetStyles.timeChipLabelSelected,
                  ]}
                >
                  {slot}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

/* ---------------------------- 하루 활동 시간 시트 ---------------------------- */

interface DayTimeSheetProps {
  visible: boolean;
  dates: string[];
  initialDate: string;
  initialField: 'start' | 'end';
  initialApplyAll?: boolean;
  existing: Record<string, DayTime>;
  onClose: () => void;
  onComplete: (times: Record<string, DayTime>) => void;
}

function DayTimeSheet({
  visible,
  dates,
  initialDate,
  initialField,
  initialApplyAll = false,
  existing,
  onClose,
  onComplete,
}: DayTimeSheetProps) {
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [applyAll, setApplyAll] = useState(initialApplyAll);
  // 여행 일수가 많으면 Day 탭을 가로 스크롤로 전환한다
  const manyDays = dates.length > 4;
  const dayScrollRef = useRef<ScrollView>(null);
  // 바텀시트가 올라오면 기본 시작 시간을 오전 9:00으로 세팅한다 (디자인 주석)
  const [start, setStart] = useState(existing[initialDate]?.start ?? '9:00');
  const [end, setEnd] = useState<string | null>(
    existing[initialDate]?.end ?? null,
  );
  const [activeField, setActiveField] = useState<'start' | 'end'>(initialField);

  const activeTime = activeField === 'start' ? start : end;
  const [activeHour, activeMinute] = (activeTime ?? '9:00')
    .split(':')
    .map(Number);

  const setTime = (hour: number, minute: number) => {
    const value = `${hour}:${String(minute).padStart(2, '0')}`;
    if (activeField === 'start') setStart(value);
    else setEnd(value);
  };

  const switchDate = (date: string) => {
    setSelectedDate(date);
    setStart(existing[date]?.start ?? '9:00');
    setEnd(existing[date]?.end ?? null);
    setActiveField('start');
  };

  const handleComplete = () => {
    if (!end) return;
    const time: DayTime = { start, end };
    if (applyAll) {
      const all: Record<string, DayTime> = {};
      dates.forEach((date) => {
        all[date] = time;
      });
      onComplete(all);
    } else {
      onComplete({ [selectedDate]: time });
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={sheetStyles.headerArea}>
        <Text style={sheetStyles.title}>
          제주에서의 하루 활동 시간을 알려주세요
        </Text>
        {(() => {
          const segments = dates.map((date) => {
            const isSelected = date === selectedDate;
            const day = fromKey(date);
            return (
              <Pressable
                key={date}
                style={[
                  sheetStyles.daySegment,
                  manyDays && sheetStyles.daySegmentFixed,
                  isSelected && sheetStyles.daySegmentSelected,
                ]}
                onPress={() => switchDate(date)}
              >
                <Text
                  style={[
                    sheetStyles.dayWeekday,
                    isSelected && sheetStyles.dayTextSelected,
                  ]}
                >
                  {WEEKDAYS[day.getDay()]}
                </Text>
                <Text
                  style={[
                    sheetStyles.dayNumber,
                    isSelected && sheetStyles.dayTextSelected,
                  ]}
                >
                  {day.getDate()}
                </Text>
              </Pressable>
            );
          });

          if (!manyDays) {
            return <View style={sheetStyles.dayTrack}>{segments}</View>;
          }
          return (
            <ScrollView
              ref={dayScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={sheetStyles.dayTrackScroll}
              contentContainerStyle={sheetStyles.dayTrackContent}
              onLayout={() => {
                const index = dates.indexOf(selectedDate);
                dayScrollRef.current?.scrollTo({
                  x: Math.max(index * 80 - 120, 0),
                  animated: false,
                });
              }}
            >
              {segments}
            </ScrollView>
          );
        })()}
        <Pressable
          style={sheetStyles.applyAllRow}
          onPress={() => setApplyAll((prev) => !prev)}
        >
          <CheckContained
            checked={applyAll}
            onPress={() => setApplyAll((prev) => !prev)}
          />
          <Text
            style={[
              sheetStyles.applyAllLabel,
              applyAll && sheetStyles.applyAllLabelActive,
            ]}
          >
            모든 날 동일하게 적용
          </Text>
        </Pressable>

        <View style={sheetStyles.timeDisplayRow}>
          <Pressable onPress={() => setActiveField('start')}>
            <Text
              style={[
                sheetStyles.timeDisplay,
                activeField === 'start'
                  ? sheetStyles.timeDisplayActive
                  : sheetStyles.timeDisplayInactive,
              ]}
            >
              {formatAmPm(start)}
            </Text>
          </Pressable>
          <Image source={chevronIcon} style={sheetStyles.timeChevron} />
          <Pressable onPress={() => setActiveField('end')}>
            <Text
              style={[
                sheetStyles.timeDisplay,
                activeField === 'end'
                  ? sheetStyles.timeDisplayActive
                  : sheetStyles.timeDisplayInactive,
              ]}
            >
              {end ? formatAmPm(end) : '종료 시간'}
            </Text>
          </Pressable>
        </View>

        <View style={sheetStyles.pickerRow}>
          <ScrollView style={sheetStyles.pickerColumn} nestedScrollEnabled>
            {HOURS.map((hour) => (
              <Pressable
                key={hour}
                style={[
                  sheetStyles.pickerItem,
                  hour === activeHour && sheetStyles.pickerItemSelected,
                ]}
                onPress={() => setTime(hour, activeMinute || 0)}
              >
                <Text
                  style={[
                    sheetStyles.pickerLabel,
                    hour === activeHour && sheetStyles.pickerLabelSelected,
                  ]}
                >
                  {hour}시
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <ScrollView style={sheetStyles.pickerColumn} nestedScrollEnabled>
            {MINUTES.map((minute) => (
              <Pressable
                key={minute}
                style={[
                  sheetStyles.pickerItem,
                  minute === activeMinute && sheetStyles.pickerItemSelected,
                ]}
                onPress={() => setTime(activeHour, minute)}
              >
                <Text
                  style={[
                    sheetStyles.pickerLabel,
                    minute === activeMinute && sheetStyles.pickerLabelSelected,
                  ]}
                >
                  {String(minute).padStart(2, '0')}분
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
      <View style={sheetStyles.footer}>
        <Button title="선택완료" disabled={!end} onPress={handleComplete} />
      </View>
    </BottomSheet>
  );
}

/* ------------------------------ 숙소 위치 시트 ------------------------------ */

interface LodgingValue {
  mode: LodgingMode;
  lodging: TripLodging | null;
  dailyLodgings: Record<string, TripLodging>;
}

interface LodgingSheetProps {
  dates: string[];
  initialMode: LodgingMode | null;
  initialLodging: TripLodging | null;
  initialDailyLodgings: Record<string, TripLodging>;
  onClose: () => void;
  onComplete: (value: LodgingValue) => void;
}

/** mode: 숙소 형태 선택 → days: 일자별 목록 → search: 숙소 검색 */
type LodgingStep = 'mode' | 'days' | 'search';

function LodgingSheet({
  dates,
  initialMode,
  initialLodging,
  initialDailyLodgings,
  onClose,
  onComplete,
}: LodgingSheetProps) {
  const [step, setStep] = useState<LodgingStep>('mode');
  const [mode, setMode] = useState<LodgingMode | null>(initialMode);
  const [lodging, setLodging] = useState<TripLodging | null>(initialLodging);
  const [dailyLodgings, setDailyLodgings] = useState(initialDailyLodgings);
  /** 지금 검색 중인 날짜 (단일 숙소면 null) */
  const [targetDate, setTargetDate] = useState<string | null>(null);

  const allFilled = dates.every((date) => dailyLodgings[date]);

  const handleSelectMode = () => {
    if (mode === 'daily') {
      setStep('days');
      return;
    }
    setTargetDate(null);
    setStep('search');
  };

  const handleSearched = (place: TripLodging) => {
    if (mode === 'daily' && targetDate) {
      setDailyLodgings((prev) => ({ ...prev, [targetDate]: place }));
      setStep('days');
      return;
    }
    onComplete({ mode: 'single', lodging: place, dailyLodgings: {} });
  };

  if (step === 'mode') {
    return (
      <BottomSheet visible onClose={onClose}>
        <View style={sheetStyles.headerArea}>
          <Text style={sheetStyles.title}>
            제주에서 머무를 숙소를 알려주세요
          </Text>
          <View style={lodgingStyles.modeRow}>
            {(
              [
                {
                  key: 'single',
                  title: '한 숙소에서만 머물러요',
                  description: '여행 기간 동안 한 곳에만\n숙박할 예정이에요.',
                },
                {
                  key: 'daily',
                  title: '여행 중 숙소가 달라져요',
                  description: '중간에 숙소를\n옮길 예정이에요.',
                },
              ] as const
            ).map((option) => {
              const isSelected = mode === option.key;
              return (
                <Pressable
                  key={option.key}
                  style={[
                    lodgingStyles.modeCard,
                    isSelected && lodgingStyles.modeCardSelected,
                  ]}
                  onPress={() => setMode(option.key)}
                >
                  <Checkbox
                    checked={isSelected}
                    onPress={() => setMode(option.key)}
                  />
                  <View style={lodgingStyles.modeTextGroup}>
                    <Text style={lodgingStyles.modeTitle}>{option.title}</Text>
                    <Text style={lodgingStyles.modeDescription}>
                      {option.description}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={sheetStyles.footer}>
          <Button
            title="선택완료"
            disabled={!mode}
            onPress={handleSelectMode}
          />
        </View>
      </BottomSheet>
    );
  }

  if (step === 'days') {
    return (
      <BottomSheet visible onClose={onClose}>
        <View style={sheetStyles.headerArea}>
          <Text style={sheetStyles.title}>
            {allFilled
              ? '입력한 숙소를 확인해주세요'
              : '일자별로 숙소를 입력해주세요'}
          </Text>
          <View style={lodgingStyles.dayList}>
            {dates.map((date, index) => (
              <Pressable
                key={date}
                style={lodgingStyles.dayRow}
                onPress={() => {
                  setTargetDate(date);
                  setStep('search');
                }}
              >
                <View style={lodgingStyles.dayTextGroup}>
                  <Text style={lodgingStyles.dayTitle}>Day {index + 1}</Text>
                  <Text style={lodgingStyles.dayDate}>{formatDot(date)}</Text>
                </View>
                <View style={lodgingStyles.dayValueGroup}>
                  <Text
                    style={
                      dailyLodgings[date]
                        ? lodgingStyles.dayValue
                        : lodgingStyles.dayPlaceholder
                    }
                    numberOfLines={1}
                  >
                    {dailyLodgings[date]?.name ?? '숙소 선택'}
                  </Text>
                  <Image
                    source={chevronIcon}
                    style={lodgingStyles.dayChevron}
                  />
                </View>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={[sheetStyles.footer, lodgingStyles.dayFooter]}>
          {!allFilled && (
            <Button
              title="이전"
              color="outlinedGrey"
              style={lodgingStyles.footerButton}
              onPress={() => setStep('mode')}
            />
          )}
          <Button
            title="다음"
            disabled={!allFilled}
            style={lodgingStyles.footerButton}
            onPress={() =>
              onComplete({ mode: 'daily', lodging: null, dailyLodgings })
            }
          />
        </View>
      </BottomSheet>
    );
  }

  return (
    <LodgingSearchSheet
      selected={targetDate ? dailyLodgings[targetDate] : lodging}
      onClose={mode === 'daily' ? () => setStep('days') : onClose}
      onComplete={(place) => {
        setLodging(place);
        handleSearched(place);
      }}
    />
  );
}

interface LodgingSearchSheetProps {
  selected: TripLodging | null | undefined;
  onClose: () => void;
  onComplete: (lodging: TripLodging) => void;
}

function LodgingSearchSheet({
  selected: initialSelected,
  onClose,
  onComplete,
}: LodgingSearchSheetProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState<Place | null>(null);

  const handleSearch = async () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    try {
      const places = await searchPlaces(`제주 ${trimmed}`);
      setResults(places);
    } catch {
      setResults([]);
    } finally {
      setSearched(true);
      setSelected(null);
    }
  };

  return (
    <BottomSheet visible onClose={onClose}>
      <View style={sheetStyles.headerArea}>
        <Text style={sheetStyles.title}>제주에서 머무를 숙소를 알려주세요</Text>
        <View style={sheetStyles.searchBox}>
          <TextInput
            style={sheetStyles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder={initialSelected?.name ?? '숙소를 입력해주세요'}
            placeholderTextColor={PLACEHOLDER}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
          <Pressable hitSlop={spacing.xs} onPress={handleSearch}>
            <Image source={searchIcon} style={sheetStyles.searchIcon} />
          </Pressable>
        </View>

        {!searched && (
          <View style={sheetStyles.exampleArea}>
            <Text style={sheetStyles.exampleTitle}>검색 예시</Text>
            <View style={sheetStyles.exampleList}>
              <View>
                <Text style={sheetStyles.exampleItem}>
                  • 건물명 또는 호텔명 검색
                </Text>
                <Text style={sheetStyles.exampleSub}> (예: 제주 신라호텔)</Text>
              </View>
              <View>
                <Text style={sheetStyles.exampleItem}>• 도로명 주소</Text>
                <Text style={sheetStyles.exampleSub}>
                  {' '}
                  (예: 제주 서귀포시 중문관광로72번길 75)
                </Text>
              </View>
              <View>
                <Text style={sheetStyles.exampleItem}>• 지번 주소</Text>
                <Text style={sheetStyles.exampleSub}>
                  {' '}
                  (예: 서귀포시 색달동 3039-3)
                </Text>
              </View>
            </View>
          </View>
        )}

        {searched && results.length > 0 && (
          <View style={sheetStyles.resultArea}>
            <Text style={sheetStyles.exampleTitle}>검색 결과</Text>
            <ScrollView style={sheetStyles.resultScroll} nestedScrollEnabled>
              <View style={sheetStyles.resultList}>
                {results.map((place) => (
                  <Pressable
                    key={`${place.name}-${place.coord.longitude}`}
                    style={sheetStyles.resultRow}
                    onPress={() => setSelected(place)}
                  >
                    <View style={sheetStyles.resultInfo}>
                      <Image
                        source={placeholderPlace}
                        style={sheetStyles.resultImage}
                      />
                      <View style={sheetStyles.resultTextGroup}>
                        <Text style={sheetStyles.resultName} numberOfLines={1}>
                          {place.name}
                        </Text>
                        <Text
                          style={sheetStyles.resultAddress}
                          numberOfLines={1}
                        >
                          {place.roadAddress}
                        </Text>
                      </View>
                    </View>
                    <RadioButton
                      selected={selected === place}
                      onPress={() => setSelected(place)}
                    />
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {searched && results.length === 0 && (
          <View style={sheetStyles.emptyArea}>
            <Image source={searchIllust} style={sheetStyles.emptyIllust} />
            <Text style={sheetStyles.emptyTitle}>검색 결과가 없어요</Text>
            <Text style={sheetStyles.emptySub}>
              입력하신 &quot;{query.trim()}&quot;와(과) 일치하는 숙소가 없어요.
            </Text>
          </View>
        )}
      </View>
      <View style={sheetStyles.footer}>
        <Button
          title="선택완료"
          disabled={!selected}
          onPress={() =>
            selected &&
            onComplete({
              name: selected.name,
              address: selected.roadAddress,
              coord: selected.coord,
            })
          }
        />
      </View>
    </BottomSheet>
  );
}

/* --------------------------------- 스타일 --------------------------------- */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingBottom: spacing.xl,
  },
  titleBlock: {
    paddingHorizontal: grid.pageMargin,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing['2xs'],
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['4xl'],
    lineHeight: lineHeight['3xl'],
    color: TITLE,
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    color: colors.grey[700],
  },
  card: {
    backgroundColor: colors.white,
    padding: grid.pageMargin,
    gap: 22,
  },
  section: {
    gap: spacing.xs,
  },
  sectionTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    lineHeight: lineHeight.xl,
    color: colors.grey[900],
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionHint: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.xs,
    color: INACTIVE_TEXT,
  },
  scheduleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    borderRadius: radius['2xs'],
  },
  scheduleSide: {
    alignItems: 'center',
    gap: spacing['2xs'],
  },
  scheduleLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.xs,
    color: PLACEHOLDER,
  },
  schedulePlaceholder: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    color: PLACEHOLDER,
  },
  scheduleDate: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    color: colors.grey[900],
  },
  scheduleSub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    lineHeight: lineHeight.lg,
    color: PLACEHOLDER,
  },
  scheduleDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.grey[200],
  },
  timeRow: {
    flexDirection: 'row',
    gap: 3,
  },
  dropdown: {
    flex: 1,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    borderRadius: radius['2xs'],
  },
  dropdownIcon: {
    width: 24,
    height: 24,
    tintColor: colors.grey[500],
  },
  inputRow: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    borderRadius: radius['2xs'],
  },
  inputPlaceholder: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    color: PLACEHOLDER,
  },
  inputValue: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    color: colors.grey[900],
  },
  rowChevron: {
    width: 24,
    height: 24,
    transform: [{ scaleX: -1 }],
  },
  rowSearchIcon: {
    width: 24,
    height: 24,
    tintColor: colors.grey[800],
  },
  dayList: {
    gap: 3,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.grey[100],
    borderRadius: radius['2xs'],
  },
  dayRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dayBadge: {
    width: 46,
    paddingVertical: spacing['2xs'],
    borderRadius: radius['3xs'],
    backgroundColor: orange[50],
    alignItems: 'center',
  },
  dayBadgeLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.xs,
    color: colors.primary,
  },
  dayRowDate: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    color: colors.grey[900],
  },
  dayRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dayRowTime: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    color: colors.primary,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing['2xs'],
  },
  transportRow: {
    flexDirection: 'row',
    gap: 6,
  },
  transportCard: {
    flex: 1,
    height: 95,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing['3xs'],
    borderRadius: radius['2xs'],
    backgroundColor: BACKGROUND,
  },
  transportCardSelected: {
    backgroundColor: SELECTED_CARD_BG,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  transportImage: {
    width: 72,
    height: 60,
    resizeMode: 'contain',
  },
  transportLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.xs,
    color: colors.grey[400],
  },
  transportLabelSelected: {
    fontFamily: fontFamily.bold,
    color: colors.primary,
  },
  footer: {
    paddingHorizontal: grid.pageMargin,
    paddingTop: spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dim,
  },
  modalBox: {
    width: grid.containerMaxWidth,
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: 30,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
  },
  modalIllust: {
    width: 120,
    height: 84,
    resizeMode: 'contain',
    marginVertical: spacing.lg,
  },
  modalTextGroup: {
    alignItems: 'center',
    gap: spacing['2xs'],
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['2xl'],
    lineHeight: lineHeight.xl,
    color: colors.grey[900],
    textAlign: 'center',
  },
  modalSubtitle: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.xs,
    color: colors.grey[600],
    textAlign: 'center',
  },
});

const lodgingStyles = StyleSheet.create({
  modeRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  modeCard: {
    flex: 1,
    gap: 6,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: radius['2xs'],
    backgroundColor: colors.white,
  },
  modeCardSelected: {
    borderColor: colors.primary,
    backgroundColor: orange[50],
  },
  modeTextGroup: {
    gap: spacing['2xs'],
  },
  modeTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    color: colors.grey[900],
  },
  modeDescription: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    lineHeight: lineHeight.sm,
    color: colors.grey[800],
  },
  dayList: {
    gap: spacing.xs,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: radius['2xs'],
  },
  dayTextGroup: {
    gap: spacing['2xs'],
  },
  dayTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    color: colors.grey[900],
  },
  dayDate: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    lineHeight: lineHeight.sm,
    color: colors.grey[800],
  },
  dayValueGroup: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['2xs'],
  },
  dayPlaceholder: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    color: colors.grey[700],
  },
  dayValue: {
    flexShrink: 1,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    color: colors.grey[900],
  },
  dayChevron: {
    width: 24,
    height: 24,
    tintColor: colors.grey[700],
    transform: [{ scaleX: -1 }],
  },
  dayFooter: {
    flexDirection: 'row',
    gap: spacing['2xs'],
  },
  footerButton: {
    flex: 1,
  },
});

const sheetStyles = StyleSheet.create({
  headerArea: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['2xl'],
    lineHeight: lineHeight.xl,
    color: '#2E2E2E',
  },
  scheduleScroll: {
    maxHeight: 560,
  },
  transportArea: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    backgroundColor: TRACK_BACKGROUND,
  },
  question: {
    gap: spacing['2xs'],
  },
  questionTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    color: colors.grey[900],
  },
  radioRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  radioLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    color: colors.grey[600],
  },
  radioLabelActive: {
    color: colors.primary,
  },
  timeChipRow: {
    flexDirection: 'row',
    gap: spacing['2xs'],
  },
  timeChip: {
    width: 50,
    paddingVertical: spacing['2xs'],
    borderRadius: radius.circle,
    borderWidth: 1,
    borderColor: colors.grey[100],
    backgroundColor: colors.white,
    alignItems: 'center',
  },
  timeChipSelected: {
    borderColor: colors.primary,
  },
  timeChipLabel: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.lg,
    color: colors.grey[700],
  },
  timeChipLabelSelected: {
    color: colors.primary,
  },
  footer: {
    paddingHorizontal: grid.pageMargin,
    paddingTop: spacing.lg,
  },
  dayTrack: {
    flexDirection: 'row',
    padding: spacing['2xs'],
    borderRadius: 6,
    backgroundColor: TRACK_BACKGROUND,
  },
  dayTrackScroll: {
    borderRadius: 6,
    backgroundColor: TRACK_BACKGROUND,
  },
  dayTrackContent: {
    flexDirection: 'row',
    padding: spacing['2xs'],
  },
  daySegmentFixed: {
    flex: 0,
    width: 76,
  },
  daySegment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderRadius: 6,
    gap: spacing['2xs'],
  },
  daySegmentSelected: {
    backgroundColor: colors.white,
    shadowColor: '#3D2707',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  dayWeekday: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.xs,
    color: INACTIVE_TEXT,
  },
  dayNumber: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    color: INACTIVE_TEXT,
  },
  dayTextSelected: {
    color: colors.primary,
  },
  applyAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  applyAllLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    color: colors.grey[400],
  },
  applyAllLabelActive: {
    color: colors.primary,
  },
  timeDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  timeDisplay: {
    width: 110,
    fontFamily: fontFamily.bold,
    fontSize: fontSize['4xl'],
    lineHeight: lineHeight['3xl'],
    textAlign: 'center',
  },
  timeDisplayActive: {
    color: colors.primary,
  },
  timeDisplayInactive: {
    color: colors.grey[300],
  },
  timeChevron: {
    width: 24,
    height: 24,
    // 시작 시간 → 종료 시간 방향이라 좌우를 뒤집어 오른쪽 화살표로 쓴다
    transform: [{ scaleX: -1 }],
  },
  pickerRow: {
    flexDirection: 'row',
    height: 180,
  },
  pickerColumn: {
    flex: 1,
  },
  pickerItem: {
    paddingVertical: spacing.xs,
    borderRadius: radius['2xs'],
    alignItems: 'center',
  },
  pickerItemSelected: {
    backgroundColor: TRACK_BACKGROUND,
  },
  pickerLabel: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    color: colors.grey[400],
  },
  pickerLabelSelected: {
    color: colors.grey[900],
  },
  searchBox: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: radius.circle,
    backgroundColor: colors.white,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 28,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    color: colors.grey[900],
    padding: 0,
  },
  searchIcon: {
    width: 24,
    height: 24,
    tintColor: colors.grey[800],
  },
  exampleArea: {
    gap: spacing.xs,
    minHeight: 280,
  },
  exampleTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    lineHeight: lineHeight.md,
    color: colors.grey[900],
  },
  exampleList: {
    gap: spacing.md,
  },
  exampleItem: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.lg,
    lineHeight: 26,
    color: INACTIVE_TEXT,
  },
  exampleSub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    lineHeight: 22,
    color: INACTIVE_TEXT,
    paddingLeft: spacing.lg,
  },
  resultArea: {
    gap: spacing.xs,
  },
  resultScroll: {
    maxHeight: 300,
  },
  resultList: {
    gap: spacing['2xs'],
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderWidth: 1,
    borderColor: TRACK_BACKGROUND,
    borderRadius: radius['2xs'],
    backgroundColor: colors.white,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  },
  resultInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginRight: spacing.sm,
  },
  resultImage: {
    width: 50,
    height: 50,
    borderRadius: radius['3xs'],
  },
  resultTextGroup: {
    flexShrink: 1,
  },
  resultName: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    lineHeight: lineHeight.xl,
    color: colors.grey[900],
  },
  resultAddress: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    lineHeight: lineHeight.lg,
    color: INACTIVE_TEXT,
  },
  emptyArea: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing['2xl'],
    minHeight: 280,
  },
  emptyIllust: {
    width: 100,
    height: 90,
    resizeMode: 'contain',
  },
  emptyTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['2xl'],
    lineHeight: lineHeight.xl,
    color: colors.grey[900],
  },
  emptySub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    color: INACTIVE_TEXT,
    marginTop: -spacing.xs,
  },
});
