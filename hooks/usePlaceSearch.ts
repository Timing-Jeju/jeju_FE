import { useEffect, useRef, useState } from 'react';
import { listPlaces, type Place } from '@/services/places';

/** 검색 변경·화면 종료 시 이전 요청을 취소하고 최신 요청만 화면에 반영한다. */
export function usePlaceSearch() {
  const [results, setResults] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  const lastQuery = useRef('');
  useEffect(() => () => controller.current?.abort(), []);
  const clear = () => {
    controller.current?.abort();
    setResults([]);
    setCursor(null);
    setError(null);
    setSearched(false);
    setLoading(false);
  };
  const request = async (query: string, nextCursor?: string) => {
    controller.current?.abort();
    const active = new AbortController();
    controller.current = active;
    setLoading(true);
    setError(null);
    if (!nextCursor) {
      setResults([]);
      setCursor(null);
    }
    try {
      const response = await listPlaces(
        { query, cursor: nextCursor },
        active.signal,
      );
      if (active.signal.aborted) return;
      setResults((previous) => {
        if (!nextCursor) return response.items;
        const known = new Set(previous.map((place) => place.placeId));
        return [
          ...previous,
          ...response.items.filter((place) => !known.has(place.placeId)),
        ];
      });
      setCursor(response.page.nextCursor);
    } catch {
      if (!active.signal.aborted)
        setError('검색하지 못했어요. 연결을 확인하고 다시 시도해 주세요.');
    } finally {
      if (!active.signal.aborted) {
        setLoading(false);
        setSearched(true);
      }
    }
  };
  const search = async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      clear();
      return;
    }
    lastQuery.current = trimmed;
    await request(trimmed);
  };
  const more = async () => {
    if (!cursor || loading) return;
    await request(lastQuery.current, cursor);
  };
  return {
    results,
    loading,
    error,
    searched,
    hasMore: cursor !== null,
    search,
    more,
    clear,
  };
}
