import {
  NaverMapMarkerOverlay,
  NaverMapView,
  type NaverMapViewRef,
} from '@mj-studio/react-native-naver-map';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  Keyboard,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, LikeIcon, Text } from '@/components/ui';
import {
  colors,
  fontFamily,
  fontSize,
  lineHeight,
  radius,
  spacing,
} from '@/constants';
import { getCurrentLocation } from '@/services/location';
import { searchPlaces, type Coord, type Place } from '@/services/naverApi';

// Figma 디자인 전용 색상 (constants 팔레트에 없는 값)
const INPUT_BORDER = '#F0F0F0';
const PLACEHOLDER = '#898989';
const CHIP_TEXT = '#747476';

const searchIcon = require('../../assets/images/icon-search.png');
const filterIcon = require('../../assets/images/icon-filter.png');
const sunIcon = require('../../assets/images/icon-sun.png');
const utensilsIcon = require('../../assets/images/icon-utensils.png');
const coffeeIcon = require('../../assets/images/icon-coffee.png');
const targetIcon = require('../../assets/images/icon-target.png');
const placeholderPlace = require('../../assets/images/placeholder-place.png');

const INITIAL_CAMERA = {
  latitude: 33.5104,
  longitude: 126.5219,
  zoom: 11,
};

// 장소 바텀시트 스냅 높이
const SHEET_COLLAPSED = 265;
const SHEET_EXPANDED = 540;
const SHEET_CLOSE_THRESHOLD = SHEET_COLLAPSED - 80;

const CATEGORIES = [
  { key: 'all', label: '전체', icon: null },
  { key: 'tour', label: '관광지', icon: sunIcon },
  { key: 'food', label: '식당', icon: utensilsIcon },
  { key: 'cafe', label: '카페', icon: coffeeIcon },
  { key: 'near', label: '내 근처', icon: targetIcon },
] as const;

type CategoryKey = (typeof CATEGORIES)[number]['key'];

// TODO: 주변 식당/카페 API 연동 전 임시 데이터
const MOCK_NEARBY = [
  { name: '소심한 브런치', category: '카페', distance: '25m' },
  { name: '오른', category: '카페', distance: '130m' },
];

const formatDistance = (meters: number) =>
  meters >= 1000 ? `${(meters / 1000).toFixed(1)}km` : `${Math.round(meters)}m`;

