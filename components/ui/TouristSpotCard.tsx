import {
  Image,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import {
  colors,
  fontFamily,
  fontSize,
  lineHeight,
  radius,
  spacing,
} from '@/constants';
import { Checkbox } from './Checkbox';
import { Text } from './Text';

// Figma 디자인 전용 색상 (constants 팔레트에 없는 값)
const CARD_BORDER = '#F0F0F0';

interface TouristSpotCardProps {
  title: string;
  category: string;
  description: string;
  imageSource: ImageSourcePropType;
  checked?: boolean;
  onCheckPress?: () => void;
  onPress?: () => void;
}

export function TouristSpotCard({
  title,
  category,
  description,
  imageSource,
  checked = false,
  onCheckPress,
  onPress,
}: TouristSpotCardProps) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.info}>
        <Checkbox checked={checked} onPress={onCheckPress} />
        <View style={styles.textGroup}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.category}>{category}</Text>
          </View>
          <Text style={styles.description} numberOfLines={1}>
            {description}
          </Text>
        </View>
      </View>
      <Image source={imageSource} style={styles.image} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    height: 122,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    backgroundColor: colors.white,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 4,
  },
  info: {
    flex: 1,
    height: '100%',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  textGroup: {
    gap: 6,
    width: '100%',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing['2xs'],
  },
  title: {
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
  description: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    lineHeight: lineHeight.lg,
    color: colors.grey[600],
  },
  image: {
    width: 90,
    height: 90,
    borderRadius: radius['2xs'],
    marginLeft: spacing.sm,
  },
});
