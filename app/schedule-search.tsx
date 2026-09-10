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
import type { Place } from '@/services/places';
import { usePlaceSearch } from '@/hooks/usePlaceSearch';
import { useSchedulePersistence } from '@/hooks/useSchedulePersistence';
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
const SEARCH_FILTERS = ['전체', '관광지', '식당', '카페'] as const;

export default function ScheduleSearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ day?: string }>();
  const day = Number(params.day) || 1;

  const activeVersionId = useScheduleStore((state) => state.activeVersionId);
  const { createPlace } = useSchedulePersistence();

  const [query, setQuery] = useState('');
  const { results, loading, error, searched, hasMore, search, more, clear } =
    usePlaceSearch();
  const [selected, setSelected] = useState<Place[]>([]);
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    if (error) Alert.alert('검색 실패', error);
  }, [error]);
  const visiblePlaces = results;

  const toggleSelect = (place: Place) => {
    setSelected((prev) =>
      prev.some((item) => item.placeId === place.placeId)
        ? prev.filter((item) => item.placeId !== place.placeId)
        : [...prev, place],
    );
  };

  const handleSearch = () => {
    Keyboard.dismiss();
    void search(query);
  };

  const handleAdd = async () => {
    const places = selected.map(
      (place): SchedulePlace => ({
        placeId: place.placeId,
        name: place.name,
        category: place.categoryLabel,
        address: place.roadAddress,
        visitType: '선택방문',
        stayMinutes: place.recommendedStayMinutes ?? 60,
        coord: place.coord,
      }),
    );
    if (!activeVersionId) {
      Alert.alert(
        '활성 일정이 필요해요',
        '서버 일정을 다시 불러온 뒤 장소를 추가해 주세요.',
      );
      return;
    }
    setSubmitting(true);
    try {
      for (const place of places) {
        await createPlace(day, place);
        setSelected((current) =>
          current.filter((item) => item.placeId !== place.placeId),
        );
      }
      router.back();
    } catch (error) {
      Alert.alert(
        '장소를 추가하지 못했어요',
        error instanceof Error ? error.message : '다시 시도해 주세요.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title={searched ? '장소 추가' : '직접 검색하기'} />

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
              clear();
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

      {searched ? (
        <Text style={styles.resultTitle}>검색 결과</Text>
      ) : (
        <View style={styles.recommendArea}>
          <View style={styles.recommendTitleRow}>
            <Text style={styles.title}>가볼 만한 장소</Text>
            <Pressable
              style={styles.sortButton}
              onPress={() => setSortSheetOpen(true)}
            >
              <Text style={styles.sortLabel}>인기순</Text>
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
                selected={item === '전체'}
                onPress={() =>
                  Alert.alert(
                    '준비 중이에요',
                    '추천 장소 필터는 아직 지원하지 않아요. 장소 이름으로 검색해 주세요.',
                  )
                }
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
            {error ??
              (searched
                ? '검색 결과가 없어요'
                : '추천 장소는 준비 중이에요. 장소를 검색해 주세요')}
          </Text>
        }
        onEndReached={() => {
          if (hasMore && !error) void more();
        }}
        onEndReachedThreshold={0.2}
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
                    <PlaceTag label={item.categoryLabel} />
                  </View>
                  <Text style={styles.address} numberOfLines={1}>
                    {item.roadAddress}
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
          disabled={selected.length === 0 || submitting}
          onPress={() => void handleAdd()}
        />
      </View>
      <OptionSheet
        visible={sortSheetOpen}
        options={SORT_OPTIONS.map((option) => ({ key: option, label: option }))}
        selectedKey="인기순"
        onSelect={() => {
          setSortSheetOpen(false);
          Alert.alert(
            '준비 중이에요',
            '추천 장소 정렬은 아직 지원하지 않아요.',
          );
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
