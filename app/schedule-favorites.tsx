import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  Button,
  Checkbox,
  FavoriteMemoModal,
  FilterChip,
  MEMO_EDIT_TAB_LABELS,
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
  FAVORITE_FILTERS,
  matchesFavoriteFilter,
  useFavoriteStore,
  type FavoriteFilter,
  type FavoritePlace,
} from '@/store/useFavoriteStore';
import {
  dayOrdinal,
  useScheduleStore,
  type SchedulePlace,
} from '@/store/useScheduleStore';

// Figma 디자인 전용 색상 (constants 팔레트에 없는 값)
const TITLE = '#191919';
const CARD_BORDER = '#E9EAED';
const SUB_TEXT = '#747476';

const editIcon = require('../assets/images/icon-edit.png');
const placeholderPlace = require('../assets/images/placeholder-place.png');

export default function ScheduleFavoritesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ day?: string }>();
  const day = Number(params.day) || 1;

  const favorites = useFavoriteStore((state) => state.favorites);
  const updateFavorite = useFavoriteStore((state) => state.updateFavorite);
  const addPlaces = useScheduleStore((state) => state.addPlaces);

  const [filter, setFilter] = useState<FavoriteFilter>('전체');
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const [memoTarget, setMemoTarget] = useState<FavoritePlace | null>(null);

  const visiblePlaces = favorites.filter((place) =>
    matchesFavoriteFilter(place, filter),
  );

  const toggleSelect = (name: string) => {
    setSelectedNames((prev) =>
      prev.includes(name)
        ? prev.filter((item) => item !== name)
        : [...prev, name],
    );
  };

  const handleAdd = () => {
    addPlaces(
      day,
      favorites
        .filter((place) => selectedNames.includes(place.name))
        .map(
          (place): SchedulePlace => ({
            name: place.name,
            category: place.category,
            address: place.address,
            visitType: place.visitType,
            stayMinutes: place.stayMinutes,
            coord: null,
          }),
        ),
    );
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="찜 목록에서 가져오기" />

      <Text style={styles.title}>
        여행 {dayOrdinal(day)} 날,{'\n'}방문하고 싶은 장소를 선택해 주세요
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterArea}
        contentContainerStyle={styles.filterRow}
      >
        {FAVORITE_FILTERS.map((item) => (
          <FilterChip
            key={item}
            label={item}
            variant="outlined"
            selected={filter === item}
            onPress={() => setFilter(item)}
          />
        ))}
      </ScrollView>

      <FlatList
        data={visiblePlaces}
        keyExtractor={(item) => item.name}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 106 },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={styles.emptyText}>찜한 장소가 없어요</Text>
        }
        renderItem={({ item }) => {
          const isSelected = selectedNames.includes(item.name);
          return (
            <Pressable
              style={[styles.card, isSelected && styles.cardSelected]}
              onPress={() => toggleSelect(item.name)}
            >
              <View style={styles.cardTop}>
                <View style={styles.cardInfo}>
                  <Checkbox
                    checked={isSelected}
                    onPress={() => toggleSelect(item.name)}
                  />
                  <View style={styles.cardTextGroup}>
                    <View style={styles.nameRow}>
                      <Text style={styles.name}>{item.name}</Text>
                      <PlaceTag label={item.category} />
                      <PlaceTag label={item.visitType} />
                    </View>
                    <Text style={styles.stayText}>
                      추천 체류 {item.stayMinutes}분 / {item.direction}
                    </Text>
                  </View>
                </View>
                <Image source={placeholderPlace} style={styles.cardImage} />
              </View>

              <View style={styles.cardDivider} />

              <Pressable
                style={styles.memoRow}
                onPress={() => setMemoTarget(item)}
              >
                <Text style={styles.memoText}>
                  {item.memo.length > 0 ? item.memo : '메모없음'}
                </Text>
                <Image source={editIcon} style={styles.memoIcon} />
              </Pressable>
            </Pressable>
          );
        }}
      />

      <View
        style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}
      >
        <Button
          title={
            selectedNames.length > 0
              ? `선택한 ${selectedNames.length}개의 장소 추가`
              : '선택 장소 추가'
          }
          disabled={selectedNames.length === 0}
          onPress={handleAdd}
        />
      </View>

      <FavoriteMemoModal
        visible={memoTarget !== null}
        initialVisitType={memoTarget?.visitType ?? null}
        initialMemo={memoTarget?.memo ?? ''}
        tabLabels={MEMO_EDIT_TAB_LABELS}
        onClose={() => setMemoTarget(null)}
        onSave={(visitType, memo) => {
          if (memoTarget) updateFavorite(memoTarget.name, visitType, memo);
          setMemoTarget(null);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  title: {
    marginTop: spacing.lg,
    paddingHorizontal: grid.pageMargin,
    fontFamily: fontFamily.bold,
    fontSize: fontSize['3xl'],
    lineHeight: lineHeight['2xl'],
    color: TITLE,
  },
  filterArea: {
    flexGrow: 0,
    marginTop: spacing.md,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['2xs'],
    paddingHorizontal: grid.pageMargin,
  },
  listContent: {
    gap: spacing.xs,
    paddingHorizontal: grid.pageMargin,
    paddingTop: spacing.md,
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
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: radius['2xs'],
    backgroundColor: colors.white,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 3,
  },
  cardSelected: {
    borderColor: colors.primary,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardInfo: {
    flexShrink: 1,
    gap: spacing.xs,
  },
  cardImage: {
    width: 74,
    height: 74,
    borderRadius: 8.7,
  },
  cardTextGroup: {
    gap: spacing['3xs'],
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
  stayText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    lineHeight: lineHeight.lg,
    color: SUB_TEXT,
  },
  cardDivider: {
    width: '100%',
    height: 1,
    backgroundColor: colors.grey[100],
  },
  memoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  memoText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    lineHeight: lineHeight.lg,
    color: SUB_TEXT,
  },
  memoIcon: {
    width: 24,
    height: 24,
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
