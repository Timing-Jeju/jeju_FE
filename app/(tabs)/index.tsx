import {
  NaverMapMarkerOverlay,
  NaverMapPathOverlay,
  NaverMapView,
  type NaverMapViewRef,
} from '@mj-studio/react-native-naver-map';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '@/constants';
import {
  getDrivingRoute,
  searchPlaces,
  type Coord,
  type DrivingRoute,
  type Place,
} from '@/services/naverApi';
import { getCurrentLocation } from '@/services/location';

const INITIAL_CAMERA = {
  latitude: 37.5666,
  longitude: 126.9784,
  zoom: 12,
};

const formatDistance = (meters: number) =>
  meters >= 1000 ? `${(meters / 1000).toFixed(1)}km` : `${meters}m`;

const formatDuration = (ms: number) => {
  const minutes = Math.round(ms / 60000);
  if (minutes >= 60) {
    return `${Math.floor(minutes / 60)}시간 ${minutes % 60}분`;
  }
  return `${minutes}분`;
};

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<NaverMapViewRef>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [destination, setDestination] = useState<Place | null>(null);
  const [origin, setOrigin] = useState<Coord | null>(null);
  const [route, setRoute] = useState<DrivingRoute | null>(null);
  const [loading, setLoading] = useState(false);

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

  const fitRouteToMap = (path: Coord[]) => {
    const latitudes = path.map((c) => c.latitude);
    const longitudes = path.map((c) => c.longitude);
    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);
    const latPad = Math.max((maxLat - minLat) * 0.25, 0.005);
    const lngPad = Math.max((maxLng - minLng) * 0.25, 0.005);

    mapRef.current?.animateRegionTo({
      latitude: minLat - latPad,
      longitude: minLng - lngPad,
      latitudeDelta: maxLat - minLat + latPad * 2,
      longitudeDelta: maxLng - minLng + lngPad * 2,
      duration: 800,
    });
  };

  const handleSelectPlace = async (place: Place) => {
    setResults([]);
    setQuery(place.name);
    setDestination(place);
    setRoute(null);
    setLoading(true);

    try {
      const currentLocation = await getCurrentLocation();
      setOrigin(currentLocation);

      const drivingRoute = await getDrivingRoute(currentLocation, place.coord);
      setRoute(drivingRoute);
      fitRouteToMap([currentLocation, place.coord, ...drivingRoute.path]);
    } catch (error) {
      Alert.alert(
        '경로 탐색 실패',
        error instanceof Error ? error.message : '알 수 없는 오류',
      );
      mapRef.current?.animateCameraTo({
        ...place.coord,
        zoom: 14,
        duration: 800,
      });
    } finally {
      setLoading(false);
    }
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
        isShowLocationButton
      >
        {origin && route && (
          <NaverMapMarkerOverlay
            latitude={origin.latitude}
            longitude={origin.longitude}
            caption={{ text: '출발' }}
            tintColor={colors.grey[700]}
          />
        )}
        {destination && (
          <NaverMapMarkerOverlay
            latitude={destination.coord.latitude}
            longitude={destination.coord.longitude}
            caption={{ text: destination.name }}
            tintColor={colors.primary}
          />
        )}
        {route && (
          <NaverMapPathOverlay
            coords={route.path}
            width={6}
            color={colors.primary}
            outlineWidth={1}
            outlineColor={colors.white}
          />
        )}
      </NaverMapView>

      <View style={[styles.searchArea, { top: insets.top + spacing.sm }]}>
        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="장소나 주소를 검색하세요 (예: 경복궁)"
            placeholderTextColor={colors.grey[400]}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
          <Pressable style={styles.searchButton} onPress={handleSearch}>
            <Text style={styles.searchButtonText}>검색</Text>
          </Pressable>
        </View>

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

      {route && destination && (
        <View
          style={[styles.routeCard, { bottom: insets.bottom + spacing.md }]}
        >
          <Text style={styles.routeTitle}>{destination.name}</Text>
          <Text style={styles.routeSummary}>
            {formatDistance(route.distance)} · 차량 약{' '}
            {formatDuration(route.duration)}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchArea: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.xs,
    paddingLeft: spacing.md,
    paddingRight: spacing['2xs'],
    height: 48,
    shadowColor: colors.grey[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.grey[900],
  },
  searchButton: {
    backgroundColor: colors.primary,
    borderRadius: radius['2xs'],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  searchButtonText: {
    color: colors.white,
    fontWeight: '600',
  },
  resultList: {
    marginTop: spacing.xs,
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
    fontSize: 15,
    fontWeight: '600',
    color: colors.grey[900],
  },
  resultAddress: {
    marginTop: spacing['3xs'],
    fontSize: 13,
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
  routeCard: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    padding: spacing.md,
    shadowColor: colors.grey[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  routeTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.grey[900],
  },
  routeSummary: {
    marginTop: spacing['2xs'],
    fontSize: 14,
    color: colors.grey[600],
  },
  webFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webFallbackText: {
    fontSize: 15,
    color: colors.grey[600],
  },
});
