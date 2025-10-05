import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ScheduleScanDto, RunScanDto, ScanFiltersDto } from '../dto/scan.dto';

@Injectable()
export class ScanService {
  constructor(private prisma: PrismaService) {}

  async scheduleScan(userId: string, organizationId: string, scheduleScanDto: ScheduleScanDto) {
    // Find agents for this organization
    const agents = scheduleScanDto.agentIds?.length 
      ? await this.prisma.agent.findMany({
          where: { 
            id: { in: scheduleScanDto.agentIds }, 
            organizationId, 
            isActive: true 
          },
        })
      : await this.prisma.agent.findMany({
          where: { organizationId, isActive: true },
        });

    if (agents.length === 0) {
      throw new Error('No active agents found for this organization. Please register agents first.');
    }

    // Create scan schedules for each agent
    const scanSchedules = await Promise.all(
      agents.map(agent =>
        this.prisma.scanResult.create({
          data: {
            type: scheduleScanDto.type as any,
            status: 'PENDING',
            findings: JSON.stringify({
              schedule: {
                frequency: scheduleScanDto.frequency,
                schedule: scheduleScanDto.schedule,
                time: scheduleScanDto.time,
                config: scheduleScanDto.config || {},
              },
              nextRun: this.calculateNextRun(scheduleScanDto),
            }),
            agentId: agent.id,
          },
        })
      )
    );

    return {
      message: 'Scan scheduled successfully',
      scheduleCount: scanSchedules.length,
      nextRun: this.calculateNextRun(scheduleScanDto),
      data: scanSchedules,
    };
  }

  async runScan(userId: string, organizationId: string, runScanDto: RunScanDto) {
    // Find agents for this organization
    const agents = runScanDto.agentIds?.length 
      ? await this.prisma.agent.findMany({
          where: { 
            id: { in: runScanDto.agentIds }, 
            organizationId, 
            isActive: true 
          },
        })
      : await this.prisma.agent.findMany({
          where: { organizationId, isActive: true },
        });

    if (agents.length === 0) {
      throw new Error('No active agents found for this organization. Please register agents first.');
    }

    // Create scan jobs for each agent
    const scanResults = await Promise.all(
      agents.map(agent =>
        this.prisma.scanResult.create({
          data: {
            type: runScanDto.type as any,
            status: 'RUNNING',
            findings: JSON.stringify({
              startedBy: userId,
              priority: runScanDto.priority || 'NORMAL',
              config: runScanDto.config || {},
            }),
            agentId: agent.id,
          },
        })
      )
    );

    // Simulate scan execution for each result
    scanResults.forEach(result => this.simulateScanExecution(result.id));

    return {
      message: 'Scan triggered successfully',
      scanCount: scanResults.length,
      estimatedDuration: '15-30 minutes',
      data: scanResults,
    };
  }

  async getScans(organizationId: string, type?: string, status?: string) {
    // Get all agents for this organization
    const organizationAgents = await this.prisma.agent.findMany({
      where: { organizationId },
      select: { id: true },
    });

    const where: any = {
      agentId: {
        in: organizationAgents.map(agent => agent.id),
      },
    };
    
    if (type) where.type = type;
    if (status) where.status = status;

    const scans = await this.prisma.scanResult.findMany({
      where,
      select: {
        id: true,
        type: true,
        status: true,
        score: true,
        startedAt: true,
        completedAt: true,
        agent: {
          select: {
            name: true,
            hostname: true,
          },
        },
      },
      orderBy: { startedAt: 'desc' },
    });

    return {
      data: scans,
      summary: {
        total: scans.length,
        running: scans.filter(s => s.status === 'RUNNING').length,
        completed: scans.filter(s => s.status === 'COMPLETED').length,
        pending: scans.filter(s => s.status === 'PENDING').length,
        failed: scans.filter(s => s.status === 'FAILED').length,
      },
    };
  }

