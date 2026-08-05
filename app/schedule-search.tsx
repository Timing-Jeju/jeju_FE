import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  Button,
  Checkbox,
  FilterChip,
  OptionSheet,
  PlaceTag,
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
import { searchPlaces, type Coord } from '@/services/naverApi';
import {
  dayOrdinal,
  useScheduleStore,
  type SchedulePlace,
} from '@/store/useScheduleStore';

// Figma 디자인 전용 색상 (constants 팔레트에 없는 값)
const TITLE = '#191919';
const CARD_BORDER = '#F5F6F9';
const SUB_TEXT = '#747476';

const searchIcon = require('../assets/images/icon-search.png');
const chevronDownIcon = require('../assets/images/icon-chevron-down.png');
const placeholderPlace = require('../assets/images/placeholder-place.png');

const SORT_OPTIONS = ['인기순', '정확도', '최신순'] as const;

type SortOption = (typeof SORT_OPTIONS)[number];

const SEARCH_FILTERS = ['전체', '관광지', '식당', '카페'] as const;

type SearchFilter = (typeof SEARCH_FILTERS)[number];

interface SearchPlace {
  name: string;
  /** 관광지 / 식당 / 카페 */
  category: string;
  address: string;
  coord: Coord | null;
}

// TODO: 추천 장소 API 연동 전 임시 데이터
const MOCK_RECOMMENDED: SearchPlace[] = [
  {
    name: '성산일출봉',
    category: '관광지',
    address: '제주 서귀포시 성산읍 성산리 1',
    coord: null,
  },
  {
    name: '9.81파크 제주',
    category: '관광지',
    address: '제주 제주시 애월읍 천덕로 880-24',
    coord: null,
  },
  {
    name: '함덕해수욕장',
    category: '관광지',
    address: '제주 제주시 조천읍 조함해안로 525',
    coord: null,
  },
  {
    name: '새물',
    category: '카페',
    address: '제주 제주시 애월읍 애월해안로 620 1.2.3층',
    coord: null,
  },
];

