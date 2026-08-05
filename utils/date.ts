/** YYYY-MM-DD 날짜 키 유틸 (여행 조건 / 일정 화면에서 함께 쓴다) */

export const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

export const toKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;

export const fromKey = (key: string) => {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/** 시작일 ~ 종료일(양 끝 포함) 사이의 날짜 키 목록 */
export const datesBetween = (startKey: string, endKey: string) => {
  const dates: string[] = [];
  const cursor = fromKey(startKey);
  const end = fromKey(endKey);
  while (cursor <= end) {
    dates.push(toKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
};

/** 6월 12일 (수) */
export const formatKorean = (key: string) => {
  const date = fromKey(key);
  return `${date.getMonth() + 1}월 ${date.getDate()}일 (${WEEKDAYS[date.getDay()]})`;
};

/** 6월 12일 */
export const formatShort = (key: string) => {
  const date = fromKey(key);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
};

/** 06.12 (수) */
export const formatDot = (key: string) => {
  const date = fromKey(key);
  return `${String(date.getMonth() + 1).padStart(2, '0')}.${String(
    date.getDate(),
  ).padStart(2, '0')} (${WEEKDAYS[date.getDay()]})`;
};

/* --------------------------------- 시각 --------------------------------- */

/** 'H:MM' → 자정부터의 분 */
export const toMinutes = (time: string) => {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
};

/** 자정부터의 분 → 'H:MM' (24시를 넘기면 다음 날로 넘어간다) */
export const toTime = (minutes: number) =>
  `${Math.floor(minutes / 60) % 24}:${String(minutes % 60).padStart(2, '0')}`;

/** 'H:MM' → '오후 3:24' */
export const formatAmPm = (time: string) => {
  const [hour, minute] = time.split(':').map(Number);
  const period = hour < 12 ? '오전' : '오후';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${period} ${displayHour}:${String(minute).padStart(2, '0')}`;
};
