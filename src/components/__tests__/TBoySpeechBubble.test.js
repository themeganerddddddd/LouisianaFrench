import { Image, Linking, StyleSheet, Text, View } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import TBoySpeechBubble from '../TBoySpeechBubble';

function renderBubble(props = {}) {
  return render(
    <TBoySpeechBubble
      body="Helpful context"
      accentColor="#2771CB"
      bodyTestID="tboy-text"
      {...props}
    />
  );
}

function getCenteredParagraphViews() {
  return screen.UNSAFE_getAllByType(View).filter(v => {
    const flat = StyleSheet.flatten(v.props.style);
    return flat && flat.justifyContent === 'center' && flat.flexDirection === 'row';
  });
}

function getCenteredTextGroups() {
  return screen.UNSAFE_getAllByType(Text).filter(t => {
    const flat = StyleSheet.flatten(t.props.style);
    return flat && Object.keys(flat).length === 1 && flat.textAlign === 'center';
  });
}

describe('TBoySpeechBubble', () => {
  beforeEach(() => {
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders plain Extra details in full', () => {
    const body =
      'This is a longer practice note so you can see how helpful context fits beside the Activity.';

    renderBubble({ body });

    expect(screen.getByTestId('tboy-text')).toHaveTextContent(body);
    expect(screen.getByTestId('tboy-text').props.numberOfLines).toBeUndefined();
  });

  it('renders bold, italic, and inline code without markdown markers', () => {
    renderBubble({
      body: 'Use **apé** with *the verb* and `pa + olé`.'
    });

    const bubbleBody = screen.getByTestId('tboy-text');

    expect(bubbleBody).toHaveTextContent(
      'Use apé with the verb and pa + olé.'
    );
    expect(bubbleBody).not.toHaveTextContent('**');
    expect(bubbleBody).not.toHaveTextContent('`');
  });

  it('renders a short list as list items', () => {
    renderBubble({
      body: '- First note\n- Second note'
    });

    expect(screen.getByText('First note')).toBeOnTheScreen();
    expect(screen.getByText('Second note')).toBeOnTheScreen();
  });

  it('keeps the heading as plain text', () => {
    renderBubble({
      heading: 'A Unit note **title**',
      headingTestID: 'tboy-heading'
    });

    expect(screen.getByTestId('tboy-heading')).toHaveTextContent(
      'A Unit note **title**'
    );
  });

  it('shows link text without opening a URL', () => {
    renderBubble({
      body: 'See [this note](https://example.com/note).'
    });

    const bubbleBody = screen.getByTestId('tboy-text');

    expect(bubbleBody).toHaveTextContent('See this note.');
    expect(bubbleBody).not.toHaveTextContent('https://example.com/note');
    expect(Linking.openURL).not.toHaveBeenCalled();
  });

  it('renders the heading centered', () => {
    renderBubble({
      heading: 'Vocabulary tip',
      headingTestID: 'tboy-heading'
    });

    expect(screen.getByTestId('tboy-heading')).toHaveStyle({
      textAlign: 'center'
    });
  });

  it('renders plain-text body centered via paragraph justifyContent', () => {
    renderBubble({ body: 'Helpful context' });

    const centered = getCenteredParagraphViews();
    expect(centered.length).toBeGreaterThanOrEqual(1);
  });

  it('renders markdown inline content centered via paragraph justifyContent', () => {
    renderBubble({ body: 'Use **bold** and `code`.' });

    const centered = getCenteredParagraphViews();
    expect(centered.length).toBeGreaterThanOrEqual(1);
  });

  it('renders list item paragraphs centered via justifyContent', () => {
    renderBubble({ body: '- First note\n- Second note' });

    // List items use textgroup Text nodes (column-flex parent stretches to full width)
    const centered = getCenteredTextGroups();
    expect(centered.length).toBe(2);
  });

  it('does not render Catalog images', () => {
    renderBubble({
      body: 'Look ![photo](https://example.com/x.png) here.'
    });

    expect(screen.getByTestId('tboy-text')).toHaveTextContent('Look  here.');
    expect(screen.UNSAFE_queryAllByType(Image)).toHaveLength(0);
  });
});
