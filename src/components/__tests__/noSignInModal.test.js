import fs from 'fs';
import path from 'path';

function sources(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sources(full);
    return /\.(js|jsx|ts|tsx)$/.test(entry.name) && entry.name !== 'noSignInModal.test.js' ? [full] : [];
  });
}

describe('SignInModal retirement', () => {
  it('leaves no SignInModal file or import in the app', () => {
    const root = process.cwd();
    expect(fs.existsSync(path.join(root, 'src/components/SignInModal.js'))).toBe(false);
    const offenders = [...sources(path.join(root, 'src')), path.join(root, 'App.js')].filter((file) =>
      /SignInModal/.test(fs.readFileSync(file, 'utf8'))
    );
    expect(offenders).toEqual([]);
  });
});