const haversine = (a: Coord, b: Coord) => {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) *
      Math.cos(toRad(b.latitude)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<NaverMapViewRef>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [category, setCategory] = useState<CategoryKey>('all');
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(false);

  // 바텀시트 드래그: 위로 올리면 확장(주변 정보), 아래로 내리면 축소/닫기
  const sheetHeight = useMemo(() => new Animated.Value(SHEET_COLLAPSED), []);
  const sheetSnap = useRef(SHEET_COLLAPSED);

  const snapSheetTo = (target: number) => {
    sheetSnap.current = target;
    Animated.spring(sheetHeight, {
      toValue: target,
      useNativeDriver: false,
      bounciness: 4,
    }).start();
  };

  const panResponder = useMemo(
    () =>
      // eslint-disable-next-line react-hooks/refs -- 제스처 핸들러 내부에서만 ref를 읽는다
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 5,
        onPanResponderMove: (_, gesture) => {
          const next = Math.min(
            Math.max(sheetSnap.current - gesture.dy, 120),
            SHEET_EXPANDED,
          );
          sheetHeight.setValue(next);
        },
        onPanResponderRelease: (_, gesture) => {
          const current = sheetSnap.current - gesture.dy;
          if (current < SHEET_CLOSE_THRESHOLD || gesture.vy > 1.2) {
            Animated.timing(sheetHeight, {
              toValue: 0,
              duration: 180,
              useNativeDriver: false,
            }).start(() => setSelectedPlace(null));
            return;
          }
          const midpoint = (SHEET_COLLAPSED + SHEET_EXPANDED) / 2;
          snapSheetTo(
            current > midpoint || gesture.vy < -1.2
              ? SHEET_EXPANDED
              : SHEET_COLLAPSED,
          );
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const handleSearch = async () => {
    const trimmed = query.trim();
    if (!trimmed) return;

    Keyboard.dismiss();
    setLoading(true);
    try {
      const places = await searchPlaces(trimmed);
      setResults(places);
      if (places.length === 0) {
        Alert.alert('검색 결과 없음', '다른 키워드나 주소로 검색해보세요.');
      }
    } catch (error) {
      Alert.alert(
        '검색 실패',
        error instanceof Error ? error.message : '알 수 없는 오류',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlace = async (place: Place) => {
    setResults([]);
    setQuery(place.name);
    setSelectedPlace(place);
    setLiked(false);
    setDistance(null);
    sheetHeight.setValue(SHEET_COLLAPSED);
    sheetSnap.current = SHEET_COLLAPSED;

    mapRef.current?.animateCameraTo({
      ...place.coord,
      zoom: 14,
      duration: 600,
    });

    try {
      const current = await getCurrentLocation();
      setDistance(haversine(current, place.coord));
    } catch {
      // 위치 권한이 없으면 거리 표시를 생략한다
    }
  };

  const openPlaceDetail = () => {
    if (!selectedPlace) return;
    router.push({
      pathname: '/place-detail',
      params: {
        name: selectedPlace.name,
        address: selectedPlace.roadAddress,
      },
    });
  };

  // TODO: 백엔드 주변 장소 API 연동 전까지는 탭하면 열려 있던 시트만 닫는다
  const handleTapMap = () => {
    setSelectedPlace(null);
  };

  if (Platform.OS === 'web') {
    return (
      <View style={styles.webFallback}>
        <Text style={styles.webFallbackText}>
          네이버 지도는 iOS / Android에서만 지원됩니다.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <NaverMapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialCamera={INITIAL_CAMERA}
        onTapMap={handleTapMap}
      >
        {selectedPlace && (
          <NaverMapMarkerOverlay
            latitude={selectedPlace.coord.latitude}
            longitude={selectedPlace.coord.longitude}
            caption={{ text: selectedPlace.name }}
            tintColor={colors.primary}
          />
        )}
      </NaverMapView>

      {/* 상단 검색 + 카테고리 칩 */}
      <View style={[styles.topArea, { top: insets.top + 7 }]}>
        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="가고싶은 장소를 검색해보세요."
            placeholderTextColor={PLACEHOLDER}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
          <Pressable hitSlop={spacing.xs} onPress={handleSearch}>
            <Image source={searchIcon} style={styles.searchIcon} />
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {CATEGORIES.map((item) => {
            const isActive = category === item.key;
            return (
              <Pressable
                key={item.key}
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => setCategory(item.key)}
              >
                {item.icon && !isActive && (
                  <Image source={item.icon} style={styles.chipIcon} />
                )}
                <Text
                  style={[styles.chipLabel, isActive && styles.chipLabelActive]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {results.length > 0 && (
          <FlatList
            style={styles.resultList}
            data={results}
            keyboardShouldPersistTaps="handled"
            keyExtractor={(item) => `${item.name}-${item.coord.longitude}`}
            renderItem={({ item }) => (
              <Pressable
                style={styles.resultItem}
                onPress={() => handleSelectPlace(item)}
              >
                <Text style={styles.resultName}>{item.name}</Text>
                <Text style={styles.resultAddress}>{item.roadAddress}</Text>
              </Pressable>
            )}
          />
        )}
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {/* 여행조건 플로팅 버튼 */}
      <Animated.View
        style={[
          styles.tripConditionWrap,
          {
            bottom: selectedPlace
              ? Animated.add(sheetHeight, spacing.md)
              : spacing.md,
          },
        ]}
      >
        <Pressable
          style={styles.tripConditionButton}
          onPress={() => router.push('/trip-conditions')}
        >
          <Image source={filterIcon} style={styles.filterIcon} />
          <Text style={styles.tripConditionLabel}>여행조건</Text>
        </Pressable>
      </Animated.View>

      {/* 장소 선택 바텀 패널 (드래그로 확장/축소/닫기) */}
      {selectedPlace && (
        <Animated.View style={[styles.placeSheet, { height: sheetHeight }]}>
          <View {...panResponder.panHandlers}>
            <View style={styles.sheetHandleArea}>
              <View style={styles.sheetHandle} />
            </View>
            <View style={styles.placeInfo}>
              <View style={styles.placeTitleRow}>
                <Text style={styles.placeName}>{selectedPlace.name}</Text>
                <LikeIcon
                  liked={liked}
                  onPress={() => setLiked((prev) => !prev)}
                />
              </View>
              <Text style={styles.placeAddress}>
                {selectedPlace.roadAddress}
              </Text>
              {distance !== null && (
                <View style={styles.distanceRow}>
                  <Text style={styles.distanceLabel}>내 위치로부터 </Text>
                  <Text style={styles.distanceValue}>
                    {formatDistance(distance)}
                  </Text>
                </View>
              )}
              <Button
                title="장소상세"
                color="outlinedBlack"
                size="small"
                shape="rectangle"
                onPress={openPlaceDetail}
                style={styles.detailButton}
              />
            </View>
          </View>
          <View style={styles.nearbySection}>
            <Text style={styles.nearbyTitle}>
              {selectedPlace.name}의 주변 식당/카페
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.nearbyCards}>
                {MOCK_NEARBY.map((item) => (
                  <View key={item.name} style={styles.nearbyCard}>
                    <View style={styles.nearbyImageWrap}>
                      <Image
                        source={placeholderPlace}
                        style={styles.nearbyImage}
                      />
                      <View style={styles.nearbyImageOverlay} />
                      <View style={styles.nearbyCaption}>
                        <Text style={styles.nearbyName}>{item.name}</Text>
                        <Text style={styles.nearbyCategory}>
                          {item.category}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.nearbyDistanceRow}>
                      <Text style={styles.nearbyDistanceLabel}>
                        {selectedPlace.name}에서{' '}
                      </Text>
                      <Text style={styles.nearbyDistanceValue}>
                        {item.distance}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6F9',
  },
  topArea: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    gap: spacing.xs,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    borderRadius: radius.circle,
    paddingHorizontal: spacing.md,
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
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['2xs'],
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['2xs'],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.grey[200],
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipIcon: {
    width: 20,
    height: 20,
  },
  chipLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    color: CHIP_TEXT,
  },
  chipLabelActive: {
    color: colors.white,
  },
  resultList: {
    backgroundColor: colors.white,
    borderRadius: radius.xs,
    maxHeight: 260,
    shadowColor: colors.grey[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  resultItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.grey[100],
  },
  resultName: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
    color: colors.grey[900],
  },
  resultAddress: {
    marginTop: spacing['3xs'],
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.grey[500],
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
  tripConditionWrap: {
    position: 'absolute',
    right: spacing.md,
  },
  tripConditionButton: {
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['2xs'],
    paddingHorizontal: spacing.sm,
    borderRadius: radius.xl,
    backgroundColor: colors.grey[900],
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  filterIcon: {
    width: 16,
    height: 16,
    tintColor: colors.white,
    // 텍스트(lineHeight 20)의 시각적 중심에 맞춰 살짝 올린다
    transform: [{ translateY: -1.5 }],
  },
  tripConditionLabel: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    color: colors.white,
  },
  placeSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.sm,
    borderTopRightRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.md,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  sheetHandleArea: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  sheetHandle: {
    width: 30,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.grey[300],
  },
  placeInfo: {
    gap: spacing.xs,
  },
  placeTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  placeName: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['2xl'],
    lineHeight: lineHeight.xl,
    color: colors.grey[900],
  },
  placeAddress: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    lineHeight: lineHeight.sm,
    color: colors.grey[700],
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceLabel: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    lineHeight: lineHeight.sm,
    color: colors.grey[700],
  },
  distanceValue: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.xs,
    color: colors.primary,
  },
  detailButton: {
    marginTop: spacing['2xs'],
  },
  nearbySection: {
    gap: spacing.md,
  },
  nearbyTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['2xl'],
    lineHeight: lineHeight.xl,
    color: colors.grey[900],
  },
  nearbyCards: {
    flexDirection: 'row',
    gap: spacing['2xs'],
  },
  nearbyCard: {
    width: 200,
    gap: spacing['2xs'],
  },
  nearbyImageWrap: {
    width: '100%',
    height: 130,
    borderRadius: radius['2xs'],
    overflow: 'hidden',
  },
  nearbyImage: {
    width: '100%',
    height: '100%',
  },
  nearbyImageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  nearbyCaption: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  nearbyName: {
    fontFamily: fontFamily.extraBold,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    color: '#F2F4F7',
  },
  nearbyCategory: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize['3xs'],
    lineHeight: lineHeight.sm,
    color: '#F2F4F7',
  },
  nearbyDistanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nearbyDistanceLabel: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    lineHeight: lineHeight.sm,
    color: colors.grey[900],
  },
  nearbyDistanceValue: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.xs,
    color: colors.primary,
  },
  webFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webFallbackText: {
    fontSize: fontSize.md,
    color: colors.grey[600],
  },
});
