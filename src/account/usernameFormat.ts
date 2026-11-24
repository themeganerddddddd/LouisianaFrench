const LETTERS = 'A-Za-zÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸàâäçéèêëîïôöùûüÿ';
const USERNAME_FORMAT = new RegExp(`^[${LETTERS}][${LETTERS}0-9_]{2,19}$`, 'u');

export function isValidUsernameFormat(username: string): boolean {
  return USERNAME_FORMAT.test(username.normalize('NFC'));
}
