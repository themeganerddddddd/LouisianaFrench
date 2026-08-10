import { fireEvent, render, screen } from '@testing-library/react-native';

import PersonCarouselModal from '../PersonCarouselModal';
import { aboutPeopleFixture } from '../../test/fixtures/about/aboutFixtures';

describe('PersonCarouselModal', () => {
  it('renders paged placeholder cards for core and voice contributors', () => {
    render(
      <PersonCarouselModal
        visible
        people={aboutPeopleFixture}
        accentColor="#2771CB"
        reduceMotion
        onClose={jest.fn()}
      />
    );

    expect(screen.getByTestId('about-team-carousel').props.pagingEnabled).toBe(true);
    expect(screen.getByTestId('about-team-card-core-1')).toBeOnTheScreen();
    expect(screen.getByTestId('about-team-card-voice-1')).toBeOnTheScreen();
    expect(screen.getByTestId('about-team-portrait-core-1')).toHaveStyle({
      backgroundColor: '#2771CB'
    });
    expect(screen.getByText('CT')).toBeOnTheScreen();
    expect(screen.getByText('VC')).toBeOnTheScreen();
  });

  it('updates the page indicator, resets on reopen, and dismisses cleanly', () => {
    const onClose = jest.fn();
    const view = render(
      <PersonCarouselModal
        visible
        people={aboutPeopleFixture}
        accentColor="#2771CB"
        onClose={onClose}
      />
    );
    const carousel = screen.getByTestId('about-team-carousel');

    fireEvent.scroll(carousel, { nativeEvent: { contentOffset: { x: 280 } } });
    expect(screen.getByTestId('about-team-page-indicator')).toHaveTextContent('2 / 2');

    view.rerender(
      <PersonCarouselModal
        visible={false}
        people={aboutPeopleFixture}
        accentColor="#2771CB"
        onClose={onClose}
      />
    );
    view.rerender(
      <PersonCarouselModal
        visible
        people={aboutPeopleFixture}
        accentColor="#2771CB"
        onClose={onClose}
      />
    );

    expect(screen.getByTestId('about-team-page-indicator')).toHaveTextContent('1 / 2');
    fireEvent.press(screen.getByTestId('about-team-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
