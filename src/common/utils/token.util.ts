import { createHash, randomBytes, randomInt } from 'crypto';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Random secret for API keys, agent tokens and reset links. */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex');
}

/**
 * SHA-256 hex digest used to store bearer secrets at rest.
 * Must match the Postgres expression encode(sha256(convert_to(value, 'UTF8')), 'hex')
 * used by the hash_stored_tokens migration.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

/** Human-friendly random code (no 0/O/1/I) from a CSPRNG. */
export function generateCode(length: number): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return code;
}
