import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { render } from '@testing-library/react-native';

import { REGISTERED_ROUTES, ROUTES } from '../../App';

const Stack = createStackNavigator();

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
          component={ROUTES[name]}
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

export { REGISTERED_ROUTES, ROUTES };
