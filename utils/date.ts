/** YYYY-MM-DD 날짜 키 유틸 (여행 조건 / 일정 화면에서 함께 쓴다) */

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
