import { StyleSheet, Text, View } from 'react-native';

export default function TBoySpeechBubble({
  heading,
  body,
  accentColor,
  layout = 'column',
  tailPosition = 'bottom',
  testID = 'tboy-speech-bubble',
  headingTestID,
  bodyTestID
}) {
  return (
    <View
      style={[
        styles.bubble,
        layout === 'row'
          ? styles.rowBubble
          : styles.columnBubble,
        { borderColor: accentColor }
      ]}
      testID={testID}
    >
      <View
        style={[
          styles.tail,
          tailPosition === 'left'
            ? styles.leftTail
            : styles.bottomTail,
          {
            backgroundColor: '#F8FBFF',
            borderColor: accentColor
          }
        ]}
      />

      {heading ? (
        <Text
          testID={headingTestID}
          style={[
            styles.heading,
            { color: accentColor }
          ]}
        >
          {heading}
        </Text>
      ) : null}

      <Text
        testID={bodyTestID}
        style={styles.body}
      >
        {body}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    backgroundColor: '#F8FBFF',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    position: 'relative'
  },

  columnBubble: {
    width: '100%'
  },

  rowBubble: {
    flex: 1,
    minWidth: 0
  },

  tail: {
    position: 'absolute',
    width: 16,
    height: 16,
    transform: [
      { rotate: '45deg' }
    ]
  },

  bottomTail: {
    bottom: -9,
    left: '50%',
    marginLeft: -8,
    borderRightWidth: 1,
    borderBottomWidth: 1
  },

  leftTail: {
    left: -9,
    bottom: 24,
    borderLeftWidth: 1,
    borderBottomWidth: 1
  },

  heading: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '800',
    marginBottom: 4
  },

  body: {
    color: '#334E68',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600'
  }
});