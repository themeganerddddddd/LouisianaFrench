import { render, screen, userEvent } from '@testing-library/react-native';
import LessonPrefaceModal from '../LessonPrefaceModal';
import { compactCatalogPrefaces } from '../../test/fixtures/catalog/compactCatalog';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const cajunPreface = compactCatalogPrefaces.cajun.u03;
const kreolePreface = compactCatalogPrefaces.kreole.u01;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderModal({
  preface = cajunPreface,
  visible = true,
  mode = 'start',
  onContinue = jest.fn(),
  onClose = jest.fn(),
  accentColor = '#2771CB'
} = {}) {
  return render(
    <LessonPrefaceModal
      preface={preface}
      visible={visible}
      mode={mode}
      onContinue={onContinue}
      onClose={onClose}
      accentColor={accentColor}
    />
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LessonPrefaceModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders summary with title text visible', () => {
    renderModal();
    expect(screen.getByText(cajunPreface.title)).toBeOnTheScreen();
  });

  it('uses the shared T-Boy speech bubble and accessible artwork in the summary', () => {
    renderModal();

    expect(screen.getByTestId('preface-tboy-bubble')).toBeOnTheScreen();
    expect(screen.getByTestId('preface-tboy-image')).toBeOnTheScreen();
    expect(screen.getByLabelText('T-Boy')).toBeOnTheScreen();
    expect(screen.getByTestId('preface-summary-scroll')).toBeOnTheScreen();
  });

  it('keeps long Unit note summaries visible inside the summary scroll', () => {
    const longSummary = 'A regional note '.repeat(40);
    renderModal({
      preface: {
        ...cajunPreface,
        title: 'A long Unit note title that should wrap on narrow screens',
        summary: longSummary
      }
    });

    expect(screen.getByText(longSummary)).toBeOnTheScreen();
    expect(screen.getByTestId('preface-summary-scroll')).toBeOnTheScreen();
  });

  it('renders all term chips', () => {
    renderModal();
    for (const term of cajunPreface.terms) {
      expect(screen.getByText(term)).toBeOnTheScreen();
    }
  });

  it('reassurance text is visible', () => {
    renderModal();
    expect(screen.getByText(cajunPreface.reassurance)).toBeOnTheScreen();
  });

  it('shows "Learn more" and "Start lesson" buttons in start mode', () => {
    renderModal({ mode: 'start' });
    expect(screen.getByText('Learn more')).toBeOnTheScreen();
    expect(screen.getByText('Start lesson')).toBeOnTheScreen();
  });

  it('shows "Back to lesson" in reference mode', () => {
    renderModal({ mode: 'reference' });
    expect(screen.getByText('Back to lesson')).toBeOnTheScreen();
    expect(screen.queryByText('Start lesson')).toBeNull();
  });

  it('tapping "Learn more" hides summary and shows detail heading', async () => {
    const user = userEvent.setup();
    renderModal();

    // Summary is showing
    expect(screen.getByText(cajunPreface.title)).toBeOnTheScreen();

    await user.press(screen.getByLabelText('Learn more'));

    // Summary should be gone
    expect(screen.queryByText(cajunPreface.title)).toBeNull();

    // Detail heading should be visible
    expect(screen.getByText(cajunPreface.detailsTitle)).toBeOnTheScreen();
  });

  it('keeps the footer action usable with long detail content', async () => {
    const onContinue = jest.fn();
    const user = userEvent.setup();
    const longSections = Array.from({ length: 12 }, (_, index) => ({
      heading: `Detail heading ${index + 1}`,
      paragraphs: ['A long explainer paragraph that should scroll above the footer.']
    }));

    renderModal({
      mode: 'reference',
      onContinue,
      preface: { ...cajunPreface, sections: longSections }
    });

    await user.press(screen.getByLabelText('Learn more'));

    const continueButton = screen.getByLabelText('Back to lesson');
    expect(continueButton).toBeOnTheScreen();
    expect(continueButton).toHaveStyle({ flex: 0, width: '100%' });

    await user.press(continueButton);
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('tapping back in details returns to summary', async () => {
    const user = userEvent.setup();
    renderModal();

    // Go to details
    await user.press(screen.getByLabelText('Learn more'));
    expect(screen.getByText(cajunPreface.detailsTitle)).toBeOnTheScreen();

    // Tap back
    await user.press(screen.getByLabelText('Back to summary'));

    // Summary is back
    expect(screen.getByText(cajunPreface.title)).toBeOnTheScreen();
    expect(screen.queryByText(cajunPreface.detailsTitle)).toBeNull();
  });

  it('tapping "Start lesson" calls onContinue', async () => {
    const onContinue = jest.fn();
    const user = userEvent.setup();
    renderModal({ mode: 'start', onContinue });

    await user.press(screen.getByLabelText('Start lesson'));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('tapping close/X calls onClose', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    renderModal({ onClose });

    await user.press(screen.getByLabelText('Close preface'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('terms are rendered with accentColor border styling', () => {
    const accentColor = '#6D28D9';
    renderModal({ accentColor });

    cajunPreface.terms.forEach((term, index) => {
      const chip = screen.getByTestId(`term-chip-${index}`);
      expect(chip).toHaveStyle({ borderColor: accentColor });
    });
  });

  it('renders kreole preface content correctly', () => {
    renderModal({ preface: kreolePreface, accentColor: '#6D28D9' });
    expect(screen.getByText(kreolePreface.title)).toBeOnTheScreen();
    expect(screen.getByText(kreolePreface.summary)).toBeOnTheScreen();
    for (const term of kreolePreface.terms) {
      expect(screen.getByText(term)).toBeOnTheScreen();
    }
    expect(screen.getByText(kreolePreface.reassurance)).toBeOnTheScreen();
  });
});
