import { normalizeBootstrapPassword } from './bootstrap-password';

describe('normalizeBootstrapPassword', () => {
  it.each([
    ['StrongPassword!2026\n', 'StrongPassword!2026'],
    ['StrongPassword!2026\r\n', 'StrongPassword!2026'],
    ['StrongPassword!2026', 'StrongPassword!2026'],
  ])('removes only trailing line endings from Secret Manager values', (input, expected) => {
    expect(normalizeBootstrapPassword(input)).toBe(expected);
  });

  it('preserves intentional spaces', () => {
    expect(normalizeBootstrapPassword(' Strong Password!2026 ')).toBe(' Strong Password!2026 ');
  });
});
