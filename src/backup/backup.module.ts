import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { DatabaseModule } from '../database/database.module';
import { BackupController } from './backup.controller';
import { BackupService } from './backup.service';
import { BackupAgentGuard } from './guards/backup-agent.guard';
import * as multer from 'multer';

@Module({
  imports: [
    MulterModule.register({
      storage: multer.memoryStorage(),
    }),
    DatabaseModule,
  ],
  controllers: [BackupController],
  providers: [BackupService, BackupAgentGuard]
})
export class BackupModule {}
