import { Module } from '@nestjs/common';
import { DefendxService } from './defendx.service';
import { DefendxController } from './defendx.controller';
import { CSIDirectoryController } from './csi-directory.controller';
import { AssessmentService } from './services/assessment.service';
import { QuestionService } from './services/question.service';
import { ReportService } from './services/report.service';
import { BenchmarkService } from './services/benchmark.service';

@Module({
  providers: [
    DefendxService,
    AssessmentService,
    QuestionService,
    ReportService,
    BenchmarkService,
  ],
  controllers: [DefendxController, CSIDirectoryController],
  exports: [DefendxService, AssessmentService],
})
export class DefendxModule {}