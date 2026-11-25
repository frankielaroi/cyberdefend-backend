import { Global, Module } from '@nestjs/common';
import { CronLockService } from './services/cron-lock.service';

@Global()
@Module({
  providers: [CronLockService],
  exports: [CronLockService],
})
export class CronLockModule {}
