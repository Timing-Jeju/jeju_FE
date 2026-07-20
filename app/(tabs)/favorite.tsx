import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ConfirmModal,
  FavoriteMemoModal,
  FilterChip,
  FloatingButton,
  LikeIcon,
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
import { useFavoriteStore, type FavoritePlace } from '@/store/useFavoriteStore';

// Figma 디자인 전용 색상 (constants 팔레트에 없는 값)
const CARD_BORDER = '#F0F0F0';

const editIcon = require('../../assets/images/icon-edit.png');
const trashIllust = require('../../assets/images/illust-trash.png');
const placeholderPlace = require('../../assets/images/placeholder-place.png');

const FILTERS = [
  '전체',
  '관광지',
  '식당',
  '카페',
  '필수방문',
  '선택방문',
] as const;

type Filter = (typeof FILTERS)[number];

// 관심장소 수정 모달은 방문 유형을 친근한 문구로 보여준다
const MEMO_TAB_LABELS = {
  필수방문: '꼭 갈래요',
  선택방문: '시간 되면 갈래요',
} as const;

const matchesFilter = (place: FavoritePlace, filter: Filter) => {
  switch (filter) {
    case '전체':
      return true;
    case '관광지':
      return place.category !== '식당' && place.category !== '카페';
    case '식당':
    case '카페':
      return place.category === filter;
    case '필수방문':
    case '선택방문':
      return place.visitType === filter;
  }
};

export default function FavoriteScreen() {
  const router = useRouter();

  const favorites = useFavoriteStore((state) => state.favorites);
  const updateFavorite = useFavoriteStore((state) => state.updateFavorite);
  const removeFavorite = useFavoriteStore((state) => state.removeFavorite);

  const [filter, setFilter] = useState<Filter>('전체');
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const [memoTarget, setMemoTarget] = useState<FavoritePlace | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FavoritePlace | null>(null);

  const visiblePlaces = favorites.filter((place) =>
    matchesFilter(place, filter),
  );

  const toggleSelect = (name: string) => {
    setSelectedNames((prev) =>
      prev.includes(name)
        ? prev.filter((item) => item !== name)
        : [...prev, name],
    );
  };

  const openPlaceDetail = (place: FavoritePlace) => {
    router.push({ pathname: '/place-detail', params: { name: place.name } });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="관심장소" showBack={false} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterArea}
        contentContainerStyle={styles.filterRow}
      >
        {FILTERS.map((item) => (
          <FilterChip
            key={item}
            label={item}
            selected={filter === item}
            onPress={() => setFilter(item)}
          />
        ))}
      </ScrollView>

      <FlatList
        data={visiblePlaces}
        keyExtractor={(item) => item.name}
        contentContainerStyle={styles.listContent}
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
                  <Image source={placeholderPlace} style={styles.cardImage} />
                  <View style={styles.cardTextGroup}>
                    <Pressable
                      style={styles.nameRow}
                      onPress={() => openPlaceDetail(item)}
                    >
                      <Text style={styles.name}>{item.name}</Text>
                      <Text style={styles.category}>{item.category}</Text>
                    </Pressable>
                    <View style={styles.tagRow}>
                      <PlaceTag label={item.visitType} />
                      <Text style={styles.stayText}>
                        추천 체류 {item.stayMinutes}분 / {item.direction}
                      </Text>
                    </View>
                  </View>
                </View>
                <LikeIcon liked onPress={() => setDeleteTarget(item)} />
              </View>

              <View style={styles.cardDivider} />

              <Pressable
                style={styles.memoRow}
                onPress={() => setMemoTarget(item)}
              >
                <Image source={editIcon} style={styles.memoIcon} />
                <Text style={styles.memoText}>
                  {item.memo.length > 0 ? item.memo : '메모없음'}
                </Text>
              </Pressable>
            </Pressable>
          );
        }}
      />

      {selectedNames.length > 0 && (
        <View style={styles.floatingArea}>
          <FloatingButton
            title="선택 장소로 일정 생성"
            onPress={() =>
              // TODO: 일정 생성 플로우 연동 전 임시 안내
              Alert.alert('준비 중이에요', '일정 생성 기능을 준비하고 있어요.')
            }
          />
        </View>
      )}

      <FavoriteMemoModal
        visible={memoTarget !== null}
        initialVisitType={memoTarget?.visitType ?? null}
        initialMemo={memoTarget?.memo ?? ''}
        tabLabels={MEMO_TAB_LABELS}
        onClose={() => setMemoTarget(null)}
        onSave={(visitType, memo) => {
          if (memoTarget) updateFavorite(memoTarget.name, visitType, memo);
          setMemoTarget(null);
        }}
      />

      <ConfirmModal
        visible={deleteTarget !== null}
        image={trashIllust}
        title="해당 장소 찜을 삭제할까요?"
        description="찜 목록에서 삭제되며 저장한 메모도 함께 사라져요"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            removeFavorite(deleteTarget.name);
            setSelectedNames((prev) =>
              prev.filter((name) => name !== deleteTarget.name),
            );
          }
          setDeleteTarget(null);
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
  filterArea: {
    flexGrow: 0,
    marginTop: spacing.xs,
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
    paddingBottom: spacing['2xl'],
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  cardImage: {
    width: 66,
    height: 66,
    borderRadius: 6.6,
  },
  cardTextGroup: {
    gap: spacing['2xs'],
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing['2xs'],
  },
  name: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    lineHeight: lineHeight.xl,
    color: colors.grey[900],
  },
  category: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    lineHeight: lineHeight.lg,
    color: colors.grey[400],
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['2xs'],
  },
  stayText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    lineHeight: lineHeight.lg,
    color: colors.grey[700],
  },
  cardDivider: {
    width: '100%',
    height: 1,
    backgroundColor: colors.grey[100],
  },
  memoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  memoIcon: {
    width: 24,
    height: 24,
  },
  memoText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.xs,
    color: colors.grey[700],
  },
  floatingArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: spacing.md,
    alignItems: 'center',
  },
});
