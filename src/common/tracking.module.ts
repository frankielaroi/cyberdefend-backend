import { Module } from '@nestjs/common';
import { EmailTrackingService } from './services/email-tracking.service';
import { TrackingController } from './controllers/tracking.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [TrackingController],
  providers: [EmailTrackingService],
  exports: [EmailTrackingService],
})
export class TrackingModule {}
