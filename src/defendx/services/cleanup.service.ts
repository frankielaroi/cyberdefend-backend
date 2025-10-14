import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { AssessmentStatus } from '../../../generated/prisma';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Clean up expired anonymous assessments
   * Runs every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredAnonymousAssessments() {
    try {
      this.logger.log('Starting cleanup of expired anonymous assessments');

      const now = new Date();

      // Find expired anonymous assessments that haven't been transferred
      const expiredAssessments = await this.prisma.assessment.findMany({
        where: {
          isAnonymous: true,
          transferredToUserId: null,
          expiresAt: {
            lt: now
          },
          status: {
            in: [AssessmentStatus.DRAFT, AssessmentStatus.IN_PROGRESS]
          }
        },
        select: {
          id: true,
          sessionId: true,
          expiresAt: true
        }
      });

      if (expiredAssessments.length === 0) {
        this.logger.log('No expired anonymous assessments found');
        return;
      }

      this.logger.log(`Found ${expiredAssessments.length} expired anonymous assessments`);

      // Delete expired assessments and their responses
      const assessmentIds = expiredAssessments.map(a => a.id);

      // Delete responses first (cascade should handle this, but being explicit)
      await this.prisma.assessmentResponse.deleteMany({
        where: {
          assessmentId: {
            in: assessmentIds
          }
        }
      });

      // Delete assessments
      const deleteResult = await this.prisma.assessment.deleteMany({
        where: {
          id: {
            in: assessmentIds
          }
        }
      });

      this.logger.log(`Cleaned up ${deleteResult.count} expired anonymous assessments`);

    } catch (error) {
      this.logger.error('Error during cleanup of expired anonymous assessments', error);
    }
  }

  /**
   * Clean up old anonymous session data
   * Runs daily at 2 AM
   */
  @Cron('0 2 * * *')
  async cleanupOldAnonymousData() {
    try {
      this.logger.log('Starting cleanup of old anonymous session data');

      // Clean up anonymous responses older than 90 days that belong to completed/transferred assessments
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const oldResponses = await this.prisma.assessmentResponse.deleteMany({
        where: {
          sessionId: {
            not: null
          },
          createdAt: {
            lt: ninetyDaysAgo
          },
          assessment: {
            OR: [
              { isAnonymous: false }, // Transferred assessments
              { status: AssessmentStatus.COMPLETED },
              { status: AssessmentStatus.EXPIRED },
              { status: AssessmentStatus.CANCELLED }
            ]
          }
        }
      });

      this.logger.log(`Cleaned up ${oldResponses.count} old anonymous responses`);

    } catch (error) {
      this.logger.error('Error during cleanup of old anonymous session data', error);
    }
  }

  /**
   * Manual cleanup method for testing/admin purposes
   */
  async manualCleanupExpiredAssessments(): Promise<{ deletedAssessments: number; deletedResponses: number }> {
    this.logger.log('Manual cleanup of expired anonymous assessments initiated');

    const now = new Date();

    // Find expired anonymous assessments
    const expiredAssessments = await this.prisma.assessment.findMany({
      where: {
        isAnonymous: true,
        transferredToUserId: null,
        expiresAt: {
          lt: now
        },
        status: {
          in: [AssessmentStatus.DRAFT, AssessmentStatus.IN_PROGRESS]
        }
      }
    });

    const assessmentIds = expiredAssessments.map(a => a.id);

    // Delete responses
    const deletedResponses = await this.prisma.assessmentResponse.deleteMany({
      where: {
        assessmentId: {
          in: assessmentIds
        }
      }
    });

    // Delete assessments
    const deletedAssessments = await this.prisma.assessment.deleteMany({
      where: {
        id: {
          in: assessmentIds
        }
      }
    });

    this.logger.log(`Manual cleanup completed: ${deletedAssessments.count} assessments, ${deletedResponses.count} responses`);

    return {
      deletedAssessments: deletedAssessments.count,
      deletedResponses: deletedResponses.count
    };
  }
}