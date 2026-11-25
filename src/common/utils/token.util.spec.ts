import { generateCode, generateToken, hashToken } from './token.util';

describe('token.util', () => {
  it('generates unique 64-char hex tokens', () => {
    const a = generateToken();
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(generateToken()).not.toBe(a);
  });

  it('hashes with SHA-256 hex (matches the Postgres migration expression)', () => {
    expect(hashToken('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('generates codes from the unambiguous alphabet', () => {
    expect(generateCode(10)).toMatch(/^[A-HJ-NP-Z2-9]{10}$/);
  });
});
