import { LinearGradient } from 'expo-linear-gradient';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BugReportButton from '../components/BugReportButton';
import { markLanguageSelected, setDefaultLanguage } from '../utils/storage';

export default function LanguageSelectScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  async function choose(language) {
    await setDefaultLanguage(language);
    await markLanguageSelected();
    navigation.replace('Home', { language });
  }

  return (
    <LinearGradient colors={['#2771CB', '#5B21B6']} style={styles.container}>
      <ScrollView
        testID="language-select-scroll"
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + 24,
            paddingLeft: insets.left,
            paddingRight: insets.right
          }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Choose your language</Text>
        <Text style={styles.sub}>
          Pick the language you want to begin with.
        </Text>

        <View style={styles.cardRow}>
          <TouchableOpacity style={styles.card} onPress={() => choose('cajun')}>
            <Image
              source={require('../../assets/images/cajun_flag.png')}
              style={styles.flag}
              resizeMode="cover"
            />
            <Text style={styles.cardTitle}>French</Text>
            <Text style={styles.cardSub}>Louisiana French</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.card} onPress={() => choose('kreole')}>
            <Image
              source={require('../../assets/images/creole_flag.png')}
              style={styles.flag}
              resizeMode="cover"
            />
            <Text style={styles.cardTitle}>Kouri-Vini</Text>
            <Text style={styles.cardSub}>Louisiana Creole</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <BugReportButton screenName="LanguageSelect" />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center'
  },
  title: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center'
  },
  sub: {
    color: '#E9D5FF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 30
  },
  cardRow: {
    gap: 16
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 22,
    padding: 18,
    alignItems: 'center'
  },
  flag: {
    width: 150,
    height: 92,
    borderRadius: 8,
    marginBottom: 14
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#17324D'
  },
  cardSub: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B'
  }
});
