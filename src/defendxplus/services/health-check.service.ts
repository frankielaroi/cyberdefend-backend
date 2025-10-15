import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { EmailService } from '../../notification/services/email.service';
import { CircuitBreakerService } from './circuit-breaker.service';
import { PhishingQueueService } from './phishing-queue.service';

export enum HealthStatus {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  UNHEALTHY = 'UNHEALTHY'
}

export interface HealthCheckResult {
  status: HealthStatus;
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    database: ServiceHealth;
    emailService: ServiceHealth;
    queueService: ServiceHealth;
    circuitBreaker: ServiceHealth;
  };
  campaigns: {
    total: number;
    running: number;
    scheduled: number;
    completed: number;
    failed: number;
  };
  emailJobs: {
    pending: number;
    processing: number;
    sent: number;
    failed: number;
  };
  performance: {
    avgEmailSendTime: number;
    emailSuccessRate: number;
    campaignCompletionRate: number;
  };
}

export interface ServiceHealth {
  status: HealthStatus;
  message?: string;
  lastCheck?: string;
  metrics?: any;
}

/**
 * Health Check Service
 * Monitors the health of the phishing campaign system and its dependencies
 */
@Injectable()
export class HealthCheckService {
  private readonly logger = new Logger(HealthCheckService.name);
  private readonly startTime = Date.now();

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private circuitBreaker: CircuitBreakerService,
    private phishingQueueService?: PhishingQueueService
  ) {}

  /**
   * Perform a comprehensive health check
   */
  async performHealthCheck(): Promise<HealthCheckResult> {
    this.logger.log('🏥 Performing health check...');

    const [
      databaseHealth,
      emailHealth,
      queueHealth,
      circuitHealth,
      campaignStats,
      jobStats,
      performanceMetrics
    ] = await Promise.all([
      this.checkDatabaseHealth(),
      this.checkEmailServiceHealth(),
      this.checkQueueServiceHealth(),
      this.checkCircuitBreakerHealth(),
      this.getCampaignStatistics(),
      this.getEmailJobStatistics(),
      this.getPerformanceMetrics()
    ]);

    // Determine overall health status
    const overallStatus = this.determineOverallStatus([
      databaseHealth,
      emailHealth,
      queueHealth,
      circuitHealth
    ]);

    const result: HealthCheckResult = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: databaseHealth,
        emailService: emailHealth,
        queueService: queueHealth,
        circuitBreaker: circuitHealth
      },
      campaigns: campaignStats,
      emailJobs: jobStats,
      performance: performanceMetrics
    };

    this.logger.log(`✅ Health check completed - Status: ${overallStatus}`);
    return result;
  }

  /**
   * Check database connectivity and health
   */
  private async checkDatabaseHealth(): Promise<ServiceHealth> {
    try {
      const startTime = Date.now();
      
      // Simple query to test connection
      await this.prisma.$queryRaw`SELECT 1`;
      
      const responseTime = Date.now() - startTime;

      // Check connection pool stats if available
      const metrics = {
        responseTime: `${responseTime}ms`,
        connected: true
      };

      if (responseTime > 1000) {
        return {
          status: HealthStatus.DEGRADED,
          message: 'Database response time is slow',
          lastCheck: new Date().toISOString(),
          metrics
        };
      }

      return {
        status: HealthStatus.HEALTHY,
        message: 'Database is operational',
        lastCheck: new Date().toISOString(),
        metrics
      };
    } catch (error) {
      this.logger.error('❌ Database health check failed:', error);
      return {
        status: HealthStatus.UNHEALTHY,
        message: `Database connection failed: ${error.message}`,
        lastCheck: new Date().toISOString()
      };
    }
  }

  /**
   * Check email service health
   */
  private async checkEmailServiceHealth(): Promise<ServiceHealth> {
    try {
      // Check if email service exists and is available
      const isAvailable = !!this.emailService;

      if (!isAvailable) {
        return {
          status: HealthStatus.UNHEALTHY,
          message: 'Email service not available',
          lastCheck: new Date().toISOString()
        };
      }

      // Get circuit breaker metrics for email service
      const circuitMetrics = this.circuitBreaker.getCircuitMetrics('email-service');

      const metrics = {
        configured: true,
        circuitState: circuitMetrics?.state || 'CLOSED',
        uptime: circuitMetrics?.uptime?.toFixed(2) || '100.00',
        failures: circuitMetrics?.metrics?.failures || 0,
        successes: circuitMetrics?.metrics?.successes || 0
      };

      // Check circuit breaker state
      if (circuitMetrics?.state === 'OPEN') {
        return {
          status: HealthStatus.UNHEALTHY,
          message: 'Email service circuit breaker is OPEN',
          lastCheck: new Date().toISOString(),
          metrics
        };
      }

      if (circuitMetrics?.state === 'HALF_OPEN') {
        return {
          status: HealthStatus.DEGRADED,
          message: 'Email service is recovering (circuit HALF-OPEN)',
          lastCheck: new Date().toISOString(),
          metrics
        };
      }

      return {
        status: HealthStatus.HEALTHY,
        message: 'Email service is operational',
        lastCheck: new Date().toISOString(),
        metrics
      };
    } catch (error) {
      this.logger.error('❌ Email service health check failed:', error);
      return {
        status: HealthStatus.UNHEALTHY,
        message: `Email service check failed: ${error.message}`,
        lastCheck: new Date().toISOString()
      };
    }
  }

  /**
   * Check queue service health
   */
  private async checkQueueServiceHealth(): Promise<ServiceHealth> {
    try {
      if (!this.phishingQueueService) {
        return {
          status: HealthStatus.DEGRADED,
          message: 'Queue service not available (using synchronous processing)',
          lastCheck: new Date().toISOString(),
          metrics: {
            available: false,
            mode: 'synchronous'
          }
        };
      }

      // Get queue status - queue service is available
      const metrics = {
        available: true,
        mode: 'queue',
        service: 'BullMQ'
      };

      return {
        status: HealthStatus.HEALTHY,
        message: 'Queue service is operational',
        lastCheck: new Date().toISOString(),
        metrics
      };
    } catch (error) {
      this.logger.error('❌ Queue service health check failed:', error);
      return {
        status: HealthStatus.UNHEALTHY,
        message: `Queue service check failed: ${error.message}`,
        lastCheck: new Date().toISOString()
      };
    }
  }

  /**
   * Check circuit breaker health
   */
  private async checkCircuitBreakerHealth(): Promise<ServiceHealth> {
    try {
      const circuits = this.circuitBreaker.getAllCircuitMetrics();

      const openCircuits = circuits.filter(c => c.state === 'OPEN').length;
      const halfOpenCircuits = circuits.filter(c => c.state === 'HALF_OPEN').length;

      const metrics = {
        totalCircuits: circuits.length,
        openCircuits,
        halfOpenCircuits,
        circuits: circuits.map(c => ({
          serviceId: c.serviceId,
          state: c.state,
          uptime: c.uptime?.toFixed(2)
        }))
      };

      if (openCircuits > 0) {
        return {
          status: HealthStatus.UNHEALTHY,
          message: `${openCircuits} circuit breaker(s) are OPEN`,
          lastCheck: new Date().toISOString(),
          metrics
        };
      }

      if (halfOpenCircuits > 0) {
        return {
          status: HealthStatus.DEGRADED,
          message: `${halfOpenCircuits} circuit breaker(s) are HALF-OPEN`,
          lastCheck: new Date().toISOString(),
          metrics
        };
      }

      return {
        status: HealthStatus.HEALTHY,
        message: 'All circuit breakers are CLOSED',
        lastCheck: new Date().toISOString(),
        metrics
      };
    } catch (error) {
      this.logger.error('❌ Circuit breaker health check failed:', error);
      return {
        status: HealthStatus.UNHEALTHY,
        message: `Circuit breaker check failed: ${error.message}`,
        lastCheck: new Date().toISOString()
      };
    }
  }

  /**
   * Get campaign statistics
   */
  private async getCampaignStatistics() {
    const [total, running, scheduled, completed, failed] = await Promise.all([
      this.prisma.phishingCampaign.count(),
      this.prisma.phishingCampaign.count({ where: { status: 'RUNNING' } }),
      this.prisma.phishingCampaign.count({ where: { status: 'SCHEDULED' } }),
      this.prisma.phishingCampaign.count({ where: { status: 'COMPLETED' } }),
      this.prisma.phishingCampaign.count({ where: { status: 'CANCELLED' } })
    ]);

    return { total, running, scheduled, completed, failed };
  }

  /**
   * Get email job statistics
   */
  private async getEmailJobStatistics() {
    const [pending, processing, sent, failed] = await Promise.all([
      this.prisma.emailJob.count({ where: { status: 'PENDING' } }),
      this.prisma.emailJob.count({ where: { status: 'PROCESSING' } }),
      this.prisma.emailJob.count({ where: { status: 'SENT' } }),
      this.prisma.emailJob.count({ where: { status: 'FAILED' } })
    ]);

    return { pending, processing, sent, failed };
  }

  /**
   * Get performance metrics
   */
  private async getPerformanceMetrics() {
    // Get recent email jobs (last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const recentJobs = await this.prisma.emailJob.findMany({
      where: {
        createdAt: { gte: twentyFourHoursAgo }
      },
      select: {
        status: true,
        createdAt: true,
        lastAttemptAt: true
      }
    });

    // Calculate average email send time
    const completedJobs = recentJobs.filter(j => j.status === 'SENT' && j.lastAttemptAt);
    const avgSendTime = completedJobs.length > 0
      ? completedJobs.reduce((sum, job) => {
          const sendTime = job.lastAttemptAt!.getTime() - job.createdAt.getTime();
          return sum + sendTime;
        }, 0) / completedJobs.length
      : 0;

    // Calculate email success rate
    const totalJobs = recentJobs.length;
    const successfulJobs = recentJobs.filter(j => j.status === 'SENT').length;
    const emailSuccessRate = totalJobs > 0 ? (successfulJobs / totalJobs) * 100 : 0;

    // Calculate campaign completion rate
    const recentCampaigns = await this.prisma.phishingCampaign.findMany({
      where: {
        createdAt: { gte: twentyFourHoursAgo }
      },
      select: { status: true }
    });

    const totalCampaigns = recentCampaigns.length;
    const completedCampaigns = recentCampaigns.filter(c => c.status === 'COMPLETED').length;
    const campaignCompletionRate = totalCampaigns > 0 
      ? (completedCampaigns / totalCampaigns) * 100 
      : 0;

    return {
      avgEmailSendTime: Math.round(avgSendTime),
      emailSuccessRate: parseFloat(emailSuccessRate.toFixed(2)),
      campaignCompletionRate: parseFloat(campaignCompletionRate.toFixed(2))
    };
  }

  /**
   * Determine overall health status from service statuses
   */
  private determineOverallStatus(serviceHealths: ServiceHealth[]): HealthStatus {
    const hasUnhealthy = serviceHealths.some(s => s.status === HealthStatus.UNHEALTHY);
    const hasDegraded = serviceHealths.some(s => s.status === HealthStatus.DEGRADED);

    if (hasUnhealthy) {
      return HealthStatus.UNHEALTHY;
    }

    if (hasDegraded) {
      return HealthStatus.DEGRADED;
    }

    return HealthStatus.HEALTHY;
  }

  /**
   * Quick health check (lightweight)
   */
  async quickHealthCheck() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }
}
