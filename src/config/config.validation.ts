import * as Joi from 'joi';

export const configValidation = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  
  // Database
  DATABASE_URL: Joi.string().required(),
  
  // Redis
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow(''),
  
  // JWT
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().default('24h'),
  JWT_REFRESH_SECRET: Joi.string().required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  
  // Frontend
  FRONTEND_URL: Joi.string().required(),
  
  // AWS
  AWS_ACCESS_KEY_ID: Joi.string().required(),
  AWS_SECRET_ACCESS_KEY: Joi.string().required(),
  AWS_REGION: Joi.string().default('us-east-1'),
  AWS_S3_BUCKET: Joi.string().required(),
  
  // Email (Legacy - keeping for backward compatibility)
  SMTP_HOST: Joi.string().required(),
  SMTP_PORT: Joi.number().default(587),
  SMTP_USER: Joi.string().required(),
  SMTP_PASS: Joi.string().required(),
  FROM_EMAIL: Joi.string().email().required(),
  
  // Mailtrap (Notification System)
  MAILTRAP_API_TOKEN: Joi.string().required(),
  MAILTRAP_FROM_EMAIL: Joi.string().email().default('noreply@cyber360.tech'),
  MAILTRAP_FROM_NAME: Joi.string().default('CyberDefend'),
  
  // Email Rate Limiting
  EMAIL_RATE_LIMIT_PER_SECOND: Joi.number().default(10),
  EMAIL_RATE_LIMIT_PER_MINUTE: Joi.number().default(100),
  EMAIL_RATE_LIMIT_PER_HOUR: Joi.number().default(1000),
  
  // Arkesel SMS
  ARKESEL_API_KEY: Joi.string().required(),
  ARKESEL_SENDER_ID: Joi.string().default('CyberDefend'),
  ARKESEL_BASE_URL: Joi.string().default('https://sms.arkesel.com/api/v2'),
  
  // Payment Gateways
  PAYSTACK_SECRET_KEY: Joi.string().required(),
  PAYSTACK_PUBLIC_KEY: Joi.string().required(),
  FLUTTERWAVE_SECRET_KEY: Joi.string().required(),
  FLUTTERWAVE_PUBLIC_KEY: Joi.string().required(),
  
  // Security
  ENCRYPTION_KEY: Joi.string().length(32).required(),
  BCRYPT_ROUNDS: Joi.number().default(12),
});