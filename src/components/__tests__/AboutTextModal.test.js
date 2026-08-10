import { fireEvent, render, screen } from '@testing-library/react-native';

import AboutTextModal from '../AboutTextModal';
import { aboutTextFixture } from '../../test/fixtures/about/aboutFixtures';

describe('AboutTextModal', () => {
  it('renders a titled scrollable body and closes from its button', () => {
    const onClose = jest.fn();

    render(
      <AboutTextModal
        visible
        content={aboutTextFixture}
        accentColor="#2771CB"
        reduceMotion
        onClose={onClose}
      />
    );

    expect(screen.getByText('Security/Privacy')).toBeOnTheScreen();
    expect(screen.getByTestId('about-text-scroll')).toBeOnTheScreen();
    expect(screen.getByText(aboutTextFixture.paragraphs[0])).toBeOnTheScreen();
    expect(screen.getByTestId('about-text-modal')).toHaveStyle({ maxWidth: 460 });

    fireEvent.press(screen.getByTestId('about-text-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes from the backdrop without invoking any support flow', () => {
    const onClose = jest.fn();

    render(
      <AboutTextModal
        visible
        content={{ ...aboutTextFixture, title: 'Support' }}
        accentColor="#08834C"
        onClose={onClose}
      />
    );

    const modalBackdrop = screen.getByTestId('about-text-modal-backdrop');
    fireEvent.press(modalBackdrop.children[0]);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Tell us what went wrong.')).toBeNull();
  });
});
