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
        <Stack.Screen name="Loading" component={LoadingScreen} />
        <Stack.Screen name="LanguageSelect" component={LanguageSelectScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Lesson" component={LessonRunner} />
        <Stack.Screen name="MistakeReview" component={MistakeReviewScreen} />
        <Stack.Screen name="LessonComplete" component={LessonCompleteScreen} />
        <Stack.Screen name="DailyReview" component={DailyReviewScreen} />
        <Stack.Screen name="Advanced" component={AdvancedScreen} />
        <Stack.Screen name="Dictionary" component={DictionaryScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}