  async getScanResults(
    organizationId: string,
    filters: {
      fromDate?: string;
      toDate?: string;
      type?: string;
    },
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;
    
    // Get all agents for this organization
    const organizationAgents = await this.prisma.agent.findMany({
      where: { organizationId },
      select: { id: true },
    });

    const where: any = { 
      agentId: {
        in: organizationAgents.map(agent => agent.id),
      },
      status: 'COMPLETED', // Only show completed scans in results
    };

    if (filters.type) where.type = filters.type;
    if (filters.fromDate || filters.toDate) {
      where.completedAt = {};
      if (filters.fromDate) where.completedAt.gte = new Date(filters.fromDate);
      if (filters.toDate) where.completedAt.lte = new Date(filters.toDate);
    }

    const [scanResults, total] = await Promise.all([
      this.prisma.scanResult.findMany({
        where,
        select: {
          id: true,
          type: true,
          score: true,
          startedAt: true,
          completedAt: true,
          findings: true,
        },
        orderBy: { completedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.scanResult.count({ where }),
    ]);

    return {
      data: scanResults.map(result => ({
        ...result,
        findings: result.findings ? JSON.parse(result.findings) : null,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getScanResult(organizationId: string, scanResultId: string, format: 'json' | 'pdf' = 'json') {
    // Get all agents for this organization
    const organizationAgents = await this.prisma.agent.findMany({
      where: { organizationId },
      select: { id: true },
    });

    const scanResult = await this.prisma.scanResult.findFirst({
      where: {
        id: scanResultId,
        agentId: {
          in: organizationAgents.map(agent => agent.id),
        },
      },
    });

    if (!scanResult) {
      throw new NotFoundException('Scan result not found');
    }

    const findings = scanResult.findings ? JSON.parse(scanResult.findings) : {};

    if (format === 'pdf') {
      // TODO: Implement PDF generation
      return {
        message: 'PDF generation not yet implemented',
        downloadUrl: null,
        scanResult: scanResult,
      };
    }

    return {
      id: scanResult.id,
      type: scanResult.type,
      status: scanResult.status,
      score: scanResult.score,
      grade: this.calculateGrade(scanResult.score),
      startedAt: scanResult.startedAt,
      completedAt: scanResult.completedAt,
      findings: findings,
      recommendations: this.generateRecommendations(findings),
      compliance: this.generateComplianceReport(findings),
    };
  }

  private async simulateScanExecution(scanId: string) {
    // Simulate scan completion after 5 seconds (for demo purposes)
    setTimeout(async () => {
      try {
        await this.prisma.scanResult.update({
          where: { id: scanId },
          data: {
            status: 'COMPLETED',
            score: 'B+',
            completedAt: new Date(),
            findings: JSON.stringify({
              summary: {
                totalChecks: 47,
                passed: 38,
                warnings: 6,
                failures: 3,
                score: 85,
              },
              categories: {
                networkSecurity: { score: 90, status: 'GOOD' },
                systemUpdates: { score: 75, status: 'WARNING' },
                accessControls: { score: 95, status: 'EXCELLENT' },
                dataProtection: { score: 80, status: 'GOOD' },
                incidentResponse: { score: 70, status: 'WARNING' },
              },
              vulnerabilities: [
                {
                  id: 'CVE-2024-001',
                  severity: 'MEDIUM',
                  title: 'Outdated SSL certificate',
                  description: 'SSL certificate expires in 30 days',
                  remediation: 'Renew SSL certificate',
                },
                {
                  id: 'CUSTOM-002',
                  severity: 'LOW',
                  title: 'Unused user accounts detected',
                  description: '3 user accounts have not logged in for 90+ days',
                  remediation: 'Review and disable inactive accounts',
                },
              ],
            }),
            recommendations: JSON.stringify([
              'Update SSL certificate before expiration',
              'Implement automated user account review process',
              'Enable two-factor authentication for all admin accounts',
              'Schedule quarterly security awareness training',
            ]),
          },
        });
      } catch (error) {
        console.error('Error completing simulated scan:', error);
      }
    }, 5000);
  }

  private calculateGrade(score: string | null): string {
    if (!score) return 'N/A';
    
    // If score is already a grade, return it
    if (score.match(/^[A-F][+-]?$/)) return score;
    
    // If score is numeric, convert to grade
    const numericScore = parseFloat(score);
    if (numericScore >= 90) return 'A';
    if (numericScore >= 80) return 'B';
    if (numericScore >= 70) return 'C';
    if (numericScore >= 60) return 'D';
    return 'F';
  }

  private generateRecommendations(findings: any): string[] {
    const recommendations = [];
    
    if (findings?.categories?.networkSecurity?.score < 80) {
      recommendations.push('Strengthen network security configurations');
    }
    
    if (findings?.categories?.systemUpdates?.score < 80) {
      recommendations.push('Implement automated patch management');
    }
    
    if (findings?.categories?.accessControls?.score < 90) {
      recommendations.push('Review and tighten access control policies');
    }

    return recommendations;
  }

  private generateComplianceReport(findings: any): any {
    return {
      frameworks: {
        'ISO 27001': {
          coverage: 85,
          status: 'COMPLIANT',
          gaps: 3,
        },
        'NIST Cybersecurity Framework': {
          coverage: 78,
          status: 'PARTIALLY_COMPLIANT',
          gaps: 5,
        },
        'GDPR (Data Protection)': {
          coverage: 92,
          status: 'COMPLIANT',
          gaps: 1,
        },
      },
      overallCompliance: 85,
      riskLevel: 'MEDIUM',
    };
  }

  private calculateNextRun(scheduleScanDto: ScheduleScanDto): Date {
    const now = new Date();
    const nextRun = new Date(now);

    switch (scheduleScanDto.frequency) {
      case 'DAILY':
        nextRun.setDate(now.getDate() + 1);
        break;
      case 'WEEKLY':
        nextRun.setDate(now.getDate() + 7);
        break;
      case 'MONTHLY':
        nextRun.setMonth(now.getMonth() + 1);
        break;
      case 'QUARTERLY':
        nextRun.setMonth(now.getMonth() + 3);
        break;
      default:
        nextRun.setDate(now.getDate() + 7); // Default to weekly
    }

    // Set the time from scheduleScanDto.time (format: "HH:MM")
    if (scheduleScanDto.time) {
      const [hours, minutes] = scheduleScanDto.time.split(':').map(Number);
      nextRun.setHours(hours, minutes, 0, 0);
    }

    return nextRun;
  }
}