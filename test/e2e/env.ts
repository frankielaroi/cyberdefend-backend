/**
 * Environment for the e2e suite. Every external service is either local (Postgres, Redis)
 * or replaced in createTestApp(), so dummy credentials are enough.
 */
const defaults: Record<string, string> = {
  NODE_ENV: 'test',
  REDIS_URL: 'redis://localhost:6379',
  JWT_SECRET: 'e2e-jwt-secret',
  JWT_REFRESH_SECRET: 'e2e-jwt-refresh-secret',
  FRONTEND_URL: 'http://localhost:5173',
  AWS_ACCESS_KEY_ID: 'e2e',
  AWS_SECRET_ACCESS_KEY: 'e2e',
  AWS_S3_BUCKET: 'e2e-bucket',
  SMTP_HOST: 'localhost',
  SMTP_USER: 'e2e',
  SMTP_PASS: 'e2e',
  FROM_EMAIL: 'e2e@example.com',
  MAILTRAP_API_TOKEN: 'e2e',
  ARKESEL_API_KEY: 'e2e',
  PAYSTACK_SECRET_KEY: 'e2e',
  PAYSTACK_PUBLIC_KEY: 'e2e',
  FLUTTERWAVE_SECRET_KEY: 'e2e',
  FLUTTERWAVE_PUBLIC_KEY: 'e2e',
  ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef',
};

for (const [key, value] of Object.entries(defaults)) {
  process.env[key] ??= value;
}

// The suite truncates every table: refuse to run against anything but a local or test database
const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error('DATABASE_URL must point at a disposable test database for e2e tests');
}
const { hostname, pathname } = new URL(url);
const isLocal = ['localhost', '127.0.0.1', '::1', 'postgres'].includes(hostname);
if (!isLocal && !/test/i.test(pathname)) {
  throw new Error(`Refusing to run e2e tests against ${hostname}${pathname}: use a local or *test* database`);
}
