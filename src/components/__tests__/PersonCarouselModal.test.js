import { fireEvent, render, screen, within } from '@testing-library/react-native';

import PersonCarouselModal from '../PersonCarouselModal';
import { aboutPeopleFixture } from '../../test/fixtures/about/aboutFixtures';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    Feather: ({ testID, name, color }) => React.createElement(View, {
      testID,
      name,
      color
    })
  };
});

describe('PersonCarouselModal', () => {
  it('shows a readable bio and contribution for every person in the tall team modal', () => {
    render(
      <PersonCarouselModal
        visible
        people={aboutPeopleFixture}
        accentColor="#2771CB"
        reduceMotion
        onClose={jest.fn()}
      />
    );

    expect(screen.getByTestId('about-team-modal')).toHaveStyle({ height: '88%' });
    aboutPeopleFixture.forEach((person) => {
      const card = within(screen.getByTestId(`about-team-card-${person.id}`));
      expect(card.getAllByText(person.name)[0]).toBeOnTheScreen();
      expect(card.getAllByText(person.role)[0]).toBeOnTheScreen();
      expect(card.getByText(person.bio)).toBeOnTheScreen();
      expect(card.getByText(person.contribution)).toBeOnTheScreen();
    });
    expect(screen.getAllByText('Bio')).toHaveLength(aboutPeopleFixture.length);
    expect(screen.getAllByText('Contribution')).toHaveLength(aboutPeopleFixture.length);
  });

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

  it('snaps measured viewport pages and syncs after scrolling settles', () => {
    render(
      <PersonCarouselModal
        visible
        people={aboutPeopleFixture}
        accentColor="#2771CB"
        reduceMotion
        onClose={jest.fn()}
      />
    );
    const carousel = screen.getByTestId('about-team-carousel');

    fireEvent(carousel, 'layout', { nativeEvent: { layout: { width: 320 } } });

    expect(carousel.props.pagingEnabled).toBe(true);
    expect(carousel.props.snapToInterval).toBe(320);
    expect(carousel.props.snapToAlignment).toBe('center');
    expect(carousel.props.decelerationRate).toBe('fast');
    expect(carousel.props.disableIntervalMomentum).toBe(true);

    fireEvent(carousel, 'momentumScrollEnd', {
      nativeEvent: { contentOffset: { x: 320 } }
    });
    expect(screen.getByTestId('about-team-page-indicator')).toHaveTextContent('2 / 2');
  });

  it.each([
    ['mobile', 320],
    ['desktop', 460]
  ])('moves between full-width pages with icon-only side arrows on the %s viewport', (
    _viewport,
    width
  ) => {
    render(
      <PersonCarouselModal
        visible
        people={aboutPeopleFixture}
        accentColor="#2771CB"
        reduceMotion
        onClose={jest.fn()}
      />
    );
    const carousel = screen.getByTestId('about-team-carousel');
    const previous = screen.getByTestId('about-team-previous');
    const next = screen.getByTestId('about-team-next');

    fireEvent(carousel, 'layout', { nativeEvent: { layout: { width } } });

    expect(screen.getByTestId('about-team-card-core-1')).toHaveStyle({ width });
    expect(carousel.props.snapToInterval).toBe(width);
    expect(previous.props.accessibilityLabel).toBe('Previous person');
    expect(next.props.accessibilityLabel).toBe('Next person');
    expect(screen.getByTestId('about-team-previous-icon').props.name).toBe('chevron-left');
    expect(screen.getByTestId('about-team-next-icon').props.name).toBe('chevron-right');
    expect(previous.props.children).not.toEqual(expect.any(String));
    expect(next.props.children).not.toEqual(expect.any(String));
    expect(previous).toBeDisabled();
    expect(next).toBeEnabled();

    fireEvent.press(next);
    expect(screen.getByTestId('about-team-page-indicator')).toHaveTextContent('2 / 2');
    expect(previous).toBeEnabled();
    expect(next).toBeDisabled();

    fireEvent.press(previous);
    expect(screen.getByTestId('about-team-page-indicator')).toHaveTextContent('1 / 2');
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

    fireEvent(carousel, 'layout', { nativeEvent: { layout: { width: 280 } } });
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
