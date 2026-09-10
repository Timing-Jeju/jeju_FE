import {
  datesBetween,
  formatDot,
  formatKorean,
  formatShort,
  formatTime,
  fromKey,
  toKey,
  toMinutes,
  toTime,
  WEEKDAYS,
} from '@/utils/date';

describe('날짜 키 (YYYY-MM-DD)', () => {
  it('toKey는 월·일을 두 자리로 채운다', () => {
    expect(toKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(toKey(new Date(2026, 11, 25))).toBe('2026-12-25');
  });

  it('fromKey는 로컬 자정 Date로 되돌린다 (toKey와 왕복이 맞는다)', () => {
    const date = fromKey('2026-06-12');
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(5);
    expect(date.getDate()).toBe(12);
    expect(date.getHours()).toBe(0);
    expect(toKey(date)).toBe('2026-06-12');
  });

  it('datesBetween은 양 끝을 포함하고 월 경계를 넘어간다', () => {
    expect(datesBetween('2026-06-29', '2026-07-02')).toEqual([
      '2026-06-29',
      '2026-06-30',
      '2026-07-01',
      '2026-07-02',
    ]);
  });

  it('datesBetween은 같은 날이면 하루, 종료일이 앞서면 빈 목록이다', () => {
    expect(datesBetween('2026-06-12', '2026-06-12')).toEqual(['2026-06-12']);
    expect(datesBetween('2026-06-13', '2026-06-12')).toEqual([]);
  });
});

describe('날짜 표기', () => {
  // 2026-06-12 은 금요일이다
  it('formatKorean → 6월 12일 (금)', () => {
    expect(formatKorean('2026-06-12')).toBe('6월 12일 (금)');
  });

  it('formatShort → 6월 12일', () => {
    expect(formatShort('2026-06-12')).toBe('6월 12일');
  });

  it('formatDot → 06.12 (금)', () => {
    expect(formatDot('2026-06-12')).toBe('06.12 (금)');
  });

  it('WEEKDAYS는 일요일부터 시작한다', () => {
    expect(WEEKDAYS[fromKey('2026-06-14').getDay()]).toBe('일');
  });
});

describe('시각 (H:MM ↔ 분)', () => {
  it('toMinutes는 자정부터의 분을 돌려준다', () => {
    expect(toMinutes('0:00')).toBe(0);
    expect(toMinutes('9:05')).toBe(545);
    expect(toMinutes('23:59')).toBe(1439);
  });

  it('toTime은 분 단위를 두 자리로 채운 H:MM 이다', () => {
    expect(toTime(545)).toBe('9:05');
    expect(toTime(0)).toBe('0:00');
    expect(toTime(1439)).toBe('23:59');
  });

  it('toTime은 24시를 넘기면 다음 날로 넘어간다', () => {
    expect(toTime(1440)).toBe('0:00');
    expect(toTime(1500)).toBe('1:00');
  });

  it('toTime은 음수(자정 이전)를 전날 시각으로 표기한다', () => {
    // 구간 대안 계산처럼 출발 시각에서 몇 분을 빼는 경우
    expect(toTime(-10)).toBe('23:50');
    expect(toTime(-1440)).toBe('0:00');
  });

  it('toMinutes ↔ toTime 왕복이 맞는다', () => {
    ['0:00', '9:30', '12:00', '23:59'].forEach((time) => {
      expect(toTime(toMinutes(time))).toBe(time);
    });
  });

  it('formatTime은 시를 두 자리로 맞춘다', () => {
    expect(formatTime('9:05')).toBe('09:05');
    expect(formatTime('15:24')).toBe('15:24');
    expect(formatTime('0:00')).toBe('00:00');
  });
});