export default function ScheduleSearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ day?: string }>();
  const day = Number(params.day) || 1;

  const addPlaces = useScheduleStore((state) => state.addPlaces);

  const [query, setQuery] = useState('');
  /** null이면 아직 검색 전 (가볼 만한 장소를 보여준다) */
  const [results, setResults] = useState<SearchPlace[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState<SortOption>('인기순');
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const [filter, setFilter] = useState<SearchFilter>('전체');
  const [selected, setSelected] = useState<SearchPlace[]>([]);

  const visiblePlaces =
    results ??
    MOCK_RECOMMENDED.filter(
      (place) => filter === '전체' || place.category === filter,
    );

  const toggleSelect = (place: SearchPlace) => {
    setSelected((prev) =>
      prev.some((item) => item.name === place.name)
        ? prev.filter((item) => item.name !== place.name)
        : [...prev, place],
    );
  };

  const handleSearch = async () => {
    const trimmed = query.trim();
    if (!trimmed) return;

    Keyboard.dismiss();
    setLoading(true);
    try {
      const places = await searchPlaces(trimmed);
      setResults(
        // TODO: 장소 분류 API 연동 전에는 관광지로 표시한다
        places.map((place) => ({
          name: place.name,
          category: '관광지',
          address: place.roadAddress,
          coord: place.coord,
        })),
      );
    } catch (error) {
      Alert.alert(
        '검색 실패',
        error instanceof Error ? error.message : '알 수 없는 오류',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    addPlaces(
      day,
      selected.map(
        (place): SchedulePlace => ({
          name: place.name,
          category: place.category,
          address: place.address,
          visitType: '선택방문',
          stayMinutes: 60,
          coord: place.coord,
        }),
      ),
    );
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title={results ? '장소 추가' : '직접 검색하기'} />

      <View style={styles.headerArea}>
        <Text style={styles.title}>
          여행 {dayOrdinal(day)} 날,{'\n'}방문하고 싶은 장소를 선택해 주세요
        </Text>

        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={(value) => {
              setQuery(value);
              if (value.trim().length === 0) setResults(null);
            }}
            placeholder="장소를 검색해보세요."
            placeholderTextColor={colors.grey[400]}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
          <Pressable hitSlop={spacing.xs} onPress={handleSearch}>
            <Image source={searchIcon} style={styles.searchIcon} />
          </Pressable>
        </View>
      </View>

      {results ? (
        <Text style={styles.resultTitle}>검색 결과</Text>
      ) : (
        <View style={styles.recommendArea}>
          <View style={styles.recommendTitleRow}>
            <Text style={styles.title}>가볼 만한 장소</Text>
            <Pressable
              style={styles.sortButton}
              onPress={() => setSortSheetOpen(true)}
            >
              <Text style={styles.sortLabel}>{sort}</Text>
              <Image source={chevronDownIcon} style={styles.sortIcon} />
            </Pressable>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {SEARCH_FILTERS.map((item) => (
              <FilterChip
                key={item}
                label={item}
                variant="outlined"
                selected={filter === item}
                onPress={() => setFilter(item)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      <FlatList
        data={visiblePlaces}
        keyExtractor={(item) => item.name}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 106 },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {results ? '검색 결과가 없어요' : '조건에 맞는 장소가 없어요'}
          </Text>
        }
        renderItem={({ item }) => {
          const isSelected = selected.some((place) => place.name === item.name);
          return (
            <Pressable
              style={[styles.card, isSelected && styles.cardSelected]}
              onPress={() => toggleSelect(item)}
            >
              <View style={styles.cardInfo}>
                <Checkbox
                  checked={isSelected}
                  onPress={() => toggleSelect(item)}
                />
                <View style={styles.cardTextGroup}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name}>{item.name}</Text>
                    <PlaceTag label={item.category} />
                  </View>
                  <Text style={styles.address} numberOfLines={1}>
                    {item.address}
                  </Text>
                </View>
              </View>
              <Image source={placeholderPlace} style={styles.cardImage} />
            </Pressable>
          );
        }}
      />

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      <View
        style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}
      >
        <Button
          title={
            selected.length > 0
              ? `선택한 ${selected.length}개의 장소 추가`
              : '선택 장소 추가'
          }
          disabled={selected.length === 0}
          onPress={handleAdd}
        />
      </View>

      <OptionSheet
        visible={sortSheetOpen}
        options={SORT_OPTIONS.map((option) => ({
          key: option,
          label: option,
        }))}
        selectedKey={sort}
        onSelect={(key) => {
          // TODO: 정렬 기준은 추천 장소 API 연동 시 파라미터로 넘긴다
          setSort(key as SortOption);
          setSortSheetOpen(false);
        }}
        onClose={() => setSortSheetOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  headerArea: {
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingHorizontal: grid.pageMargin,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['3xl'],
    lineHeight: lineHeight['2xl'],
    color: TITLE,
  },
  searchBar: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: '#E9EAED',
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
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    color: colors.grey[900],
    padding: 0,
  },
  searchIcon: {
    width: 24,
    height: 24,
    tintColor: colors.grey[800],
  },
  recommendArea: {
    gap: spacing.xs,
    marginTop: spacing['2xl'],
  },
  recommendTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: grid.pageMargin,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortLabel: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.lg,
    color: colors.grey[900],
  },
  sortIcon: {
    width: 20,
    height: 20,
    tintColor: colors.grey[900],
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['2xs'],
    paddingHorizontal: grid.pageMargin,
  },
  resultTitle: {
    marginTop: spacing['2xl'],
    paddingHorizontal: grid.pageMargin,
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    lineHeight: lineHeight.md,
    color: colors.grey[900],
  },
  listContent: {
    gap: spacing.xs,
    paddingHorizontal: grid.pageMargin,
    paddingTop: spacing.sm,
  },
  emptyText: {
    marginTop: spacing['4xl'],
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    color: colors.grey[400],
    textAlign: 'center',
  },
  card: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: radius['2xs'],
    backgroundColor: colors.white,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 28,
    elevation: 2,
  },
  cardSelected: {
    borderColor: colors.primary,
  },
  cardInfo: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  cardTextGroup: {
    flexShrink: 1,
    gap: spacing['2xs'],
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['2xs'],
  },
  name: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    lineHeight: lineHeight.xl,
    color: colors.grey[900],
  },
  address: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize['2xs'],
    lineHeight: lineHeight.sm,
    color: SUB_TEXT,
  },
  cardImage: {
    width: 52,
    height: 52,
    marginLeft: spacing.xs,
    borderRadius: 4.6,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
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
});
