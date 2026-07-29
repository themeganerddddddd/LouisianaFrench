import { screen } from '@testing-library/react-native';
import { expect } from '@jest/globals';

export async function press(user, label) {
  await user.press(screen.getByText(label));
}

export async function chooseAndCheck(user, answer) {
  await press(user, answer);
  await press(user, 'Check');
}

export function expectFirstWrong(hint) {
  expect(screen.getByText('Not quite')).toBeOnTheScreen();
  if (hint) expect(screen.getByText(hint)).toBeOnTheScreen();
}

export async function retry(user) {
  await press(user, 'Try Again');
  expect(screen.queryByText('Not quite')).toBeNull();
}

export function expectFinalWrong(answer) {
  expect(screen.getByText('Let’s move on')).toBeOnTheScreen();
  if (answer) expect(screen.getByText(`Answer: ${answer}`)).toBeOnTheScreen();
}

export async function finishCorrect(user, onCorrect) {
  expect(screen.getByText('Correct!')).toBeOnTheScreen();
  await press(user, 'Next Question');
  expect(onCorrect).toHaveBeenCalledTimes(1);
}

export async function finishWrong(user, onWrong, answer) {
  await press(user, 'Continue');
  expect(onWrong).toHaveBeenCalledWith(answer);
}
