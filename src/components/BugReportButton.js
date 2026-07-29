import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import BugReportFlow from './BugReportFlow';

export default function BugReportButton({ screenName, language, accentColor, appearance = 'icon' }) {
  const [showFlow, setShowFlow] = useState(false);
  const resolvedAccentColor =
    accentColor || (language === 'kreole' ? '#6D28D9' : '#2771CB');
  const textOnly = appearance === 'text';

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={textOnly ? styles.textButton : [styles.iconButton, { backgroundColor: resolvedAccentColor }]}
        onPress={() => setShowFlow(true)}
        accessibilityRole="button"
        accessibilityLabel="Report a bug"
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Text style={textOnly ? [styles.textButtonLabel, { color: resolvedAccentColor }] : styles.iconButtonText}>
          {textOnly ? 'Report a bug' : '!'}
        </Text>
      </TouchableOpacity>
      <BugReportFlow
        visible={showFlow}
        onClose={() => setShowFlow(false)}
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
  iconButtonText: { color: '#fff', fontSize: 18, fontWeight: '900' },
  textButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 },
  textButtonLabel: { fontSize: 13, fontWeight: '800', textDecorationLine: 'underline' },
});
