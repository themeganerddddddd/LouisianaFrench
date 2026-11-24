import { useState } from 'react';
import { Feather } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type TextStyle,
  type ViewStyle
} from 'react-native';

const FIELD_BORDER = '#64748B';
const DANGER = '#DC2626';
const ERROR_TEXT = '#B91C1C';
const INK = '#102A43';
const WHITE = '#FFFFFF';
const INSET = 16;

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  accentColor: string;
  error?: string;
  testID?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  keyboardType?: TextInputProps['keyboardType'];
  editable?: boolean;
};

type ButtonProps = {
  label: string;
  onPress: () => void;
  accentColor: string;
  disabled?: boolean;
  testID?: string;
};

type Kind = 'primary' | 'secondary' | 'link' | 'destructive';

function useFocused(): { focused: boolean; onFocus: () => void; onBlur: () => void } {
  const [focused, setFocused] = useState(false);
  return {
    focused,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false)
  };
}

function guardedPress(onPress: () => void, blocked: boolean): () => void {
  return () => {
    if (!blocked) onPress();
  };
}

function focusRing(focused: boolean, accentColor: string): ViewStyle {
  if (!focused) return {};
  if (Platform.OS === 'web') {
    return { outlineWidth: 2, outlineOffset: 2, outlineColor: accentColor };
  }
  return { borderWidth: 2, borderColor: accentColor };
}

function fieldStyle(focused: boolean, invalid: boolean, accentColor: string): TextStyle {
  const nativeFocus = focused && Platform.OS !== 'web';
  const thick = invalid || nativeFocus;
  const borderWidth = thick ? 2 : 1;
  const webRing = focused && !invalid && Platform.OS === 'web';
  return {
    minHeight: 48,
    borderWidth,
    borderColor: invalid ? DANGER : nativeFocus ? accentColor : FIELD_BORDER,
    borderRadius: 12,
    paddingHorizontal: INSET - borderWidth,
    backgroundColor: WHITE,
    color: INK,
    fontSize: 15,
    fontWeight: '600',
    ...(webRing ? { outlineWidth: 2, outlineOffset: 2, outlineColor: accentColor } : {})
  };
}

const labelStyle: TextStyle = { color: INK, fontSize: 12, fontWeight: '700', marginBottom: 6 };
const errorText: TextStyle = { color: ERROR_TEXT, flexShrink: 1, fontSize: 13, fontWeight: '700' };
const errorRow: ViewStyle = { alignItems: 'flex-start', flexDirection: 'row', gap: 6, marginTop: 6 };
const title: TextStyle = { flexShrink: 1, fontSize: 15, fontWeight: '800' };
const frame: ViewStyle = {
  alignItems: 'center',
  borderRadius: 12,
  flexDirection: 'row',
  gap: 8,
  justifyContent: 'center',
  minWidth: 44,
  paddingHorizontal: 16,
  paddingVertical: 13
};

export function Field({
  label,
  value,
  onChangeText,
  accentColor,
  error,
  testID,
  secureTextEntry,
  autoCapitalize,
  keyboardType,
  editable
}: FieldProps) {
  const { focused, onFocus, onBlur } = useFocused();
  return (
    <View>
      <Text accessible={false} style={labelStyle}>{label}</Text>
      <TextInput
        accessibilityHint={error}
        accessibilityLabel={label}
        autoCapitalize={autoCapitalize}
        editable={editable}
        keyboardType={keyboardType}
        onBlur={onBlur}
        onChangeText={onChangeText}
        onFocus={onFocus}
        secureTextEntry={secureTextEntry}
        style={fieldStyle(focused, Boolean(error), accentColor)}
        testID={testID}
        value={value}
      />
      {error ? (
        <View style={errorRow}>
          <Feather
            accessible={false}
            color={ERROR_TEXT}
            name="alert-circle"
            size={16}
            testID={testID ? `${testID}-error-icon` : undefined}
          />
          <Text accessibilityLiveRegion="assertive" accessibilityRole="alert" style={errorText}>
            {error}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function paint(kind: Kind, confirm: boolean, accentColor: string): { backgroundColor: string; color: string } {
  if (kind === 'primary') return { backgroundColor: accentColor, color: WHITE };
  if (kind === 'secondary') return { backgroundColor: WHITE, color: INK };
  if (kind === 'link') return { backgroundColor: 'transparent', color: accentColor };
  if (confirm) return { backgroundColor: DANGER, color: WHITE };
  return { backgroundColor: 'transparent', color: ERROR_TEXT };
}

function Control({
  label,
  onPress,
  accentColor,
  disabled,
  testID,
  loading,
  confirm,
  kind
}: ButtonProps & { loading?: boolean; confirm?: boolean; kind: Kind }) {
  const blocked = Boolean(disabled || loading);
  const { focused, onFocus, onBlur } = useFocused();
  const colors = paint(kind, Boolean(confirm), accentColor);
  return (
    <Pressable
      accessibilityRole={kind === 'link' ? 'link' : 'button'}
      accessibilityState={{ disabled: blocked, busy: Boolean(loading) }}
      onBlur={onBlur}
      onFocus={onFocus}
      onPress={guardedPress(onPress, blocked)}
      style={[
        frame,
        {
          backgroundColor: colors.backgroundColor,
          borderColor: kind === 'secondary' ? FIELD_BORDER : undefined,
          borderWidth: kind === 'secondary' ? 1 : undefined,
          minHeight: kind === 'link' ? 44 : 48,
          opacity: blocked ? 0.55 : 1,
          width: kind === 'primary' ? '100%' : undefined
        },
        focusRing(focused && !blocked, accentColor)
      ]}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator color={WHITE} testID={testID ? `${testID}-spinner` : undefined} />
      ) : null}
      {kind === 'destructive' && !confirm ? (
        <Feather
          accessible={false}
          color={ERROR_TEXT}
          name="trash-2"
          size={16}
          testID={testID ? `${testID}-icon` : undefined}
        />
      ) : null}
      <Text
        style={[title, { color: colors.color, textDecorationLine: kind === 'link' ? 'none' : undefined }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function PrimaryButton(props: ButtonProps & { loading?: boolean }) {
  return <Control {...props} kind="primary" />;
}

export function SecondaryButton(props: ButtonProps) {
  return <Control {...props} kind="secondary" />;
}

export function LinkButton(props: ButtonProps) {
  return <Control {...props} kind="link" />;
}

export function DestructiveButton(props: ButtonProps & { confirm?: boolean }) {
  return <Control {...props} kind="destructive" />;
}
