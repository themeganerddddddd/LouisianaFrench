import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { getDefaultLanguage, hasSelectedLanguage } from '../utils/storage';

export default function LoadingScreen({ navigation }) {
  const opacity = useRef(new Animated.Value(1)).current;
  const [languageName, setLanguageName] = useState('Louisiana French');

  useEffect(() => {
    let active = true;
    const languageState = Promise.all([
      hasSelectedLanguage(),
      getDefaultLanguage()
    ]);

    languageState.then(([selected, savedLanguage]) => {
      if (active && selected && savedLanguage === 'kreole') {
        setLanguageName('Kouri-Vini');
      }
    });

    const timer = setTimeout(async () => {
      const [selected, savedLanguage] = await languageState;

      Animated.timing(opacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        if (!selected) {
          navigation.replace('LanguageSelect');
        } else {
          navigation.replace('Home', { language: savedLanguage || 'cajun' });
        }
      });
    }, 2500);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [navigation, opacity]);

  return (
    <View style={styles.container}>
      <Animated.Image
        source={require('../../assets/images/loading.gif')}
        style={[styles.image, { opacity }]}
        resizeMode="contain"
      />
      <Text style={styles.header}>Learn</Text>
      <Text style={styles.header}>{languageName}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2771CB',
  },
  image: {
    width: 250,
    height: 250,
    marginBottom: 20,
  },
  header: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#fff',
  },
});
