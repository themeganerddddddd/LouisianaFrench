import Markdown, { createMarkdownIt } from '@ronradtke/react-native-markdown-display';
import { StyleSheet, Text, View } from 'react-native';

const markdownIt = createMarkdownIt({ typographer: false });
markdownIt.set({ html: false, linkify: false });

const bubbleHeading = {
  fontSize: 15,
  lineHeight: 22,
  fontWeight: '800'
};

const markdownStyles = StyleSheet.create({
  body: {
    color: '#334E68',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600'
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 0
  },
  heading1: bubbleHeading,
  heading2: bubbleHeading,
  heading3: bubbleHeading,
  heading4: bubbleHeading,
  heading5: bubbleHeading,
  heading6: bubbleHeading,
  bullet_list: {
    marginTop: 4,
    marginBottom: 0
  },
  ordered_list: {
    marginTop: 4,
    marginBottom: 0
  },
  code_inline: {
    borderWidth: 0,
    backgroundColor: '#E8EEF5',
    padding: 2,
    paddingHorizontal: 4,
    borderRadius: 4,
    fontSize: 14,
    fontWeight: '600'
  },
  link: {
    color: '#334E68',
    textDecorationLine: 'none',
    fontWeight: '600'
  }
});

const markdownRules = {
  link: (node, children, _parent, styles) => (
    <Text key={node.key} style={styles.link}>
      {children}
    </Text>
  ),
  blocklink: (node, children) => children,
  image: () => null
};

function ignoreLinkPress() {
  return false;
}

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

      <View testID={bodyTestID}>
        <Markdown
          markdownit={markdownIt}
          style={markdownStyles}
          rules={markdownRules}
          onLinkPress={ignoreLinkPress}
          allowedImageHandlers={[]}
          defaultImageHandler={null}
        >
          {body}
        </Markdown>
      </View>
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
  }
});
