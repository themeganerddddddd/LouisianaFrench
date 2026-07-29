import { render, screen } from '@testing-library/react-native';
import ProgressHeader from '../ProgressHeader';

describe('ProgressHeader', () => {
  it('renders the current Lesson progress', () => {
    render(
      <ProgressHeader
        current={2}
        total={5}
        xp={10}
        title="Greetings & Check-ins"
        modeLabel="Part 1"
        language="cajun"
      />
    );

    expect(screen.getByText('2 / 5')).toBeOnTheScreen();
    expect(screen.getByText(/10/)).toBeOnTheScreen();
  });
});
