-- Store bearer secrets as SHA-256 hex digests instead of plaintext.
-- The application hashes incoming secrets the same way (src/common/utils/token.util.ts),
-- so tokens issued before this migration keep working.

UPDATE "backup_agents" SET "token" = encode(sha256(convert_to("token", 'UTF8')), 'hex');

UPDATE "agents" SET "apiKey" = encode(sha256(convert_to("apiKey", 'UTF8')), 'hex');

UPDATE "refresh_tokens" SET "token" = encode(sha256(convert_to("token", 'UTF8')), 'hex');

UPDATE "password_resets" SET "token" = encode(sha256(convert_to("token", 'UTF8')), 'hex');
