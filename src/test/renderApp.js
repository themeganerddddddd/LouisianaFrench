import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { render } from '@testing-library/react-native';
import fs from 'fs';
import path from 'path';

import AdvancedScreen from '../screens/AdvancedScreen';
import DailyReviewScreen from '../screens/DailyReviewScreen';
import DictionaryScreen from '../screens/DictionaryScreen';
import HomeScreen from '../screens/HomeScreen';
import LanguageSelectScreen from '../screens/LanguageSelectScreen';
import LessonCompleteScreen from '../screens/LessonCompleteScreen';
import LessonRunner from '../screens/LessonRunner';
import LoadingScreen from '../screens/LoadingScreen';
import MistakeReviewScreen from '../screens/MistakeReviewScreen';

const Stack = createStackNavigator();

const SCREENS = Object.freeze({
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

export const REGISTERED_ROUTES = Object.freeze(Object.keys(SCREENS));

export function routesDeclaredInAppSource() {
  const appPath = path.resolve(process.cwd(), 'App.js');
  const source = fs.readFileSync(appPath, 'utf8');
  const pattern = /name="([^"]+)"/g;
  const names = [];
  let match;

  while ((match = pattern.exec(source)) !== null) {
    names.push(match[1]);
  }

  return names;
}

function AppStack({ initialRouteName = 'Loading', initialParams }) {
  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{ headerShown: false }}
    >
      {REGISTERED_ROUTES.map((name) => (
        <Stack.Screen
          key={name}
          name={name}
          component={SCREENS[name]}
          initialParams={name === initialRouteName ? initialParams : undefined}
        />
      ))}
    </Stack.Navigator>
  );
}

export function renderApp({
  initialRouteName = 'Loading',
  initialParams,
  ...renderOptions
} = {}) {
  return render(
    <NavigationContainer>
      <AppStack
        initialRouteName={initialRouteName}
        initialParams={initialParams}
      />
    </NavigationContainer>,
    renderOptions
  );
}
