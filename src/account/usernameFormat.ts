const LETTERS = 'A-Za-zÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸàâäçéèêëîïôöùûüÿ';
const USERNAME_FORMAT = new RegExp(`^[${LETTERS}][${LETTERS}0-9_]{2,19}$`, 'u');
const ALLOWED = new RegExp(`^[${LETTERS}0-9_]*$`, 'u');
const STARTS = new RegExp(`^[${LETTERS}]`, 'u');

export function isValidUsernameFormat(username: string): boolean {
  return USERNAME_FORMAT.test(username.normalize('NFC'));
}

export function usernameFormatIssue(username: string): 'length' | 'charset' | null {
  const value = username.normalize('NFC');
  if (value === '' || USERNAME_FORMAT.test(value)) return null;
  if (!ALLOWED.test(value) || !STARTS.test(value)) return 'charset';
  return 'length';
}
