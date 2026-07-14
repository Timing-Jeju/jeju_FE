import { useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';

import { colors, fontFamily, fontSize, radius, spacing } from '@/constants';
import { Text } from './Text';

// Figma 디자인 전용 색상 (constants 팔레트에 없는 값)
const INPUT_BORDER = '#F0F0F0';
const PLACEHOLDER = '#898989';
const ERROR = '#FF5858';

const eyeIcon = require('../../assets/images/icon-eye.png');
const eyeOffIcon = require('../../assets/images/icon-eye-off.png');
const searchIcon = require('../../assets/images/icon-search.png');

interface InputFieldProps extends TextInputProps {
  label?: string;
  errorMessage?: string;
  isError?: boolean;
  secureToggle?: boolean;
  search?: boolean;
  onPressSearch?: () => void;
}

export function InputField({
  label,
  errorMessage,
  isError = false,
  secureToggle = false,
  search = false,
  onPressSearch,
  value,
  style,
  ...props
}: InputFieldProps) {
  const [hidden, setHidden] = useState(true);

  return (
    <View style={styles.container}>
      {label !== undefined && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputBox, isError && styles.inputBoxError]}>
        <TextInput
          style={[styles.input, !!value && styles.inputFilled, style]}
          value={value}
          placeholderTextColor={PLACEHOLDER}
          secureTextEntry={secureToggle && hidden}
          autoCapitalize="none"
          autoCorrect={false}
          {...props}
        />
        {secureToggle && (
          <Pressable
            hitSlop={spacing.xs}
            onPress={() => setHidden((prev) => !prev)}
          >
            <Image
              source={hidden ? eyeIcon : eyeOffIcon}
              style={styles.eyeIcon}
            />
          </Pressable>
        )}
        {search && (
          <Pressable hitSlop={spacing.xs} onPress={onPressSearch}>
            <Image source={searchIcon} style={styles.searchIcon} />
          </Pressable>
        )}
      </View>
      {errorMessage !== undefined && (
        <Text style={[styles.error, !isError && styles.errorHidden]}>
          {errorMessage}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 6,
  },
  label: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    lineHeight: 24,
    color: colors.grey[900],
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    borderRadius: radius['2xs'],
    paddingHorizontal: spacing.md,
  },
  inputBoxError: {
    borderColor: ERROR,
  },
  input: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    color: colors.grey[900],
    padding: 0,
  },
  inputFilled: {
    fontFamily: fontFamily.bold,
  },
  eyeIcon: {
    width: 24,
    height: 24,
  },
  searchIcon: {
    width: 24,
    height: 24,
    tintColor: colors.grey[800],
  },
  error: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    lineHeight: 19,
    color: ERROR,
    textAlign: 'right',
    width: '100%',
  },
  errorHidden: {
    opacity: 0,
  },
});
