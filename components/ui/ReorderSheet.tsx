import {
  Fragment,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Animated, Image, PanResponder, StyleSheet, View } from 'react-native';

import {
  colors,
  fontFamily,
  fontSize,
  grid,
  lineHeight,
  radius,
  spacing,
} from '@/constants';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { Text } from './Text';

const dragHandleIcon = require('../../assets/images/icon-drag-handle.png');

// Figma 디자인 전용 색상 (constants 팔레트에 없는 값)
const CARD_BORDER = '#E9EAED';
const TITLE = '#2E2E2E';

const ROW_HEIGHT = 40;
const ROW_GAP = 11;
// 한 칸 높이 (행 + 위아래 간격 + 구분선) — 드래그로 옮길 위치를 계산할 때 쓴다
const ROW_STEP = ROW_HEIGHT + ROW_GAP * 2 + 1;

export interface ReorderItem {
  key: string;
  /** 문자열이면 기본 스타일로 감싸고, 노드면 그대로 그린다 */
  label: ReactNode;
}

interface RowProps {
  item: ReorderItem;
  index: number;
  dragging: boolean;
  dragActive: boolean;
  shift: number;
  dragY: Animated.Value;
  onDragStart: (index: number) => void;
  onDragMove: (index: number, dy: number) => void;
  onDragEnd: (index: number) => void;
}

function Row({
  item,
  index,
  dragging,
  dragActive,
  shift,
  dragY,
  onDragStart,
  onDragMove,
  onDragEnd,
}: RowProps) {
  // 밀려나는 행은 제자리에서 부드럽게 한 칸 이동한다
  const shiftY = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    // 드래그가 끝나면 목록이 실제로 재배치되므로 밀어둔 값은 즉시 되돌린다
    if (!dragActive) {
      shiftY.setValue(0);
      return;
    }
    Animated.timing(shiftY, {
      toValue: shift,
      duration: 160,
      useNativeDriver: false,
    }).start();
  }, [dragActive, shift, shiftY]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        // 핸들을 잡는 순간 바로 드래그를 시작하고, ScrollView에 제스처를 뺏기지 않는다
        onStartShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => onDragStart(index),
        onPanResponderMove: (_, gesture) => onDragMove(index, gesture.dy),
        onPanResponderRelease: () => onDragEnd(index),
        onPanResponderTerminate: () => onDragEnd(index),
      }),
    [index, onDragStart, onDragMove, onDragEnd],
  );

  return (
    <Animated.View
      style={[
        styles.row,
        dragging && styles.rowDragging,
        { transform: [{ translateY: dragging ? dragY : shiftY }] },
      ]}
    >
      {typeof item.label === 'string' ? (
        <Text style={styles.label} numberOfLines={1}>
          {item.label}
        </Text>
      ) : (
        item.label
      )}
      <View
        style={styles.handle}
        hitSlop={spacing.xs}
        {...panResponder.panHandlers}
      >
        <Image
          source={dragHandleIcon}
          style={[styles.handleIcon, dragging && styles.handleIconActive]}
        />
      </View>
    </Animated.View>
  );
}

interface ReorderSheetProps {
  title: string;
  items: ReorderItem[];
  confirmTitle?: string;
  onClose: () => void;
  /** 바뀐 순서의 key 목록 */
  onConfirm: (keys: string[]) => void;
}

/**
 * 드래그로 순서를 바꾸는 바텀시트 (일정 항목 / 일정 구간 공용).
 * 열 때마다 순서를 처음부터 잡도록 부모에서 조건부로 렌더링해서 쓴다.
 */
export function ReorderSheet({
  title,
  items,
  confirmTitle = '변경하기',
  onClose,
  onConfirm,
}: ReorderSheetProps) {
  const [order, setOrder] = useState(items);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const dragY = useMemo(() => new Animated.Value(0), []);
  // 드래그가 끝날 때 최신 목적지를 읽어야 해서 ref로도 들고 있는다
  const dropIndexRef = useRef<number | null>(null);

  const changed = order.some((item, index) => item.key !== items[index]?.key);

  const handleDragStart = useCallback(
    (index: number) => {
      // 직전 드래그의 마무리 애니메이션이 남아 있을 수 있다
      dragY.stopAnimation();
      dragY.setValue(0);
      dropIndexRef.current = index;
      setDragIndex(index);
      setDropIndex(index);
    },
    [dragY],
  );

  const handleDragMove = useCallback(
    (index: number, dy: number) => {
      const clamped = Math.min(
        Math.max(dy, -index * ROW_STEP),
        (order.length - 1 - index) * ROW_STEP,
      );
      dragY.setValue(clamped);

      const next = index + Math.round(clamped / ROW_STEP);
      dropIndexRef.current = next;
      setDropIndex((prev) => (prev === next ? prev : next));
    },
    [dragY, order.length],
  );

  const handleDragEnd = useCallback(
    (index: number) => {
      const target = dropIndexRef.current ?? index;
      dropIndexRef.current = null;

      // 놓을 자리까지 미끄러진 뒤에 목록을 바꾼다 (중간에 위치가 튀지 않도록)
      Animated.timing(dragY, {
        toValue: (target - index) * ROW_STEP,
        duration: 140,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (!finished) return;
        dragY.setValue(0);
        setDragIndex(null);
        setDropIndex(null);
        if (target === index) return;
        setOrder((prev) => {
          const next = [...prev];
          const [moved] = next.splice(index, 1);
          next.splice(target, 0, moved);
          return next;
        });
      });
    },
    [dragY],
  );

  /** 끌고 있는 행이 지나간 자리만큼 다른 행을 한 칸씩 밀어준다 */
  const shiftOf = (index: number) => {
    if (dragIndex === null || dropIndex === null || index === dragIndex) {
      return 0;
    }
    if (dragIndex < dropIndex && index > dragIndex && index <= dropIndex) {
      return -ROW_STEP;
    }
    if (dragIndex > dropIndex && index >= dropIndex && index < dragIndex) {
      return ROW_STEP;
    }
    return 0;
  };

  return (
    <BottomSheet visible onClose={onClose}>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.card}>
          {order.map((item, index) => (
            <Fragment key={item.key}>
              {index > 0 && <View style={styles.divider} />}
              <Row
                item={item}
                index={index}
                dragging={dragIndex === index}
                dragActive={dragIndex !== null}
                shift={shiftOf(index)}
                dragY={dragY}
                onDragStart={handleDragStart}
                onDragMove={handleDragMove}
                onDragEnd={handleDragEnd}
              />
            </Fragment>
          ))}
        </View>
      </View>
      <View style={styles.footer}>
        <Button
          title={confirmTitle}
          disabled={!changed}
          onPress={() => onConfirm(order.map((item) => item.key))}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: grid.pageMargin,
    gap: spacing.md,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['2xl'],
    lineHeight: lineHeight.xl,
    color: TITLE,
  },
  card: {
    gap: ROW_GAP,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: radius.sm,
  },
  footer: {
    paddingHorizontal: grid.pageMargin,
    paddingTop: spacing.lg,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: colors.grey[100],
  },
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
    backgroundColor: colors.white,
  },
  // 끌고 있는 동안에는 카드처럼 살짝 떠 보이게 한다
  rowDragging: {
    zIndex: 1,
    borderRadius: radius['2xs'],
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  label: {
    flexShrink: 1,
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    color: colors.grey[900],
  },
  handle: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handleIcon: {
    width: 20,
    height: 20,
  },
  handleIconActive: {
    tintColor: colors.primary,
  },
});
