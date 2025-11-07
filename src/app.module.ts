import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';

import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { DefendxModule } from './defendx/defendx.module';
import { DefendxPlusModule } from './defendxplus/defendxplus.module';
import { BillingModule } from './billing/billing.module';
import { AdminModule } from './admin/admin.module';
import { OrganizationModule } from './organization/organization.module';
import { UserModule } from './user/user.module';
import { CommonModule } from './common/common.module';
import { NotificationModule } from './notification/notification.module';
import { TrackingModule } from './common/tracking.module';
import { configValidation } from './config/config.validation';
import { BackupModule } from './backup/backup.module';
import awsConfig from './config/aws.config';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validationSchema: configValidation,
      load: [awsConfig],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),

    // Task scheduling
    ScheduleModule.forRoot(),

    // Queue management
    BullModule.forRoot({
      redis: process.env.REDIS_URL || {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD,
      },
    }),

    // Core modules
    DatabaseModule,
    CommonModule,
    TrackingModule,
    AuthModule,
    DefendxModule,
    DefendxPlusModule,
    BillingModule,
    AdminModule,
    OrganizationModule,
    UserModule,
    NotificationModule,
    BackupModule,
  ],
})
export class AppModule {}