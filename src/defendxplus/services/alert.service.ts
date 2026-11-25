import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Observable, Subject } from 'rxjs';
import { MessageEvent } from '@nestjs/common';

@Injectable()
export class AlertService {
  private alertStreams = new Map<string, Subject<MessageEvent>>();

  constructor(private prisma: PrismaService) {}

  async getAlerts(
    organizationId: string,
    filters: {
      severity?: string;
      status?: string;
      fromDate?: string;
      toDate?: string;
    },
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    // Build filter conditions
    if (filters.severity) where.severity = filters.severity;
    if (filters.status) where.status = filters.status;
    if (filters.fromDate || filters.toDate) {
      where.createdAt = {};
      if (filters.fromDate) where.createdAt.gte = new Date(filters.fromDate);
      if (filters.toDate) where.createdAt.lte = new Date(filters.toDate);
    }

    // Note: Since alerts are linked to agents, we need to filter through agents
    const organizationAgents = await this.prisma.agent.findMany({
      where: { organizationId },
      select: { id: true },
    });

    where.agentId = {
      in: organizationAgents.map(agent => agent.id),
    };

    const [alerts, total] = await Promise.all([
      this.prisma.alert.findMany({
        where,
        include: {
          agent: {
            select: {
              name: true,
              hostname: true,
            },
          },
          rule: {
            select: {
              name: true,
              description: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.alert.count({ where }),
    ]);

    return {
      data: alerts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      summary: {
        total,
        open: await this.prisma.alert.count({
          where: { ...where, status: 'OPEN' },
        }),
        acknowledged: await this.prisma.alert.count({
          where: { ...where, status: 'ACKNOWLEDGED' },
        }),
        resolved: await this.prisma.alert.count({
          where: { ...where, status: 'RESOLVED' },
        }),
      },
    };
  }

  async acknowledgeAlert(userId: string, organizationId: string, alertId: string) {
    // First, verify the alert belongs to this organization
    await this.findAlertForOrganization(alertId, organizationId);

    const updatedAlert = await this.prisma.alert.update({
      where: { id: alertId },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date(),
        acknowledgedBy: userId,
      },
    });

    // Emit real-time update
    this.emitAlertUpdate(organizationId, {
      type: 'alert_acknowledged',
      alert: updatedAlert,
    });

    return {
      message: 'Alert acknowledged successfully',
      data: updatedAlert,
    };
  }

  async closeAlert(userId: string, organizationId: string, alertId: string) {
    // First, verify the alert belongs to this organization
    await this.findAlertForOrganization(alertId, organizationId);

    const updatedAlert = await this.prisma.alert.update({
      where: { id: alertId },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolvedBy: userId,
      },
    });

    // Emit real-time update
    this.emitAlertUpdate(organizationId, {
      type: 'alert_resolved',
      alert: updatedAlert,
    });

    return {
      message: 'Alert closed successfully',
      data: updatedAlert,
    };
  }

  getAlertStream(organizationId: string): Observable<MessageEvent> {
    if (!this.alertStreams.has(organizationId)) {
      this.alertStreams.set(organizationId, new Subject<MessageEvent>());
    }
    
    return this.alertStreams.get(organizationId)!.asObservable();
  }

  private async findAlertForOrganization(alertId: string, organizationId: string) {
    const alert = await this.prisma.alert.findFirst({
      where: {
        id: alertId,
        agent: {
          organizationId,
        },
      },
    });

    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    return alert;
  }

  private emitAlertUpdate(organizationId: string, data: any) {
    const stream = this.alertStreams.get(organizationId);
    if (stream) {
      stream.next({
        data: JSON.stringify(data),
        type: 'alert-update',
      } as MessageEvent);
    }
  }

  // Method to be called when new alerts are created
  async notifyNewAlert(organizationId: string, alert: any) {
    this.emitAlertUpdate(organizationId, {
      type: 'new_alert',
      alert,
    });
  }

  async getDashboardStats(organizationId: string) {
    // Get organization agents
    const organizationAgents = await this.prisma.agent.findMany({
      where: { organizationId },
      select: { id: true },
    });

    const agentIds = organizationAgents.map(agent => agent.id);

    // Get alert statistics
    const [
      _totalAlerts,
      openAlerts,
      criticalAlerts,
      highAlerts,
      authFailures,
      offlineAgents,
      allAgents,
    ] = await Promise.all([
      this.prisma.alert.count({
        where: { agentId: { in: agentIds } },
      }),
      this.prisma.alert.count({
        where: { agentId: { in: agentIds }, status: 'OPEN' },
      }),
      this.prisma.alert.count({
        where: { agentId: { in: agentIds }, severity: 'CRITICAL', status: 'OPEN' },
      }),
      this.prisma.alert.count({
        where: { agentId: { in: agentIds }, severity: 'HIGH', status: 'OPEN' },
      }),
      this.prisma.telemetryEvent.count({
        where: {
          agentId: { in: agentIds },
          type: 'LOGIN_FAILURE',
          timestamp: {
            gte: new Date(new Date().getTime() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      }),
      this.prisma.agent.count({
        where: {
          organizationId,
          isActive: false,
        },
      }),
      this.prisma.agent.count({
        where: { organizationId },
      }),
    ]);

    // Get suspicious domains (mock data for now)
    const suspiciousDomains = [
      { domain: 'malicious-site.com', hits: 15 },
      { domain: 'phishing-attempt.net', hits: 8 },
      { domain: 'suspicious-download.org', hits: 5 },
    ];

    // Calculate auth failure trend (simplified)
    const authFailureTrend = authFailures > 20 ? 'up' : authFailures > 10 ? 'stable' : 'down';
    const authFailurePercentage = authFailures > 0 ? ((authFailures - 10) / 10) * 100 : 0;

    return {
      activeAlerts: openAlerts,
      criticalAlerts,
      highAlerts,
      authFailureTrends: {
        totalFailures: authFailures,
        trend: authFailureTrend,
        percentage: Math.abs(authFailurePercentage),
      },
      devicesOffline: offlineAgents,
      avStatus: {
        protected: allAgents - offlineAgents,
        unprotected: offlineAgents,
        outdated: Math.floor(allAgents * 0.1), // Mock 10% outdated
      },
      suspiciousDomains,
    };
  }
}