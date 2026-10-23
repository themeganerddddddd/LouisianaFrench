import { render, screen } from '@testing-library/react-native';
import { setupAppTests, setupUser } from '../../test/setupAppTest';
import BugReportButton from '../BugReportButton';

setupAppTests();

describe('BugReportButton', () => {
  it('opens the flow from the text control', async () => {
    const user = setupUser();
    render(
      <BugReportButton
        screenName="Home"
        language="cajun"
        accentColor="#2771CB"
        appearance="text"
      />
    );

    await user.press(screen.getByLabelText('Report a bug'));
    expect(screen.getByText('Tell us what went wrong.')).toBeOnTheScreen();
  });

  it('defers visibility to the parent in controlled mode', async () => {
    const user = setupUser();
    const onFlowOpen = jest.fn();
    const onFlowClose = jest.fn();

    const { rerender } = render(
      <BugReportButton
        screenName="Home"
        language="cajun"
        accentColor="#2771CB"
        appearance="text"
        flowVisible={false}
        onFlowOpen={onFlowOpen}
        onFlowClose={onFlowClose}
      />
    );

    expect(screen.queryByText('Tell us what went wrong.')).toBeNull();
    await user.press(screen.getByLabelText('Report a bug'));
    expect(onFlowOpen).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Tell us what went wrong.')).toBeNull();

    rerender(
      <BugReportButton
        screenName="Home"
        language="cajun"
        accentColor="#2771CB"
        appearance="text"
        flowVisible
        onFlowOpen={onFlowOpen}
        onFlowClose={onFlowClose}
      />
    );
    expect(screen.getByText('Tell us what went wrong.')).toBeOnTheScreen();

    await user.press(screen.getByLabelText('Cancel bug report'));
    expect(onFlowClose).toHaveBeenCalledTimes(1);
  });
});
