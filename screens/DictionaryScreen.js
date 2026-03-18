import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { getAudioSource } from '../data/audioManifest';
import { getAllWords } from '../data/lessonLoader';
import { getWordProgress } from '../utils/storage';

function statusLabel(status) {
  if (status === 'mastered') return 'Mastered';
  if (status === 'strong') return 'Strong';
  if (status === 'learning') return 'Learning';
  return 'New';
}

function statusColor(status) {
  if (status === 'mastered') return '#166534';
  if (status === 'strong') return '#2563EB';
  if (status === 'learning') return '#D97706';
  return '#64748B';
}

export default function DictionaryScreen({ route }) {
  const { language } = route.params;
  const [query, setQuery] = useState('');
  const [allWords, setAllWords] = useState([]);
  const [wordProgress, setWordProgress] = useState({});
  const [selectedUnit, setSelectedUnit] = useState('all');
  const soundRef = useRef(null);

  useEffect(() => {
    load();
    return () => {
      unloadSound();
    };
  }, [language]);

  async function load() {
    setAllWords(getAllWords(language));
    setWordProgress(await getWordProgress());
  }

  async function unloadSound() {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    } catch (e) {}
  }

  async function playAudio(audioKey) {
    try {
      const source = getAudioSource(language, audioKey);
      if (!source) {
        Alert.alert('Audio missing', `No local audio found for ${audioKey || 'this word'}.`);
        return;
      }

      await unloadSound();

      const { sound } = await Audio.Sound.createAsync(source);
      soundRef.current = sound;
      await sound.playAsync();
    } catch (e) {
      Alert.alert('Audio error', 'Could not play this audio file.');
    }
  }

  const units = useMemo(() => {
    const found = new Map();
    allWords.forEach((w) => {
      if (!found.has(w.unit)) {
        found.set(w.unit, w.unitTitle);
      }
    });
    return Array.from(found.entries()).map(([unit, title]) => ({ unit, title }));
  }, [allWords]);

  const filteredWords = useMemo(() => {
    const q = query.trim().toLowerCase();

    return allWords.filter((word) => {
      const inUnit = selectedUnit === 'all' || word.unit === selectedUnit;
      const matchesQuery =
        !q ||
        String(word.english || '').toLowerCase().includes(q) ||
        String(word.target || '').toLowerCase().includes(q) ||
        String(word.rowId || '').toLowerCase().includes(q);

      return inUnit && matchesQuery;
    });
  }, [allWords, query, selectedUnit]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {language === 'cajun' ? 'Cajun Dictionary' : 'Kouri-Vini Dictionary'}
        </Text>
        <Text style={styles.sub}>
          Browse every word introduced in the course
        </Text>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search English, target word, or id"
          style={styles.searchInput}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.unitTabs}
      >
        <TouchableOpacity
          style={[styles.unitTab, selectedUnit === 'all' && styles.unitTabActive]}
          onPress={() => setSelectedUnit('all')}
        >
          <Text style={[styles.unitTabText, selectedUnit === 'all' && styles.unitTabTextActive]}>
            All
          </Text>
        </TouchableOpacity>

        {units.map((u) => (
          <TouchableOpacity
            key={u.unit}
            style={[styles.unitTab, selectedUnit === u.unit && styles.unitTabActive]}
            onPress={() => setSelectedUnit(u.unit)}
          >
            <Text
              style={[
                styles.unitTabText,
                selectedUnit === u.unit && styles.unitTabTextActive
              ]}
            >
              {u.unit.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.list}>
        {filteredWords.map((word) => {
          const progress = wordProgress[`${language}:${word.rowId}`] || {};
          const status = progress.status || 'new';

          return (
            <View key={`${language}:${word.rowId}`} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.unitLabel}>{word.unitTitle}</Text>
                <Text style={[styles.status, { color: statusColor(status) }]}>
                  {statusLabel(status)}
                </Text>
              </View>

              <Text style={styles.english}>{word.english}</Text>
              <Text style={styles.target}>{word.target}</Text>

              <View style={styles.actionsRow}>
                {word.audioKey ? (
                  <TouchableOpacity
                    style={styles.audioBtn}
                    onPress={() => playAudio(word.audioKey)}
                  >
                    <Ionicons name="play" size={16} color="#fff" />
                    <Text style={styles.audioBtnText}>Play audio</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.meta}>{word.rowId}</Text>
                {word.audioKey ? <Text style={styles.meta}>{word.audioKey}</Text> : null}
              </View>
            </View>
          );
        })}

        {!filteredWords.length ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No matches found.</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingTop: 20, paddingHorizontal: 18, paddingBottom: 10 },
  title: { fontSize: 28, fontWeight: '900', color: '#17324D' },
  sub: { color: '#64748B', marginTop: 6, fontWeight: '600' },
  searchWrap: { paddingHorizontal: 18, paddingBottom: 10 },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1'
  },
  unitTabs: { paddingHorizontal: 18, paddingBottom: 8, gap: 8 },
  unitTab: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999
  },
  unitTabActive: { backgroundColor: '#2771CB' },
  unitTabText: { color: '#334155', fontWeight: '800' },
  unitTabTextActive: { color: '#fff' },
  list: { padding: 18, paddingTop: 8 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 10
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  unitLabel: { color: '#64748B', fontWeight: '700', flex: 1, marginRight: 8 },
  status: { fontWeight: '900' },
  english: {
    fontSize: 19,
    fontWeight: '800',
    color: '#102A43',
    marginTop: 8
  },
  target: {
    fontSize: 20,
    fontWeight: '900',
    color: '#2771CB',
    marginTop: 6
  },
  actionsRow: {
    flexDirection: 'row',
    marginTop: 12
  },
  audioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2771CB',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999
  },
  audioBtnText: {
    color: '#fff',
    fontWeight: '800',
    marginLeft: 6
  },
  metaRow: {
    marginTop: 10
  },
  meta: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600'
  },
  empty: {
    paddingVertical: 40,
    alignItems: 'center'
  },
  emptyText: {
    color: '#64748B',
    fontWeight: '700'
  }
});