import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SafeScreenView({ style, ...props }) {
  const insets = useSafeAreaInsets();

  return (
    <View
      {...props}
      style={[
        style,
        {
          paddingTop: insets.top,
          paddingRight: insets.right,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left
        }
      ]}
    />
  );
}
