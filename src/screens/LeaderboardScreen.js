import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import SafeScreenView from '../components/SafeScreenView';
import { getLeaderboard } from '../utils/storage';

export default function LeaderboardScreen() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const board = await getLeaderboard();
    setRows(board.sort((a, b) => b.xp - a.xp));
  }

  return (
    <SafeScreenView style={styles.container}>
      <Text style={styles.title}>Leaderboard</Text>
      <Text style={styles.sub}>Local device leaderboard for now</Text>

      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        {rows.map((row, idx) => (
          <View key={`${row.name}-${idx}`} style={styles.row}>
            <Text style={styles.rank}>#{idx + 1}</Text>
            <Text style={styles.name}>{row.name}</Text>
            <Text style={styles.xp}>{row.xp} XP</Text>
          </View>
        ))}
      </ScrollView>
    </SafeScreenView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7FAFC', padding: 18 },
  title: { fontSize: 30, fontWeight: '900', color: '#17324D', marginTop: 20 },
  sub: { color: '#64748B', fontWeight: '600', marginTop: 6, marginBottom: 16 },
  row: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center'
  },
  rank: { width: 50, fontWeight: '900', color: '#2771CB', fontSize: 18 },
  name: { flex: 1, fontWeight: '800', color: '#17324D', fontSize: 17 },
  xp: { fontWeight: '800', color: '#475569' }
});
