import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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
import {
  categoryCode,
  categoryLabel,
  fetchPlaces,
  isApiError,
  type PlaceListItem,
} from '@/services/api';
import type { Coord } from '@/services/naverApi';
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

// '카페'는 대응하는 TourAPI 분류 코드가 없어 서버로 걸러낼 수 없다
const SEARCH_FILTERS = ['전체', '관광지', '식당'] as const;

type SearchFilter = (typeof SEARCH_FILTERS)[number];

interface SearchPlace {
  /** 백엔드 장소 식별자 — 찜하기 / 일정 생성에 그대로 쓴다 */
  placeId: string;
  name: string;
  /** 관광지 / 식당 / 카페 */
  category: string;
  address: string;
  coord: Coord | null;
  /** 서버가 내려주는 추천 체류 시간 (분) */
  stayMinutes: number;
  thumbnailUrl: string | null;
}

/** 추천 체류 시간이 없는 장소에 쓰는 기본값 (분) */
const DEFAULT_STAY_MINUTES = 60;

/** 목록 API 응답을 화면이 쓰는 모양으로 바꾼다 */
const toSearchPlace = (item: PlaceListItem): SearchPlace => ({
  placeId: item.placeId,
  name: item.name,
  category: categoryLabel(item.category),
  address: item.address ?? item.regionLabel ?? '',
  coord: { latitude: item.location.lat, longitude: item.location.lng },
  stayMinutes: item.recommendedStayMinutes ?? DEFAULT_STAY_MINUTES,
  thumbnailUrl: item.thumbnailUrl,
});

const errorMessage = (error: unknown) =>
  isApiError(error) ? error.detail : '알 수 없는 오류';

export default function ScheduleSearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ day?: string }>();
  const day = Number(params.day) || 1;

  const addPlaces = useScheduleStore((state) => state.addPlaces);

  const [query, setQuery] = useState('');
  /** null이면 아직 검색 전 (가볼 만한 장소를 보여준다) */
  const [results, setResults] = useState<SearchPlace[] | null>(null);
  /** 검색 전에 보여주는 추천 목록 */
  const [recommended, setRecommended] = useState<SearchPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState<SortOption>('인기순');
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const [filter, setFilter] = useState<SearchFilter>('전체');
  const [selected, setSelected] = useState<SearchPlace[]>([]);

  const visiblePlaces = results ?? recommended;

  /*
   * 가볼 만한 장소는 목록 API로 받아온다. 분류 필터는 서버 query로 넘기므로
   * 필터를 바꿀 때마다 다시 조회한다. (검색 결과를 보고 있을 때는 건드리지 않는다)
   */
  useEffect(() => {
    let cancelled = false;

    fetchPlaces({ category: categoryCode(filter), size: 20 })
      .then((page) => {
        if (!cancelled) setRecommended(page.items.map(toSearchPlace));
      })
      .catch(() => {
        // 추천 목록은 실패해도 검색은 쓸 수 있어야 하므로 화면을 막지 않는다
        if (!cancelled) setRecommended([]);
      });

    return () => {
      cancelled = true;
    };
  }, [filter]);

  const toggleSelect = (place: SearchPlace) => {
    setSelected((prev) =>
      prev.some((item) => item.placeId === place.placeId)
        ? prev.filter((item) => item.placeId !== place.placeId)
        : [...prev, place],
    );
  };

  const handleSearch = async () => {
    const trimmed = query.trim();
    if (!trimmed) return;

    Keyboard.dismiss();
    setLoading(true);
    try {
      const page = await fetchPlaces({ query: trimmed, size: 20 });
      setResults(page.items.map(toSearchPlace));
    } catch (error) {
      Alert.alert('검색 실패', errorMessage(error));
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
          stayMinutes: place.stayMinutes,
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
            autoCapitalize="none"
            autoCorrect={false}
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
        keyExtractor={(item) => item.placeId}
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
          const isSelected = selected.some(
            (place) => place.placeId === item.placeId,
          );
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
              <Image
                source={
                  item.thumbnailUrl
                    ? { uri: item.thumbnailUrl }
                    : placeholderPlace
                }
                style={styles.cardImage}
              />
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
          // TODO: 목록 API에 아직 정렬 query가 없어 화면 표기만 바꾼다
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
