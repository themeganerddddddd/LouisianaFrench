import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Audio } from 'expo-av';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import AdvancedScreen from './src/screens/AdvancedScreen';
import DailyReviewScreen from './src/screens/DailyReviewScreen';
import DictionaryScreen from './src/screens/DictionaryScreen';
import HomeScreen from './src/screens/HomeScreen';
import LanguageSelectScreen from './src/screens/LanguageSelectScreen';
import LessonCompleteScreen from './src/screens/LessonCompleteScreen';
import LessonRunner from './src/screens/LessonRunner';
import LoadingScreen from './src/screens/LoadingScreen';
import MistakeReviewScreen from './src/screens/MistakeReviewScreen';

const Stack = createStackNavigator();

export const ROUTES = Object.freeze({
  Loading: LoadingScreen,
  LanguageSelect: LanguageSelectScreen,
  Home: HomeScreen,
  Lesson: LessonRunner,
  MistakeReview: MistakeReviewScreen,
  LessonComplete: LessonCompleteScreen,
  DailyReview: DailyReviewScreen,
  Advanced: AdvancedScreen,
  Dictionary: DictionaryScreen
});

export const REGISTERED_ROUTES = Object.freeze(Object.keys(ROUTES));

export default function App() {
  useEffect(() => {
    async function configureAudio() {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          interruptionModeIOS: 1,
          interruptionModeAndroid: 1,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false
        });
      } catch (error) {
        console.log('Audio setup error:', error);
      }
    }

    configureAudio();
  }, []);

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator
        initialRouteName="Loading"
        screenOptions={{ headerShown: false }}
      >
        {REGISTERED_ROUTES.map((name) => (
          <Stack.Screen key={name} name={name} component={ROUTES[name]} />
        ))}
      </Stack.Navigator>
    </NavigationContainer>
  );
}