import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ProgressHeader({ current, total, xp, title, modeLabel, language, unitPreface, onOpenPreface }) {
  const pct = total > 0 ? ((current / total) * 100).toFixed(0) : 0;

  const theme =
    language === 'kreole'
      ? {
          accent: '#08834C',
          stat: '#066B3F'
        }
      : {
          accent: '#2771CB',
          stat: '#3E5F8A'
        };

  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          {modeLabel ? <Text style={styles.mode}>{modeLabel}</Text> : null}
        </View>
        {unitPreface && (
          <TouchableOpacity
            onPress={onOpenPreface}
            accessibilityRole="button"
            accessibilityLabel="Unit note"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.unitNoteButton}
          >
            <Text style={[styles.unitNoteText, { color: theme.accent }]}>
              Unit note
            </Text>
          </TouchableOpacity>
        )}
        <Text style={[styles.stat, { color: theme.stat }]}>⚡ {xp}</Text>
      </View>

      <View style={styles.barBg}>
        <View
          style={[
            styles.barFill,
            {
              width: `${pct}%`,
              backgroundColor: theme.accent
            }
          ]}
        />
      </View>

      <Text style={styles.sub}>
        {current} / {total}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 18,
    paddingBottom: 10
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    alignItems: 'center'
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#17324D'
  },
  mode: {
    color: '#64748B',
    fontWeight: '700',
    marginTop: 4
  },
  unitNoteButton: {
    marginRight: 10
  },
  unitNoteText: {
    fontSize: 13,
    fontWeight: '800'
  },
  stat: {
    fontSize: 15,
    fontWeight: '700'
  },
  barBg: {
    height: 12,
    backgroundColor: '#E2E8F0',
    borderRadius: 999,
    overflow: 'hidden'
  },
  barFill: {
    height: 12,
    borderRadius: 999
  },
  sub: {
    marginTop: 8,
    color: '#64748B',
    fontWeight: '600'
  }
});