import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import BugReportFlow from './BugReportFlow';

export default function BugReportButton({
  screenName,
  language,
  accentColor,
  appearance = 'icon',
  flowVisible,
  onFlowOpen,
  onFlowClose
}) {
  const [internalVisible, setInternalVisible] = useState(false);
  const controlled = flowVisible !== undefined;
  const visible = controlled ? flowVisible : internalVisible;
  const resolvedAccentColor =
    accentColor || (language === 'kreole' ? '#065F3B' : '#174A8B');
  const textOnly = appearance === 'text';

  function openFlow() {
    if (controlled) {
      onFlowOpen?.();
      return;
    }
    setInternalVisible(true);
  }

  function closeFlow() {
    if (controlled) {
      onFlowClose?.();
      return;
    }
    setInternalVisible(false);
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={textOnly ? styles.textButton : [styles.iconButton, { backgroundColor: resolvedAccentColor }]}
        onPress={openFlow}
        accessibilityRole="button"
        accessibilityLabel="Report a bug"
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        {textOnly ? (
          <Text style={[styles.textButtonLabel, { color: resolvedAccentColor }]}>
            Report a bug
          </Text>
        ) : (
          <Ionicons name="bug" size={19} color="#FFFFFF" testID="bug-report-icon" />
        )}
      </TouchableOpacity>
      <BugReportFlow
        visible={visible}
        onClose={closeFlow}
        screenName={screenName}
        language={language}
        accentColor={resolvedAccentColor}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 12 },
  iconButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  textButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 },
  textButtonLabel: { fontSize: 13, fontWeight: '800', textDecorationLine: 'underline' },
});
